package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
	mw "github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/store"
)

const freezeWindow = 90 * time.Second

var validReasons = map[string]bool{"TRANSIT_DAMAGE": true, "SERIAL_MISMATCH": true, "SLA_BREACH": true}

// API-09 POST /api/v1/deals/{dealId}/dispute/freeze
func (s *Server) handleDisputeFreeze(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	role := partyRole(claims(r), d)
	if role == "" {
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "RAISE_DISPUTE is permitted only for the deal's buyer or seller", false)
		return
	}
	var req struct {
		ReasonCode           string `json:"reason_code"`
		Description          string `json:"description"`
		PostDeliveryPHashHex string `json:"post_delivery_phash_hex"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if !validReasons[req.ReasonCode] {
		badRequest(w, r, "reason_code must be TRANSIT_DAMAGE|SERIAL_MISMATCH|SLA_BREACH")
		return
	}
	if len(req.Description) > 2000 {
		badRequest(w, r, "description max 2000 chars")
		return
	}
	if req.PostDeliveryPHashHex != "" {
		if _, err := clients.ParsePHash(req.PostDeliveryPHashHex); err != nil {
			badRequest(w, r, "post_delivery_phash_hex must be 1-16 hex chars")
			return
		}
	}
	ctx := r.Context()
	d.Op.Lock()
	defer d.Op.Unlock()
	st, _ := d.Machine.Snapshot()
	if !fsm.CanApply(st, fsm.ActionRaiseDispute) {
		invalidTransition(w, r, st, fsm.ActionRaiseDispute)
		return
	}

	var pre, post, channel, title string
	var amount int64
	var rpm *float64
	s.Store.ReadDeal(d, func(d *store.Deal) {
		channel, title, amount = d.ChannelID, d.Title, d.AmountPaise
		pre = d.ReferencePHash
		for i := len(d.AssayLogs) - 1; i >= 0; i-- {
			l := d.AssayLogs[i]
			if pre == d.ReferencePHash && l.StageTag == "PRE_SHIPMENT" && l.AssayPassed && l.FramePHashHex != "" {
				pre = l.FramePHashHex
			}
			if post == "" && l.StageTag == "POST_DELIVERY" && l.FramePHashHex != "" {
				post = l.FramePHashHex
			}
			if rpm == nil && l.AudioFFTRPMPeak != nil {
				v := *l.AudioFFTRPMPeak
				rpm = &v
			}
		}
	})
	postSource := "assay-log"
	if req.PostDeliveryPHashHex != "" {
		post, postSource = strings.ToLower(req.PostDeliveryPHashHex), "request"
	}
	if pre == "" {
		pre = store.SeedReferencePHash
	}

	// 1. Freeze the Nexconn group channel.
	fr := s.Bridge.Freeze(ctx, channel, true)
	// 2. pHash Hamming distance.
	hamming, hamEngine := 0, "none"
	if post != "" {
		if h, eng, err := s.Rust.PHashDiff(ctx, pre, post); err == nil {
			hamming, hamEngine = h, eng
		}
	} else {
		postSource = "none (distance 0 assumed)"
	}
	// 3. Tribunal recommendation (bridge AI or deterministic Go).
	trib := s.Bridge.Tribunal(ctx, clients.TribunalInput{DealTitle: title, AmountPaise: amount, ReasonCode: req.ReasonCode, Description: req.Description, HammingDistance: hamming, RPMPeak: rpm})
	// 4. FSM transition + voucher.
	disputeID := "disp_" + store.RandHex(3)
	out, err := s.transition(ctx, d, fsm.ActionRaiseDispute, -1, role, map[string]any{
		"dispute_id": disputeID, "reason_code": req.ReasonCode, "hamming_distance_phash": hamming,
		"recommended_buyer_refund_bps": trib.BuyerRefundBps,
	})
	if err != nil {
		// roll back the channel freeze so chat isn't stuck
		s.Bridge.Freeze(ctx, channel, false)
		writeFSMError(w, r, err)
		return
	}
	now := time.Now().UTC()
	dp := &store.Dispute{
		ID: disputeID, DealID: d.ID, ReasonCode: req.ReasonCode, Description: req.Description,
		PrePHash: pre, PostPHash: post, HammingDistance: hamming,
		BuyerRefundBps: trib.BuyerRefundBps, SellerPayoutBps: trib.SellerPayoutBps, Summary: trib.Summary, Rationale: trib.Rationale,
		TribunalModel: trib.Model, TribunalEngine: trib.Engine, Status: "FROZEN_OPEN",
		FrozenAt: now, FreezeExpiresAt: now.Add(freezeWindow),
	}
	s.Store.PutDispute(dp)
	s.Store.UpdateDeal(d, func(d *store.Deal) { d.DisputeID, d.IsFrozen = disputeID, fr.Frozen })

	refund := amount * int64(trib.BuyerRefundBps) / 10000
	split := RecommendedSplit{BuyerRefundBps: trib.BuyerRefundBps, SellerPayoutBps: trib.SellerPayoutBps,
		BuyerRefundINR: paiseToINR(refund), SellerPayoutINR: paiseToINR(amount - refund),
		Summary: trib.Summary, Rationale: trib.Rationale, Model: trib.Model, Engine: trib.Engine}
	verdictExtras := map[string]any{
		"dispute_id": disputeID, "status": "PROPOSED", "reason_code": req.ReasonCode, "hamming_distance_phash": hamming,
		"buyer_refund_bps": split.BuyerRefundBps, "seller_payout_bps": split.SellerPayoutBps,
		"buyer_refund_inr": split.BuyerRefundINR, "seller_payout_inr": split.SellerPayoutINR,
		"summary": trib.Summary, "rationale": trib.Rationale, "model": trib.Model, "engine": trib.Engine,
		"freeze_remaining_sec": int(freezeWindow.Seconds()),
	}
	stream := s.Bridge.StreamGroup(ctx, channel, "usr_mudra_arbitrator_bot", "x-mudra-tribunal-verdict", trib.Summary, verdictExtras)
	streamStatus := "STREAMING_VIA_SEND_GROUP_CHANNEL_STREAM_MESSAGE"
	if stream.Engine == clients.EngineGoFallback {
		streamStatus = "SIMULATED_BRIDGE_OFFLINE"
	}
	s.addMessage(d, store.ChatMessage{SenderRole: "system", SenderName: "AI Tribunal", MessageType: "x-mudra-tribunal-verdict",
		RawText: trib.Summary, TranslatedText: trib.Summary, Extras: verdictExtras, StreamID: stream.StreamID, Engine: trib.Engine})
	s.publishDeal(d)

	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"dispute_id": disputeID, "channel_frozen": fr.Frozen, "nexconn_api_called": fr.NexconnAPICalled,
		"freeze_latency_ms": fr.LatencyMs, "hamming_distance_phash": hamming, "ai_tribunal_stream_status": streamStatus,
		"recommended_split": split,
		// extras
		"deal_id": d.ID, "fsm_state": out.Next, "version": out.Version, "story_stage": fsm.StoryStage(out.Next),
		"freeze_remaining_sec": int(freezeWindow.Seconds()), "pre_shipment_phash_hex": pre, "post_delivery_phash_hex": post,
		"post_phash_source": postSource,
		"system_voucher":    map[string]any{"voucher_type": out.Voucher.VoucherType, "curr_voucher_sha256": out.Voucher.CurrVoucherSHA256, "ed25519_signature": out.Voucher.Ed25519Signature, "engine": out.Voucher.Engine},
		"engine":            map[string]string{"freeze": fr.Engine, "phash_diff": hamEngine, "tribunal": trib.Engine, "stream": stream.Engine},
	})
}

// API-10 POST /api/v1/dispatch/assign (arbitrator)
func (s *Server) handleDispatchAssign(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DisputeID           string `json:"dispute_id"`
		ArbitratorNexconnID string `json:"arbitrator_nexconn_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	c := claims(r)
	if req.ArbitratorNexconnID == "" {
		req.ArbitratorNexconnID = c.NexconnID
	}
	dp, ok := s.Store.GetDispute(req.DisputeID)
	if !ok {
		mw.WriteError(w, r, http.StatusNotFound, "ERR_DISPUTE_NOT_FOUND", "dispute "+req.DisputeID+" not found", false)
		return
	}
	d, _ := s.Store.GetDeal(dp.DealID)
	cur, _ := s.Store.DisputeCopy(dp.ID)
	if cur.Status == "SETTLED_BINDING" {
		mw.WriteError(w, r, http.StatusConflict, "ERR_DISPUTE_SETTLED", "dispute already settled", false)
		return
	}
	now := time.Now().UTC()
	s.Store.UpdateDispute(dp, func(x *store.Dispute) {
		x.ArbitratorNexconnID, x.Status, x.JoinedAt = req.ArbitratorNexconnID, "ARBITRATOR_ASSIGNED", &now
	})
	if arb, ok := s.Store.GetUserByNexconn(req.ArbitratorNexconnID); ok {
		s.Store.UpdateDeal(d, func(d *store.Deal) { d.ArbitratorID = arb.ID })
	}
	var channel string
	s.Store.ReadDeal(d, func(d *store.Deal) { channel = d.ChannelID })
	text := fmt.Sprintf("Arbitrator %s joined the frozen deal room.", req.ArbitratorNexconnID)
	st := s.Bridge.StreamGroup(r.Context(), channel, req.ArbitratorNexconnID, "x-mudra-arbitrator-joined", text, map[string]any{"dispute_id": dp.ID})
	s.addMessage(d, store.ChatMessage{SenderRole: "arbitrator", SenderName: c.Name, SenderNexconnID: req.ArbitratorNexconnID,
		MessageType: "x-mudra-arbitrator-joined", RawText: text, TranslatedText: text, StreamID: st.StreamID, Engine: st.Engine,
		Extras: map[string]any{"dispute_id": dp.ID}})
	s.publishDeal(d)
	cur, _ = s.Store.DisputeCopy(dp.ID)
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"dispute_id": dp.ID, "nexconn_channel_id": channel, "arbitrator_nexconn_id": req.ArbitratorNexconnID,
		"freeze_remaining_sec": cur.FreezeRemainingSec(time.Now()), "joined_at": isoTime(now), "status": cur.Status,
	})
}

// API-11 POST /api/v1/disputes/{disputeId}/resolve (arbitrator)
func (s *Server) handleDisputeResolve(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("disputeId")
	dp, ok := s.Store.GetDispute(id)
	if !ok {
		mw.WriteError(w, r, http.StatusNotFound, "ERR_DISPUTE_NOT_FOUND", "dispute "+id+" not found", false)
		return
	}
	var req struct {
		BuyerRefundBps  *int   `json:"buyer_refund_bps"`
		SellerPayoutBps *int   `json:"seller_payout_bps"`
		ExpectedVersion *int64 `json:"expected_version"`
		ResolutionNote  string `json:"resolution_note"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	switch {
	case req.BuyerRefundBps == nil || req.SellerPayoutBps == nil:
		badRequest(w, r, "buyer_refund_bps and seller_payout_bps required")
		return
	case *req.BuyerRefundBps < 0 || *req.BuyerRefundBps > 10000 || *req.SellerPayoutBps < 0 || *req.SellerPayoutBps > 10000:
		badRequest(w, r, "bps values must be within 0..10000")
		return
	case *req.BuyerRefundBps+*req.SellerPayoutBps != 10000:
		badRequest(w, r, "buyer_refund_bps + seller_payout_bps must equal 10000")
		return
	case req.ExpectedVersion == nil || *req.ExpectedVersion < 1:
		badRequest(w, r, "expected_version (>=1) required")
		return
	case len(req.ResolutionNote) > 2000:
		badRequest(w, r, "resolution_note max 2000 chars")
		return
	}
	d, _ := s.Store.GetDeal(dp.DealID)
	ctx := r.Context()
	d.Op.Lock()
	defer d.Op.Unlock()
	act := fsm.ActionResolveSplit
	if *req.BuyerRefundBps == 10000 {
		act = fsm.ActionRefundBuyer
	}
	var amount int64
	var channel string
	s.Store.ReadDeal(d, func(d *store.Deal) { amount, channel = d.AmountPaise, d.ChannelID })
	refund := amount * int64(*req.BuyerRefundBps) / 10000
	payout := amount - refund
	out, err := s.transition(ctx, d, act, *req.ExpectedVersion, "arbitrator", map[string]any{
		"dispute_id": id, "buyer_refund_bps": *req.BuyerRefundBps, "seller_payout_bps": *req.SellerPayoutBps,
		"buyer_refund_paise": refund, "seller_payout_paise": payout,
	})
	if err != nil {
		writeFSMError(w, r, err)
		return
	}
	fr := s.Bridge.Freeze(ctx, channel, false)
	now := time.Now().UTC()
	bps := *req.BuyerRefundBps
	s.Store.UpdateDispute(dp, func(x *store.Dispute) {
		x.Status, x.ResolvedAt, x.ResolutionNote, x.FinalBuyerBps = "SETTLED_BINDING", &now, req.ResolutionNote, &bps
	})
	s.Store.UpdateDeal(d, func(d *store.Deal) { d.IsFrozen = false })
	summary := fmt.Sprintf("Binding settlement: buyer refund ₹%s (%d bps), seller payout ₹%s (%d bps).",
		clients.FormatINR(refund), bps, clients.FormatINR(payout), *req.SellerPayoutBps)
	extras := map[string]any{"dispute_id": id, "status": "SETTLED_BINDING", "fsm_state": out.Next,
		"buyer_refund_bps": bps, "seller_payout_bps": *req.SellerPayoutBps, "buyer_refund_paise": refund, "seller_payout_paise": payout,
		"resolution_note": req.ResolutionNote, "summary": summary, "system_voucher_sha256": out.Voucher.CurrVoucherSHA256, "ed25519_sig_hex": out.Voucher.Ed25519Signature}
	st := s.Bridge.StreamGroup(ctx, channel, "usr_mudra_arbitrator_bot", "x-mudra-tribunal-verdict", summary, extras)
	s.addMessage(d, store.ChatMessage{SenderRole: "system", SenderName: "MUDRA Tribunal", MessageType: "x-mudra-tribunal-verdict",
		RawText: summary, TranslatedText: summary, Extras: extras, StreamID: st.StreamID, Engine: out.Voucher.Engine})
	s.publishDeal(d)
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"dispute_id": id, "deal_id": d.ID, "fsm_state": out.Next, "buyer_refund_paise": refund, "seller_payout_paise": payout,
		"channel_unfrozen": !fr.Frozen, "system_voucher_sha256": out.Voucher.CurrVoucherSHA256, "ed25519_sig_hex": out.Voucher.Ed25519Signature,
		"version": out.Version, "story_stage": fsm.StoryStage(out.Next),
		"engine": map[string]string{"unfreeze": fr.Engine, "voucher": out.Voucher.Engine},
	})
}

// GET /api/v1/dispatch/queue (arbitrators only; open, frozen disputes only)
func (s *Server) handleDispatchQueue(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	out := []DisputeView{}
	for _, dp := range s.Store.ListDisputes() {
		d, ok := s.Store.GetDeal(dp.DealID)
		if !ok {
			continue
		}
		var v DisputeView
		open := false
		s.Store.ReadDeal(d, func(d *store.Deal) {
			st, _ := d.Machine.Snapshot()
			open = st == fsm.StateDisputedFrozen // resolved disputes leave the queue
			v = s.disputeViewOf(dp, d, now)
		})
		if open {
			out = append(out, v)
		}
	}
	mw.WriteJSON(w, http.StatusOK, map[string]any{"disputes": out})
}
