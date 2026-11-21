package store

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
	"github.com/jackc/pgx/v5"
)

func (p *PostgresStore) hydrateAll(ctx context.Context) error {
	// 1. Hydrate users
	uRows, err := p.pool.Query(ctx, `
		SELECT id::text, nexconn_user_id, display_name, role, preferred_locale, kyc_tier, created_at
		FROM users`)
	if err != nil {
		return err
	}
	for uRows.Next() {
		var dbUUID, nx, name, role, loc, kyc string
		var createdAt time.Time
		if err := uRows.Scan(&dbUUID, &nx, &name, &role, &loc, &kyc, &createdAt); err == nil {
			u := &User{
				ID: FormatUserID(dbUUID), NexconnUserID: nx, DisplayName: name,
				Role: role, Locale: loc, KYCTier: kyc, CreatedAt: createdAt,
			}
			p.users[u.ID] = u
			p.usersByNx[u.NexconnUserID] = u
		}
	}
	uRows.Close()

	// 2. Hydrate disputes
	dIDs := []string{}
	dpRows, err := p.pool.Query(ctx, `SELECT COALESCE(external_id, id::text) FROM dispute_cases`)
	if err == nil {
		for dpRows.Next() {
			var id string
			if err := dpRows.Scan(&id); err == nil && id != "" {
				dIDs = append(dIDs, id)
			}
		}
		dpRows.Close()
	}
	for _, id := range dIDs {
		if dp, ok := p.fetchDisputeFromDB(ctx, id); ok {
			p.disputes[dp.ID] = dp
		}
	}

	// 3. Hydrate deals oldest-first so dealOrder matches ListDeals reverse order
	dealIDs := []string{}
	drRows, err := p.pool.Query(ctx, `SELECT COALESCE(external_id, id::text) FROM deal_rooms ORDER BY created_at ASC`)
	if err == nil {
		for drRows.Next() {
			var id string
			if err := drRows.Scan(&id); err == nil && id != "" {
				dealIDs = append(dealIDs, id)
			}
		}
		drRows.Close()
	}
	for _, id := range dealIDs {
		if d, ok := p.fetchDealFromDB(ctx, id); ok {
			p.dealOrder = append(p.dealOrder, d.ID)
			p.deals[d.ID] = d
		}
	}
	return nil
}

func mergeDealIntoSingleton(dst, src *Deal) {
	st, ver := src.Machine.Snapshot()
	dst.Machine.Sync(st, ver)
	dst.ArbitratorID = src.ArbitratorID
	dst.AmountPaise = src.AmountPaise
	dst.Currency = src.Currency
	dst.Checklist = src.Checklist
	dst.UPIMandateUMN = src.UPIMandateUMN
	dst.IsFrozen = src.IsFrozen
	dst.RequiredSerial = src.RequiredSerial
	dst.MinMotorRPM = src.MinMotorRPM
	dst.ReferencePHash = src.ReferencePHash
	dst.Challenge = src.Challenge
	dst.Messages = src.Messages
	dst.AssayLogs = src.AssayLogs
	dst.Vouchers = src.Vouchers
	dst.DisputeID = src.DisputeID
	dst.UpdatedAt = src.UpdatedAt
}

func (p *PostgresStore) fetchDealFromDB(ctx context.Context, idOrExt string) (*Deal, bool) {
	candUUID := DealUUID(idOrExt)
	var dbUUID, extID, channelID, title, buyerUUID, sellerUUID string
	var arbUUID *string
	var isFrozen bool
	var metaRaw []byte
	var createdAt, updatedAt time.Time
	var fsmState string
	var amountPaise int64
	var currency string
	var checklistRaw []byte
	var umnPtr *string
	var version int64

	err := p.pool.QueryRow(ctx, `
		SELECT
			dr.id::text, COALESCE(dr.external_id, dr.id::text), dr.nexconn_channel_id, dr.title,
			dr.buyer_user_id::text, dr.seller_user_id::text, dr.arbitrator_user_id::text,
			dr.is_frozen, COALESCE(dr.deal_meta, '{}'::jsonb), dr.created_at, dr.updated_at,
			ec.fsm_state, ec.amount_paise, ec.currency,
			COALESCE(ec.checklist_items, '[]'::jsonb), ec.upi_mandate_umn, ec.version
		FROM deal_rooms dr
		JOIN escrow_contracts ec ON ec.deal_room_id = dr.id
		WHERE dr.id = $1::uuid OR dr.external_id = $2
		LIMIT 1`,
		candUUID, idOrExt,
	).Scan(
		&dbUUID, &extID, &channelID, &title,
		&buyerUUID, &sellerUUID, &arbUUID,
		&isFrozen, &metaRaw, &createdAt, &updatedAt,
		&fsmState, &amountPaise, &currency,
		&checklistRaw, &umnPtr, &version,
	)
	if err != nil {
		return nil, false
	}

	var meta dealMetaJSON
	_ = json.Unmarshal(metaRaw, &meta)
	var checklist []ChecklistItem
	_ = json.Unmarshal(checklistRaw, &checklist)
	if checklist == nil {
		checklist = []ChecklistItem{}
	}
	arbID := ""
	if arbUUID != nil && *arbUUID != "" {
		arbID = FormatUserID(*arbUUID)
	}
	umn := ""
	if umnPtr != nil {
		umn = *umnPtr
	}

	msgs := p.fetchMessagesFromDB(ctx, dbUUID, extID)
	assays := p.fetchAssaysFromDB(ctx, dbUUID)
	vouchers := p.fetchVouchersFromDB(ctx, dbUUID)

	d := &Deal{
		ID:             extID,
		ChannelID:      channelID,
		Title:          title,
		BuyerID:        FormatUserID(buyerUUID),
		SellerID:       FormatUserID(sellerUUID),
		ArbitratorID:   arbID,
		Machine:        fsm.NewMachineWithVersion(fsm.State(fsmState), version),
		AmountPaise:    amountPaise,
		Currency:       currency,
		Checklist:      checklist,
		UPIMandateUMN:  umn,
		IsFrozen:       isFrozen,
		RequiredSerial: meta.RequiredSerial,
		MinMotorRPM:    meta.MinMotorRPM,
		ReferencePHash: meta.ReferencePHash,
		Challenge:      meta.Challenge,
		Messages:       msgs,
		AssayLogs:      assays,
		Vouchers:       vouchers,
		DisputeID:      meta.DisputeID,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}
	return d, true
}

func (p *PostgresStore) fetchMessagesFromDB(ctx context.Context, dealUUID, dealExtID string) []ChatMessage {
	rows, err := p.pool.Query(ctx, `
		SELECT nexconn_msg_id, sender_nexconn_id, message_type, source_locale, target_locale,
		       scrubbed_source_text, translated_text, COALESCE(extracted_terms_json, '{}'::jsonb),
		       COALESCE(msg_meta, '{}'::jsonb), created_at
		FROM bilingual_messages
		WHERE deal_room_id = $1::uuid
		ORDER BY created_at ASC, seq ASC`, dealUUID,
	)
	if err != nil {
		return []ChatMessage{}
	}
	defer rows.Close()
	out := []ChatMessage{}
	for rows.Next() {
		var msgID, senderNx, msgType, srcLoc, dstLoc, rawTxt, trTxt string
		var termsRaw, metaRaw []byte
		var createdAt time.Time
		if err := rows.Scan(&msgID, &senderNx, &msgType, &srcLoc, &dstLoc, &rawTxt, &trTxt, &termsRaw, &metaRaw, &createdAt); err != nil {
			continue
		}
		var meta msgMetaJSON
		_ = json.Unmarshal(metaRaw, &meta)
		terms := unmarshalJSONUseNumber(termsRaw)
		extras := meta.Extras
		if extras == nil {
			extras = map[string]any{}
		}
		actualSenderNx := meta.SenderNxOrig
		if actualSenderNx == "" && senderNx != "system" {
			actualSenderNx = senderNx
		}
		actualSrc := meta.SrcLocOrig
		if actualSrc == "" && meta.SenderRole != "system" {
			actualSrc = srcLoc
		}
		actualDst := meta.DstLocOrig
		if actualDst == "" && meta.SenderRole != "system" {
			actualDst = dstLoc
		}
		out = append(out, ChatMessage{
			ID:              msgID,
			DealID:          dealExtID,
			SenderRole:      meta.SenderRole,
			SenderName:      meta.SenderName,
			SenderNexconnID: actualSenderNx,
			MessageType:     msgType,
			SourceLocale:    actualSrc,
			TargetLocale:    actualDst,
			RawText:         rawTxt,
			TranslatedText:  trTxt,
			ExtractedTerms:  terms,
			PIIRedacted:     meta.PIIRedacted,
			StreamID:        meta.StreamID,
			Engine:          meta.Engine,
			Extras:          extras,
			CreatedAt:       createdAt,
		})
	}
	return out
}

func (p *PostgresStore) fetchAssaysFromDB(ctx context.Context, dealUUID string) []AssayLog {
	rows, err := p.pool.Query(ctx, `
		SELECT id::text, nexconn_call_id, stage_tag, assay_passed, frame_phash_hex,
		       blur_laplacian_score::float8, detected_serial_text, audio_fft_rpm_peak::float8,
		       COALESCE(vision_verdict_json, '{}'::jsonb), ed25519_sig_hex, created_at
		FROM video_assay_logs
		WHERE deal_room_id = $1::uuid
		ORDER BY created_at ASC, seq ASC`, dealUUID,
	)
	if err != nil {
		return []AssayLog{}
	}
	defer rows.Close()
	out := []AssayLog{}
	for rows.Next() {
		var dbID, callID, stageTag string
		var passed bool
		var phashPtr, serialPtr, sigPtr *string
		var blurPtr, rpmPtr *float64
		var verdictRaw []byte
		var createdAt time.Time
		if err := rows.Scan(&dbID, &callID, &stageTag, &passed, &phashPtr, &blurPtr, &serialPtr, &rpmPtr, &verdictRaw, &sigPtr, &createdAt); err != nil {
			continue
		}
		var meta assayMetaJSON
		_ = json.Unmarshal(verdictRaw, &meta)
		assayID := meta.AssayID
		if assayID == "" {
			assayID = dbID
		}
		origCallID := meta.NexconnCallID
		if origCallID == "" {
			origCallID = callID
		}
		phash := ""
		if phashPtr != nil {
			phash = strings.TrimSpace(*phashPtr)
		}
		serial := ""
		if serialPtr != nil {
			serial = *serialPtr
		}
		sig := ""
		if sigPtr != nil {
			sig = *sigPtr
		}
		failures := meta.FailureReasons
		if failures == nil {
			failures = []string{}
		}
		out = append(out, AssayLog{
			ID:                 assayID,
			NexconnCallID:      origCallID,
			StageTag:           stageTag,
			AssayPassed:        passed,
			FramePHashHex:      phash,
			BlurLaplacian:      blurPtr,
			AudioFFTRPMPeak:    rpmPtr,
			RPMSource:          meta.RPMSource,
			DetectedSerialText: serial,
			RustComputeMs:      meta.RustComputeMs,
			FSMState:           meta.FSMState,
			Ed25519SigHex:      sig,
			FailureReasons:     failures,
			Engine:             meta.Engine,
			CreatedAt:          createdAt,
		})
	}
	return out
}

func (p *PostgresStore) fetchVouchersFromDB(ctx context.Context, dealUUID string) []Voucher {
	rows, err := p.pool.Query(ctx, `
		SELECT COALESCE(external_id, id::text), voucher_type,
		       TRIM(prev_voucher_sha256), TRIM(curr_voucher_sha256),
		       ed25519_signature, TRIM(public_key_hex),
		       payload_json, COALESCE(signing_engine, 'postgresql'), created_at
		FROM system_audit_vouchers
		WHERE deal_room_id = $1::uuid
		ORDER BY seq ASC, created_at ASC`, dealUUID,
	)
	if err != nil {
		return []Voucher{}
	}
	defer rows.Close()
	out := []Voucher{}
	for rows.Next() {
		var id, vType, prevHash, currHash, sig, pubKey, engine string
		var payloadRaw []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &vType, &prevHash, &currHash, &sig, &pubKey, &payloadRaw, &engine, &createdAt); err != nil {
			continue
		}
		out = append(out, Voucher{
			ID:                id,
			VoucherType:       vType,
			PrevVoucherSHA256: prevHash,
			CurrVoucherSHA256: currHash,
			Ed25519Signature:  sig,
			PublicKeyHex:      pubKey,
			Payload:           unmarshalJSONUseNumber(payloadRaw),
			Engine:            engine,
			CreatedAt:         createdAt,
		})
	}
	return out
}

func insertMessageTx(ctx context.Context, tx pgx.Tx, dealUUID string, m ChatMessage) error {
	msgID := m.ID
	if msgID == "" {
		msgID = "msg_" + RandHex(6)
	}
	createdAt := m.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}
	senderNx := m.SenderNexconnID
	if senderNx == "" {
		senderNx = "system"
	}
	srcLoc := m.SourceLocale
	if srcLoc == "" {
		srcLoc = "en-IN"
	}
	dstLoc := m.TargetLocale
	if dstLoc == "" {
		dstLoc = "en-IN"
	}
	msgType := m.MessageType
	if msgType == "" {
		msgType = "x-mudra-bilingual-bubble"
	}
	meta := msgMetaJSON{
		SenderRole:   m.SenderRole,
		SenderName:   m.SenderName,
		SenderNxOrig: m.SenderNexconnID,
		SrcLocOrig:   m.SourceLocale,
		DstLocOrig:   m.TargetLocale,
		PIIRedacted:  m.PIIRedacted,
		StreamID:     m.StreamID,
		Engine:       m.Engine,
		Extras:       m.Extras,
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO bilingual_messages (
			id, deal_room_id, nexconn_msg_id, sender_nexconn_id, message_type,
			source_locale, target_locale, scrubbed_source_text, translated_text,
			extracted_terms_json, msg_meta, created_at
		) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12)
		ON CONFLICT (nexconn_msg_id) DO NOTHING`,
		MessageUUID(msgID), dealUUID, msgID, senderNx, msgType,
		srcLoc, dstLoc, m.RawText, m.TranslatedText,
		string(marshalJSONOrEmptyObj(m.ExtractedTerms)), string(marshalJSONOrEmptyObj(meta)), createdAt,
	)
	return err
}

func insertAssayTx(ctx context.Context, tx pgx.Tx, dealUUID string, a AssayLog) error {
	assayID := a.ID
	if assayID == "" {
		assayID = "assay_" + RandHex(5)
	}
	aUUID := AssayUUID(assayID)
	callID := a.NexconnCallID
	if callID == "" {
		callID = "call_nc_" + assayID
	}
	var conflict bool
	_ = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM video_assay_logs WHERE nexconn_call_id = $1 AND id <> $2::uuid)`, callID, aUUID).Scan(&conflict)
	dbCallID := callID
	if conflict {
		dbCallID = callID + "#" + assayID
		if len(dbCallID) > 128 {
			dbCallID = dbCallID[:128]
		}
	}
	var phashPtr *string
	if ph := strings.TrimSpace(a.FramePHashHex); ph != "" && len(ph) <= 16 {
		phashPtr = &ph
	}
	var serialPtr *string
	if a.DetectedSerialText != "" {
		s := a.DetectedSerialText
		if len(s) > 64 {
			s = s[:64]
		}
		serialPtr = &s
	}
	var sigPtr *string
	if a.Ed25519SigHex != "" {
		s := a.Ed25519SigHex
		sigPtr = &s
	}
	meta := assayMetaJSON{
		AssayID:        assayID,
		NexconnCallID:  a.NexconnCallID,
		RPMSource:      a.RPMSource,
		RustComputeMs:  a.RustComputeMs,
		FSMState:       a.FSMState,
		FailureReasons: a.FailureReasons,
		Engine:         a.Engine,
	}
	createdAt := a.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO video_assay_logs (
			id, deal_room_id, nexconn_call_id, stage_tag, assay_passed,
			frame_phash_hex, blur_laplacian_score, detected_serial_text,
			audio_fft_rpm_peak, vision_verdict_json, ed25519_sig_hex, created_at
		) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)
		ON CONFLICT (id) DO NOTHING`,
		aUUID, dealUUID, dbCallID, a.StageTag, a.AssayPassed,
		phashPtr, a.BlurLaplacian, serialPtr,
		a.AudioFFTRPMPeak, string(marshalJSONOrEmptyObj(meta)), sigPtr, createdAt,
	)
	return err
}

func insertVoucherTx(ctx context.Context, tx pgx.Tx, dealUUID string, v Voucher) error {
	vID := v.ID
	if vID == "" {
		vID = "vch_" + RandHex(6)
	}
	createdAt := v.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}
	// Strictly append-only: NEVER UPDATE or DELETE on system_audit_vouchers.
	_, err := tx.Exec(ctx, `
		INSERT INTO system_audit_vouchers (
			id, external_id, deal_room_id, voucher_type,
			prev_voucher_sha256, curr_voucher_sha256,
			ed25519_signature, public_key_hex,
			payload_json, signing_engine, created_at
		) VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
		ON CONFLICT (curr_voucher_sha256) DO NOTHING`,
		VoucherUUID(v.CurrVoucherSHA256), vID, dealUUID, v.VoucherType,
		v.PrevVoucherSHA256, v.CurrVoucherSHA256,
		v.Ed25519Signature, v.PublicKeyHex,
		string(marshalJSONOrEmptyObj(v.Payload)), v.Engine, createdAt,
	)
	return err
}

func (p *PostgresStore) upsertDisputeDB(dp *Dispute) {
	ctx, cancel := p.opCtx()
	defer cancel()

	hamming := max(0, min(64, dp.HammingDistance))
	buyerBps := dp.BuyerRefundBps
	sellerBps := dp.SellerPayoutBps
	if buyerBps+sellerBps != 10000 {
		buyerBps = max(0, min(10000, buyerBps))
		sellerBps = 10000 - buyerBps
	}
	meta := disputeMetaJSON{
		DisputeID:           dp.ID,
		PrePHash:            dp.PrePHash,
		PostPHash:           dp.PostPHash,
		Summary:             dp.Summary,
		Rationale:           dp.Rationale,
		TribunalModel:       dp.TribunalModel,
		TribunalEngine:      dp.TribunalEngine,
		ArbitratorNexconnID: dp.ArbitratorNexconnID,
		JoinedAt:            dp.JoinedAt,
		ResolutionNote:      dp.ResolutionNote,
		FinalBuyerBps:       dp.FinalBuyerBps,
	}
	frozenAt := dp.FrozenAt
	if frozenAt.IsZero() {
		frozenAt = time.Now().UTC()
	}
	expiresAt := dp.FreezeExpiresAt
	if expiresAt.IsZero() {
		expiresAt = frozenAt.Add(90 * time.Second)
	}
	_, err := p.pool.Exec(ctx, `
		INSERT INTO dispute_cases (
			id, external_id, deal_room_id, freeze_reason_code, description,
			hamming_distance_phash, ai_tribunal_proposal_json,
			buyer_refund_bps, seller_payout_bps, status,
			frozen_at, freeze_expires_at, resolved_at
		) VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (id) DO UPDATE SET
			ai_tribunal_proposal_json = EXCLUDED.ai_tribunal_proposal_json,
			status = EXCLUDED.status,
			resolved_at = EXCLUDED.resolved_at`,
		DisputeUUID(dp.ID), dp.ID, DealUUID(dp.DealID), dp.ReasonCode, dp.Description,
		hamming, string(marshalJSONOrEmptyObj(meta)),
		buyerBps, sellerBps, dp.Status,
		frozenAt, expiresAt, dp.ResolvedAt,
	)
	if err != nil {
		slog.Error("PostgresStore.upsertDisputeDB failed", "dispute_id", dp.ID, "err", err)
	}
}

func (p *PostgresStore) fetchDisputeFromDB(ctx context.Context, idOrExt string) (*Dispute, bool) {
	candUUID := DisputeUUID(idOrExt)
	var extID, dealExtID, reasonCode, status string
	var descPtr *string
	var hammingPtr, buyerBpsPtr, sellerBpsPtr *int
	var metaRaw []byte
	var frozenAt, expiresAt time.Time
	var resolvedAt *time.Time

	err := p.pool.QueryRow(ctx, `
		SELECT
			COALESCE(dc.external_id, dc.id::text),
			COALESCE(dr.external_id, dr.id::text),
			dc.freeze_reason_code, dc.description, dc.hamming_distance_phash,
			COALESCE(dc.ai_tribunal_proposal_json, '{}'::jsonb),
			dc.buyer_refund_bps, dc.seller_payout_bps, dc.status,
			dc.frozen_at, dc.freeze_expires_at, dc.resolved_at
		FROM dispute_cases dc
		JOIN deal_rooms dr ON dr.id = dc.deal_room_id
		WHERE dc.id = $1::uuid OR dc.external_id = $2
		LIMIT 1`,
		candUUID, idOrExt,
	).Scan(
		&extID, &dealExtID, &reasonCode, &descPtr, &hammingPtr,
		&metaRaw, &buyerBpsPtr, &sellerBpsPtr, &status,
		&frozenAt, &expiresAt, &resolvedAt,
	)
	if err != nil {
		return nil, false
	}
	var meta disputeMetaJSON
	_ = json.Unmarshal(metaRaw, &meta)
	desc := ""
	if descPtr != nil {
		desc = *descPtr
	}
	ham := 0
	if hammingPtr != nil {
		ham = *hammingPtr
	}
	bBps, sBps := 0, 10000
	if buyerBpsPtr != nil && sellerBpsPtr != nil {
		bBps, sBps = *buyerBpsPtr, *sellerBpsPtr
	}
	return &Dispute{
		ID:                  extID,
		DealID:              dealExtID,
		ReasonCode:          reasonCode,
		Description:         desc,
		PrePHash:            meta.PrePHash,
		PostPHash:           meta.PostPHash,
		HammingDistance:     ham,
		BuyerRefundBps:      bBps,
		SellerPayoutBps:     sBps,
		Summary:             meta.Summary,
		Rationale:           meta.Rationale,
		TribunalModel:       meta.TribunalModel,
		TribunalEngine:      meta.TribunalEngine,
		Status:              status,
		ArbitratorNexconnID: meta.ArbitratorNexconnID,
		FrozenAt:            frozenAt,
		FreezeExpiresAt:     expiresAt,
		JoinedAt:            meta.JoinedAt,
		ResolvedAt:          resolvedAt,
		ResolutionNote:      meta.ResolutionNote,
		FinalBuyerBps:       meta.FinalBuyerBps,
	}, true
}

func (p *PostgresStore) saveArenaDB(r *ArenaRun) {
	ctx, cancel := p.opCtx()
	defer cancel()

	meta := arenaMetaJSON{
		ChallengerName:    r.ChallengerName,
		ChallengerNexconn: r.ChallengerNexconn,
		Locale:            r.Locale,
		ItemTitle:         r.ItemTitle,
		LastCounterPaise:  r.LastCounterPaise,
		Turns:             append([]ArenaTurn(nil), r.Turns...),
		FinalPricePaise:   r.FinalPricePaise,
		EndsAt:            r.EndsAt,
		OpeningText:       r.OpeningText,
		TokenEngine:       r.TokenEngine,
	}
	floorPaise := int64(float64(r.StickerPaise) * 0.84)
	var currOffer *int64
	if n := len(r.Turns); n > 0 {
		v := r.Turns[n-1].OfferedPaise
		currOffer = &v
	}
	startedAt := r.StartedAt
	if startedAt.IsZero() {
		startedAt = time.Now().UTC()
	}
	_, err := p.pool.Exec(ctx, `
		INSERT INTO bargain_arena_runs (
			id, external_id, user_id, nexconn_direct_channel_id, item_slug,
			ask_paise, floor_paise, current_offer_paise, turns_used, is_won,
			run_meta, created_at
		) VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
		ON CONFLICT (id) DO UPDATE SET
			current_offer_paise = EXCLUDED.current_offer_paise,
			turns_used = EXCLUDED.turns_used,
			is_won = EXCLUDED.is_won,
			run_meta = EXCLUDED.run_meta`,
		ArenaUUID(r.ID), r.ID, UserUUID(r.UserID), r.DirectChannelID, r.ItemSKU,
		r.StickerPaise, floorPaise, currOffer, len(r.Turns), r.Won,
		string(marshalJSONOrEmptyObj(meta)), startedAt,
	)
	if err != nil {
		slog.Error("PostgresStore.saveArenaDB failed", "run_id", r.ID, "err", err)
	}
}

func (p *PostgresStore) fetchArenaFromDB(ctx context.Context, idOrExt string) (*ArenaRun, bool) {
	candUUID := ArenaUUID(idOrExt)
	var extID, userUUID, directCh, sku string
	var askPaise int64
	var won bool
	var metaRaw []byte
	var createdAt time.Time

	err := p.pool.QueryRow(ctx, `
		SELECT COALESCE(external_id, id::text), user_id::text, nexconn_direct_channel_id,
		       item_slug, ask_paise, is_won, COALESCE(run_meta, '{}'::jsonb), created_at
		FROM bargain_arena_runs
		WHERE id = $1::uuid OR external_id = $2
		LIMIT 1`,
		candUUID, idOrExt,
	).Scan(&extID, &userUUID, &directCh, &sku, &askPaise, &won, &metaRaw, &createdAt)
	if err != nil {
		return nil, false
	}
	var meta arenaMetaJSON
	_ = json.Unmarshal(metaRaw, &meta)
	turns := meta.Turns
	if turns == nil {
		turns = []ArenaTurn{}
	}
	return &ArenaRun{
		ID:                extID,
		UserID:            FormatUserID(userUUID),
		ChallengerName:    meta.ChallengerName,
		ChallengerNexconn: meta.ChallengerNexconn,
		Locale:            meta.Locale,
		DirectChannelID:   directCh,
		ItemSKU:           sku,
		ItemTitle:         meta.ItemTitle,
		StickerPaise:      askPaise,
		LastCounterPaise:  meta.LastCounterPaise,
		Turns:             turns,
		Won:               won,
		FinalPricePaise:   meta.FinalPricePaise,
		StartedAt:         createdAt,
		EndsAt:            meta.EndsAt,
		OpeningText:       meta.OpeningText,
		TokenEngine:       meta.TokenEngine,
	}, true
}
