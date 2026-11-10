package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/fsm"
	mw "github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

var (
	reSerial = regexp.MustCompile(`\b[A-Z0-9]+(?:-[A-Z0-9]+){2,}\b`)
	reMinRPM = regexp.MustCompile(`(?i)([0-9][0-9,]*)\s*RPM`)
)

// API-03 POST /api/v1/deals
func (s *Server) handleCreateDeal(w http.ResponseWriter, r *http.Request) {
	c := claims(r)
	if c.Role != "buyer" {
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "only buyers create deal rooms", false)
		return
	}
	var req struct {
		Title           string                `json:"title"`
		SellerNexconnID string                `json:"seller_nexconn_id"`
		AmountPaise     int64                 `json:"amount_paise"`
		Currency        string                `json:"currency"`
		ChecklistItems  []store.ChecklistItem `json:"checklist_items"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	switch {
	case req.Title == "" || len(req.Title) > 200:
		badRequest(w, r, "title required (max 200 chars)")
		return
	case req.SellerNexconnID == "":
		badRequest(w, r, "seller_nexconn_id required")
		return
	case req.AmountPaise < 100:
		badRequest(w, r, "amount_paise must be >= 100")
		return
	}
	if req.Currency == "" {
		req.Currency = "INR"
	}
	if req.Currency != "INR" && req.Currency != "SGD" && req.Currency != "USD" {
		badRequest(w, r, "currency must be INR|SGD|USD")
		return
	}
	seller, ok := s.Store.GetUserByNexconn(req.SellerNexconnID)
	if !ok {
		seller = &store.User{ID: "e01_" + store.NewUUID(), NexconnUserID: req.SellerNexconnID, DisplayName: req.SellerNexconnID, Role: "seller", Locale: "hi-IN", KYCTier: "GUEST_SANDBOX", CreatedAt: time.Now().UTC()}
		s.Store.PutUser(seller)
	}
	if seller.ID == c.Sub {
		badRequest(w, r, "buyer and seller must differ")
		return
	}
	checklist := []store.ChecklistItem{}
	serial, minRPM := "", 0.0
	for i, it := range req.ChecklistItems {
		if it.ID == "" {
			it.ID = "chk_" + strconv.Itoa(i+1)
		}
		it.Verified = false // verification only happens through the assay
		checklist = append(checklist, it)
		if serial == "" {
			serial = reSerial.FindString(it.Label)
		}
		if m := reMinRPM.FindStringSubmatch(it.Label); m != nil && minRPM == 0 {
			minRPM, _ = strconv.ParseFloat(strings.ReplaceAll(m[1], ",", ""), 64)
		}
	}
	tag := store.RandHex(3)
	now := time.Now().UTC()
	d := &store.Deal{
		ID: "d_" + tag, ChannelID: "grp_samadhan_" + slugify(req.Title) + "_" + tag, Title: req.Title,
		BuyerID: c.Sub, SellerID: seller.ID, Machine: fsm.NewMachine(fsm.StateCreated),
		AmountPaise: req.AmountPaise, Currency: req.Currency, Checklist: checklist,
		RequiredSerial: serial, MinMotorRPM: minRPM, CreatedAt: now, UpdatedAt: now,
	}
	ch := s.Bridge.CreateGroupChannel(r.Context(), d.ChannelID, d.Title, seller.NexconnUserID, []string{c.NexconnID, seller.NexconnUserID})
	s.Store.PutDeal(d)
	v := s.dealView(d)
	w.Header().Set("X-Samadhan-Channel-Engine", ch.Engine)
	mw.WriteJSON(w, http.StatusCreated, v)
}

// API-04 GET /api/v1/deals/{dealId}
func (s *Server) handleGetDeal(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	mw.WriteJSON(w, http.StatusOK, s.dealView(d))
}

// GET /api/v1/deals — participants see their deals; arbitrators/guests see all.
func (s *Server) handleListDeals(w http.ResponseWriter, r *http.Request) {
	c := claims(r)
	out := []DealView{}
	for _, d := range s.Store.ListDeals() {
		if c.Role == "arbitrator" || c.Role == "guest" || d.BuyerID == c.Sub || d.SellerID == c.Sub {
			out = append(out, s.dealView(d))
		}
	}
	mw.WriteJSON(w, http.StatusOK, map[string]any{"deals": out})
}

type translated struct {
	msg       store.ChatMessage
	scrubUS   int64
	scrubEng  string
	stream    clients.StreamResult
	translate clients.TranslateResult
}

func termsMap(t clients.ExtractedTerms) map[string]any {
	m := map[string]any{}
	b, _ := json.Marshal(t)
	_ = json.Unmarshal(b, &m)
	return m
}

// translateAndStore: Rust PII scrub → bridge translate → bridge group stream → store + SSE.
func (s *Server) translateAndStore(ctx context.Context, d *store.Deal, sender store.User, senderRole, text, src, dst string) translated {
	sc := s.Rust.ScrubPII(ctx, text)
	s.Store.Telemetry().RecordPII(sc.ScrubTimeUS, sc.Engine)
	tr := s.Bridge.Translate(ctx, sc.ScrubbedText, src, dst)
	redacted := max(sc.RedactedCount, tr.PIIRedactedCount)
	terms := termsMap(tr.ExtractedTerms)
	var channel string
	s.Store.ReadDeal(d, func(d *store.Deal) { channel = d.ChannelID })
	extras := map[string]any{
		"source_locale": src, "target_locale": dst, "scrubbed_source_text": sc.ScrubbedText,
		"extracted_terms": terms, "pii_redacted_count": redacted, "pii_categories": sc.Categories,
	}
	st := s.Bridge.StreamGroup(ctx, channel, sender.NexconnUserID, "x-samadhan-bilingual-bubble", tr.TranslatedText, extras)
	msg := store.ChatMessage{
		ID: "msg_" + store.RandHex(6), SenderRole: senderRole, SenderName: sender.DisplayName, SenderNexconnID: sender.NexconnUserID,
		MessageType: "x-samadhan-bilingual-bubble", SourceLocale: src, TargetLocale: dst,
		RawText: sc.ScrubbedText, TranslatedText: tr.TranslatedText, ExtractedTerms: terms, PIIRedacted: redacted,
		StreamID: st.StreamID, Engine: tr.Engine,
		Extras: map[string]any{"pii_scrub_engine": sc.Engine, "pii_scrub_time_us": sc.ScrubTimeUS, "translate_model": tr.Model, "stream_engine": st.Engine, "pii_categories": sc.Categories},
	}
	s.addMessage(d, msg)
	return translated{msg: msg, scrubUS: sc.ScrubTimeUS, scrubEng: sc.Engine, stream: st, translate: tr}
}

func (s *Server) rejectIfFrozen(w http.ResponseWriter, r *http.Request, d *store.Deal) bool {
	var frozen bool
	s.Store.ReadDeal(d, func(d *store.Deal) { frozen = d.IsFrozen })
	if frozen {
		mw.WriteError(w, r, http.StatusLocked, "ERR_CHANNEL_FROZEN", "deal channel is frozen pending dispute resolution", false)
		return true
	}
	return false
}

func defaultLocales(d *store.Deal, s *Server, role string) (string, string) {
	var bl, sl string
	s.Store.ReadDeal(d, func(d *store.Deal) {
		bl, sl = s.Store.UserCopyUnsafe(d.BuyerID).Locale, s.Store.UserCopyUnsafe(d.SellerID).Locale
	})
	if role == "seller" {
		return sl, bl
	}
	return bl, sl
}

// API-05 POST /api/v1/deals/{dealId}/translate-stream
func (s *Server) handleTranslateStream(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	c := claims(r)
	role := partyRole(c, d)
	if role == "" {
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "only the buyer or seller can send deal messages", false)
		return
	}
	var req struct {
		SenderNexconnID string `json:"sender_nexconn_id"`
		SourceLocale    string `json:"source_locale"`
		TargetLocale    string `json:"target_locale"`
		RawText         string `json:"raw_text"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.RawText) == "" || len(req.RawText) > 4000 {
		badRequest(w, r, "raw_text required (max 4000 chars)")
		return
	}
	if req.SenderNexconnID != "" && req.SenderNexconnID != c.NexconnID {
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "sender_nexconn_id does not match token", false)
		return
	}
	if s.rejectIfFrozen(w, r, d) {
		return
	}
	src, dst := defaultLocales(d, s, role)
	if req.SourceLocale != "" {
		src = req.SourceLocale
	}
	if req.TargetLocale != "" {
		dst = req.TargetLocale
	}
	sender := s.Store.UserCopy(c.Sub)
	t := s.translateAndStore(r.Context(), d, sender, role, req.RawText, src, dst)
	delivery := "POST /v4/group-channel/message/stream/send (x-samadhan-bilingual-bubble)"
	if t.stream.Engine == clients.EngineGoFallback {
		delivery += " [simulated: bridge offline]"
	}
	mw.WriteJSON(w, http.StatusAccepted, map[string]any{
		"stream_id": t.stream.StreamID, "pii_scrub_time_us": t.scrubUS, "pii_redacted_count": t.msg.PIIRedacted,
		"extracted_terms": t.msg.ExtractedTerms, "nexconn_delivery": delivery,
		"message": t.msg, "translated_text": t.msg.TranslatedText,
		"engine": map[string]string{"pii_scrub": t.scrubEng, "translate": t.translate.Engine, "stream": t.stream.Engine},
	})
}

// POST /api/v1/deals/{dealId}/messages (contract §8)
func (s *Server) handlePostMessage(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	c := claims(r)
	var req struct {
		SenderRole   string `json:"sender_role"`
		Text         string `json:"text"`
		SourceLocale string `json:"source_locale"`
		TargetLocale string `json:"target_locale"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Text) == "" || len(req.Text) > 4000 {
		badRequest(w, r, "text required (max 4000 chars)")
		return
	}
	actual := partyRole(c, d)
	if c.Role == "arbitrator" {
		actual = "arbitrator"
	}
	if actual == "" || (req.SenderRole != "" && req.SenderRole != actual) {
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "sender_role does not match the authenticated user's role in this deal", false)
		return
	}
	if actual != "arbitrator" && s.rejectIfFrozen(w, r, d) {
		return
	}
	src, dst := defaultLocales(d, s, actual)
	if req.SourceLocale != "" {
		src = req.SourceLocale
	}
	if req.TargetLocale != "" {
		dst = req.TargetLocale
	}
	t := s.translateAndStore(r.Context(), d, s.Store.UserCopy(c.Sub), actual, req.Text, src, dst)
	mw.WriteJSON(w, http.StatusCreated, t.msg)
}

// API-06 POST /api/v1/deals/{dealId}/escrow/transition
func (s *Server) handleTransition(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	var req struct {
		Action          string `json:"action"`
		ExpectedVersion *int64 `json:"expected_version"`
		UPIMandateUMN   string `json:"upi_mandate_umn"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	act := fsm.Action(req.Action)
	if !fsm.IsValidAction(act) {
		badRequest(w, r, "unknown action "+req.Action)
		return
	}
	if req.ExpectedVersion == nil || *req.ExpectedVersion < 1 {
		badRequest(w, r, "expected_version (>=1) required")
		return
	}
	switch act {
	case fsm.ActionRaiseDispute:
		badRequest(w, r, "RAISE_DISPUTE goes through POST /api/v1/deals/{dealId}/dispute/freeze (API-09)")
		return
	case fsm.ActionResolveSplit, fsm.ActionRefundBuyer:
		badRequest(w, r, string(act)+" goes through POST /api/v1/disputes/{disputeId}/resolve (API-11)")
		return
	}
	c := claims(r)
	role := partyRole(c, d)
	switch act {
	case fsm.ActionLockEscrow, fsm.ActionReleaseFunds:
		if role != "buyer" {
			mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", string(act)+" is permitted only for the deal's buyer", false)
			return
		}
	default:
		if role == "" {
			mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", string(act)+" is permitted only for the deal's buyer or seller", false)
			return
		}
	}
	d.Op.Lock()
	defer d.Op.Unlock()
	extra := map[string]any{}
	if act == fsm.ActionLockEscrow && req.UPIMandateUMN != "" {
		extra["upi_mandate_umn_masked"] = maskUMN(req.UPIMandateUMN)
	}
	if act == fsm.ActionMarkAssayVerified {
		extra["manual_override"] = true
	}
	out, err := s.transition(r.Context(), d, act, *req.ExpectedVersion, role, extra)
	if err != nil {
		writeFSMError(w, r, err)
		return
	}
	s.Store.UpdateDeal(d, func(d *store.Deal) {
		if act == fsm.ActionLockEscrow && req.UPIMandateUMN != "" {
			d.UPIMandateUMN = req.UPIMandateUMN
		}
	})
	s.publishDeal(d)
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"deal_id": d.ID, "prev_state": out.Prev, "fsm_state": out.Next, "story_stage": fsm.StoryStage(out.Next),
		"version": out.Version, "go_exec_time_us": out.ExecTimeUS(), "go_exec_time_ns": out.ExecTime.Nanoseconds(),
		"system_voucher": map[string]any{
			"voucher_type": out.Voucher.VoucherType, "curr_voucher_sha256": out.Voucher.CurrVoucherSHA256,
			"prev_voucher_sha256": out.Voucher.PrevVoucherSHA256, "ed25519_signature": out.Voucher.Ed25519Signature,
			"public_key_hex": out.Voucher.PublicKeyHex, "engine": out.Voucher.Engine,
		},
		"allowed_actions": allowedActions(out.Next),
	})
}
