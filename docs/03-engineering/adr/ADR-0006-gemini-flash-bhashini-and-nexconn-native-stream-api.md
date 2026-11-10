# ADR-0006: Gemini 2.5 Flash/Pro + Bhashini Indic Pipeline Delivered via Native Nexconn v4 Server Stream APIs
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (AI & Streaming Lead — Dev 4) · Status: Accepted · Last updated: 2026-11-10
> Related: [Models](../../04-ai/MODELS.md) · [Prompts](../../04-ai/PROMPTS.md) · [Nexconn SDK Manual](../NEXCONN_SDK_MANUAL.md)

---

## Status
`Accepted`

## Context & Problem Statement
Most hackathon teams call an LLM from the frontend or a simple REST endpoint, wait 4–6 seconds, and post a static message—or open a separate custom WebSocket that bypasses Nexconn. Furthermore, sending raw Indian user messages to external LLMs risks leaking Aadhaar/phone/bank PII under the India DPDP Act 2023 (`R-09`).

## Decision Drivers
- Achieve `< 280ms` Time-To-First-Token (TTFT) for bilingual bargaining translations (`M-01`) and AI Tribunal briefs (`M-04`).
- Use Nexconn's native v4 streaming APIs (`sendDirectChannelStreamMessage` and `sendGroupChannelStreamMessage`) rather than side-channel WebSockets so tokens stream natively inside `<nc-chat-ui-app-provider>`.
- Guarantee `1.000` recall on Indian PII redaction (`Aadhaar`, `PAN`, `UPI VPA`, `IFSC`, phone numbers) in `< 300µs` before any text leaves our server boundary (`R-09`).

## Considered Options
1. **Option A: Client-side LLM calls or non-streaming `POST` message injection**: Rejected—exposes API keys, incurs 4–6s blocking wait times, and fails to showcase Nexconn's v4 native stream endpoints.
2. **Option B: Single LLM provider without Indic ASR or PII redaction**: Rejected—poor accuracy on colloquial Tamil/Marathi/Hindi voice notes and violates DPDP Act 2023 data minimization.
3. **Option C: Rust `< 300µs` Aho-Corasick Pre-Scrubber (`POST /internal/scrub-pii`) + Gemini 2.5 Flash/Pro & Bhashini ULCA ASR + Native `@nexconn/server-sdk@0.1.2` `sendGroupChannelStreamMessage` / `sendDirectChannelStreamMessage`**.

## Decision Outcome
Chosen option: **Option C**.
1. **Rust Pre-Flight DPDP PII Scrubber (`<300µs`)**: Every message routed to `API-05` passes through `services/assay-verifier-rs` (`aho-corasick` + Verhoeff checksum) to redact personal identifiers before external LLM transit.
2. **Dual-Engine Model Routing (`Gemini 2.5 Flash/Pro` + `Bhashini ULCA` + `Together AI`)**:
   - `M-01` (`gemini-2.5-flash`) handles `<280ms` TTFT cross-lingual streaming translation + JSON contract term extraction, with automatic circuit-breaker failover to **Bhashini ULCA** (`M-02`) and **Together AI (`Llama-3.3-70B`)**.
3. **100% Native Nexconn v4 Server Streaming**:
   - All AI responses (`M-01`, `M-04`, `M-05`) are delivered exclusively through `@nexconn/server-sdk@0.1.2`'s native `MessageManagementApi.sendGroupChannelStreamMessage` (`POST /v4/group-channel/message/stream/send`) and `MessageManagementApi.sendDirectChannelStreamMessage` (`POST /v4/direct-channel/message/stream/send`).

### Positive Consequences
- Real-time token streaming inside `Direct` (`/arena`) and `Group` (`/app`, `/dispatch`) channels using official `@nexconn/server-sdk@0.1.2` methods.
- Zero raw PII exposure to third-party foundation models (`1.000` recall gate enforced in `.github/workflows/ai-evals.yml`).

### Negative Consequences & Mitigations
- **External LLM or Bhashini API rate-limiting during high-concurrency campus bursts** → Mitigated by a `2.5s` circuit breaker that fails over to Together AI (`Llama-3.3-70B-Instruct`) and pre-cached deterministic demo embeddings (`R-07`, `R-08`).

