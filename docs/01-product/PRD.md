# Product Requirements Document (PRD) - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Product Management Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Personas](./PERSONAS.md) · [User Journeys](./USER_JOURNEYS.md) · [User Stories](./USER_STORIES.md) · [Features](./FEATURES.md) · [Architecture](../03-engineering/ARCHITECTURE.md)

---

## 1. Background & Problem Statement (With Empirical Data)

Across India, Southeast Asia, and global cross-border trade, high-ticket B2B and P2P commerce suffers from a structural **trust-and-communication chasm**:
- **₹38,000+ Crore ($4.5B+ USD) in India & $48B+ Globally Lost Annually**: According to ONDC Network Dispute Benchmarks ([ondc.org](https://ondc.org)), RBI Payment Fraud Reports ([rbi.org.in](https://www.rbi.org.in)), and IRDAI claim grievance studies ([irdai.gov.in](https://irdai.gov.in)), counterparty fraud, advance-payment vanish scams, counterfeit box swaps, and "No Trouble Found" (NTF) reverse logistics destroy 18–32% of net merchant margin.
- **Language Fragmentation**: Over 72% of Indian MSME manufacturers, FPO mandi coordinators, and regional dealers operate primarily in regional languages (Tamil, Hindi, Marathi, Punjabi, Malayalam, Telugu, Bengali). Moving negotiations from directories (IndiaMART, OLX, e-NAM) onto unmoderated WhatsApp threads corrupts technical tolerances, voltages, moisture grades, and delivery SLAs.
- **Static Photo Obsolescence**: In 2025–2026, generative image editing allows bad actors to fabricate damaged product photos or spoof serial number stickers in seconds. Static image uploads no longer prove physical condition.
- **14-Day Dispute Paralysis**: Traditional marketplace support desks (Zendesk, Freshdesk, Intercom, Chatwoot) separate the buyer-seller conversation from the payment state and dispute resolution queue, turning simple defects into 2-week email battles.

---

## 2. Goals & Non-Goals

### 2.1 Product Goals
1. **Unify All 3 Nexconn Marketplace & Support (`PS-03`) Sub-Prompts**: Deliver *(1) Buyer-seller 1-on-1 & Group chat*, *(2) Human agent dispatch center*, and *(3) Multi-language translated chat* inside one cohesive transactional workspace.
2. **Beginner-First Story UX**: Guide any first-time visitor or exhausted hackathon judge from `/` (Story Landing) → `/auth` (1-Tap Persona Login) → `/onboarding` (45s Setup + Webcam Fallback) → `/app` or `/sandbox` (4-Stage Deal Story Bar) with zero dead ends.
3. **Sub-Second Cross-Lingual Negotiation (`F-03`)**: Stream live translated speech/text and extracted JSON contract terms in `<280ms` time-to-first-token using `@nexconn/server-sdk`'s native `sendGroupChannelStreamMessage`.
4. **Live WebRTC Video & Audio Forensic Assay (`F-05`, `F-06`)**: Escalate any chat room into a 1:1 `@nexconn/call` HD video inspection with 60fps Rust WASM serial-plate lock, server-side perceptual frame hashing (`pHash`), audio FFT motor/fan RPM check, and `onServerCallLogReceived` timeline receipts.
5. **90-Second Freeze-Locked Dispute Arbitration (`F-07`, `F-08`)**: Lock contested rooms in `<150ms` via `GroupChannelModerationApi.addGroupChannelFreezeList`, dispatch a human arbitrator from `/dispatch`, and stream an AI Tribunal settlement split into `<nc-tribunal-verdict-card>`.
6. **Verifiable Hackathon MAU Traction (`F-11`, `F-12`, `F-13`)**: Generate `500–1,000+` real connected unique `userId`s in `console.nexconn.ai` via `/sandbox` and `/arena`.

### 2.2 Non-Goals
1. Not building a static e-commerce catalog cart (we are the **real-time conversational deal & escrow closing layer** that plugs into any listing or shared link).
2. Not custodying unregulated public fiat deposits in a bank account owned by Team `Chanakya` during the hackathon MVP (we orchestrate UPI ASBA / licensed RBI PA-Escrow webhooks via `API-17`).
3. Not using generic Python microservice wrappers in the latency-critical request path.

---

## 3. Success Metrics

| Metric Category | Metric Name | Baseline (WhatsApp / Legacy Tickets) | MVP (Hackathon) Target | v1 (Production) Target |
|---|---|---|---|---|
| **North Star** | Verified Dispute-Free Deal Completion Rate | `< 58%` on out-of-state P2P/MSME leads | `> 92%` in sandbox & pilot trials | `> 96%` across ₹500 Cr GMV |
| **Speed** | Time from Dispute Raised to Binding Settlement | `7 – 21 days` | `< 90 seconds` | `< 3 minutes` |
| **SDK Latency** | Cross-Lingual Stream First-Token Latency (`API-05`) | N/A (manual copy-paste into translate) | `< 280 ms` p50 / `< 480 ms` p95 | `< 150 ms` p50 |
| **Systems Latency** | Go 1.24 Escrow FSM State Transition (`API-06`) | `400 – 1,200 ms` | `< 1.2 ms` p99 (in-engine) | `< 0.8 ms` p99 |
| **Forensic Speed** | Rust 1.85 `pHash` + Audio FFT + Ed25519 Sign (`API-08`) | Manual human review (hours) | `< 5.0 ms` (Rust) + `< 900 ms` (Vision) | `< 3.0 ms` (Rust) |
| **Traction** | Verified Connected `userId`s (MAUs) in `console.nexconn.ai` | `0` | `500 – 1,000+` real users | `50,000+` monthly active traders |

---

## 4. Personas Summary

Refer to [PERSONAS.md](./PERSONAS.md) for full dossiers:
- **`P-01` Rajesh Natarajan (39, Tirupur MSME Buyer, Tamil)**: Buys refurbished textile machinery; needs Tamil ↔ Hindi translation, live motor video/audio RPM proof, and milestone escrow.
- **`P-02` Vikramjeet Singh (44, Ludhiana Machinery Dealer, Hindi/Punjabi)**: Wants serious buyers who lock escrow upfront and cannot falsely claim post-delivery damage after signing off on a live `@nexconn/call` video inspection.
- **`P-03` Aarav Mehta (21, Bengaluru Campus Thrift & Used-GPU Trader, English/Hindi/Marathi)**: Uses shared deal links for hostel electronics sales and shares `/arena` (60s AI Shopkeeper Bargaining Challenge) across college WhatsApp groups.
- **`P-04` Meera Krishnan (32, Chennai/Singapore Dispute Arbitrator, English/Tamil/Hindi)**: Uses `/dispatch` to step into frozen `Group` channels, inspect signed `System` vouchers, and finalize AI Tribunal splits in 90 seconds.
- **`P-05` Exhausted Hour-9 Hackathon Judge (2 AM Mode)**: Uses `/` → `/sandbox` (1-Click Split-Screen Buyer + Seller + AI Sandbox with simulated HD camera fallback) and checks `/traction` + `console.nexconn.ai` `App Key` telemetry.

---

## 5. Scope Matrix: MVP (Hackathon) vs. v1 (Production) vs. v2 (Scale)

| Capability | MVP (Hackathon - Nov 2026) | v1 (Production - Q1/Q2 2027) | v2 (Global Scale - 2028+) |
|---|---|---|---|
| **Frontend Channels** | Web (`apps/web` HeroUI v3) + Mobile (`apps/mobile` `heroui-native`) | Full iOS/Android App Store release + WhatsApp deep-link launcher | Embedded SDK widget for ONDC buyer/seller apps & IndiaMART |
| **Languages (`F-03`)** | Tamil, Hindi, Marathi, Punjabi, Malayalam, English (`M-01`/`M-02`) | All 22 Scheduled Indian Languages (Bhashini) + Bahasa, Mandarin, Thai | 100+ global trade languages with real-time voice dubbing |
| **Escrow Rails (`F-04`)** | Go 1.24 FSM + HMAC Sandbox Webhooks (`API-17`) + Ed25519 `System` vouchers | Live RBI PA-Escrow (Razorpay Route / Cashfree) + UPI ASBA Mandates | Cross-border Singapore PayNow–UPI linkage + MAS licensed escrow |
| **Video Assay (`F-05`/`F-06`)** | `@nexconn/call` WebRTC + Rust WASM blur/serial box + Rust `pHash`/FFT + Gemini Vision | Hardware C2PA camera attestation + thermal/OBD Bluetooth sensor ingest | Autonomous warehouse drone/robotic pre-shipment video assay |

---

## 6. Functional Requirements (`F-01` – `F-14`)

### `F-01` - Zero-Friction Auth, 1-Tap Persona Login & Nexconn Token Service (`Must`)
- **Description**: Authenticates users via `/auth` or auto-provisions guest tokens on `/sandbox` and `/arena` via `API-01` (`POST /api/v1/auth/session`), invoking `@nexconn/server-sdk`'s `UserManagementApi.issueAccessToken` (`POST /v4/auth/access-token/issue`).
- **Mapped User Stories**: `US-01`, `US-02`.
- **Acceptance Criteria**:
  1. Clicking any 1-Tap Persona button on `/auth` (*Rajesh*, *Vikram*, *Meera*, *Guest*) returns a valid Nexconn `token` and `appKey` in `<400ms`.
  2. `NCEngine.initialize({ appKey })` and `await NCEngine.connect({ token })` complete before mounting `<nc-chat-ui-app-provider>` or initializing `NCCallEngine`.
  3. `NEXCONN_SECRET_KEY` is never transmitted to or bundled in the client.

### `F-02` - Story-Driven Beginner Landing, Onboarding Wizard & Interactive Coachmarks (`Must`)
- **Description**: Multi-route progressive story flow (`/` → `/auth` → `/onboarding` → `/app` / `/sandbox`) built with HeroUI v3, Hallmark Floor rules, Unslop warm-ledger tokens, and Apple fluid springs.
- **Mapped User Stories**: `US-02`, `US-03`.
- **Acceptance Criteria**:
  1. `/` displays a `1280x800` above-the-fold hero (≤7 words headline, 1 sentence, 2 CTAs) and 3 story chapters explaining the MUDRA flow.
  2. `/onboarding` allows selecting native language, testing camera/mic, or toggling **"Use Simulated HD Inspection Video Stream"** for webcam-less devices.
  3. `/app` and `/sandbox` display a top **4-Stage Deal Story Bar** with a contextual **"Next Step"** coachmark pill.

### `F-03` - Cross-Lingual 1:1 & Group Deal Room with Streaming Translation (`Must`)
- **Description**: Real-time translation and contract entity extraction streamed into `<nc-bilingual-bubble>` inside `<nc-chat-ui-app-provider>`.
- **Mapped User Stories**: `US-04`, `US-05`.
- **Acceptance Criteria**:
  1. When Buyer sends a text or `@nexconn/chat` voice note in Tamil, Rust scrubs PII in `<300µs` (`API-05`), and Node Bridge streams the Hindi/English translation token-by-token via `MessageManagementApi.sendGroupChannelStreamMessage`.
  2. `<nc-bilingual-bubble>` renders original text, streaming translation, language badge, and extracted price/warranty chips without Shadow DOM layout shifts.

### `F-04` - Custom Lit Escrow Milestone State Card (`<nc-escrow-deal-card>`) (`Must`)
- **Description**: Interactive Lit `BaseMessageContent` web component registered before `app.ready()` and backed by the Go 1.24 FSM (`services/deal-engine-go`).
- **Mapped User Stories**: `US-06`, `US-07`.
- **Acceptance Criteria**:
  1. Registered synchronously inside `NCChatUIApplication.initialize({ hooks })` prior to `app.ready()`.
  2. Enforces valid Go FSM transitions (`DRAFT` → `LOCKED` → `ASSAY_IN_PROGRESS` → `ASSAY_VERIFIED` → `SETTLED_RELEASED` or `DISPUTE_FROZEN` → `SETTLED_SPLIT`).
  3. Concurrent conflicting clicks return HTTP `409 Conflict` via PostgreSQL optimistic locking.

### `F-05` - 1-Click Live WebRTC Video Defect & Serial Inspection (`@nexconn/call`) (`Must`)
- **Description**: Launches an in-channel `@nexconn/call` session and escalates to HD video via `requestChangeMediaType(NCCallMediaType.VIDEO)`.
- **Mapped User Stories**: `US-08`, `US-09`.
- **Acceptance Criteria**:
  1. Clicking `Verify on Live Video` starts `NCCallEngine` audio call and escalates to `NCCallMediaType.VIDEO` inside a draggable Apple-design Picture-in-Picture Loupe (`setPointerCapture` + momentum corner projection).
  2. When call ends or frame is verified, `onServerCallLogReceived` captures the server call log and binds it to `video_assay_logs` (`E-06`).

### `F-06` - Rust + WASM Real-Time Forensic Frame & Audio Assay (`Must`)
- **Description**: Browser WASM (`packages/assay-wasm-rs`) + Rust Axum server (`services/assay-verifier-rs`) + Gemini 2.5 Flash Vision (`M-03`) verify physical condition, serial number plate, and acoustic motor/fan RPM signature.
- **Mapped User Stories**: `US-09`, `US-10`.
- **Acceptance Criteria**:
  1. Client WASM computes frame Laplacian blur variance (`>120.0` threshold) and serial bounding-box alignment at 60fps.
  2. Rust `assay-verifier-rs` (`API-08`) computes 64-bit `pHash`, runs 4096-point `rustfft` audio spectrum check, signs an Ed25519 voucher in `<5ms`, and emits `<nc-video-assay-receipt>`.

### `F-07` - Instant Channel-Freeze Dispute Lock (`addGroupChannelFreezeList`) (`Must`)
- **Description**: Freezes a `Group` deal room in `<150ms` when either party flags a defect or breach.
- **Mapped User Stories**: `US-11`.
- **Acceptance Criteria**:
  1. Clicking `Raise Dispute` calls `API-09` → `GroupChannelModerationApi.addGroupChannelFreezeList` (`POST /v4/group-channel/moderation/freeze/add`).
  2. Buyer and Seller text/voice inputs lock immediately with a clear Frozen Tribunal banner; only the AI Tribunal and dispatched Arbitrator can post.

### `F-08` - Human Agent Dispatch Center & AI Tribunal Streaming Settlement (`Must`)
- **Description**: `/dispatch` routes a human arbitrator (`P-04`) into frozen channels while `M-04` streams a structured settlement split into `<nc-tribunal-verdict-card>`.
- **Mapped User Stories**: `US-12`, `US-13`.
- **Acceptance Criteria**:
  1. Frozen rooms appear in `/dispatch` within `500ms` with pre-loaded `pHash` diffs and call logs.
  2. `M-04` streams an evidence-cited settlement split (e.g., `88%` seller payout / `12%` buyer repair rebate) via `sendGroupChannelStreamMessage`.

### `F-09` - Immutable `System` Channel Audit & Compliance Ledger (`Must`)
- **Description**: Every DPDP consent notice, escrow lock, call log, and tribunal verdict emits an Ed25519-signed voucher into the user's read-only `System` channel via `SystemMessagesApi`.
- **Mapped User Stories**: `US-07`, `US-13`.
- **Acceptance Criteria**:
  1. Each voucher in `system_audit_vouchers` (`E-08`) contains `prev_hash`, `curr_hash`, and `ed25519_sig`, verifiable in `/guide` and rendered in `<nc-chat-ui-app-provider>`'s `System` tab.

### `F-10` - Live `Open` Channel Flash-Lot Ticker & `Community` Category Subchannels (`Must`)
- **Description**: Hybrid `@nexconn/chat` (`NCEngine`) sidebar showing priority `Open` channel drops (`OpenChannelPriorityControlsApi`) and `Community` subchannels (`createCommunitySubchannel`).
- **Mapped User Stories**: `US-14`.
- **Acceptance Criteria**:
  1. Verified sellers broadcast flash lots via `API-13` (`OpenChannelPriorityControlsApi`).
  2. Users switch between `Machinery`, `Refurbished-Tech`, `Agri-Mandi`, and `Campus-Thrift` `Community` subchannels (`API-14`) and click `Negotiate Deal` to spawn a 1:1/Group room.

### `F-11` - 1-Click Split-Screen Buyer + Seller + AI Judge Sandbox (`/sandbox`) (`Must`)
- **Description**: Dual-pane zero-login sandbox provisioning two real Nexconn tokens (`buyer_demo_<id>`, `seller_demo_<id>`) with a 5-step guided story tour.
- **Mapped User Stories**: `US-03`, `US-15`.
- **Acceptance Criteria**:
  1. Loads from `/` in `<400ms` with zero login wall and walks the user through all 4 deal stages in under 60 seconds.

### `F-12` - 60-Second Viral AI Shopkeeper Bargaining Arena (`/arena`) (`Should`)
- **Description**: Gamified 60-second bargaining duel against "Chanakya AI Shopkeeper" (`M-05`) streaming via `sendDirectChannelStreamMessage`.
- **Mapped User Stories**: `US-16`.
- **Acceptance Criteria**:
  1. Every player receives a real Nexconn `userId` token (`API-15`) and generates a shareable WhatsApp/Instagram score card.

### `F-13` - Public Verified MAU & SDK Telemetry Proof Dashboard (`/traction`) (`Should`)
- **Description**: Live public metrics dashboard backed by `API-18` matching `console.nexconn.ai`.
- **Mapped User Stories**: `US-15`.
- **Acceptance Criteria**:
  1. Displays live unique connected `userId`s, channel counts across all 5 types, stream latencies, and call logs.

### `F-14` - Companion Mobile Field Assay App (`apps/mobile`) (`Could`)
- **Description**: Expo + React Native + `heroui-native` v2.0.1 + Uniwind mobile app for field sellers/inspectors.
- **Mapped User Stories**: `US-08`.
- **Acceptance Criteria**:
  1. Uses `HeroUINativeProvider`, `GestureHandlerRootView`, and compound `heroui-native` `<Card>`/`<Button>` components to join a deal room and stream back-camera video.

---

## 7. Non-Functional Requirements (NFRs)

| NFR Area | Requirement & Measurable Target |
|---|---|
| **Performance** | Go FSM transitions `<1.2ms` p99; Rust PII scrub `<300µs`; Rust `pHash`/FFT/Ed25519 `<5ms`; Web First Contentful Paint `<0.9s` on 4G (`PERFORMANCE.md`). |
| **Availability & Resilience** | `99.9%` uptime during judging window (Nov 23–27, 2026); automatic LLM failover (`Gemini 2.5` → `Bhashini` / `Together AI`) and webcam fallback stream (`RUNBOOK.md`). |
| **Low-Bandwidth / Offline** | Graceful degradation on 3G/patchy hostel Wi-Fi: if WebRTC video drops below `250 kbps`, auto-switches to signed Rust WASM keyframes over `NCEngine`. |
| **Languages & Scripts** | UTF-8 + Noto Sans Tamil / Devanagari / Gurmukhi / Malayalam font stacks with zero tofu glyphs (`LOCALIZATION.md`). |
| **Accessibility** | WCAG 2.2 AA (`4.5:1` contrast, React Aria keyboard navigation via HeroUI v3 `onPress`, `prefers-reduced-motion: reduce` support, voice-first input (`ACCESSIBILITY.md`)). |
| **Security & Privacy** | Zero client secrets; `<300µs` Rust PII scrubbing; India DPDP Act 2023 + Singapore PDPA consent vouchers in `System` channel (`SECURITY_ARCHITECTURE.md`, `PRIVACY.md`). |

---

## 8. Assumptions, Dependencies & Open Questions Resolved

- **Assumptions**: Judges will evaluate primarily on desktop Chrome/Edge/Safari at `1280x800` to `1920x1080` (with optional mobile inspection) and may test late at night without a second human counterparty or physical machinery on camera - hence `/sandbox` and our Simulated HD Inspection Stream are mandatory defaults.
- **Dependencies**: `https://api.nexconn.ai` v4 endpoints, `console.nexconn.ai` App Key with Call SDK enabled, Google Gemini 2.5 API / Bhashini ULCA API.
- **Release Criteria (Definition of Ready to Submit)**: All 14 features (`F-01`–`F-14`) verified against Playwright E2E suite, `sloplint --render` returning `0 FAIL`, and `>500` verified MAUs recorded under our `App Key`.
