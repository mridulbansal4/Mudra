package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/fsm"
	mw "github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

var validRoles = map[string]bool{"buyer": true, "seller": true, "arbitrator": true, "guest": true}

// issueSession issues a Nexconn token (bridge or sim_) and a samadhan JWT for u.
func (s *Server) issueSession(ctx context.Context, u *store.User) (clients.TokenResult, string, error) {
	tok := s.Bridge.IssueToken(ctx, u.NexconnUserID, u.DisplayName, "")
	s.Store.Telemetry.RecordToken(u.NexconnUserID, tok.Mode)
	jwt, err := s.JWT.Issue(mw.Claims{Sub: u.ID, NexconnID: u.NexconnUserID, Name: u.DisplayName, Role: u.Role, Locale: u.Locale})
	return tok, jwt, err
}

// API-01 POST /api/v1/auth/session
func (s *Server) handleAuthSession(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PersonaPreset   string `json:"persona_preset"`
		DisplayName     string `json:"display_name"`
		Role            string `json:"role"`
		PreferredLocale string `json:"preferred_locale"`
		ClientPlatform  string `json:"client_platform"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	var u *store.User
	if req.PersonaPreset != "" {
		p, ok := store.PersonaByPreset(req.PersonaPreset)
		if !ok {
			badRequest(w, r, "unknown persona_preset "+req.PersonaPreset)
			return
		}
		u, _ = s.Store.GetUser(p.ID)
	} else {
		req.DisplayName = strings.TrimSpace(req.DisplayName)
		if req.DisplayName == "" || len(req.DisplayName) > 80 {
			badRequest(w, r, "display_name required (max 80 chars)")
			return
		}
		if !validRoles[req.Role] {
			badRequest(w, r, "role must be one of buyer|seller|arbitrator|guest")
			return
		}
		if req.PreferredLocale == "" {
			req.PreferredLocale = "en-IN"
		}
		loc := strings.ToLower(strings.SplitN(req.PreferredLocale, "-", 2)[0])
		u = &store.User{
			ID: "e01_" + store.NewUUID(), NexconnUserID: req.Role + "_" + slugify(req.DisplayName) + "_" + loc + "_" + store.RandHex(2),
			DisplayName: req.DisplayName, Role: req.Role, Locale: req.PreferredLocale, KYCTier: "GUEST_SANDBOX", CreatedAt: time.Now().UTC(),
		}
		s.Store.PutUser(u)
	}
	tok, jwt, err := s.issueSession(r.Context(), u)
	if err != nil {
		mw.WriteError(w, r, http.StatusInternalServerError, "ERR_INTERNAL", err.Error(), true)
		return
	}
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"user":         map[string]any{"id": u.ID, "nexconn_user_id": u.NexconnUserID, "display_name": u.DisplayName, "role": u.Role, "preferred_locale": u.Locale},
		"nexconn":      map[string]any{"app_key": tok.AppKey, "access_token": tok.AccessToken, "expires_in_sec": tok.ExpiresInSec, "mode": tok.Mode},
		"samadhan_jwt": jwt,
		"engine":       tok.Engine,
	})
}

func sessionJSON(u *store.User, tok clients.TokenResult, jwt string) map[string]any {
	return map[string]any{
		"user_id": u.ID, "nexconn_user_id": u.NexconnUserID, "display_name": u.DisplayName, "role": u.Role,
		"access_token": tok.AccessToken, "app_key": tok.AppKey, "locale": u.Locale, "samadhan_jwt": jwt, "token_mode": tok.Mode,
	}
}

// API-02 POST /api/v1/sandbox/provision — fresh CREATED Juki deal with new buyer+seller.
func (s *Server) handleSandboxProvision(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BuyerLocale  string `json:"buyer_locale"`
		SellerLocale string `json:"seller_locale"`
	}
	if !decodeOptionalJSON(w, r, &req) {
		return
	}
	if req.BuyerLocale == "" {
		req.BuyerLocale = "ta-IN"
	}
	if req.SellerLocale == "" {
		req.SellerLocale = "hi-IN"
	}
	tag := store.RandHex(2)
	now := time.Now().UTC()
	buyer := &store.User{ID: "e01_" + store.NewUUID(), NexconnUserID: "buyer_demo_" + tag + "a", DisplayName: "Rajesh (Sandbox Buyer)", Role: "buyer", Locale: req.BuyerLocale, KYCTier: "GUEST_SANDBOX", CreatedAt: now}
	seller := &store.User{ID: "e01_" + store.NewUUID(), NexconnUserID: "seller_demo_" + tag + "b", DisplayName: "Vikram (Sandbox Seller)", Role: "seller", Locale: req.SellerLocale, KYCTier: "GUEST_SANDBOX", CreatedAt: now}
	arbiter, _ := store.PersonaByPreset("P-04_MEERA")
	arbUser, _ := s.Store.GetUser(arbiter.ID)
	s.Store.PutUser(buyer)
	s.Store.PutUser(seller)

	ctx := r.Context()
	bt, bj, err1 := s.issueSession(ctx, buyer)
	st, sj, err2 := s.issueSession(ctx, seller)
	at, aj, err3 := s.issueSession(ctx, arbUser)
	if err1 != nil || err2 != nil || err3 != nil {
		mw.WriteError(w, r, http.StatusInternalServerError, "ERR_INTERNAL", "jwt issue failed", true)
		return
	}
	dealID := "d_" + tag + "_sandbox"
	channelID := "grp_samadhan_juki_" + tag
	ch := s.Bridge.CreateGroupChannel(ctx, channelID, store.SeedDealTitle, seller.NexconnUserID, []string{buyer.NexconnUserID, seller.NexconnUserID})
	d := &store.Deal{
		ID: dealID, ChannelID: channelID, Title: store.SeedDealTitle, BuyerID: buyer.ID, SellerID: seller.ID,
		Machine: fsm.NewMachine(fsm.StateCreated), AmountPaise: store.SeedAmountPaise, Currency: "INR",
		Checklist: store.DefaultChecklist(), RequiredSerial: store.SeedSerial, MinMotorRPM: store.SeedMinRPM,
		ReferencePHash: store.SeedReferencePHash, CreatedAt: now, UpdatedAt: now,
	}
	s.Store.PutDeal(d)
	st0, ver := d.Machine.Snapshot()
	mw.WriteJSON(w, http.StatusCreated, map[string]any{
		"deal_id": dealID, "nexconn_channel_id": channelID, "story_stage": fsm.StoryStage(st0),
		"buyer_session": sessionJSON(buyer, bt, bj), "seller_session": sessionJSON(seller, st, sj),
		"arbitrator_session": sessionJSON(arbUser, at, aj),
		"escrow_contract":    EscrowContractView{FSMState: string(st0), AmountPaise: d.AmountPaise, Currency: "INR", Version: ver},
		"engine":             map[string]string{"tokens": bt.Engine, "channel": ch.Engine},
	})
}
