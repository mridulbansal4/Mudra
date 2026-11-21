package clients

import (
	"context"
	"log/slog"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/hrtime"
)

// Rust is the client for services/assay-verifier-rs (:4003) with Go fallbacks.
type Rust struct {
	svc    *service
	signer *GoSigner
}

// NewRust builds the client. signer is the Go fallback Ed25519 signer.
func NewRust(baseURL, hmacSecret string, signer *GoSigner) *Rust {
	return &Rust{svc: newService("assay-verifier-rs", baseURL, hmacSecret), signer: signer}
}

// RunProber keeps reachability fresh.
func (r *Rust) RunProber(ctx context.Context) { r.svc.runProber(ctx, 5*time.Second) }

// Status for /health.
func (r *Rust) Status() Status { return r.svc.status() }

// Reachable reports last known reachability.
func (r *Rust) Reachable() bool { return r.svc.isReachable() }

// GoPublicKeyHex is the fallback signer's public key.
func (r *Rust) GoPublicKeyHex() string { return r.signer.PublicKeyHex() }

// ScrubPII redacts DPDP PII via Rust, falling back to Go regexes.
func (r *Rust) ScrubPII(ctx context.Context, text string) ScrubResult {
	var out ScrubResult
	if err := r.svc.postJSON(ctx, "/internal/scrub-pii", map[string]string{"text": text}, &out); err == nil {
		out.Engine = EngineRust
		if out.Categories == nil {
			out.Categories = []string{}
		}
		return out
	}
	return ScrubPIIGo(text)
}

// PHashDiff returns the Hamming distance via Rust or Go.
func (r *Rust) PHashDiff(ctx context.Context, a, b string) (int, string, error) {
	var out struct {
		HammingDistance int `json:"hamming_distance"`
	}
	if err := r.svc.postJSON(ctx, "/internal/phash-diff", map[string]string{"a_hex": a, "b_hex": b}, &out); err == nil {
		return out.HammingDistance, EngineRust, nil
	}
	d, err := HammingGo(a, b)
	return d, EngineGoFallback, err
}

// SignVoucher signs a hash-chained voucher via Rust, falling back to Go Ed25519.
func (r *Rust) SignVoucher(ctx context.Context, dealID, voucherType string, payload map[string]any, prevHashHex string) SignedVoucher {
	var out SignedVoucher
	req := map[string]any{"deal_id": dealID, "voucher_type": voucherType, "payload": payload, "prev_hash_hex": prevHashHex}
	if err := r.svc.postJSON(ctx, "/internal/sign-voucher", req, &out); err == nil && out.CurrHashHex != "" && out.SignatureHex != "" {
		out.Engine = EngineRust
		if local, err := ChainHash(prevHashHex, dealID, voucherType, payload); err == nil && local != out.CurrHashHex {
			slog.Warn("rust voucher hash differs from Go canonical formula (canonical_json mismatch?)", "deal_id", dealID, "type", voucherType)
		}
		return out
	}
	sv, err := r.signer.Sign(dealID, voucherType, payload, prevHashHex)
	if err != nil {
		slog.Error("go voucher signing failed", "err", err)
	}
	return sv
}

// AssayInput is what the Go handler passes in.
type AssayInput struct {
	FrameJPEGBase64   string
	ReferencePHashHex string
	AudioPCMBase64    string
	SampleRate        int
	MinMotorRPM       float64
	ClientReportedRPM *float64
}

// AssayOutput merges Rust or Go results.
type AssayOutput struct {
	FramePHashHex     string   `json:"frame_phash_hex,omitempty"`
	HammingDistance   *int     `json:"hamming_distance,omitempty"`
	AudioFFTRPMPeak   *float64 `json:"audio_fft_rpm_peak,omitempty"`
	BearingNoiseRatio *float64 `json:"bearing_noise_ratio,omitempty"`
	RPMOk             *bool    `json:"rpm_ok,omitempty"`
	ComputeMs         float64  `json:"compute_ms"`
	Engine            string   `json:"engine"`
	RPMSource         string   `json:"rpm_source,omitempty"`
	FrameError        string   `json:"frame_error,omitempty"`
}

// VerifyAssay forwards to Rust /internal/verify-assay or computes in Go.
func (r *Rust) VerifyAssay(ctx context.Context, in AssayInput) AssayOutput {
	req := map[string]any{}
	if in.FrameJPEGBase64 != "" {
		req["frame_jpeg_base64"] = in.FrameJPEGBase64
	}
	if in.ReferencePHashHex != "" {
		req["reference_phash_hex"] = in.ReferencePHashHex
	}
	if in.AudioPCMBase64 != "" {
		req["audio_pcm_f32_base64"] = in.AudioPCMBase64
		sr := in.SampleRate
		if sr <= 0 {
			sr = 48000
		}
		req["sample_rate"] = sr
	}
	if in.MinMotorRPM > 0 {
		req["min_motor_rpm"] = in.MinMotorRPM
	}
	var out AssayOutput
	if err := r.svc.postJSON(ctx, "/internal/verify-assay", req, &out); err == nil {
		out.Engine = EngineRust
		if out.AudioFFTRPMPeak != nil {
			out.RPMSource = "rust-fft"
		} else if in.ClientReportedRPM != nil {
			out.AudioFFTRPMPeak, out.RPMSource = in.ClientReportedRPM, "client-reported"
		}
		return out
	}
	return verifyAssayGo(in)
}

func verifyAssayGo(in AssayInput) AssayOutput {
	start := hrtime.Now()
	out := AssayOutput{Engine: EngineGoFallback}
	if in.FrameJPEGBase64 != "" {
		if img, err := DecodeBase64Payload(in.FrameJPEGBase64); err != nil {
			out.FrameError = "frame base64 invalid: " + err.Error()
		} else if ph, err := PHashGo(img); err != nil {
			out.FrameError = err.Error()
		} else {
			out.FramePHashHex = ph
			if in.ReferencePHashHex != "" {
				if d, err := HammingGo(ph, in.ReferencePHashHex); err == nil {
					out.HammingDistance = &d
				}
			}
		}
	}
	if in.AudioPCMBase64 != "" {
		if pcm, err := DecodeBase64Payload(in.AudioPCMBase64); err == nil {
			if rpm, err := RPMFromPCMGo(pcm, in.SampleRate); err == nil {
				out.AudioFFTRPMPeak, out.RPMSource = &rpm, "go-goertzel"
			}
		}
	}
	if out.AudioFFTRPMPeak == nil && in.ClientReportedRPM != nil {
		out.AudioFFTRPMPeak, out.RPMSource = in.ClientReportedRPM, "client-reported"
	}
	if out.AudioFFTRPMPeak != nil && in.MinMotorRPM > 0 {
		ok := *out.AudioFFTRPMPeak >= in.MinMotorRPM
		out.RPMOk = &ok
	}
	out.ComputeMs = float64(hrtime.Since(start).Microseconds()) / 1000
	return out
}
