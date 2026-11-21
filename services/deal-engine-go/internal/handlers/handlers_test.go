package handlers

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/config"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/store"
)

func testServer(t *testing.T) (*Server, http.Handler) {
	t.Helper()
	seed := make([]byte, 32)
	seed[0] = 1
	cfg := config.Config{Port: 4002, JWTSecret: "test", WebhookSecret: "whsec_test", Ed25519Seed: seed,
		CORSOrigins: []string{"http://localhost:5173"}} // empty bridge/rust URLs => pure fallback mode
	s := New(cfg)
	return s, s.Routes()
}

type resp struct {
	Code   int
	Header http.Header
	Body   map[string]any
	Raw    string
}

func call(t *testing.T, h http.Handler, method, path, token string, body any, hdr ...string) resp {
	t.Helper()
	var rdr *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	} else {
		rdr = bytes.NewReader(nil)
	}
	r := httptest.NewRequest(method, path, rdr)
	r.Header.Set("Content-Type", "application/json")
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(hdr); i += 2 {
		r.Header.Set(hdr[i], hdr[i+1])
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	out := resp{Code: w.Code, Header: w.Header(), Raw: w.Body.String()}
	_ = json.Unmarshal(w.Body.Bytes(), &out.Body)
	return out
}

func num(v any) float64 { f, _ := v.(float64); return f }

func m(v any) map[string]any { x, _ := v.(map[string]any); return x }

func frameB64(t *testing.T) string {
	img := image.NewRGBA(image.Rect(0, 0, 128, 96))
	for y := 0; y < 96; y++ {
		for x := 0; x < 128; x++ {
			v := uint8((x*3 + y*2) % 256)
			img.Set(x, y, color.RGBA{v, 255 - v, v / 2, 255})
		}
	}
	var buf bytes.Buffer
	_ = jpeg.Encode(&buf, img, nil)
	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

func audioB64(freq float64) string {
	sr, n := 48000, 96000
	buf := make([]byte, n*4)
	for i := 0; i < n; i++ {
		binary.LittleEndian.PutUint32(buf[i*4:], math.Float32bits(float32(0.5*math.Sin(2*math.Pi*freq*float64(i)/float64(sr)))))
	}
	return base64.StdEncoding.EncodeToString(buf)
}

func TestSeededDealIsFunded(t *testing.T) {
	_, h := testServer(t)
	auth := call(t, h, "POST", "/api/v1/auth/session", "", map[string]any{"persona_preset": "P-01_RAJESH", "display_name": "x", "role": "buyer", "preferred_locale": "ta-IN"})
	if auth.Code != 200 {
		t.Fatalf("auth %d %s", auth.Code, auth.Raw)
	}
	tok := auth.Body["mudra_jwt"].(string)
	if !strings.HasPrefix(m(auth.Body["nexconn"])["access_token"].(string), "sim_") {
		t.Fatal("expected simulated token")
	}
	d := call(t, h, "GET", "/api/v1/deals/"+store.SeedDealID, tok, nil)
	ec := m(d.Body["escrow_contract"])
	if d.Code != 200 || ec["fsm_state"] != "FUNDED" || num(ec["amount_paise"]) != 14500000 || num(d.Body["story_stage"]) != 2 {
		t.Fatalf("seed deal: %d %s", d.Code, d.Raw)
	}
	if d.Body["buyer_name"] != "Rajesh Natarajan" || d.Body["seller_locale"] != "hi-IN" || len(d.Body["system_vouchers"].([]any)) != 1 {
		t.Fatalf("view extras missing: %s", d.Raw)
	}
	list := call(t, h, "GET", "/api/v1/deals", tok, nil)
	if len(list.Body["deals"].([]any)) != 1 {
		t.Fatalf("rajesh should see 1 deal: %s", list.Raw)
	}
	if call(t, h, "GET", "/api/v1/deals/"+store.SeedDealID, "", nil).Code != 401 {
		t.Fatal("unauthenticated read allowed")
	}
}

func TestFullEscrowDisputeFlowFallbackMode(t *testing.T) {
	s, h := testServer(t)
	prov := call(t, h, "POST", "/api/v1/sandbox/provision", "", nil)
	if prov.Code != 201 {
		t.Fatalf("provision %d %s", prov.Code, prov.Raw)
	}
	dealID := prov.Body["deal_id"].(string)
	buyer := m(prov.Body["buyer_session"])["mudra_jwt"].(string)
	seller := m(prov.Body["seller_session"])["mudra_jwt"].(string)
	arb := m(prov.Body["arbitrator_session"])["mudra_jwt"].(string)
	base := "/api/v1/deals/" + dealID

	// RBAC: seller cannot LOCK_ESCROW
	if r := call(t, h, "POST", base+"/escrow/transition", seller, map[string]any{"action": "LOCK_ESCROW", "expected_version": 1}); r.Code != 403 {
		t.Fatalf("seller lock: %d", r.Code)
	}
	// invalid transition -> 422
	if r := call(t, h, "POST", base+"/escrow/transition", buyer, map[string]any{"action": "RELEASE_FUNDS", "expected_version": 1}); r.Code != 422 || m(r.Body["error"])["code"] != "ERR_INVALID_FSM_TRANSITION" {
		t.Fatalf("invalid: %d %s", r.Code, r.Raw)
	}
	lock := call(t, h, "POST", base+"/escrow/transition", buyer, map[string]any{"action": "LOCK_ESCROW", "expected_version": 1, "upi_mandate_umn": "mudra.8821@okaxis"}, "X-Idempotency-Key", "lock-1")
	if lock.Code != 200 || lock.Body["fsm_state"] != "FUNDED" || num(lock.Body["version"]) != 2 || num(lock.Body["story_stage"]) != 2 {
		t.Fatalf("lock: %d %s", lock.Code, lock.Raw)
	}
	sv := m(lock.Body["system_voucher"])
	if sv["voucher_type"] != "ESCROW_LOCKED" || len(sv["curr_voucher_sha256"].(string)) != 64 || sv["engine"] != clients.EngineGoFallback {
		t.Fatalf("voucher: %v", sv)
	}
	// idempotent replay returns identical body, no double transition
	replay := call(t, h, "POST", base+"/escrow/transition", buyer, map[string]any{"action": "LOCK_ESCROW", "expected_version": 1}, "X-Idempotency-Key", "lock-1")
	if replay.Code != 200 || replay.Raw != lock.Raw || replay.Header.Get("Idempotent-Replay") != "true" {
		t.Fatalf("replay: %d %s", replay.Code, replay.Raw)
	}
	// stale version -> 409
	if r := call(t, h, "POST", base+"/escrow/transition", buyer, map[string]any{"action": "START_ASSAY", "expected_version": 1}); r.Code != 409 || m(r.Body["error"])["code"] != "ERR_FSM_CONFLICT" {
		t.Fatalf("stale: %d %s", r.Code, r.Raw)
	}
	// chat (bridge offline => go passthrough + PII scrub)
	msg := call(t, h, "POST", base+"/messages", buyer, map[string]any{"sender_role": "buyer", "text": "Call 9876543210, ₹1,40,000 final, 4800 RPM"})
	if msg.Code != 201 || strings.Contains(msg.Body["raw_text"].(string), "9876543210") || num(m(msg.Body["extracted_terms"])["offered_amount_paise"]) != 14000000 {
		t.Fatalf("message: %d %s", msg.Code, msg.Raw)
	}
	if r := call(t, h, "POST", base+"/messages", buyer, map[string]any{"sender_role": "seller", "text": "spoof"}); r.Code != 403 {
		t.Fatalf("spoofed sender_role: %d", r.Code)
	}
	ts := call(t, h, "POST", base+"/translate-stream", seller, map[string]any{"source_locale": "hi-IN", "target_locale": "ta-IN", "raw_text": "₹1,45,000 पक्का, 6 महीने warranty"})
	if ts.Code != 202 || !strings.HasPrefix(ts.Body["stream_id"].(string), "sim_") || num(m(ts.Body["extracted_terms"])["warranty_months"]) != 6 {
		t.Fatalf("translate-stream: %d %s", ts.Code, ts.Raw)
	}

	// API-07 auto START_ASSAY
	start := call(t, h, "POST", base+"/assay/start", seller, map[string]any{"stage_tag": "PRE_SHIPMENT", "simulated_hd_camera": true})
	if start.Code != 200 || start.Body["fsm_state"] != "INSPECTION_LIVE" || start.Body["auto_started_assay"] != true {
		t.Fatalf("assay start: %d %s", start.Code, start.Raw)
	}
	nonce := start.Body["challenge_nonce"].(string)
	// wrong nonce fails, state unchanged
	bad := call(t, h, "POST", base+"/assay/verify-frame", seller, map[string]any{"challenge_nonce": "nope", "frame_jpeg_base64": frameB64(t), "wasm_blur_laplacian": 148.4})
	if bad.Code != 200 || bad.Body["assay_passed"] != false || bad.Body["fsm_state"] != "INSPECTION_LIVE" {
		t.Fatalf("bad nonce: %d %s", bad.Code, bad.Raw)
	}
	ok := call(t, h, "POST", base+"/assay/verify-frame", seller, map[string]any{
		"nexconn_call_id": "call_nc_90123", "stage_tag": "PRE_SHIPMENT", "challenge_nonce": nonce, "wasm_blur_laplacian": 148.4,
		"frame_jpeg_base64": frameB64(t), "audio_pcm_f32_base64": audioB64(80.34),
	})
	if ok.Code != 200 || ok.Body["assay_passed"] != true || ok.Body["fsm_state"] != "ASSAY_VERIFIED" || ok.Body["ed25519_sig_hex"] == "" {
		t.Fatalf("assay verify: %d %s", ok.Code, ok.Raw)
	}
	if rpm := num(ok.Body["audio_fft_rpm_peak"]); math.Abs(rpm-4820) > 20 {
		t.Fatalf("rpm %.1f", rpm)
	}

	// API-09 dispute
	disp := call(t, h, "POST", base+"/dispute/freeze", buyer, map[string]any{"reason_code": "TRANSIT_DAMAGE", "description": "hairline crack", "post_delivery_phash_hex": ok.Body["frame_phash_hex"]})
	if disp.Code != 200 || disp.Body["channel_frozen"] != true || num(disp.Body["hamming_distance_phash"]) != 0 || disp.Body["fsm_state"] != "DISPUTED_FROZEN" {
		t.Fatalf("dispute: %d %s", disp.Code, disp.Raw)
	}
	split := m(disp.Body["recommended_split"])
	if num(split["buyer_refund_bps"])+num(split["seller_payout_bps"]) != 10000 {
		t.Fatalf("split %v", split)
	}
	disputeID := disp.Body["dispute_id"].(string)
	if r := call(t, h, "POST", base+"/messages", seller, map[string]any{"text": "hello?"}); r.Code != 423 {
		t.Fatalf("frozen chat allowed: %d", r.Code)
	}
	view := call(t, h, "GET", base, buyer, nil)
	if view.Body["dispute"] == nil || num(view.Body["freeze_remaining_sec"]) < 85 || num(m(view.Body["dispute"])["freeze_remaining_sec"]) < 85 {
		t.Fatalf("dispute view: %s", view.Raw)
	}
	q := call(t, h, "GET", "/api/v1/dispatch/queue", arb, nil)
	if len(q.Body["disputes"].([]any)) != 1 {
		t.Fatalf("queue %s", q.Raw)
	}
	// API-10 RBAC + assign
	if r := call(t, h, "POST", "/api/v1/dispatch/assign", buyer, map[string]any{"dispute_id": disputeID, "arbitrator_nexconn_id": "x"}); r.Code != 403 {
		t.Fatalf("buyer assign: %d", r.Code)
	}
	as := call(t, h, "POST", "/api/v1/dispatch/assign", arb, map[string]any{"dispute_id": disputeID, "arbitrator_nexconn_id": "arbitrator_meera_sg_8821"})
	if as.Code != 200 || num(as.Body["freeze_remaining_sec"]) <= 0 {
		t.Fatalf("assign %d %s", as.Code, as.Raw)
	}
	// API-11: bad sum, stale, ok
	if r := call(t, h, "POST", "/api/v1/disputes/"+disputeID+"/resolve", arb, map[string]any{"buyer_refund_bps": 1200, "seller_payout_bps": 8000, "expected_version": 5, "resolution_note": "x"}); r.Code != 400 {
		t.Fatalf("bad sum %d", r.Code)
	}
	if r := call(t, h, "POST", "/api/v1/disputes/"+disputeID+"/resolve", arb, map[string]any{"buyer_refund_bps": 1200, "seller_payout_bps": 8800, "expected_version": 4, "resolution_note": "x"}); r.Code != 409 {
		t.Fatalf("stale resolve %d %s", r.Code, r.Raw)
	}
	res := call(t, h, "POST", "/api/v1/disputes/"+disputeID+"/resolve", arb, map[string]any{"buyer_refund_bps": 1200, "seller_payout_bps": 8800, "expected_version": 5, "resolution_note": "Approved 12/88"})
	if res.Code != 200 || res.Body["fsm_state"] != "ARBITRATED_SPLIT" || num(res.Body["buyer_refund_paise"]) != 1740000 || num(res.Body["seller_payout_paise"]) != 12760000 || res.Body["channel_unfrozen"] != true {
		t.Fatalf("resolve %d %s", res.Code, res.Raw)
	}

	// verify the full voucher hash chain and every signature
	final := call(t, h, "GET", base, buyer, nil)
	vs := final.Body["system_vouchers"].([]any)
	wantTypes := []string{"ESCROW_LOCKED", "ASSAY_STARTED", "ASSAY_VERIFIED", "DISPUTE_FROZEN", "ARBITRATED_SPLIT"}
	if len(vs) != len(wantTypes) {
		t.Fatalf("vouchers %d", len(vs))
	}
	prev := clients.GenesisHash
	for i, x := range vs {
		v := m(x)
		if v["voucher_type"] != wantTypes[i] || v["prev_voucher_sha256"] != prev {
			t.Fatalf("voucher %d chain broken: %v", i, v)
		}
		recomputed, _ := clients.ChainHash(prev, dealID, v["voucher_type"].(string), v["payload"])
		if recomputed != v["curr_voucher_sha256"] {
			t.Fatalf("voucher %d hash mismatch", i)
		}
		if !clients.VerifyVoucher(v["public_key_hex"].(string), v["curr_voucher_sha256"].(string), v["ed25519_signature"].(string)) {
			t.Fatalf("voucher %d signature invalid", i)
		}
		prev = v["curr_voucher_sha256"].(string)
	}
	// timeline cards present
	types := map[string]int{}
	for _, x := range final.Body["messages"].([]any) {
		types[m(x)["message_type"].(string)]++
	}
	if types["x-mudra-escrow-card"] != 5 || types["x-mudra-assay-receipt"] != 2 || types["x-mudra-tribunal-verdict"] != 2 || types["x-mudra-bilingual-bubble"] != 2 {
		t.Fatalf("timeline types %v", types)
	}
	if len(final.Body["allowed_actions"].([]any)) != 0 {
		t.Fatal("terminal state should have no allowed actions")
	}
	_ = s
}

func TestRefundBuyerWhenFullRefund(t *testing.T) {
	_, h := testServer(t)
	rajesh := call(t, h, "POST", "/api/v1/auth/session", "", map[string]any{"persona_preset": "P-01_RAJESH"}).Body["mudra_jwt"].(string)
	meera := call(t, h, "POST", "/api/v1/auth/session", "", map[string]any{"persona_preset": "P-04_MEERA"}).Body["mudra_jwt"].(string)
	d := call(t, h, "POST", "/api/v1/deals/"+store.SeedDealID+"/dispute/freeze", rajesh, map[string]any{"reason_code": "SERIAL_MISMATCH", "description": "wrong machine", "post_delivery_phash_hex": "5b0e637c1d4f88e2"})
	if d.Code != 200 || num(d.Body["hamming_distance_phash"]) != 64 || num(m(d.Body["recommended_split"])["buyer_refund_bps"]) != 10000 {
		t.Fatalf("dispute %d %s", d.Code, d.Raw)
	}
	r := call(t, h, "POST", "/api/v1/disputes/"+d.Body["dispute_id"].(string)+"/resolve", meera, map[string]any{"buyer_refund_bps": 10000, "seller_payout_bps": 0, "expected_version": num(d.Body["version"]), "resolution_note": "full refund"})
	if r.Code != 200 || r.Body["fsm_state"] != "REFUNDED" {
		t.Fatalf("resolve %d %s", r.Code, r.Raw)
	}
}

func TestArena(t *testing.T) {
	s, h := testServer(t)
	st := call(t, h, "POST", "/api/v1/arena/start", "", map[string]any{"challenger_name": "Aarav Mehta", "preferred_locale": "en-IN", "item_sku": "THINKPAD_X1_GEN10"})
	if st.Code != 201 || num(st.Body["sticker_price_paise"]) != 5200000 || num(st.Body["duration_sec"]) != 60 {
		t.Fatalf("start %d %s", st.Code, st.Raw)
	}
	runID := st.Body["run_id"].(string)
	low := call(t, h, "POST", "/api/v1/arena/"+runID+"/bid", "", map[string]any{"offered_amount_paise": 3000000, "message_text": "30k?", "locale": "en-IN"})
	if low.Code != 202 || low.Body["deal_closed"] != false || num(low.Body["counter_offer_paise"]) < 0.84*5200000 || low.Body["reply_text"] == "" {
		t.Fatalf("low bid %d %s", low.Code, low.Raw)
	}
	c1 := num(low.Body["counter_offer_paise"])
	low2 := call(t, h, "POST", "/api/v1/arena/"+runID+"/bid", "", map[string]any{"offered_amount_paise": 3500000, "message_text": "35k", "locale": "hi-IN"})
	if num(low2.Body["counter_offer_paise"]) > c1 {
		t.Fatal("counter-offer increased")
	}
	win := call(t, h, "POST", "/api/v1/arena/"+runID+"/bid", "", map[string]any{"offered_amount_paise": 4800000, "message_text": "48k now", "locale": "en-IN"})
	if win.Code != 202 || win.Body["deal_closed"] != true || num(win.Body["counter_offer_paise"]) < 4800000 || num(win.Body["savings_bps"]) <= 0 {
		t.Fatalf("win %d %s", win.Code, win.Raw)
	}
	if r := call(t, h, "POST", "/api/v1/arena/"+runID+"/bid", "", map[string]any{"offered_amount_paise": 1, "message_text": "", "locale": "en-IN"}); r.Code != 409 {
		t.Fatalf("closed run bid %d", r.Code)
	}
	g := call(t, h, "GET", "/api/v1/arena/"+runID, "", nil)
	if g.Body["status"] != "WON" || len(g.Body["turns"].([]any)) != 3 {
		t.Fatalf("get %s", g.Raw)
	}
	// expiry
	run, _ := s.Store.GetArena(runID)
	run.Lock()
	run.Won = false
	run.EndsAt = time.Now().Add(-time.Second)
	run.Unlock()
	if r := call(t, h, "POST", "/api/v1/arena/"+runID+"/bid", "", map[string]any{"offered_amount_paise": 5000000, "message_text": "", "locale": "en-IN"}); r.Code != 410 {
		t.Fatalf("expired run bid %d", r.Code)
	}
}

func TestDecideBidCurve(t *testing.T) {
	const sticker = 5200000
	// at t=0 floor=92% (4,784,000): 4,700,000 is a counter, 4,790,000 closes
	if d := DecideBid(sticker, 4700000, sticker, 0, 0); d.Accepted {
		t.Fatal("below floor accepted at t=0")
	}
	if d := DecideBid(sticker, 4790000, sticker, 0, 0); !d.Accepted || d.CounterPaise != 4800000 {
		t.Fatalf("t=0 close %+v", d)
	}
	// at t=60 floor=84% (4,368,000): spec example 4,450,000 closes at 4,450,000
	if d := DecideBid(sticker, 4450000, sticker, 0, 60*time.Second); !d.Accepted || d.CounterPaise != 4450000 || d.SavingsBps != 1442 {
		t.Fatalf("t=60 %+v", d)
	}
	// offers above sticker never pay more than sticker
	if d := DecideBid(sticker, 9000000, sticker, 0, 0); d.CounterPaise != sticker {
		t.Fatalf("overpay %+v", d)
	}
}

func TestWebhook(t *testing.T) {
	s, h := testServer(t)
	prov := call(t, h, "POST", "/api/v1/sandbox/provision", "", nil)
	dealID := prov.Body["deal_id"].(string)
	post := func(body map[string]any, sig string) resp {
		raw, _ := json.Marshal(body)
		if sig == "" {
			sig = SignWebhook(s.Cfg.WebhookSecret, raw)
		}
		r := httptest.NewRequest("POST", "/api/v1/webhooks/upi-ondc", bytes.NewReader(raw))
		r.Header.Set("X-Mudra-Signature", sig)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		out := resp{Code: w.Code, Raw: w.Body.String()}
		_ = json.Unmarshal(w.Body.Bytes(), &out.Body)
		return out
	}
	ev := map[string]any{"event_id": "evt_1", "event_type": "UPI_MANDATE_LOCKED", "deal_id": dealID, "amount_paise": 14500000, "umn_or_txn_id": "mudra.8821@okaxis", "timestamp_unix": time.Now().Unix()}
	if r := post(ev, strings.Repeat("0", 64)); r.Code != 401 {
		t.Fatalf("bad sig accepted %d", r.Code)
	}
	r := post(ev, "")
	if r.Code != 200 || r.Body["new_fsm_state"] != "FUNDED" || r.Body["idempotent_replay"] != false {
		t.Fatalf("valid %d %s", r.Code, r.Raw)
	}
	r = post(ev, "")
	if r.Code != 200 || r.Body["idempotent_replay"] != true {
		t.Fatalf("replay %d %s", r.Code, r.Raw)
	}
	old := map[string]any{"event_id": "evt_2", "event_type": "UPI_MANDATE_LOCKED", "deal_id": dealID, "amount_paise": 14500000, "timestamp_unix": time.Now().Unix() - 400}
	if r := post(old, ""); r.Code != 401 {
		t.Fatalf("stale timestamp accepted %d", r.Code)
	}
	d, _ := s.Store.GetDeal(dealID)
	if _, v := d.Machine.Snapshot(); v != 2 {
		t.Fatalf("version %d, webhook replay double-applied?", v)
	}
}

func TestTractionAndHealth(t *testing.T) {
	_, h := testServer(t)
	call(t, h, "POST", "/api/v1/sandbox/provision", "", nil)
	tr := call(t, h, "GET", "/api/v1/traction/telemetry", "", nil)
	if tr.Code != 200 || tr.Body["live_counts"] == nil || tr.Body["baseline_counts"] == nil {
		t.Fatalf("traction %s", tr.Raw)
	}
	if num(m(tr.Body["latency_detail"])["go_escrow_fsm_samples"]) < 1 {
		t.Fatalf("fsm p99 should be measured from seed transition: %s", tr.Raw)
	}
	live := m(tr.Body["live_counts"])
	if num(live["tokens_issued_simulated"]) != 3 || num(m(live["active_channels_by_type"])["group"]) != 2 {
		t.Fatalf("live counts %v", live)
	}
	hl := call(t, h, "GET", "/health", "", nil)
	if hl.Code != 200 || hl.Body["status"] != "ok" || hl.Body["store"] != store.BackendInMemory {
		t.Fatalf("health %s", hl.Raw)
	}
	apiHealth := call(t, h, "GET", "/api/v1/health", "", nil)
	if apiHealth.Code != 200 || apiHealth.Body["store"] != "in-memory" || apiHealth.Body["service"] != "deal-engine-go" {
		t.Fatalf("api health %s", apiHealth.Raw)
	}
	if r := call(t, h, "GET", "/api/v1/nope", "", nil); r.Code != 404 || m(r.Body["error"])["trace_id"] == "" {
		t.Fatalf("404 envelope %s", r.Raw)
	}
}

func TestSSEInitialDealAndMessageEvents(t *testing.T) {
	_, h := testServer(t)
	ts := httptest.NewServer(h)
	defer ts.Close()
	tok := call(t, h, "POST", "/api/v1/auth/session", "", map[string]any{"persona_preset": "P-02_VIKRAM"}).Body["mudra_jwt"].(string)
	req, _ := http.NewRequest("GET", ts.URL+"/api/v1/deals/"+store.SeedDealID+"/events?access_token="+tok, nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 || !strings.HasPrefix(res.Header.Get("Content-Type"), "text/event-stream") {
		t.Fatalf("sse status %d %s", res.StatusCode, res.Header.Get("Content-Type"))
	}
	events := make(chan string, 10)
	go func() {
		sc := bufio.NewScanner(res.Body)
		sc.Buffer(make([]byte, 1<<20), 1<<20)
		for sc.Scan() {
			if line := sc.Text(); strings.HasPrefix(line, "event: ") {
				events <- strings.TrimPrefix(line, "event: ")
			}
		}
	}()
	expect := func(name string) {
		select {
		case e := <-events:
			if e != name {
				t.Fatalf("got event %q want %q", e, name)
			}
		case <-time.After(3 * time.Second):
			t.Fatalf("timeout waiting for %s", name)
		}
	}
	expect("deal")
	r := call(t, h, "POST", "/api/v1/deals/"+store.SeedDealID+"/messages", tok, map[string]any{"sender_role": "seller", "text": "नमस्ते"})
	if r.Code != 201 {
		t.Fatalf("msg %d %s", r.Code, r.Raw)
	}
	expect("message")
	call(t, h, "POST", "/api/v1/deals/"+store.SeedDealID+"/assay/start", tok, map[string]any{"stage_tag": "PRE_SHIPMENT"})
	expect("message") // escrow card
	expect("deal")
	_ = fmt.Sprint()
}
