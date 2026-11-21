package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
	mw "github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/store"
)

const webhookWindow = 300 // seconds

// SignWebhook returns hex(HMAC_SHA256(secret, rawBody)).
func SignWebhook(secret string, body []byte) string {
	m := hmac.New(sha256.New, []byte(secret))
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

// API-17 POST /api/v1/webhooks/upi-ondc
func (s *Server) handleWebhook(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
	if err != nil {
		badRequest(w, r, "body too large or unreadable")
		return
	}
	sig := strings.TrimPrefix(strings.TrimSpace(r.Header.Get("X-Mudra-Signature")), "sha256=")
	want := SignWebhook(s.Cfg.WebhookSecret, raw)
	if sig == "" || !hmac.Equal([]byte(strings.ToLower(sig)), []byte(want)) {
		s.Store.Telemetry().RecordWebhook(false)
		mw.WriteError(w, r, http.StatusUnauthorized, "ERR_WEBHOOK_SIGNATURE", "invalid or missing X-Mudra-Signature", false)
		return
	}
	var ev struct {
		EventID       string `json:"event_id"`
		EventType     string `json:"event_type"`
		DealID        string `json:"deal_id"`
		AmountPaise   int64  `json:"amount_paise"`
		UMNOrTxnID    string `json:"umn_or_txn_id"`
		TimestampUnix int64  `json:"timestamp_unix"`
	}
	if err := json.Unmarshal(raw, &ev); err != nil {
		badRequest(w, r, "invalid JSON: "+err.Error())
		return
	}
	if ev.EventID == "" || ev.DealID == "" || ev.TimestampUnix == 0 {
		badRequest(w, r, "event_id, deal_id and timestamp_unix are required")
		return
	}
	if d := time.Now().Unix() - ev.TimestampUnix; d > webhookWindow || d < -webhookWindow {
		s.Store.Telemetry().RecordWebhook(false)
		mw.WriteError(w, r, http.StatusUnauthorized, "ERR_WEBHOOK_REPLAY_WINDOW", "timestamp_unix outside ±300s replay window", false)
		return
	}
	s.Store.Telemetry().RecordWebhook(true)
	if cached, ok := s.Store.WebhookSeen(ev.EventID); ok {
		var body map[string]any
		_ = json.Unmarshal(cached, &body)
		body["idempotent_replay"] = true
		mw.WriteJSON(w, http.StatusOK, body)
		return
	}
	d, ok := s.Store.GetDeal(ev.DealID)
	if !ok {
		mw.WriteError(w, r, http.StatusNotFound, "ERR_DEAL_NOT_FOUND", "deal "+ev.DealID+" not found", false)
		return
	}
	d.Op.Lock()
	defer d.Op.Unlock()
	// Re-check under the deal lock so two concurrent deliveries of one event can't both apply.
	if cached, ok := s.Store.WebhookSeen(ev.EventID); ok {
		var body map[string]any
		_ = json.Unmarshal(cached, &body)
		body["idempotent_replay"] = true
		mw.WriteJSON(w, http.StatusOK, body)
		return
	}
	var amount int64
	s.Store.ReadDeal(d, func(d *store.Deal) { amount = d.AmountPaise })
	st, _ := d.Machine.Snapshot()
	applied := ""
	extra := map[string]any{"webhook_event_id": ev.EventID, "webhook_event_type": ev.EventType, "umn_or_txn_masked": maskUMN(ev.UMNOrTxnID)}
	switch ev.EventType {
	case "UPI_MANDATE_LOCKED":
		if ev.AmountPaise != amount {
			mw.WriteError(w, r, http.StatusUnprocessableEntity, "ERR_AMOUNT_MISMATCH", "webhook amount_paise does not match escrow amount", false)
			return
		}
		if st == fsm.StateCreated {
			if _, err := s.transition(r.Context(), d, fsm.ActionLockEscrow, -1, "upi-webhook", extra); err != nil {
				writeFSMError(w, r, err)
				return
			}
			applied = string(fsm.ActionLockEscrow)
			s.Store.UpdateDeal(d, func(d *store.Deal) { d.UPIMandateUMN = ev.UMNOrTxnID })
		}
	case "UPI_MANDATE_SETTLED":
		if st == fsm.StateAssayVerified {
			if _, err := s.transition(r.Context(), d, fsm.ActionReleaseFunds, -1, "upi-webhook", extra); err != nil {
				writeFSMError(w, r, err)
				return
			}
			applied = string(fsm.ActionReleaseFunds)
		}
	case "ONDC_CONFIRM":
		// acknowledged only; ONDC adapter is feature-flagged off (FF_ONDC_ADAPTER)
	default:
		badRequest(w, r, "event_type must be UPI_MANDATE_LOCKED|UPI_MANDATE_SETTLED|ONDC_CONFIRM")
		return
	}
	stNow, ver := d.Machine.Snapshot()
	resp := map[string]any{
		"acknowledged": true, "deal_id": d.ID, "new_fsm_state": string(stNow), "idempotent_replay": false,
		"applied_action": applied, "version": ver,
	}
	b, _ := json.Marshal(resp)
	s.Store.RecordWebhook(ev.EventID, b)
	if applied != "" {
		s.publishDeal(d)
	}
	mw.WriteJSON(w, http.StatusOK, resp)
}
