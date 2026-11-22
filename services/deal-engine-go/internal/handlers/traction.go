package handlers

import (
	"math"
	"net/http"
	"runtime"
	"strings"
	"time"

	mw "github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/middleware"
)

func round3(f float64) float64 { return math.Round(f*1000) / 1000 }

// round6 keeps nanosecond precision when expressed in ms.
func round6(f float64) float64 { return math.Round(f*1e6) / 1e6 }

func maskAppKey(k string) string {
	if k == "" || strings.Contains(k, "replace") {
		return "simulated_****"
	}
	if len(k) <= 8 {
		return "****"
	}
	return k[:7] + "****" + k[len(k)-4:]
}

// API-18 GET /api/v1/traction/telemetry (public)
func (s *Server) handleTraction(w http.ResponseWriter, r *http.Request) {
	snap := s.Store.Telemetry().Snapshot()
	base := s.Store.Telemetry().Baseline
	c := s.Store.Counts()
	systemLive := 0
	if c.Vouchers > 0 {
		systemLive = 1
	}
	live := map[string]int{
		"direct": c.ArenaRuns, "group": c.Deals, "community": c.Subchannels, "open": c.OpenChannels, "system": systemLive,
	}
	total := map[string]int{}
	for k, v := range live {
		total[k] = v + base.ChannelsByType[k]
	}
	if c.Deals >= 12 {
		total["group"] = c.Deals
	}
	piiEngine, assayEngine := snap.PIIEngine, snap.AssayEngine
	if piiEngine == "" {
		piiEngine = "rust"
	}
	if assayEngine == "" {
		assayEngine = "rust"
	}
	connectedMAU := base.VerifiedConnectedMAUs + snap.DistinctTokenUsers
	if snap.DistinctTokenUsers >= 55 {
		connectedMAU = snap.DistinctTokenUsers
	}

	deals := s.Store.ListDeals()
	recentDeals := make([]map[string]any, 0, len(deals)+14)
	for _, d := range deals {
		if strings.HasSuffix(d.ID, "_sandbox") {
			continue
		}
		st, ver := d.Machine.Snapshot()
		buyer := s.Store.UserCopy(d.BuyerID)
		seller := s.Store.UserCopy(d.SellerID)
		recentDeals = append(recentDeals, map[string]any{
			"deal_id":       d.ID,
			"channel_id":    d.ChannelID,
			"title":         d.Title,
			"buyer_handle":  buyer.NexconnUserID,
			"buyer_name":    buyer.DisplayName,
			"seller_handle": seller.NexconnUserID,
			"seller_name":   seller.DisplayName,
			"amount_paise":  d.AmountPaise,
			"currency":      d.Currency,
			"fsm_state":     string(st),
			"version":       ver,
			"serial":        d.RequiredSerial,
			"created_at":    isoTime(d.CreatedAt),
		})
	}
	// Fixed seeded rows fill the table while few live deals exist; each is flagged so the UI labels it.
	if len(recentDeals) < 6 {
		for _, row := range recentPilotDeals() {
			row["seeded"] = true
			recentDeals = append(recentDeals, row)
		}
	}
	timer := "time.Now (monotonic clock)"
	if runtime.GOOS == "windows" {
		timer = "QueryPerformanceCounter (~100ns ticks)"
	}

	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"app_key_masked":               maskAppKey(s.Cfg.NexconnAppKey),
		"verified_connected_maus":      connectedMAU,
		"active_channels_by_type":      total,
		"latency_p99_ms": map[string]float64{
			"go_escrow_fsm_ms":    round6(snap.FSMP99Ms),
			"rust_pii_scrub_ms":   round3(snap.PIIP99Ms),
			"rust_phash_assay_ms": round3(snap.AssayP99Ms),
		},
		"total_escrow_vouchers_signed": base.VouchersSigned + c.Vouchers,
		"recent_deals":                 recentDeals,
		"baseline_counts":              base,
		"baseline_note":                "baseline_counts are fixed seeded numbers (store.DefaultBaseline), added to live counts; they are not measured by this process",
		"live_counts": map[string]any{
			"distinct_users_with_tokens": snap.DistinctTokenUsers,
			"tokens_issued_live":         snap.TokensLive,
			"tokens_issued_simulated":    snap.TokensSim,
			"active_channels_by_type":    live,
			"vouchers_signed":            c.Vouchers,
			"fsm_transitions":            snap.Transitions,
			"disputes":                   c.Disputes,
			"webhooks_verified":          snap.WebhooksOK,
			"webhooks_rejected":          snap.WebhooksBad,
			"sse_subscribers":            s.Bus.SubscriberCount(),
		},
		"latency_detail": map[string]any{
			"go_escrow_fsm_p50_ms":  round6(snap.FSMP50Ms),
			"go_escrow_fsm_samples": snap.FSMSamples,
			"pii_scrub_samples":     snap.PIISamples,
			"pii_scrub_engine":      piiEngine,
			"timer":                 timer,
			"assay_samples":         snap.AssaySamples,
			"assay_engine":          assayEngine,
		},
		"uptime_sec":   int(snap.Uptime.Seconds()),
		"generated_at": isoTime(time.Now()),
	})
}

func recentPilotDeals() []map[string]any {
	return []map[string]any{
		{"deal_id": "d_9481a", "channel_id": "dl_9481a", "title": "ipad air m1 64gb", "buyer_handle": "pranav04", "buyer_name": "pranav", "seller_handle": "rohan_k", "seller_name": "Rohan", "amount_paise": 2650000, "currency": "INR", "fsm_state": "RELEASED", "version": 4, "serial": "DMPH482Q19", "created_at": "2026-11-21T18:13:42Z"},
		{"deal_id": "d_3810c", "channel_id": "dl_3810c", "title": "Sem 5 CSE books + drafter", "buyer_handle": "u_743019", "buyer_name": "", "seller_handle": "aman_h4", "seller_name": "Aman", "amount_paise": 65000, "currency": "INR", "fsm_state": "RELEASED", "version": 3, "serial": "", "created_at": "2026-11-21T16:48:11Z"},
		{"deal_id": "d_7291f", "channel_id": "dl_7291f", "title": "cooler", "buyer_handle": "kartik_cse", "buyer_name": "kartik", "seller_handle": "u_981420", "seller_name": "", "amount_paise": 180000, "currency": "INR", "fsm_state": "CREATED", "version": 1, "serial": "", "created_at": "2026-11-21T15:09:27Z"},
		{"deal_id": "d_5104b", "channel_id": "dl_5104b", "title": "lg 24 inch monitor", "buyer_handle": "ishita_m", "buyer_name": "Ishita", "seller_handle": "suresh_elec", "seller_name": "Suresh Electronics", "amount_paise": 580000, "currency": "INR", "fsm_state": "FUNDED", "version": 2, "serial": "403NTGY8B219", "created_at": "2026-11-21T11:34:05Z"},
		{"deal_id": "d_6029e", "channel_id": "dl_6029e", "title": "Logitech G304 mouse", "buyer_handle": "sid_k", "buyer_name": "Siddharth", "seller_handle": "dev_sharma", "seller_name": "dev", "amount_paise": 135000, "currency": "INR", "fsm_state": "RELEASED", "version": 4, "serial": "", "created_at": "2026-11-20T19:52:19Z"},
		{"deal_id": "d_4410c", "channel_id": "dl_4410c", "title": "ThinkPad T480 i5 8th gen", "buyer_handle": "arjun_v", "buyer_name": "Arjun", "seller_handle": "chirag_lamington", "seller_name": "Chirag - Lamington Laptops", "amount_paise": 1450000, "currency": "INR", "fsm_state": "ASSAY_VERIFIED", "version": 3, "serial": "PF-1M92K4", "created_at": "2026-11-20T13:21:48Z"},
		{"deal_id": "d_1948d", "channel_id": "dl_1948d", "title": "casio fx-991cw", "buyer_handle": "riya23", "buyer_name": "riya", "seller_handle": "ananya", "seller_name": "Ananya", "amount_paise": 75000, "currency": "INR", "fsm_state": "RELEASED", "version": 3, "serial": "", "created_at": "2026-11-20T09:14:33Z"},
		{"deal_id": "d_3390e", "channel_id": "dl_3390e", "title": "ps5 dualsense controller", "buyer_handle": "varun_99", "buyer_name": "varun", "seller_handle": "kabir", "seller_name": "Kabir", "amount_paise": 310000, "currency": "INR", "fsm_state": "DISPUTED_FROZEN", "version": 3, "serial": "", "created_at": "2026-11-19T17:41:08Z"},
		{"deal_id": "d_8372a", "channel_id": "dl_8372a", "title": "Hero Sprint cycle", "buyer_handle": "u_619284", "buyer_name": "", "seller_handle": "raju_cycles", "seller_name": "Raju Cycles", "amount_paise": 290000, "currency": "INR", "fsm_state": "RELEASED", "version": 4, "serial": "", "created_at": "2026-11-19T12:06:54Z"},
		{"deal_id": "d_2041f", "channel_id": "dl_2041f", "title": "cult fit elite pass (4m left)", "buyer_handle": "tanvi_s", "buyer_name": "Tanvi", "seller_handle": "yash_m", "seller_name": "yash", "amount_paise": 320000, "currency": "INR", "fsm_state": "CREATED", "version": 1, "serial": "", "created_at": "2026-11-19T06:29:15Z"},
		{"deal_id": "d_7712b", "channel_id": "dl_7712b", "title": "kettle + induction", "buyer_handle": "sahil_h7", "buyer_name": "sahil", "seller_handle": "u_830147", "seller_name": "", "amount_paise": 90000, "currency": "INR", "fsm_state": "FUNDED", "version": 2, "serial": "", "created_at": "2026-11-18T18:55:03Z"},
		{"deal_id": "d_5591c", "channel_id": "dl_5591c", "title": "Yamaha F280 guitar", "buyer_handle": "naman", "buyer_name": "naman", "seller_handle": "vedant03", "seller_name": "Vedant", "amount_paise": 450000, "currency": "INR", "fsm_state": "RELEASED", "version": 4, "serial": "", "created_at": "2026-11-17T16:12:49Z"},
		{"deal_id": "d_6183d", "channel_id": "dl_6183d", "title": "brass lamp lot - 35pcs", "buyer_handle": "meera_sg", "buyer_name": "Meera Iyer", "seller_handle": "irfan_mbd", "seller_name": "Mohammad Irfan", "amount_paise": 1850000, "currency": "INR", "fsm_state": "RELEASED", "version": 4, "serial": "", "created_at": "2026-11-17T08:38:14Z"},
	}
}

// GET /health
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	bridge, rust := s.Bridge.Status(), s.Rust.Status()
	body := map[string]any{
		"status": "ok", "service": "deal-engine-go", "version": Version, "port": s.Cfg.Port,
		"store":      s.Store.BackendName(),
		"uptime_sec": int(time.Since(s.Store.Telemetry().StartedAt).Seconds()),
		"dependencies": map[string]any{
			"nexconn_bridge":    bridge,
			"assay_verifier_rs": rust,
		},
		"fallback_voucher_public_key_hex": s.Rust.GoPublicKeyHex(),
	}
	// Internal URLs and the dev-default self-check are only shown to requests from the host itself,
	// so the public endpoint doesn't advertise configuration weaknesses.
	if isLocalRequest(r) {
		body["dev_defaults_in_use"] = map[string]bool{
			"jwt_secret": s.Cfg.UsingDevJWT, "webhook_secret": s.Cfg.UsingDevWebhook, "ed25519_seed": s.Cfg.UsingDevSigningKey,
			"internal_hmac_unset": s.Cfg.InternalHMAC == "",
		}
	} else {
		bridge.URL, rust.URL = "", ""
		body["dependencies"] = map[string]any{"nexconn_bridge": bridge, "assay_verifier_rs": rust}
	}
	mw.WriteJSON(w, http.StatusOK, body)
}

// isLocalRequest reports whether the request came straight from this machine (no reverse proxy hop).
func isLocalRequest(r *http.Request) bool {
	if r.Header.Get("X-Forwarded-For") != "" || r.Header.Get("X-Real-IP") != "" {
		return false
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		host = host[:i]
	}
	host = strings.Trim(host, "[]")
	return host == "127.0.0.1" || host == "::1" || host == "localhost"
}
