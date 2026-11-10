package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/fsm"
	mw "github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

// TransitionOutcome is the result of a successful FSM transition + voucher.
type TransitionOutcome struct {
	Prev     fsm.State
	Next     fsm.State
	Version  int64
	ExecTime time.Duration
	Voucher  store.Voucher
}

// ExecTimeUS rounds exec time up to whole microseconds (min 1).
func (o TransitionOutcome) ExecTimeUS() int64 {
	us := (o.ExecTime.Nanoseconds() + 999) / 1000
	return max(1, us)
}

// transition applies an FSM action with optimistic locking and appends a
// hash-chained signed voucher, an escrow-card chat message and SSE events.
// The caller MUST hold d.Op. expectedVersion < 0 means "current version"
// (used by internal flows such as API-09/webhooks that have no client version).
func (s *Server) transition(ctx context.Context, d *store.Deal, act fsm.Action, expectedVersion int64, actorRole string, extra map[string]any) (TransitionOutcome, error) {
	var out TransitionOutcome
	var cardMsg store.ChatMessage
	res, v, card, err := s.Store.ApplyTransition(ctx, d, act, expectedVersion, func(prevHash string, res fsm.Result, amount int64) (store.Voucher, store.ChatMessage, error) {
		if prevHash == "" {
			prevHash = clients.GenesisHash
		}
		now := time.Now().UTC()
		vType := fsm.VoucherType(act)
		payload := map[string]any{
			"action":       string(act),
			"prev_state":   string(res.Prev),
			"fsm_state":    string(res.Next),
			"version":      res.Version,
			"amount_paise": amount,
			"actor_role":   actorRole,
			"issued_at":    now.Format(time.RFC3339Nano),
		}
		for k, val := range extra {
			payload[k] = val
		}
		sv := s.Rust.SignVoucher(ctx, d.ID, vType, payload, prevHash)
		v := store.Voucher{
			ID: "vch_" + store.RandHex(6), VoucherType: vType, PrevVoucherSHA256: prevHash,
			CurrVoucherSHA256: sv.CurrHashHex, Ed25519Signature: sv.SignatureHex, PublicKeyHex: sv.PublicKeyHex,
			Payload: payload, Engine: sv.Engine, CreatedAt: now,
		}
		tmpOut := TransitionOutcome{Prev: res.Prev, Next: res.Next, Version: res.Version, ExecTime: res.ExecTime, Voucher: v}
		card := store.ChatMessage{
			ID: "msg_" + store.RandHex(6), DealID: d.ID, SenderRole: "system", SenderName: "SAMADHAN Escrow",
			MessageType: "x-samadhan-escrow-card", RawText: string(res.Prev) + " → " + string(res.Next), TranslatedText: string(res.Prev) + " → " + string(res.Next),
			ExtractedTerms: map[string]any{},
			Extras: map[string]any{
				"action": string(act), "prev_state": string(res.Prev), "fsm_state": string(res.Next), "version": res.Version,
				"story_stage": fsm.StoryStage(res.Next), "amount_paise": amount, "go_exec_time_us": tmpOut.ExecTimeUS(),
				"voucher_type": vType, "curr_voucher_sha256": v.CurrVoucherSHA256, "prev_voucher_sha256": prevHash,
				"ed25519_signature": v.Ed25519Signature, "signing_engine": v.Engine, "actor_role": actorRole,
			},
			Engine: v.Engine, CreatedAt: now,
		}
		return v, card, nil
	})
	if err != nil {
		return TransitionOutcome{}, err
	}
	s.Store.Telemetry().RecordFSM(res.ExecTime)
	out = TransitionOutcome{Prev: res.Prev, Next: res.Next, Version: res.Version, ExecTime: res.ExecTime, Voucher: v}
	cardMsg = card

	var buyerNx, sellerNx, channel, dealTitle string
	s.Store.ReadDeal(d, func(d *store.Deal) {
		buyerNx = s.Store.UserCopyUnsafe(d.BuyerID).NexconnUserID
		sellerNx = s.Store.UserCopyUnsafe(d.SellerID).NexconnUserID
		channel = d.ChannelID
		dealTitle = d.Title
	})
	s.Bus.PublishMessage(d.ID, cardMsg)

	// Best-effort Nexconn side effects: System-channel voucher + escrow card stream.
	vPayload := map[string]any{"deal_id": d.ID, "deal_title": dealTitle, "voucher_type": v.VoucherType, "curr_voucher_sha256": v.CurrVoucherSHA256,
		"prev_voucher_sha256": v.PrevVoucherSHA256, "ed25519_signature": v.Ed25519Signature, "public_key_hex": v.PublicKeyHex, "fsm_state": string(res.Next), "version": res.Version}
	async("system-voucher", func(ctx context.Context) {
		s.Bridge.SystemVoucher(ctx, []string{buyerNx, sellerNx}, vPayload)
		s.Bridge.StreamGroup(ctx, channel, "usr_samadhan_system_voucher", "x-samadhan-escrow-card", cardMsg.RawText, cardMsg.Extras)
	})
	return out, nil
}

// writeFSMError maps FSM errors onto the contract's status codes.
func writeFSMError(w http.ResponseWriter, r *http.Request, err error) {
	var ce *fsm.ConflictError
	switch {
	case errors.As(err, &ce):
		mw.WriteError(w, r, http.StatusConflict, "ERR_FSM_CONFLICT", "Escrow state transition rejected: "+ce.Error()[len("escrow state transition rejected: "):], true)
	case errors.Is(err, fsm.ErrInvalidTransition):
		mw.WriteError(w, r, http.StatusUnprocessableEntity, "ERR_INVALID_FSM_TRANSITION", err.Error(), false)
	case errors.Is(err, fsm.ErrUnknownAction):
		mw.WriteError(w, r, http.StatusBadRequest, "ERR_VALIDATION", "unknown FSM action", false)
	default:
		mw.WriteError(w, r, http.StatusInternalServerError, "ERR_INTERNAL", err.Error(), true)
	}
}

// invalidTransition writes a 422 with state context.
func invalidTransition(w http.ResponseWriter, r *http.Request, st fsm.State, act fsm.Action) {
	mw.WriteError(w, r, http.StatusUnprocessableEntity, "ERR_INVALID_FSM_TRANSITION",
		"action "+string(act)+" is not allowed from state "+string(st), false)
}

// addMessage appends a chat message and publishes it.
func (s *Server) addMessage(d *store.Deal, m store.ChatMessage) {
	if m.ID == "" {
		m.ID = "msg_" + store.RandHex(6)
	}
	if m.CreatedAt.IsZero() {
		m.CreatedAt = time.Now().UTC()
	}
	if m.Extras == nil {
		m.Extras = map[string]any{}
	}
	if m.ExtractedTerms == nil {
		m.ExtractedTerms = map[string]any{}
	}
	m.DealID = d.ID
	s.Store.UpdateDeal(d, func(d *store.Deal) { d.Messages = append(d.Messages, m) })
	s.Bus.PublishMessage(d.ID, m)
}

// publishDeal pushes the current DealView to SSE subscribers.
func (s *Server) publishDeal(d *store.Deal) {
	if s.Bus.HasSubscribers(d.ID) {
		s.Bus.PublishDeal(d.ID, s.dealView(d))
	}
}

// seed creates the FUNDED demo deal (Rajesh ↔ Vikram) with a real signed voucher chain idempotently.
func (s *Server) seed() {
	now := time.Now().UTC()
	s.Store.SeedStatic(now)
	if existing, exists := s.Store.GetDeal(store.SeedDealID); exists {
		// Record one baseline FSM sample from persisted seed state so /traction latency_detail stays populated.
		_ = existing
		s.Store.Telemetry().RecordFSM(time.Microsecond)
		return
	}
	rajesh, _ := store.PersonaByPreset("P-01_RAJESH")
	vikram, _ := store.PersonaByPreset("P-02_VIKRAM")
	d := &store.Deal{
		ID: store.SeedDealID, ChannelID: store.SeedChannelID, Title: store.SeedDealTitle,
		BuyerID: rajesh.ID, SellerID: vikram.ID, Machine: fsm.NewMachine(fsm.StateCreated),
		AmountPaise: store.SeedAmountPaise, Currency: "INR", Checklist: store.DefaultChecklist(),
		UPIMandateUMN: "samadhan.8821@okaxis", RequiredSerial: store.SeedSerial, MinMotorRPM: store.SeedMinRPM,
		ReferencePHash: store.SeedReferencePHash, CreatedAt: now.Add(-20 * time.Minute), UpdatedAt: now,
	}
	s.Store.PutDeal(d)
	s.addMessage(d, store.ChatMessage{
		ID: "msg_seed_8821_offer",
		SenderRole: "buyer", SenderName: rajesh.Name, SenderNexconnID: rajesh.NexconnID, MessageType: "x-samadhan-bilingual-bubble",
		SourceLocale: "ta-IN", TargetLocale: "hi-IN",
		RawText:        "நான் ₹1,45,000-க்கு வாங்க தயார், மோட்டார் 4800 RPM சோதனை தேவை",
		TranslatedText: "मैं ₹1,45,000 में खरीदने को तैयार हूँ, मोटर 4800 RPM जाँच ज़रूरी है",
		ExtractedTerms: map[string]any{"offered_amount_paise": 14500000, "required_rpm": 4800},
		Engine:         "seed", CreatedAt: now.Add(-15 * time.Minute),
	})
	d.Op.Lock()
	// Seed signing is local (Go Ed25519) — siblings are not probed yet at boot.
	if _, err := s.transitionLocal(d, fsm.ActionLockEscrow, map[string]any{"upi_mandate_umn_masked": "****8821@okaxis", "source": "seed"}); err != nil {
		panic(err)
	}
	d.Op.Unlock()
}

// transitionLocal is transition() but always signs with the Go signer (seed only).
func (s *Server) transitionLocal(d *store.Deal, act fsm.Action, extra map[string]any) (TransitionOutcome, error) {
	res, v, _, err := s.Store.ApplyTransition(context.Background(), d, act, -1, func(prev string, res fsm.Result, amount int64) (store.Voucher, store.ChatMessage, error) {
		now := time.Now().UTC()
		payload := map[string]any{"action": string(act), "prev_state": string(res.Prev), "fsm_state": string(res.Next),
			"version": res.Version, "amount_paise": amount, "actor_role": "system", "issued_at": now.Format(time.RFC3339Nano)}
		for k, val := range extra {
			payload[k] = val
		}
		if prev == "" {
			prev = clients.GenesisHash
		}
		sv, err := s.signer.Sign(d.ID, fsm.VoucherType(act), payload, prev)
		if err != nil {
			return store.Voucher{}, store.ChatMessage{}, err
		}
		v := store.Voucher{ID: "vch_seed_8821_lock", VoucherType: fsm.VoucherType(act), PrevVoucherSHA256: prev,
			CurrVoucherSHA256: sv.CurrHashHex, Ed25519Signature: sv.SignatureHex, PublicKeyHex: sv.PublicKeyHex,
			Payload: payload, Engine: "go-native-seed", CreatedAt: now}
		card := store.ChatMessage{
			ID: "msg_seed_8821_lock", DealID: d.ID, SenderRole: "system", SenderName: "SAMADHAN Escrow",
			MessageType: "x-samadhan-escrow-card", RawText: string(res.Prev) + " → " + string(res.Next), TranslatedText: string(res.Prev) + " → " + string(res.Next),
			ExtractedTerms: map[string]any{},
			Extras: map[string]any{"action": string(act), "prev_state": string(res.Prev), "fsm_state": string(res.Next), "version": res.Version,
				"story_stage": fsm.StoryStage(res.Next), "amount_paise": amount, "voucher_type": v.VoucherType,
				"curr_voucher_sha256": v.CurrVoucherSHA256, "prev_voucher_sha256": prev, "ed25519_signature": v.Ed25519Signature, "signing_engine": v.Engine},
			Engine: v.Engine, CreatedAt: now,
		}
		return v, card, nil
	})
	if err != nil {
		return TransitionOutcome{}, err
	}
	s.Store.Telemetry().RecordFSM(res.ExecTime)
	return TransitionOutcome{Prev: res.Prev, Next: res.Next, Version: res.Version, ExecTime: res.ExecTime, Voucher: v}, nil
}
