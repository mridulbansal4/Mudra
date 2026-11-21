package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
	mw "github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/store"
)

const (
	challengeTTL     = 300 * time.Second
	minBlurLaplacian = 100.0
)

// API-07 POST /api/v1/deals/{dealId}/assay/start
func (s *Server) handleAssayStart(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	role := partyRole(claims(r), d)
	if role == "" {
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "only the buyer or seller can start an assay", false)
		return
	}
	var req struct {
		StageTag          string `json:"stage_tag"`
		SimulatedHDCamera bool   `json:"simulated_hd_camera"`
	}
	if !decodeOptionalJSON(w, r, &req) {
		return
	}
	if req.StageTag == "" {
		req.StageTag = "PRE_SHIPMENT"
	}
	if req.StageTag != "PRE_SHIPMENT" && req.StageTag != "POST_DELIVERY" {
		badRequest(w, r, "stage_tag must be PRE_SHIPMENT|POST_DELIVERY")
		return
	}
	d.Op.Lock()
	defer d.Op.Unlock()
	st, _ := d.Machine.Snapshot()
	autoStarted := false
	var voucher *store.Voucher
	if req.StageTag == "PRE_SHIPMENT" {
		switch st {
		case fsm.StateFunded:
			out, err := s.transition(r.Context(), d, fsm.ActionStartAssay, -1, role, map[string]any{"simulated_hd_camera": req.SimulatedHDCamera})
			if err != nil {
				writeFSMError(w, r, err)
				return
			}
			autoStarted, voucher = true, &out.Voucher
		case fsm.StateInspectionLive:
		default:
			invalidTransition(w, r, st, fsm.ActionStartAssay)
			return
		}
	} else if st == fsm.StateCreated || st == fsm.StateFunded {
		mw.WriteError(w, r, http.StatusUnprocessableEntity, "ERR_INVALID_FSM_TRANSITION", "POST_DELIVERY assay requires a completed pre-shipment assay (state "+string(st)+")", false)
		return
	}
	nonce := fmt.Sprintf("nonce_tilt20_rpm2s_%s", store.RandHex(4))
	var serial string
	var minRPM float64
	s.Store.UpdateDeal(d, func(d *store.Deal) {
		d.Challenge = &store.AssayChallenge{Nonce: nonce, StageTag: req.StageTag, ExpiresAt: time.Now().Add(challengeTTL)}
		serial, minRPM = d.RequiredSerial, d.MinMotorRPM
	})
	s.publishDeal(d)
	st, ver := d.Machine.Snapshot()
	resp := map[string]any{
		"deal_id": d.ID, "challenge_nonce": nonce, "required_serial_plate": serial, "min_motor_rpm": minRPM,
		"expires_in_sec": int(challengeTTL.Seconds()), "stage_tag": req.StageTag,
		"fsm_state": st, "version": ver, "auto_started_assay": autoStarted,
	}
	if voucher != nil {
		resp["system_voucher"] = map[string]any{"voucher_type": voucher.VoucherType, "curr_voucher_sha256": voucher.CurrVoucherSHA256, "ed25519_signature": voucher.Ed25519Signature, "engine": voucher.Engine}
	}
	mw.WriteJSON(w, http.StatusOK, resp)
}

// API-08 POST /api/v1/deals/{dealId}/assay/verify-frame
func (s *Server) handleAssayVerify(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	role := partyRole(claims(r), d)
	if role == "" {
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "only the buyer or seller can submit assay frames", false)
		return
	}
	var req struct {
		NexconnCallID      string   `json:"nexconn_call_id"`
		StageTag           string   `json:"stage_tag"`
		ChallengeNonce     string   `json:"challenge_nonce"`
		WasmBlurLaplacian  *float64 `json:"wasm_blur_laplacian"`
		FrameJPEGBase64    string   `json:"frame_jpeg_base64"`
		AudioPCMF32Base64  string   `json:"audio_pcm_f32_base64"`
		SampleRate         int      `json:"sample_rate"`
		AudioFFTRPMPeak    *float64 `json:"audio_fft_rpm_peak"`
		DetectedSerialText string   `json:"detected_serial_text"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.StageTag == "" {
		req.StageTag = "PRE_SHIPMENT"
	}
	if req.ChallengeNonce == "" {
		badRequest(w, r, "challenge_nonce required (call API-07 first)")
		return
	}
	if req.FrameJPEGBase64 == "" {
		badRequest(w, r, "frame_jpeg_base64 required")
		return
	}
	if req.NexconnCallID == "" {
		req.NexconnCallID = "call_nc_" + store.RandHex(4)
	}

	d.Op.Lock()
	defer d.Op.Unlock()
	st, _ := d.Machine.Snapshot()
	if req.StageTag == "PRE_SHIPMENT" && st != fsm.StateInspectionLive {
		invalidTransition(w, r, st, fsm.ActionMarkAssayVerified)
		return
	}

	var challenge *store.AssayChallenge
	var serial, refPHash, prePHash string
	var minRPM float64
	s.Store.ReadDeal(d, func(d *store.Deal) {
		if d.Challenge != nil {
			c := *d.Challenge
			challenge = &c
		}
		serial, minRPM, refPHash = d.RequiredSerial, d.MinMotorRPM, d.ReferencePHash
		for i := len(d.AssayLogs) - 1; i >= 0; i-- {
			if d.AssayLogs[i].StageTag == "PRE_SHIPMENT" && d.AssayLogs[i].AssayPassed && d.AssayLogs[i].FramePHashHex != "" {
				prePHash = d.AssayLogs[i].FramePHashHex
				break
			}
		}
	})
	reference := ""
	if req.StageTag == "POST_DELIVERY" {
		reference = prePHash
		if reference == "" {
			reference = refPHash
		}
	}

	failures := []string{}
	switch {
	case challenge == nil:
		failures = append(failures, "no active challenge (call API-07)")
	case challenge.Nonce != req.ChallengeNonce:
		failures = append(failures, "challenge_nonce mismatch")
	case time.Now().After(challenge.ExpiresAt):
		failures = append(failures, "challenge expired")
	case challenge.StageTag != req.StageTag:
		failures = append(failures, "stage_tag does not match challenge")
	}
	if req.WasmBlurLaplacian != nil && *req.WasmBlurLaplacian < minBlurLaplacian {
		failures = append(failures, fmt.Sprintf("frame too blurry: laplacian %.1f < %.0f", *req.WasmBlurLaplacian, minBlurLaplacian))
	}

	res := s.Rust.VerifyAssay(r.Context(), clients.AssayInput{
		FrameJPEGBase64: req.FrameJPEGBase64, ReferencePHashHex: reference, AudioPCMBase64: req.AudioPCMF32Base64,
		SampleRate: req.SampleRate, MinMotorRPM: minRPM, ClientReportedRPM: req.AudioFFTRPMPeak,
	})
	s.Store.Telemetry().RecordAssay(res.ComputeMs, res.Engine)
	if res.FrameError != "" {
		failures = append(failures, "frame: "+res.FrameError)
	}
	if res.AudioFFTRPMPeak != nil && minRPM > 0 && *res.AudioFFTRPMPeak < minRPM {
		failures = append(failures, fmt.Sprintf("motor RPM %.1f below required %.0f", *res.AudioFFTRPMPeak, minRPM))
	}
	passed := len(failures) == 0

	detected := req.DetectedSerialText
	serialSource := "client-ocr"
	if detected == "" {
		detected, serialSource = serial, "expected-plate (no server OCR)"
	}

	log := store.AssayLog{
		ID: "assay_" + store.RandHex(5), NexconnCallID: req.NexconnCallID, StageTag: req.StageTag, AssayPassed: passed,
		FramePHashHex: res.FramePHashHex, BlurLaplacian: req.WasmBlurLaplacian, AudioFFTRPMPeak: res.AudioFFTRPMPeak, RPMSource: res.RPMSource,
		DetectedSerialText: detected, RustComputeMs: res.ComputeMs, FailureReasons: failures, Engine: res.Engine, CreatedAt: time.Now().UTC(),
	}

	var voucher *store.Voucher
	if passed && req.StageTag == "PRE_SHIPMENT" {
		out, err := s.transition(r.Context(), d, fsm.ActionMarkAssayVerified, -1, role, map[string]any{
			"frame_phash_hex": res.FramePHashHex, "audio_fft_rpm_peak": res.AudioFFTRPMPeak, "nexconn_call_id": req.NexconnCallID,
			"stage_tag": req.StageTag, "assay_engine": res.Engine,
		})
		if err != nil {
			writeFSMError(w, r, err)
			return
		}
		voucher = &out.Voucher
		log.Ed25519SigHex = out.Voucher.Ed25519Signature
	}
	stNow, ver := d.Machine.Snapshot()
	log.FSMState = string(stNow)
	var channel string
	s.Store.UpdateDeal(d, func(d *store.Deal) {
		d.AssayLogs = append(d.AssayLogs, log)
		if passed {
			d.Challenge = nil // nonce is single-use once accepted
			if req.StageTag == "PRE_SHIPMENT" {
				for i := range d.Checklist {
					d.Checklist[i].Verified = true
				}
			}
		}
		channel = d.ChannelID
	})

	receiptExtras := map[string]any{
		"assay_id": log.ID, "assay_passed": passed, "stage_tag": log.StageTag, "frame_phash_hex": log.FramePHashHex,
		"audio_fft_rpm_peak": log.AudioFFTRPMPeak, "rpm_source": log.RPMSource, "detected_serial_text": detected,
		"blur_laplacian": req.WasmBlurLaplacian, "rust_compute_ms": res.ComputeMs, "engine": res.Engine,
		"failure_reasons": failures, "fsm_state": log.FSMState, "ed25519_sig_hex": log.Ed25519SigHex,
		"hamming_distance_vs_reference": res.HammingDistance,
	}
	text := fmt.Sprintf("Assay %s: pHash %s", map[bool]string{true: "PASSED", false: "FAILED"}[passed], log.FramePHashHex)
	if log.AudioFFTRPMPeak != nil {
		text += fmt.Sprintf(", %.1f RPM", *log.AudioFFTRPMPeak)
	}
	stream := s.Bridge.StreamGroup(r.Context(), channel, "usr_mudra_system_voucher", "x-mudra-assay-receipt", text, receiptExtras)
	s.addMessage(d, store.ChatMessage{
		SenderRole: "system", SenderName: "MUDRA Assay", MessageType: "x-mudra-assay-receipt",
		RawText: text, TranslatedText: text, Extras: receiptExtras, StreamID: stream.StreamID, Engine: res.Engine,
	})
	s.publishDeal(d)

	resp := map[string]any{
		"assay_passed": passed, "frame_phash_hex": log.FramePHashHex, "audio_fft_rpm_peak": log.AudioFFTRPMPeak,
		"detected_serial_text": detected, "rust_compute_ms": res.ComputeMs, "fsm_state": log.FSMState,
		"ed25519_sig_hex": log.Ed25519SigHex,
		// extras
		"version": ver, "failure_reasons": failures, "stage_tag": log.StageTag, "rpm_source": log.RPMSource,
		"serial_source": serialSource, "hamming_distance_vs_reference": res.HammingDistance,
		"engine":            map[string]string{"assay": res.Engine, "receipt_stream": stream.Engine},
		"receipt_stream_id": stream.StreamID,
	}
	if voucher != nil {
		resp["system_voucher"] = map[string]any{"voucher_type": voucher.VoucherType, "curr_voucher_sha256": voucher.CurrVoucherSHA256, "ed25519_signature": voucher.Ed25519Signature, "engine": voucher.Engine}
	}
	mw.WriteJSON(w, http.StatusOK, resp)
}
