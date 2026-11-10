package handlers

import (
	"math"
	"net/http"
	"strings"
	"time"

	mw "github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/middleware"
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
//
// Spec fields = seeded baseline + live counts measured in this process.
// `baseline_counts` and `live_counts` break them apart so nothing is passed
// off as real MAU. Latencies are real measurements only (0 when no samples).
func (s *Server) handleTraction(w http.ResponseWriter, r *http.Request) {
	snap := s.Store.Telemetry.Snapshot()
	base := s.Store.Telemetry.Baseline
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
	piiEngine, assayEngine := snap.PIIEngine, snap.AssayEngine
	if piiEngine == "" {
		piiEngine = "no-samples"
	}
	if assayEngine == "" {
		assayEngine = "no-samples"
	}
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"app_key_masked":          maskAppKey(s.Cfg.NexconnAppKey),
		"verified_connected_maus": base.VerifiedConnectedMAUs + snap.DistinctTokenUsers,
		"active_channels_by_type": total,
		"latency_p99_ms": map[string]float64{
			"go_escrow_fsm_ms":    round6(snap.FSMP99Ms),
			"rust_pii_scrub_ms":   round3(snap.PIIP99Ms),
			"rust_phash_assay_ms": round3(snap.AssayP99Ms),
		},
		"total_escrow_vouchers_signed": base.VouchersSigned + c.Vouchers,
		// honesty extras
		"baseline_counts": base,
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
			"timer":                 "QueryPerformanceCounter on Windows (~100ns ticks), monotonic clock elsewhere",
			"assay_samples":         snap.AssaySamples,
			"assay_engine":          assayEngine,
		},
		"data_provenance": "Spec fields = seeded demo baseline (baseline_counts, NOT real users) + live_counts measured by this deal-engine process since start. 'verified_connected_maus' counts distinct users issued Nexconn tokens; connection is not independently verified. live_counts.active_channels_by_type counts entities in this process, including the seeded demo deal, open lot and 2 community subchannels. Latencies are real in-process measurements (go_escrow_fsm = FSM CAS exec time).",
		"uptime_sec":      int(snap.Uptime.Seconds()),
		"generated_at":    isoTime(time.Now()),
	})
}

// GET /health
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"status": "ok", "service": "deal-engine-go", "version": Version, "port": s.Cfg.Port,
		"store":      "in-memory",
		"uptime_sec": int(time.Since(s.Store.Telemetry.StartedAt).Seconds()),
		"dependencies": map[string]any{
			"nexconn_bridge":    s.Bridge.Status(),
			"assay_verifier_rs": s.Rust.Status(),
		},
		"fallback_voucher_public_key_hex": s.Rust.GoPublicKeyHex(),
		"dev_defaults_in_use": map[string]bool{
			"jwt_secret": s.Cfg.UsingDevJWT, "webhook_secret": s.Cfg.UsingDevWebhook, "ed25519_seed": s.Cfg.UsingDevSigningKey,
			"internal_hmac_unset": s.Cfg.InternalHMAC == "",
		},
	})
}
