// Package handlers implements the public `/api/v1/*` gateway (API-01..API-18
// plus the contract §8 extras) on top of the in-memory store, the escrow FSM
// and the bridge/Rust clients.
package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/config"
	mw "github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

// Version of the service.
const Version = "0.1.0"

// Server wires everything together.
type Server struct {
	Cfg    config.Config
	Store  *store.Store
	Bridge *clients.Bridge
	Rust   *clients.Rust
	JWT    *mw.JWT
	Idem   *mw.Idempotency
	Bus    *Broadcaster
	signer *clients.GoSigner
	// asyncWG-free: async side effects are best-effort with their own timeouts.
}

// New builds a server and seeds the store.
func New(cfg config.Config) *Server {
	signer := clients.NewGoSigner(cfg.Ed25519Seed)
	s := &Server{
		Cfg:    cfg,
		Store:  store.New(),
		Bridge: clients.NewBridge(cfg.BridgeURL, cfg.InternalHMAC, cfg.NexconnAppKey),
		Rust:   clients.NewRust(cfg.RustURL, cfg.InternalHMAC, signer),
		JWT:    mw.NewJWT(cfg.JWTSecret),
		Idem:   mw.NewIdempotency(24 * time.Hour),
		Bus:    NewBroadcaster(),
		signer: signer,
	}
	s.seed()
	return s
}

// StartBackground launches probers and sweepers until ctx is done.
func (s *Server) StartBackground(ctx context.Context) {
	go s.Bridge.RunProber(ctx)
	go s.Rust.RunProber(ctx)
	go func() {
		t := time.NewTicker(10 * time.Minute)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				s.Idem.Sweep()
			}
		}
	}()
}

// Routes returns the full HTTP handler with middleware.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	auth := s.JWT.RequireAuth(false)
	authQ := s.JWT.RequireAuth(true)
	arb := s.JWT.RequireAuth(false, "arbitrator")
	seller := s.JWT.RequireAuth(false, "seller")
	idem := s.Idem.Wrap

	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /api/v1/health", s.handleHealth)

	// API-01 / API-02 (public)
	mux.HandleFunc("POST /api/v1/auth/session", idem(s.handleAuthSession))
	mux.HandleFunc("POST /api/v1/sandbox/provision", idem(s.handleSandboxProvision))
	// API-03 / API-04 + list
	mux.HandleFunc("POST /api/v1/deals", auth(idem(s.handleCreateDeal)))
	mux.HandleFunc("GET /api/v1/deals", auth(s.handleListDeals))
	mux.HandleFunc("GET /api/v1/deals/{dealId}", auth(s.handleGetDeal))
	// API-05 + chat messages
	mux.HandleFunc("POST /api/v1/deals/{dealId}/translate-stream", auth(idem(s.handleTranslateStream)))
	mux.HandleFunc("POST /api/v1/deals/{dealId}/messages", auth(idem(s.handlePostMessage)))
	mux.HandleFunc("GET /api/v1/deals/{dealId}/events", authQ(s.handleDealEvents))
	// API-06
	mux.HandleFunc("POST /api/v1/deals/{dealId}/escrow/transition", auth(idem(s.handleTransition)))
	// API-07 / API-08
	mux.HandleFunc("POST /api/v1/deals/{dealId}/assay/start", auth(idem(s.handleAssayStart)))
	mux.HandleFunc("POST /api/v1/deals/{dealId}/assay/verify-frame", auth(idem(s.handleAssayVerify)))
	// API-09 / API-10 / API-11 + dispatch queue
	mux.HandleFunc("POST /api/v1/deals/{dealId}/dispute/freeze", auth(idem(s.handleDisputeFreeze)))
	mux.HandleFunc("POST /api/v1/dispatch/assign", arb(idem(s.handleDispatchAssign)))
	mux.HandleFunc("POST /api/v1/disputes/{disputeId}/resolve", arb(idem(s.handleDisputeResolve)))
	mux.HandleFunc("GET /api/v1/dispatch/queue", auth(s.handleDispatchQueue))
	// API-12 / API-13 / API-14
	mux.HandleFunc("GET /api/v1/marketplace/open-lots", s.handleOpenLots)
	mux.HandleFunc("POST /api/v1/marketplace/open-lots/broadcast", seller(idem(s.handleBroadcastLot)))
	mux.HandleFunc("POST /api/v1/community/subchannels", auth(idem(s.handleSubchannel)))
	// API-15 / API-16 + run state (public)
	mux.HandleFunc("POST /api/v1/arena/start", idem(s.handleArenaStart))
	mux.HandleFunc("POST /api/v1/arena/{runId}/bid", idem(s.handleArenaBid))
	mux.HandleFunc("GET /api/v1/arena/{runId}", s.handleArenaGet)
	// API-17 (HMAC; idempotent on event_id instead of header)
	mux.HandleFunc("POST /api/v1/webhooks/upi-ondc", s.handleWebhook)
	// API-18 (public)
	mux.HandleFunc("GET /api/v1/traction/telemetry", s.handleTraction)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		mw.WriteError(w, r, http.StatusNotFound, "ERR_NOT_FOUND", "no route for "+r.Method+" "+r.URL.Path, false)
	})

	var h http.Handler = mux
	h = mw.CORS(s.Cfg.CORSOrigins)(h)
	h = mw.Logging(h)
	return h
}

// ---- helpers ----

const maxBody = 8 << 20 // frames can be large

func decodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(v); err != nil {
		if errors.Is(err, io.EOF) {
			mw.WriteError(w, r, http.StatusBadRequest, "ERR_VALIDATION", "request body required", false)
			return false
		}
		mw.WriteError(w, r, http.StatusBadRequest, "ERR_VALIDATION", "invalid JSON: "+err.Error(), false)
		return false
	}
	return true
}

// decodeOptionalJSON allows an empty body.
func decodeOptionalJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil && !errors.Is(err, io.EOF) {
		mw.WriteError(w, r, http.StatusBadRequest, "ERR_VALIDATION", "invalid JSON: "+err.Error(), false)
		return false
	}
	return true
}

func badRequest(w http.ResponseWriter, r *http.Request, msg string) {
	mw.WriteError(w, r, http.StatusBadRequest, "ERR_VALIDATION", msg, false)
}

func claims(r *http.Request) mw.Claims {
	c, _ := mw.ClaimsFrom(r.Context())
	return c
}

// loadDeal fetches the deal and checks read access (participants, arbitrators, guests).
func (s *Server) loadDeal(w http.ResponseWriter, r *http.Request) (*store.Deal, bool) {
	id := r.PathValue("dealId")
	d, ok := s.Store.GetDeal(id)
	if !ok {
		mw.WriteError(w, r, http.StatusNotFound, "ERR_DEAL_NOT_FOUND", "deal "+id+" not found", false)
		return nil, false
	}
	c := claims(r)
	if c.Role == "arbitrator" || c.Role == "guest" || c.Sub == d.BuyerID || c.Sub == d.SellerID {
		return d, true
	}
	mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "not a participant of deal "+id, false)
	return nil, false
}

// partyRole returns "buyer"/"seller"/"" for the caller on a deal.
func partyRole(c mw.Claims, d *store.Deal) string {
	switch c.Sub {
	case d.BuyerID:
		return "buyer"
	case d.SellerID:
		return "seller"
	}
	return ""
}

func slugify(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			if b.Len() > 0 && !strings.HasSuffix(b.String(), "_") {
				b.WriteByte('_')
			}
		}
		if b.Len() >= 16 {
			break
		}
	}
	out := strings.Trim(b.String(), "_")
	if out == "" {
		out = "user"
	}
	return out
}

func paiseToINR(p int64) float64 { return float64(p) / 100 }

func isoTime(t time.Time) string { return t.UTC().Format(time.RFC3339) }

// async runs a best-effort side effect with its own timeout.
func async(name string, fn func(ctx context.Context)) {
	go func() {
		defer func() {
			if p := recover(); p != nil {
				slog.Error("async side effect panicked", "name", name, "panic", fmt.Sprint(p))
			}
		}()
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		fn(ctx)
	}()
}
