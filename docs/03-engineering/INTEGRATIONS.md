# External Systems & DPI Integrations — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Integrations & India Stack Lead — Dr. R.S. Sharma Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Nexconn SDK Manual](./NEXCONN_SDK_MANUAL.md) · [API Spec](./API_SPEC.md) · [Models](../04-ai/MODELS.md)

---

## 1. Integration Summary Matrix

| Integration ID | System / Provider | Purpose in SAMADHAN-OS | Auth Mechanism | Latency / SLA | Cost (Hackathon MVP / Production) |
|---|---|---|---|---|---|
| **INT-01** | **Nexconn Cloud Platform (`https://api.nexconn.ai` & `console.nexconn.ai`)** | Core real-time IM (`Direct`, `Group`, `System`, `Open`, `Community`), custom Lit Chat UI, WebRTC Audio/Video Calls, v4 Server Streaming & Channel Freeze. | `appKey` + `secretKey` (Backend) / Issued `accessToken` (Client) | `<80ms` IM edge / `<200ms` WebRTC signaling | **100% Free** (10k free MAUs + 10k free Call SDK mins; 1st Prize = $20,640 2-Yr Free Plan) |
| **INT-02** | **Google Gemini 2.5 API (`generativelanguage.googleapis.com`)** | `M-01` Cross-lingual streaming translation + JSON contract extraction; `M-03` Multimodal video frame defect check; `M-04` AI Tribunal settlement synthesizer; `M-05` `/arena` Shopkeeper. | `GEMINI_API_KEY` (`x-goog-api-key` over HTTP/2 SSE) | `<280ms` TTFT (`Flash`) / `<400ms` (`Pro`) | Free tier / `$0.15 per 1M input tokens` (`<₹0.40` per full deal) |
| **INT-03** | **Bhashini ULCA National Language Translation Mission (`https://bhashini.gov.in/ulca`)** | Government of India 22-language NMT + Conformer Indic ASR (`M-02`) for Tamil, Hindi, Punjabi, Marathi, Malayalam, Telugu, Kannada, and Bengali voice notes. | `BHASHINI_USER_ID` + `BHASHINI_ULCA_API_KEY` | `<450ms` ASR + NMT pipeline | Free Government of India Digital Public Infrastructure (DPI) sandbox |
| **INT-04** | **Together AI (`api.together.xyz`)** | High-speed open-weights fallback (`Llama-3.3-70B-Instruct-Turbo`) for `/arena` (`M-05`) and `M-01` failover, plus `/hallmark` visual comp support. | `TOGETHER_API_KEY` (`Bearer`) | `<220ms` TTFT | `$0.88 / 1M tokens` |
| **INT-05** | **UPI ASBA One-Time Mandate / Razorpay Route PA-Escrow Sandbox** | Blocks buyer funds in bank account / licensed nodal escrow upon `<nc-escrow-deal-card>` lock and executes instant split (`88% / 12%`) upon tribunal resolution (`API-17`). | `RAZORPAY_KEY_ID` + `RAZORPAY_WEBHOOK_SECRET` (HMAC-SHA256) | `<300ms` webhook callback | Sandbox `₹0` / Production `0.2%–0.5%` PA-Escrow rail fee |
| **INT-06** | **ONDC Beckn Protocol (`on_confirm` / `IGM 2.0` Issue & Grievance Management)** | Maps SAMADHAN-OS deal rooms and Ed25519 `System` channel vouchers (`E-08`) to standard ONDC Beckn order and ODR (Online Dispute Resolution) payloads. | Ed25519 Beckn `Authorization` header (`Signature keyId=...`) | `<200ms` | Open protocol (`₹0`) |
| **INT-07** | **PostHog Cloud + Internal Go Telemetry (`API-18`)** | Tracks DPDP-compliant funnel events (`METRICS.md`) and powers the public `/traction` live MAU dashboard. | `VITE_POSTHOG_KEY` | Async non-blocking | Free tier (`1M events/mo`) |

---

## 2. Deep-Dive Integration Specifications & Failure Handling

### 2.1 `INT-01` — Nexconn Cloud Platform (`https://api.nexconn.ai`)
- **Complete Step-by-Step Manual**: Because Nexconn is the centerpiece of this hackathon (25% SDK Integration weight + 15% MAU Traction bonus), we have dedicated an entire standalone engineering manual to it: see **[NEXCONN_SDK_MANUAL.md](./NEXCONN_SDK_MANUAL.md)** for full `console.nexconn.ai` setup, package installation, boot sequence, custom Lit component registration, Call SDK escalation, and v4 Server SDK streaming code.

### 2.2 `INT-02` & `INT-03` — Dual-Engine AI & Indic Language Pipeline (`Gemini 2.5` + `Bhashini ULCA`)
- **Sandbox Access Steps**:
  1. **Google AI Studio**: Generate `GEMINI_API_KEY` at [https://aistudio.google.com](https://aistudio.google.com).
  2. **Bhashini ULCA Portal**: Register at [https://bhashini.gov.in/ulca/user/register](https://bhashini.gov.in/ulca/user/register) → Navigate to *My Profile* → Generate `ulcaApiKey` and `userID` → Call the Pipeline Config endpoint (`https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline`) for `asr` + `translation` (`ta` ↔ `hi` ↔ `en`).
- **Circuit-Breaker & Failover Logic in `services/nexconn-bridge-node`**:
  - Every request to `API-05` (`POST /api/v1/deals/:dealId/translate-stream`) first passes through the **Rust `<300µs` PII Scrubber** (`services/assay-verifier-rs`).
  - Primary stream opens an HTTP/2 SSE connection to `gemini-2.5-flash`. If time-to-first-token exceeds `1,800ms` or returns HTTP `429`/`503`, the circuit breaker immediately switches to **Bhashini ULCA** (for Indic translation/ASR) or **Together AI (`INT-04`)**, piping tokens seamlessly into `MessageManagementApi.sendGroupChannelStreamMessage` so the user inside `<nc-chat-ui-app-provider>` never sees an error bubble.

### 2.3 `INT-05` & `INT-06` — UPI ASBA / Razorpay Route Escrow Sandbox & ONDC IGM 2.0 Webhook (`API-17`)
- **Why This Matters**: In our War Room Council review, Seat 5 (**Harvey Specter ⚔️ R5 Chuck Rhoades**) flagged that holding raw customer fiat in an unlicensed startup bank account violates RBI Payment Aggregator guidelines (`R-08`).
- **How We Integrate Cleanly**:
  1. When Buyer clicks `Lock ₹1,45,000 Escrow` inside `<nc-escrow-deal-card>`, `services/deal-engine-go` (`API-06`) generates a deterministic **UPI One-Time Mandate (`UMN`) / Razorpay Route Linked Account hold** (`hold_until_verified: true`).
  2. In Hackathon MVP mode, our built-in **Sandbox Bank Simulator** signs a real `X-Razorpay-Signature` HMAC-SHA256 webhook payload and posts it to `POST /api/v1/webhooks/upi-ondc` (`API-17`):
     ```go
     // services/deal-engine-go/internal/handlers/webhooks.go
     func VerifyWebhookHMAC(payload []byte, signatureHex string, secret string) bool {
         mac := hmac.New(sha256.New, []byte(secret))
         mac.Write(payload)
         expected := hex.EncodeToString(mac.Sum(nil))
         return hmac.Equal([]byte(expected), []byte(signatureHex))
     }
     ```
  3. Upon settlement (`API-11`), if the AI + Human Tribunal orders an `88% / 12%` split (`buyer_refund_bps: 1200`, `seller_payout_bps: 8800`), the Go engine dispatches the split transfer instruction (`₹1,27,600` to Seller Vikram, `₹17,400` refund to Buyer Rajesh) and logs an ONDC IGM 2.0-compatible `on_issue_status` resolution payload signed with Ed25519 into the Nexconn `System` channel (`SystemMessagesApi`).
