# Observability, Distributed Tracing & LLM Telemetry — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Observability Lead — Charity Majors Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Metrics](../01-product/METRICS.md) · [Performance](../03-engineering/PERFORMANCE.md) · [Runbook](./RUNBOOK.md)

---

## 1. End-to-End OpenTelemetry Distributed Tracing Across All 3 Runtimes

Every request entering SAMADHAN-OS from `apps/web` or `apps/mobile-expo` carries an `X-Samadhan-Trace-Id` (`traceparent` W3C standard) propagated seamlessly across:
1. **Go 1.24 (`deal-engine-go` `:4002`)** via `go.opentelemetry.io/otel`
2. **Rust 1.85 (`assay-verifier-rs` `:4003`)** via `tracing` + `opentelemetry-otlp`
3. **Node.js 22 (`nexconn-bridge-node` `:4001`)** via `@opentelemetry/sdk-node`

```text
Trace [tr_991a8f2c1b] POST /api/v1/deals/d_8821/translate-stream (Total: 264.4ms)
├── [Go :4002]   auth_and_rate_limit_check ............................ 0.32 ms
├── [Rust :4003] scrubber::scrub_dpdp_pii (Aho-Corasick + Regex) ...... 0.18 ms (0 PII redacted)
├── [Rust :4003] lexicon::inject_sku_terms ("Juki MO-6814S") .......... 0.08 ms
└── [Node :4001] gemini_2_5_flash_sse -> sendGroupChannelStreamMessage  263.82 ms (TTFT: 218ms)
```

---

## 2. Structured PII-Redacted JSON Logging

Every log entry emitted by Go (`slog`), Rust (`tracing_subscriber::fmt::json()`), and Node (`pino`) adheres to a strict schema with zero raw PII:
```json
{
  "timestamp": "2026-11-10T18:45:12.402Z",
  "level": "INFO",
  "service": "assay-verifier-rs",
  "trace_id": "tr_991a8f2c1b",
  "deal_id": "d_8821_sandbox",
  "event": "video_assay_verified",
  "phash_hex": "a4f19c83e2b0771d",
  "audio_fft_rpm": 4820.5,
  "rust_compute_ms": 3.71,
  "ed25519_signed": true
}
```
- **Forbidden in Logs**: `NEXCONN_SECRET_KEY`, `GEMINI_API_KEY`, `access_token`, raw un-scrubbed chat strings, Aadhaar/PAN/phone numbers, and base64 frame buffers.

---

## 3. LLM & Nexconn SDK Observability Metrics

Tracked in Prometheus / Grafana and exposed in summary form via `GET /api/v1/traction/telemetry` (`API-18` → `/traction`):
- `samadhan_nexconn_issued_tokens_total` (Counter by `role`, `platform`)
- `samadhan_nexconn_connected_maus_total` (Gauge matching `console.nexconn.ai` Active Users)
- `samadhan_go_fsm_transition_duration_microseconds` (Histogram by `prev_state`, `next_state`)
- `samadhan_rust_pii_scrub_duration_microseconds` (Histogram)
- `samadhan_rust_assay_compute_duration_milliseconds` (Histogram)
- `samadhan_llm_stream_ttft_milliseconds` (Histogram by `model_id`: `M-01`..`M-05`, `provider`: `gemini` | `bhashini` | `together`)
- `samadhan_llm_token_cost_paise_total` (Counter tracking real-time ₹ spend per deal)

---

## 4. Alert Thresholds & CERT-In 180-Day Log Retention

| Alert Name | Condition | Severity | Automated Action |
|---|---|---|---|
| `NexconnTokenIssueErrorRateHigh` | `> 1%` 5xx on `API-01` over 2m | **P0 (Critical)** | Pages Dev 1; checks `NEXCONN_APP_KEY` / `api.nexconn.ai` reachability. |
| `LlmStreamTtftDegraded` | `p95 TTFT > 1,800ms` on `M-01` | **P1 (Warning)** | Circuit breaker automatically shifts traffic to Bhashini ULCA / Together AI. |
| `GoFsmVersionConflictSpike` | `> 15` HTTP `409` responses/min on `API-06` | **P2 (Info)** | Logs concurrent click burst in deal room; verifies UI button debounce. |

- **CERT-In Compliance (April 2022 Directions)**: All container clocks synchronize via chrony NTP (`time.google.com` / `samay1.nic.in`), and structured security/audit logs are retained in encrypted append-only storage in `ap-south-1` (Mumbai, India) for **180 days**.
