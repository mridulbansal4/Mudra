# Responsible AI, Fairness & Governance — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (AI Ethics & Governance Lead — Amanda Askell, Dario Amodei & Mike Ross Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Models](./MODELS.md) · [Prompts](./PROMPTS.md) · [AI Evals](./AI_EVALS.md) · [Compliance](../06-security-compliance/COMPLIANCE.md)

---

## 1. Bias & Fairness Analysis Across Language, Region, Class & Device Tier

In Indian and cross-border commerce, an asymmetric AI system could unfairly favor fluent English speakers or wealthy corporate sellers over vernacular smallholders (`P-01` Rajesh in Tirupur, regional FPO farmers, or small workshop mechanics). We enforce four structural fairness guarantees:

| Fairness Dimension | Potential Bias Risk | Structural Mitigation in SAMADHAN-OS |
|---|---|---|
| **Linguistic & Dialect Parity** | A seller speaking fluent English might sound more "persuasive" to an LLM arbitrator (`M-04`) than a buyer speaking colloquial Tamil or rural Punjabi. | `M-04` (`P-M04-v1.2`) evaluates disputes primarily on **objective, language-independent cryptographic facts**: pre- vs. post-delivery 64-bit `pHash` Hamming distance, `rustfft` motor RPM measurements, `onServerCallLogReceived` call logs, and `System` channel timestamps—never on rhetorical polish. |
| **Caste, Gender & Regional Neutrality** | Surnames, honorifics, or regional accents influencing bargaining (`M-05`) or dispute split recommendations (`M-04`). | Prior to invoking `M-04`, buyer and seller names/locations are anonymized in the tribunal prompt context as `PARTY_BUYER` and `PARTY_SELLER`. Our eval suite (`AI_EVALS.md`) runs counterfactual name-swap invariance tests (asserting `0 bps` difference when swapping Tamil, Punjabi, Muslim, Dalit, or female persona names). |
| **Low-End Device & Lighting Equity** | Budget Android cameras in dimly lit workshops producing slightly noisier frames that could be falsely flagged as "defective." | Client WASM (`packages/assay-wasm-rs`) guides the seller in real time (`"Move 10cm closer / turn on torch"`) until Laplacian sharpness `>= 120.0` before capturing, and `phash.rs` uses illumination-invariant DCT low-frequency bins rather than raw RGB pixel diffs. |

---

## 2. Autonomy Slider & Mandatory Human-in-the-Loop (HITL) Gates

Following Andrej Karpathy's **Autonomy Slider** principle and Mike Ross's ethical rule (*"Does the AI make a decision that affects a person's money, health, liberty, or reputation without human review?"*):

| Workflow Stage | AI Autonomy Level | Human-in-the-Loop (HITL) & Deterministic Gate |
|---|---|---|
| **Stage 1: Bilingual Translation (`M-01`, `M-02`)** | **Level 4 (Automatic Streaming)** | Original vernacular text is always shown side-by-side above the streamed translation inside `<nc-bilingual-bubble>` with a 1-tap audio read-aloud (`<Volume2 />`) and `"Flag mistranslation"` button. |
| **Stage 2: Escrow Term Extraction (`M-01` → `F-04`)** | **Level 2 (Draft Proposal Only)** | `M-01` can only pre-fill a `DRAFT` `<nc-escrow-deal-card>`. Locking ₹1,45,000 requires an explicit, authenticated human button press (`API-06`) by the Buyer. |
| **Stage 3: Live Video & Audio Assay (`M-03` + Rust)** | **Level 3 (Co-Pilot Verification)** | Rust WASM + `M-03` highlights the serial plate and RPM readout inside `<nc-video-assay-receipt>`, and the Buyer visually sees the live `@nexconn/call` video stream before confirming shipment. |
| **Stage 4: Frozen Dispute Tribunal (`M-04` → `F-08`)** | **Level 2 (Mediation Recommendation)** | When `addGroupChannelFreezeList` locks a room, `M-04` streams a proposed basis-point split (`88% / 12%`) into `<nc-tribunal-verdict-card>`. **Funds never move until** either (a) both Buyer and Seller click `Accept Split`, OR (b) dispatched Human Arbitrator Meera (`P-04`) reviews `/dispatch` and executes `API-11`. |

---

## 3. Explainability & Verifiable Provenance

Every AI-generated message streamed via `sendGroupChannelStreamMessage` carries structured provenance in `customExtras`:
1. **`<nc-bilingual-bubble>`**: Shows source language code, target language code, model badge (`Gemini 2.5 Flash` or `Bhashini ULCA`), and extracted contract chips.
2. **`<nc-video-assay-receipt>`**: Displays the exact 16-char hex `pHash`, Laplacian sharpness score (`148.4`), FFT peak (`4,820 RPM`), and `onServerCallLogReceived` call ID.
3. **`<nc-tribunal-verdict-card>`**: Explicitly cites the `System` channel voucher hashes (`[SYS-VOUCHER #402]` vs `[SYS-VOUCHER #405]`) that justified the `88% / 12%` split.

---

## 4. Misuse Scenarios & Red-Team Defenses

1. **Deepfake / Virtual Camera Injection During `@nexconn/call`**:
   - *Scenario*: A scammer feeds a pre-recorded video into a virtual webcam.
   - *Mitigation*: `API-07` issues a randomized real-time **physical challenge nonce** (e.g., *"Hold up 3 fingers next to serial plate and tilt camera 20° left while running motor"*). `M-03` + Rust optical-flow/FFT checks verify live compliance with the challenge nonce.
2. **Coercive Off-Platform Payment Luring**:
   - *Scenario*: A scammer tries to send a personal UPI QR or phone number in chat to trick the buyer into paying outside `<nc-escrow-deal-card>`.
   - *Mitigation*: Rust `scrubber.rs` redacts raw phone numbers and personal UPI handles in `<300µs` prior to escrow lock and injects an inline safety warning in the user's native language.

---

## 5. Regulatory Alignment: MeitY IndiaAI Guidelines, Singapore Model AI Governance & EU AI Act

| Framework | Classification of SAMADHAN-OS | Compliance Implementation |
|---|---|---|
| **MeitY IndiaAI Governance Guidelines & Advisories (2024–2026)** | Commercial Mediation & Translation Assistant | Explicit watermark/labeling on all AI-streamed cards (`<nc-bilingual-bubble>`, `<nc-tribunal-verdict-card>`), zero non-consensual deepfake generation, and full Indian language parity via Bhashini. |
| **Singapore IMDA Model AI Governance Framework (GenAI 2024–2026)** | Human-over-the-Loop Commercial Decision Support (Relevant to **RCLOUD GLOBAL PTE. LTD.**) | Deterministic Go FSM boundaries, cryptographic provenance (`System` channel Ed25519 vouchers), and human arbitrator override in `/dispatch`. |
| **EU AI Act (Regulation (EU) 2024/1689)** | **Limited Risk (Article 50 — Transparency Obligations)** (Not High-Risk Annex III, as it is bilateral commercial escrow/mediation with human sign-off, not public judicial court administration or credit scoring) | Complies 100% with Article 50 transparency duties: users are clearly informed when interacting with `Chanakya AI Shopkeeper` (`/arena`) or `AI Tribunal` (`M-04`). |
