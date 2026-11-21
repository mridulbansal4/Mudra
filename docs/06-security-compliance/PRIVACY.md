# Data Privacy, India DPDP Act 2023 & Singapore PDPA Specification - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Data Protection Officer - Dr. R.S. Sharma & Apar Gupta Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Data Model](../03-engineering/DATA_MODEL.md) · [Security Architecture](./SECURITY_ARCHITECTURE.md) · [Compliance](./COMPLIANCE.md)

---

## 1. Dual-Jurisdiction Privacy Mandate (India DPDP Act 2023 + Singapore PDPA)

Because MUDRA-OS serves Indian MSMEs, students, and traders (`P-01`..`P-03`) while running on **RCLOUD GLOBAL PTE. LTD.**'s Singapore-headquartered Nexconn platform (`P-04`, `P-05`), we comply simultaneously with:
1. **India Digital Personal Data Protection (DPDP) Act, 2023 & DPDP Rules, 2025**: Itemized bilingual notice, affirmative consent before processing, data minimization, `<300µs` pre-LLM PII scrubbing, and 1-click Data Principal rights (Access, Correction, Erasure, Grievance Redressal).
2. **Singapore Personal Data Protection Act (PDPA, 2012 / 2021 Amendments)**: Purpose limitation, notification of cross-border transit over `api.nexconn.ai`, and verifiable consent logs.

---

## 2. Personal Data Inventory (`E-01` – `E-10`)

| Data Field & Entity | Purpose of Processing | Legal Basis (DPDP s.6 / PDPA) | Who Sees It | Retention & Disposal |
|---|---|---|---|---|
| `users.display_name` & `preferred_locale` (`E-01`) | Render participant name & route bilingual translations (`<nc-bilingual-bubble>`) | Affirmative Consent at `/auth` & `/onboarding` | Deal room counterparty, assigned arbitrator (`P-04`), Nexconn IM (`issueAccessToken`) | Purged within `24h` of Data Principal Erasure request. |
| `bilingual_messages.scrubbed_source_text` (`E-05`) | Cross-lingual commercial negotiation & contract term extraction | Affirmative Consent / Contractual Necessity | Counterparty + **Scrubbed** text (`[REDACTED_DPDP_PII]`) sent to `M-01` (zero retention) | `90 days` post-deal or immediate purge upon erasure request. |
| `video_assay_logs.frame_phash_hex` & `audio_fft_rpm_peak` (`E-06`) | Prove physical machine/gadget condition & serial number during `@nexconn/call` | Affirmative Consent at Step 2 of `/onboarding` | Counterparty, Arbitrator (`P-04`), Rust `assay-verifier-rs` (`:4003`) | Stores **only** 64-bit `pHash` & RPM float (`90 days`); raw video frames are discarded after hashing unless dispute is raised. |
| `escrow_contracts.upi_mandate_umn` (`E-04`) | Execute escrow lock/release/split webhook (`API-17`) | Contractual / Statutory Obligation | Go `deal-engine-go` (`:4002`) - stored masked (`****8821@okaxis`) | `5 years` (RBI statutory financial record). |
| `system_audit_vouchers` (`E-08`) | Immutable proof of consent, escrow state, and tribunal settlement | Legal Obligation & Legitimate Audit Use | Read-only user `System` channel + `/guide` verifier | Hash chain (`SHA-256` + `Ed25519`) contains **zero raw PII**, surviving erasure without breaking audit integrity! |

---

## 3. Verifiable Consent Flow & Itemized Notice Text (Logged to Nexconn `System` Channel)

At Step 2 of `/onboarding` (and inside the `/auth` footer), users are presented with a plain-language, itemized notice available in **English, Tamil, Hindi, Marathi, Punjabi, and Malayalam** (DPDP Act 2023 Section 5(3) mandate):

> **MUDRA-OS Data Protection Notice (DPDP Act 2023 & Singapore PDPA)**
> 1. **What we collect**: Your display name, language preference, chat messages (automatically scrubbed of Aadhaar/PAN/phone numbers in `<300µs` by our Rust privacy filter), and product hardware inspection frames/audio during live `@nexconn/call` video checks.
> 2. **Why we collect it**: Exclusively to translate your deal conversation, verify product condition (`pHash` & motor RPM), and resolve escrow disputes.
> 3. **Your Rights**: You may withdraw consent, export your deal ledger, or erase your personal data at any time via **Settings → Privacy & DPDP Rights** (`DELETE /api/v1/privacy/erase`) or by contacting our Grievance Officer (`dpo@mudra-os.dev`, SLA `<72 hours`).

**Our Technical Innovation**: The moment the user clicks **Agree & Continue**, `services/assay-verifier-rs` signs a `DPDP_CONSENT` voucher (`E-08`) with Ed25519 and dispatches it via `@nexconn/server-sdk`'s `SystemMessagesApi` directly into the user's read-only **`System` channel** inside `<nc-chat-ui-app-provider>`. Both the user and the platform hold an unforgeable cryptographic consent receipt!

---

## 4. Children's Data & Privacy-by-Design Safeguards

1. **Age Gate & Commercial Scope (DPDP Act Section 9)**: B2B and P2P escrow contract creation (`/auth` & `/app`) requires users to confirm they are `18+` (competent to contract under Section 11 of the Indian Contract Act, 1872). Our campus `/arena` bargaining game collects **zero personal data** (uses anonymous ephemeral `arena_guest_<id>` tokens, zero behavioral ad tracking).
2. **Rust `<300µs` Pre-Flight PII Redactor (`services/assay-verifier-rs/src/scrubber.rs`)**:
   - Before any chat string reaches Google Gemini 2.5 or Bhashini (`API-05`), Rust strips 12-digit Aadhaar numbers, 10-char PAN cards, 10-digit mobile numbers, credit/debit card numbers (Luhn check), and bank IFSC/account numbers.
3. **Cryptographic Separation of PII from Hash Ledger**:
   - Because `system_audit_vouchers` (`E-08`) hashes only `(prev_hash, deal_room_id, voucher_type, amount_paise, timestamp)`, executing a Data Principal Erasure (`DELETE /api/v1/privacy/erase`) deletes `users.display_name` and `bilingual_messages` without invalidating a single Ed25519 audit signature!
