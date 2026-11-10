# Project Brief — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Architecture & Product Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Vision](./VISION.md) · [Pitch](./PITCH.md) · [Hackathon Plan](./HACKATHON_PLAN.md) · [PRD](../01-product/PRD.md) · [Architecture](../03-engineering/ARCHITECTURE.md) · [Nexconn SDK Manual](../03-engineering/NEXCONN_SDK_MANUAL.md)

---

## 1. Identity & Hackathon Context

| Attribute | Canonical Value |
|---|---|
| **Product Name** | **SAMADHAN-OS (`SamvadDeal`)** |
| **Tagline / One-Liner** | Live Video-Escrow Commerce, Cross-Lingual B2B/P2P Deal Desk & 90-Second Freeze-Locked AI/Human Dispute Tribunal built 100% on the Nexconn Real-Time Stack. |
| **Hackathon** | **Nexconn Build Challenge 2026** (`https://reskilll.com/hack/nexconn`) |
| **Sponsor Legal Entity** | **RCLOUD GLOBAL PTE. LTD.** (`120 Robinson Road, #13-01, Singapore 068913` — International HQ of RongCloud / Nexconn AI, backed by AWS & Alibaba Cloud) |
| **Operating Partner** | **Reskilll** (`https://reskilll.com`, `rohan@reskilll.com`) |
| **Team Name** | `Chanakya` (4 Engineers · 36-Hour Sprint Core + Pre-Deadline MAU Campaign Window through Mon, Nov 23, 2026, 5:29 PM IST) |
| **Official Track** | **Marketplace & Support (`PS-03`)** — Combines all 3 official track sub-prompts: *(1) Buyer-seller 1-on-1 chat*, *(2) Human agent dispatch center*, and *(3) Multi-language translated chat*. |
| **Idea Archetype** | **Doesn't exist** (War Room Council Rank #1 Overall Pick across all 30 ideas · Score: `96.4 / 100` / `9.64 / 10`) |
| **Nexconn Packages Used** | `@nexconn/chatui@^26.2.5` (`lit@^3.3.2`), `@nexconn/chat@^26.2.1` (`@nexconn/engine@^26.2.1`), `@nexconn/call@^26.2.0`, `@nexconn/server-sdk@0.1.2` |

---

## 2. The Problem (Grounded in Data)

Cross-border B2B trade (IndiaMART, Alibaba, ONDC) and high-ticket P2P/social commerce (OLX, Instagram thrift stores, refurbished electronics, inter-state agricultural mandis) lose **$48B+ globally** and **₹38,000+ Crore annually in India** to counterparty fraud, vernacular language misunderstandings, static photo manipulation, and unmoderated WhatsApp negotiations ([ONDC Network Reports](https://ondc.org), [RBI Payment Vision & Fraud Reports](https://www.rbi.org.in)).

1. **Vernacular Spec Corruption**: An MSME garment owner in Tirupur (speaking Tamil) buying a ₹1,45,000 refurbished industrial overlock machine from a dealer in Ludhiana (speaking Hindi/Punjabi) loses critical tolerance and voltage specs when negotiating over fragmented WhatsApp voice notes.
2. **Static Photo & Deepfake Fraud**: Second-hand laptop/phone buyers and B2B machinery buyers are routinely scammed by stolen or AI-edited static photos because there is no live interactive video serial-number and stress-test verification bound into the chat timeline.
3. **Unmoderated Dispute Deadlock**: When defective goods arrive, sellers block buyers on WhatsApp, or buyers abuse chargebacks. Legacy escrow and support tickets take 14–21 days via email ping-pong.

---

## 3. The Contrarian Secret (Peter Thiel / Patrick Jane)

Every competitor (Intercom, Chatwoot, Zendesk, WhatsApp Business, Bikayi) treats chat as **passive talk** and treats escrow, video inspection, and dispute resolution as **separate external web forms**.

**Our Contrarian Secret**: **The Nexconn channel timeline itself IS the deterministic transactional state machine.**
- The bilateral contract is an interactive custom Lit Web Component (`<nc-escrow-deal-card>`) rendered natively inside `<nc-chat-ui-app-provider>` (`@nexconn/chatui`) and backed by a **Go 1.24 finite-state machine (`services/deal-engine-go`)**.
- Pre-shipment and post-delivery physical verification is a 1-click **live `@nexconn/call` WebRTC video inspection** (`NCCallEngine.requestChangeMediaType(NCCallMediaType.VIDEO)`) enhanced by a **Rust 1.85 + WebAssembly forensic verifier (`services/assay-verifier-rs` & `packages/assay-wasm-rs`)** that hashes video frames, locks serial plates, analyzes motor/fan audio FFT spectra, and writes an immutable call log back into the timeline via `onServerCallLogReceived`.
- If a defect or dispute is flagged, `GroupChannelModerationApi.addGroupChannelFreezeList` (`POST /v4/group-channel/moderation/freeze/add`) **cryptographically freezes the room in <150ms** so neither party can spam or intimidate the other, while our **Human Agent Dispatch Center** injects a human arbitrator and our **AI Tribunal** streams an evidence-backed settlement split token-by-token via `MessageManagementApi.sendGroupChannelStreamMessage` (`POST /v4/group-channel/message/stream/send`).
- Every state change writes an Ed25519-signed, tamper-evident voucher into the user's read-only `System` channel via `SystemMessagesApi`.

---

## 4. Target Users & Personas Summary

Full profiles live in [PERSONAS.md](../01-product/PERSONAS.md):

| Persona ID | Name & Role | Archetype & Location | Primary Language(s) | Core Pain Solved |
|---|---|---|---|---|
| **P-01** | **Rajesh Natarajan (39)** | MSME Garment Unit Owner & Buyer · Tirupur, Tamil Nadu | Tamil (`ta-IN`), basic English | Needs to buy ₹1.45L refurbished machinery from North India without language errors or advance-payment fraud. |
| **P-02** | **Vikramjeet "Vikram" Singh (44)** | Industrial Machinery & Refurbished Electronics Dealer · Ludhiana, Punjab | Hindi (`hi-IN`), Punjabi (`pa-IN`) | Loses 30% of out-of-state leads due to buyer distrust and suffers from fake return/damage claims on COD. |
| **P-03** | **Aarav Mehta (21)** | College Hostel Thrift Seller & Used-GPU/MacBook Trader · Bengaluru / Pune | English (`en-IN`), Hindi, Marathi (`mr-IN`) | Faces courier box-swap scams and endless haggling on WhatsApp/Reddit `r/IndianGaming`; drives our viral campus MAU loop. |
| **P-04** | **Meera Krishnan (32)** | Senior Dispute Arbitrator & Support Dispatch Specialist · Chennai / Singapore | English (`en-SG`), Tamil, Hindi | Wastes 40 minutes per dispute piecing together scattered screenshots instead of reviewing a single frozen channel with signed video logs. |
| **P-05** | **Exhausted Hour-9 Hackathon Judge (2 AM Mode)** | Nexconn / Reskilll Technical Evaluator · Singapore / Bengaluru | English (`en-US`) | Evaluates 60+ repos; needs a **zero-login, 1-click Split-Screen Buyer + Seller + AI Sandbox** with guided coachmarks and instant `App Key` telemetry proof. |

---

## 5. Story-Driven Frontend Flow & Design Mandate

Per user mandate, the frontend (`apps/web` in React 19 + HeroUI v3 + Tailwind v4 + Lit 3.3.2, and `apps/mobile-expo` in Expo + `heroui-native` v2.0.1 + Uniwind) is engineered as a **beginner-first, zero-confusion interactive story flow** governed by `/hallmark` (v2.0.0), `/unslop`, `/apple-design`, `/heroui-react` (v3.0.1), and `/heroui-native` (v2.0.1):

1. **`/` (Story Landing Page)**: Editorial Hallmark hero (`1280x800` Floor compliant, ≤7-word headline, warm ledger-paper & graphite `oklch` palette, zero purple/blue AI slop) that explains the problem in 3 visual chapters and offers two zero-friction entry doors: **"Launch 1-Click Split-Screen Live Demo"** (`/sandbox`) or **"Sign In / Create Account"** (`/auth`).
2. **`/auth` (1-Tap Beginner Login, Signup & Persona Switcher)**: HeroUI v3 compound `<Card>` and `<Tabs>` supporting standard account creation PLUS **1-Tap Demo Persona Quick-Fill buttons** (*Rajesh — Tamil Buyer*, *Vikram — Hindi Seller*, *Meera — Arbitrator*, *Instant Guest Pass*) that call `POST /api/v1/auth/session` (`issueAccessToken`) and connect `NCEngine` in `<400ms`.
3. **`/onboarding` (45-Second Interactive First-Time User Setup & Guide)**: 3-step visual wizard: (1) Language & Role Pair Selection, (2) Camera/Mic check with a **1-Click Simulated HD Machinery/Gadget Video Stream** toggle (so users without a webcam or judges at 2 AM still see real video inspection!), and (3) Interactive 3-card preview of the Deal Flow.
4. **`/app` & `/app/deals/:channelId` (Main Deal Desk Workbench)**: Features a persistent top **4-Stage Deal Story Bar** (`1. Bilingual Negotiate` → `2. Lock Escrow Card` → `3. Live Video Assay` → `4. Release or Freeze Tribunal`) with a pulsing **"Next Step Coachmark"** so a beginner always knows the exact button to press next.
5. **`/sandbox` (1-Click Split-Screen Buyer + Seller + AI Judge Mode)**: Side-by-side synchronized dual-persona workbench (`buyer_demo_<id>` on left, `seller_demo_<id>` on right) with a 5-step interactive guided story bar at the top.
6. **`/arena` (60-Second AI Shopkeeper Bargaining Challenge)**: Viral campus/public mini-app that provisions a real Nexconn user token (`issueAccessToken`) per player to drive 500–1,000+ genuine MAUs in `console.nexconn.ai`.
7. **`/dispatch` (Human Agent & Arbitrator Dispatch Center)**: Live triage console for frozen `Group` channels (`addGroupChannelFreezeList`).
8. **`/guide` (Interactive Beginner Walkthrough & Nexconn SDK Inspector)**: Step-by-step interactive manual showing users and judges exactly how each UI action maps to `@nexconn/chatui`, `@nexconn/chat`, `@nexconn/call`, and `@nexconn/server-sdk`.
9. **`/traction` (Live MAU & Console Telemetry Proof Page)**: Real-time public ledger of connected unique Nexconn `userId`s, channels, stream messages, and call logs.

---

## 6. Canonical Feature List (`F-01` – `F-14`) with MoSCoW

| Feature ID | Feature Name | MoSCoW | MVP (Hackathon) | v1 (Production) | Core Nexconn / Polyglot Primitive |
|---|---|---|---|---|---|
| **F-01** | **Zero-Friction Auth, 1-Tap Persona Login & Nexconn Token Service** | **Must** | Real `/v4/auth/access-token/issue` via Node Bridge + Go session store + 1-Tap Demo Persona Login & Guest auto-provisioning | Full Passkey/WebAuthn + Aadhaar DigiLocker / GSTIN KYB verification | `@nexconn/server-sdk` (`UserManagementApi.issueAccessToken`), `NCEngine.initialize` & `NCEngine.connect` |
| **F-02** | **Story-Driven Beginner Landing, Onboarding Wizard & Interactive Coachmarks** | **Must** | Full `/` → `/auth` → `/onboarding` → `/app` / `/sandbox` guided flow with "Next Step" coachmarks & webcam fallback | Personalized merchant onboarding by vertical (machinery, electronics, agri, sneaker thrift) | HeroUI v3 (`@heroui/react`), Hallmark Floor, Apple fluid springs |
| **F-03** | **Cross-Lingual 1:1 & Group Deal Room with Streaming Translation** | **Must** | Real-time Tamil/Hindi/Marathi/Punjabi/Malayalam ↔ English translation + term extraction streamed into `<nc-bilingual-bubble>` | 22 scheduled Indian languages (Bhashini) + ASEAN languages (Bahasa, Mandarin, Thai) | `@nexconn/chatui` (`<nc-chat-ui-app-provider>`), `MessageManagementApi.sendDirectChannelStreamMessage` & `sendGroupChannelStreamMessage` |
| **F-04** | **Custom Lit Escrow Milestone State Card (`<nc-escrow-deal-card>`)** | **Must** | Registered via `registerMessageType` before `app.ready()`; backed by Go 1.24 FSM (`DRAFT` → `LOCKED` → `ASSAY_IN_PROGRESS` → `ASSAY_VERIFIED` → `DISPUTE_FROZEN` → `SETTLED_RELEASED` / `SETTLED_SPLIT` / `REFUNDED`) | Multi-milestone B2B Letter of Credit (30/40/30 split) + automated logistics webhook triggers | `@nexconn/chatui` (`BaseMessageContent`, `registerMessageType`), Go 1.24 `services/deal-engine-go` |
| **F-05** | **1-Click Live WebRTC Video Defect & Serial Inspection (`@nexconn/call`)** | **Must** | In-channel audio call (`NCCallEngine.startCall`) + dynamic HD video escalation (`requestChangeMediaType(NCCallMediaType.VIDEO)`) + simulated video fallback stream | Multi-camera warehouse feed + hardware OBD/IoT telemetry overlay | `@nexconn/call@^26.2.0` (`NCCallEngine`, `NCCallMediaType`, `onServerCallLogReceived`) riding on `NCEngine` |
| **F-06** | **Rust + WASM Real-Time Forensic Frame & Audio Assay (`assay-verifier-rs`)** | **Must** | Client WASM 60fps blur/serial bounding box + Rust Axum server `pHash`, audio FFT motor/fan anomaly check, and Ed25519 receipt signing in `<5ms` | Hardware-attested C2PA camera signatures + custom fine-tuned YOLO defect segmentation | Rust 1.85 (`services/assay-verifier-rs` + `packages/assay-wasm-rs`) + Gemini 2.5 Flash Vision (`M-03`) |
| **F-07** | **Instant Channel-Freeze Dispute Lock (`addGroupChannelFreezeList`)** | **Must** | 1-click `Raise Dispute` invokes `GroupChannelModerationApi.addGroupChannelFreezeList` (`POST /v4/group-channel/moderation/freeze/add`), locking buyer/seller input in `<150ms` | Automated fraud-velocity freeze trigger on suspicious payment/link patterns | `@nexconn/server-sdk` (`GroupChannelModerationApi.addGroupChannelFreezeList`, `ModerationApi`) |
| **F-08** | **Human Agent Dispatch Center & AI Tribunal Streaming Settlement** | **Must** | `/dispatch` dashboard injects human arbitrator (`Meera`) into frozen `Group` channel while AI Mediator streams evidence-backed rebate/split proposal into `<nc-tribunal-verdict-card>` | Skill-based & language-based global arbitrator routing with SLA timers and staking | `@nexconn/server-sdk` (`GroupChannelManagementApi`, `sendGroupChannelStreamMessage`) |
| **F-09** | **Immutable `System` Channel Audit & Compliance Ledger** | **Must** | Every escrow lock, WebRTC call receipt (`onServerCallLogReceived`), DPDP consent notice, and tribunal verdict emits an Ed25519-signed voucher to the user's `System` channel | Anchored Merkle root to ONDC IGM (Issue & Grievance Management) & RBI PA-Escrow audit rail | `@nexconn/server-sdk` (`SystemMessagesApi`), `@nexconn/chatui` (`System` channel view) |
| **F-10** | **Live `Open` Channel Flash-Lot Ticker & `Community` Category Subchannels** | **Must** | Collapsible sidebar mounted via `@nexconn/chat` (`NCEngine`) showing `Open` channel live wholesale/thrift drops (`OpenChannelPriorityControlsApi`) + `Community` subchannels (`createCommunitySubchannel`) | High-frequency Dutch auctions & regional FPO commodity floors | `@nexconn/chat@^26.2.1` (`NCEngine`), `OpenChannelManagementApi`, `OpenChannelPriorityControlsApi`, `CommunityChannelManagementApi` |
| **F-11** | **1-Click Split-Screen Buyer + Seller + AI Judge Sandbox (`/sandbox`)** | **Must** | Zero-login dual-pane browser view provisioning 2 real Nexconn tokens (`buyer_demo_<id>`, `seller_demo_<id>`) with a 5-step guided story tour | Multi-device QR handoff so judges can optionally scan to move Seller pane to their phone | `@nexconn/chatui` dual-instance isolation + Go/Node sandbox orchestrator |
| **F-12** | **60-Second Viral AI Shopkeeper Bargaining Arena (`/arena`)** | **Should** | Gamified 1:1 bargaining challenge against "Chanakya AI Shopkeeper" streaming via `sendDirectChannelStreamMessage`; auto-issues real Nexconn user tokens for MAU growth | Sponsored D2C brand drop discounts unlocked by bargaining score | `@nexconn/server-sdk` (`sendDirectChannelStreamMessage`), viral WhatsApp share card |
| **F-13** | **Public Verified MAU & SDK Telemetry Proof Dashboard (`/traction`)** | **Should** | Live public dashboard displaying verified unique `userId` connections, channel counts, stream latency, and call logs matching `console.nexconn.ai` | Tenant-level merchant analytics & dispute prevention ROI reports | Go 1.24 metrics aggregator + PostHog + PostgreSQL |
| **F-14** | **Companion Mobile Field Assay App (`apps/mobile-expo`)** | **Could** | Expo + React Native + `heroui-native` v2.0.1 + Uniwind mobile view for back-camera serial/defect inspection and push notifications | Full offline-first mandi field queue with background sync | `heroui-native@^2.0.1`, `uniwind`, WebRTC React Native bridge |

---

## 7. Core Entities (`E-01` – `E-10`)

Full schema and ER diagrams live in [DATA_MODEL.md](../03-engineering/DATA_MODEL.md):

| Entity ID | Table / Struct Name | Primary Owner Service | Description |
|---|---|---|---|
| **E-01** | `users` | Go Deal Engine + Node Bridge | Buyers, sellers, human arbitrators, and guest sandbox/arena users; maps internal UUID to Nexconn `userId`, role, language code (`ta-IN`, `hi-IN`, `en-IN`, etc.), and KYC tier. |
| **E-02** | `nexconn_sessions` | Node Bridge + Redis | Active Nexconn access tokens issued via `/v4/auth/access-token/issue`, connection telemetry, device fingerprint, and MAU verification timestamp. |
| **E-03** | `deal_rooms` | Go Deal Engine (`deal-engine-go`) | Maps a deal to its Nexconn `channelId` (`Direct` or `Group`), buyer `userId`, seller `userId`, assigned arbitrator `userId`, freeze status (`is_frozen`), and current story stage (`1..4`). |
| **E-04** | `escrow_contracts` | Go Deal Engine (`deal-engine-go`) | Deterministic FSM state (`DRAFT`, `LOCKED`, `ASSAY_IN_PROGRESS`, `ASSAY_VERIFIED`, `DISPUTE_FROZEN`, `SETTLED_RELEASED`, `SETTLED_SPLIT`, `REFUNDED`), amount in paise (`₹`), currency, inspection checklist JSON, and UPI/ONDC mandate reference. |
| **E-05** | `bilingual_messages` | Node Bridge + Rust Scrubber | Source transcript, DPDP-scrubbed text, translated target text, extracted structured deal terms JSON, and Nexconn stream message ID. |
| **E-06** | `video_assay_logs` | Rust Assay Verifier (`assay-verifier-rs`) | Links `@nexconn/call` `callId` (`onServerCallLogReceived`) to perceptual frame hashes (`pHash`), detected serial plate text, audio FFT anomaly score, Gemini Vision assessment, and Ed25519 signature. |
| **E-07** | `dispute_cases` | Go Deal Engine + Node Bridge | Triggered when `addGroupChannelFreezeList` locks a room; stores freeze timestamp, dispatched human agent ID, AI Tribunal streamed recommendation JSON, and final binding split (`buyer_refund_bps`, `seller_payout_bps`). |
| **E-08** | `system_audit_vouchers` | Rust Assay Verifier + Node Bridge | Immutable hash-chained receipts (`prev_hash`, `curr_hash`, `ed25519_sig`) dispatched to users' read-only `System` channel via `SystemMessagesApi` (includes DPDP consent notices, escrow locks, call logs, and payouts). |
| **E-09** | `open_flash_lots` | Go Deal Engine + Node Bridge | Priority wholesale/thrift lots broadcast into the `Open` channel via `OpenChannelPriorityControlsApi` and linked to `Community` category subchannels. |
| **E-10** | `bargain_arena_runs` | Go Deal Engine + Node Bridge | 60-second `/arena` sessions tracking user Nexconn `userId`, starting ask price, final agreed discount, AI Shopkeeper turns, and viral referral code. |

---

## 8. Canonical API Surface (`API-01` – `API-18`)

Full request/response schemas live in [API_SPEC.md](../03-engineering/API_SPEC.md) and [`api/openapi.yaml`](../../api/openapi.yaml):

| API ID | Method & Path | Service Handler | Underlying Nexconn SDK / Engine Action |
|---|---|---|---|
| **API-01** | `POST /api/v1/auth/session` | Node Bridge (`:4001`) + Go (`:4002`) | Authenticates or registers user/persona, calls `UserManagementApi.issueAccessToken` (`POST /v4/auth/access-token/issue`), returns JWT + Nexconn `token` & `appKey`. |
| **API-02** | `POST /api/v1/sandbox/provision` | Go Engine + Node Bridge | Atomically provisions dual Buyer (`buyer_demo_<id>`) + Seller (`seller_demo_<id>`) Nexconn tokens, creates a seeded `Group` deal room, and emits initial `<nc-escrow-deal-card>`. |
| **API-03** | `POST /api/v1/deals` | Go Deal Engine (`:4002`) | Creates a new `deal_rooms` (`E-03`) and `escrow_contracts` (`E-04`) record and provisions the Nexconn `Direct` or `Group` channel via `GroupChannelManagementApi`. |
| **API-04** | `GET /api/v1/deals/:dealId` | Go Deal Engine (`:4002`) | Returns current deal FSM state, story stage (`1..4`), escrow milestones, video assay status, and signed `System` voucher chain. |
| **API-05** | `POST /api/v1/deals/:dealId/translate-stream` | Rust PII Filter (`:4003`) → Node Bridge (`:4001`) | Scrubs PII in `<300µs` (Rust), calls Gemini 2.5 Flash / Bhashini (`M-01`/`M-02`), and streams bilingual translation + extracted contract JSON via `MessageManagementApi.sendGroupChannelStreamMessage`. |
| **API-06** | `POST /api/v1/deals/:dealId/escrow/transition` | Go Deal Engine (`:4002`) | Executes atomic FSM state transition (`LOCK_ESCROW`, `START_ASSAY`, `MARK_ASSAY_VERIFIED`, `RELEASE_FUNDS`), updates `<nc-escrow-deal-card>`, and fires `SystemMessagesApi` receipt. |
| **API-07** | `POST /api/v1/deals/:dealId/assay/start` | Go Engine + Node Bridge | Records pre-call challenge nonce before frontend `NCCallEngine.startCall` / `requestChangeMediaType(NCCallMediaType.VIDEO)`. |
| **API-08** | `POST /api/v1/deals/:dealId/assay/verify-frame` | Rust Assay Verifier (`:4003`) | Computes perceptual `pHash`/`dHash`, verifies WASM watermark & audio FFT spectrum, invokes `M-03` Vision defect check, signs Ed25519 voucher, and logs `onServerCallLogReceived`. |
| **API-09** | `POST /api/v1/deals/:dealId/dispute/freeze` | Go Engine → Node Bridge (`:4001`) | Invokes `GroupChannelModerationApi.addGroupChannelFreezeList` (`POST /v4/group-channel/moderation/freeze/add`), locks channel, creates `dispute_cases` (`E-07`), and triggers AI Tribunal stream (`M-04`). |
| **API-10** | `POST /api/v1/dispatch/assign` | Go Engine + Node Bridge | Dispatches human arbitrator (`P-04`) from `/dispatch` queue into the frozen `Group` channel (`GroupChannelManagementApi`) with moderation override permissions. |
| **API-11** | `POST /api/v1/disputes/:disputeId/resolve` | Go Engine → Node Bridge (`:4001`) | Executes binding payout split (`buyer_refund_bps` / `seller_payout_bps`), unfreezes or archives channel, and sends Ed25519-signed `System` channel settlement voucher. |
| **API-12** | `GET /api/v1/marketplace/open-lots` | Go Deal Engine (`:4002`) | Lists active flash wholesale/thrift lots and `Community` category subchannel IDs. |
| **API-13** | `POST /api/v1/marketplace/open-lots/broadcast` | Node Bridge (`:4001`) | Whitelists verified seller and broadcasts priority flash-lot card into the `Open` channel via `OpenChannelPriorityControlsApi`. |
| **API-14** | `POST /api/v1/community/subchannels` | Node Bridge (`:4001`) | Creates or joins category subchannels (`Machinery`, `Refurbished-Tech`, `Agri-Mandi`, `Campus-Thrift`) via `CommunityChannelManagementApi` / `createCommunitySubchannel`. |
| **API-15** | `POST /api/v1/arena/start` | Go Engine + Node Bridge | Issues real Nexconn `userId` token (`/v4/auth/access-token/issue`) and opens a 60-second `/arena` `Direct` channel with Chanakya AI Shopkeeper (`M-05`). |
| **API-16** | `POST /api/v1/arena/:runId/bid` | Go Engine → Node Bridge (`:4001`) | Evaluates user bargain counter-offer in Go pricing engine and streams AI Shopkeeper response via `MessageManagementApi.sendDirectChannelStreamMessage`. |
| **API-17** | `POST /api/v1/webhooks/upi-ondc` | Go Deal Engine (`:4002`) | High-throughput HMAC-verified webhook receiver for UPI ASBA / PA-Escrow mandate events and ONDC `on_confirm` / `on_status` callbacks. |
| **API-18** | `GET /api/v1/traction/telemetry` | Go Deal Engine (`:4002`) | Public verifiable JSON feed for `/traction` showing unique connected Nexconn `userId`s (MAUs), channel breakdown, call minutes, and p95 latencies. |

---

## 9. High-Performance Polyglot Tech Stack (Go + Rust + Node + React 19 / HeroUI v3)

We explicitly reject slow, generic Python backend wrappers. Every layer uses the fastest, most appropriate systems or UI technology:

| Layer | Technology & Version | Why Chosen |
|---|---|---|
| **Web Frontend (`apps/web`)** | **React 19.1** + **TypeScript 5.8** + **Vite 6.2** + **Tailwind CSS v4.1** + **HeroUI v3 (`@heroui/react@^3.0.1`, `@heroui/styles@^3.0.1`)** | Zero-provider HeroUI v3 compound components (`<Card><Card.Header>...`), `oklch` CSS variables, React Aria `onPress` accessibility, `/hallmark` v2.0.0 Floor compliance, `/unslop` warm-ledger craft, and `/apple-design` velocity-aware springs. |
| **Mobile Field App (`apps/mobile-expo`)** | **Expo SDK 53** + **React Native 0.78** + **HeroUI Native (`heroui-native@^2.0.1`)** + **Uniwind** | Native compound components (`<Card><Card.Body>...`), HSL theme variables, `react-native-reanimated` & `react-native-gesture-handler` for field merchants doing back-camera video inspection. |
| **Nexconn Client SDKs** | **`@nexconn/chatui@^26.2.5`** + **`lit@^3.3.2`** + **`@nexconn/chat@^26.2.1`** (`@nexconn/engine@^26.2.1`) + **`@nexconn/call@^26.2.0`** | 100% coverage of Nexconn client primitives: `<nc-chat-ui-app-provider>` (`Direct`, `Group`, `System`), custom Lit `BaseMessageContent` cards, `NCEngine` (`Open`, `Community`, voice capture), and `NCCallEngine` WebRTC video inspection. |
| **Client Forensic WASM (`packages/assay-wasm-rs`)** | **Rust 1.85 (`wasm32-unknown-unknown`)** + **`wasm-bindgen 0.2`** | Runs at 60fps inside the browser canvas during `@nexconn/call` video calls to compute Laplacian blur variance, glare masks, serial-plate bounding locks, and frame watermarks with zero JS main-thread jank. |
| **Core Deal & Escrow Engine (`services/deal-engine-go`)** | **Go 1.24** + **Chi v5 / Fiber v3** + **`pgx/v5`** + **`sqlc`** | Sub-millisecond (`p99 < 1.2ms`) deterministic finite-state machine for escrow locks, optimistic concurrency control, UPI/ONDC HMAC webhook ingestion, and 10,000+ concurrent Open channel auction bids. |
| **Forensic Assay & Crypto Service (`services/assay-verifier-rs`)** | **Rust 1.85 (2024 Edition)** + **Axum 0.8** + **Tokio 1.43** + **`image` / `rustfft` / `ed25519-dalek`** | Ultra-fast perceptual frame hashing (`pHash`/`dHash`), audio FFT motor/fan RPM anomaly detection, `<300µs` Aho-Corasick DPDP PII redaction filter, and Ed25519 cryptographic signing of `System` channel vouchers. |
| **Official Nexconn Server SDK Bridge (`services/nexconn-bridge-node`)** | **Node.js 22 LTS** + **TypeScript 5.8** + **Fastify 5.2** + **`@nexconn/server-sdk@0.1.2`** | Hosts the official TypeScript `@nexconn/server-sdk` (`git+https://github.com/NexconnAI-Dev/nexconn-server-sdk-node.git#v0.1.2`) to execute `issueAccessToken`, `sendDirectChannelStreamMessage`, `sendGroupChannelStreamMessage`, `addGroupChannelFreezeList`, `OpenChannelPriorityControlsApi`, and `SystemMessagesApi`. |
| **Database & Cache** | **PostgreSQL 17** (Neon / Supabase / Docker) + **DragonflyDB / Redis 7.4** | ACID serializable transactions for `escrow_contracts` (`E-04`) and hash-chained `system_audit_vouchers` (`E-08`), plus sub-millisecond pub/sub between Go, Rust, and Node services. |

---

## 10. AI Models (`M-01` – `M-05`)

Full model cards, prompts, and evals live in [MODELS.md](../04-ai/MODELS.md), [PROMPTS.md](../04-ai/PROMPTS.md), and [AI_EVALS.md](../04-ai/AI_EVALS.md):

| Model ID | Task | Primary Model & Provider | Fallback Model | Delivery Path into Nexconn | Latency & Cost Target |
|---|---|---|---|---|---|
| **M-01** | **Cross-Lingual Streaming Translation & Term Extraction** | **Gemini 2.5 Flash** (`gemini-2.5-flash` via Google GenAI HTTP/2 SSE) | **Bhashini NMT + ASR Pipeline** (`ulca-api.bhashini.gov.in`) | Streamed token-by-token via `MessageManagementApi.sendGroupChannelStreamMessage` into `<nc-bilingual-bubble>` | First token `<280ms` · `₹0.04` / message |
| **M-02** | **Voice Note ASR & Dialect Normalization** | **Bhashini ASR (Conformer Indic)** / **Gemini 2.5 Flash Audio** | **Groq Whisper-Large-v3-Turbo** | Triggered on `@nexconn/chat` browser audio capture; streams transcript + translation | `<450ms` total · `₹0.06` / voice note |
| **M-03** | **Live Video Frame Defect, Serial Plate & Audio FFT Assay** | **Rust `assay-verifier-rs` (`pHash` + `rustfft`)** + **Gemini 2.5 Flash Multimodal Vision** | **Claude 3.7 Sonnet Vision** (for complex machinery/PCB disputes) | Triggered during `@nexconn/call` video inspection; emits signed `<nc-video-assay-receipt>` + `SystemMessagesApi` log | Rust pre-check `<5ms`; Vision `<900ms` · `₹0.18` / assay |
| **M-04** | **Channel-Freeze AI Dispute Tribunal & Evidence Synthesizer** | **Gemini 2.5 Pro** (`gemini-2.5-pro` structured reasoning over frozen timeline + call logs) | **Gemini 2.5 Flash** | Triggered right after `addGroupChannelFreezeList`; streams binding rebate/split rationale via `sendGroupChannelStreamMessage` | First token `<400ms` · `₹0.32` / dispute |
| **M-05** | **Chanakya 60-Second Viral Bargaining Shopkeeper (`/arena`)** | **Gemini 2.5 Flash** constrained by Go deterministic reservation-price guardrails | **Llama-3.3-70B-Instruct (Together AI)** | Streamed via `MessageManagementApi.sendDirectChannelStreamMessage` (`POST /v4/direct-channel/message/stream/send`) | First token `<220ms` · `₹0.08` / 60s game |

---

## 11. External Integrations

Detailed in [INTEGRATIONS.md](../03-engineering/INTEGRATIONS.md) and [NEXCONN_SDK_MANUAL.md](../03-engineering/NEXCONN_SDK_MANUAL.md):
1. **Nexconn Cloud Platform (`https://api.nexconn.ai` & `https://console.nexconn.ai`)**: Core real-time IM, Chat UI, WebRTC Call signaling/media, Server v4 streaming, moderation freeze, and MAU telemetry.
2. **Google Gemini 2.5 Flash / Pro API & Together AI**: Low-latency multimodal streaming inference.
3. **Bhashini ULCA API (`https://bhashini.gov.in/ulca`)**: Government of India national language translation & ASR fallback for Tamil, Hindi, Marathi, Punjabi, Malayalam, Telugu, Kannada, and Bengali.
4. **UPI One-Time Mandate (ASBA) / Razorpay Route PA-Escrow Sandbox & ONDC Beckn Protocol**: Programmable escrow lock/release simulation for hackathon MVP with production-ready HMAC webhook handlers in Go (`API-17`).
5. **PostHog Cloud + Internal Go Telemetry Ledger**: Verifiable MAU & event tracking feeding `/traction`.

---

## 12. Top Risks (`R-01` – `R-12`) — Charlie Munger Pre-Mortem

Full risk register in [RISK_REGISTER.md](../06-security-compliance/RISK_REGISTER.md):

| Risk ID | Category | Risk Description | Likelihood | Impact | Deterministic Mitigation |
|---|---|---|---|---|---|
| **R-01** | **Tech / SDK** | Calling `NCCallEngine` before `await NCEngine.connect({ token })` resolves causes silent WebRTC signaling failure. | Medium | Critical | Strict state-machine barrier in `apps/web/src/lib/nexconn-boot.ts`: `NCCallEngine` initialization awaits the `NCEngine.connect` Promise resolution. |
| **R-02** | **Tech / SDK** | Attempting to mount `Open` or `Community` channels inside `<nc-chat-ui-app-provider>` (which only supports `Direct`, `Group`, `System`). | High | High | Hybrid architecture (`ADR-0002`): `<nc-chat-ui-app-provider>` renders `Direct`/`Group`/`System`; custom HeroUI v3 panel bound to `NCEngine` renders `Open` & `Community`. |
| **R-03** | **Tech / UI** | Registering Lit custom message components (`<nc-escrow-deal-card>`) *after* `app.ready()` causes fallback plain-text rendering. | Medium | High | All `registerMessageType` calls execute synchronously inside `NCChatUIApplication.initialize({ hooks })` prior to `app.ready()` (`ADR-0003`). |
| **R-04** | **Judge UX** | Solo judge opens the live app at 2 AM with no counterparty or no webcam, experiencing a "dead room." | High | Critical | `/sandbox` 1-Click Split-Screen Buyer + Seller mode + built-in **Simulated HD Inspection Video Stream** fallback toggle in `/onboarding` and `/sandbox`. |
| **R-05** | **Submission** | Reskilll portal serializer (`pS(n)` / `Dx(n)`) corrupts Judge Card if free text exceeds 4,000 chars or contains `Track:` / `Summary:` newline prefixes. | Low | Critical | Pre-validated character-counted submission payload in `HACKATHON_PLAN.md` and `NEXCONN_SDK_MANUAL.md` (`<2,900` chars, zero reserved prefixes). |
| **R-06** | **Security** | Exposing Nexconn `secretKey` in frontend Vite bundle (`VITE_*` env vars). | Low | Critical | `NEXCONN_SECRET_KEY` exists solely in `services/nexconn-bridge-node`; CI secret scanner blocks any client reference. |
| **R-07** | **AI / Security** | Prompt injection in chat messages attempting to trick `M-01` or `M-04` into releasing escrow funds prematurely. | Medium | High | AI models (`M-01`, `M-04`) have **zero direct write access** to `escrow_contracts`; Go FSM (`services/deal-engine-go`) requires dual cryptographic confirmation or signed arbitrator action. |
| **R-08** | **Legal / Fin** | Operating an unlicensed escrow pool under RBI Payment Aggregator (PA) regulations. | Medium | High | MVP uses simulated UPI Mandate / PA-Escrow webhooks; production operates strictly as a technical orchestration & inspection evidence layer atop licensed RBI PA-Escrow banks (`COMPLIANCE.md`). |
| **R-09** | **Privacy** | Sending unredacted phone numbers, Aadhaar, or bank account digits inside chat transcripts to external LLM APIs under India DPDP Act 2023 & Singapore PDPA. | Medium | High | Rust `assay-verifier-rs` runs a `<300µs` Aho-Corasick + regex PII scrubber before any prompt leaves our infrastructure (`PRIVACY.md`). |
| **R-10** | **Network** | WebRTC peer-to-peer connection blocked by symmetric corporate/hostel NAT during `@nexconn/call` video inspection. | Medium | Medium | Uses Nexconn managed TURN/STUN ice servers + automatic graceful fallback to high-cadence signed frame snapshots over `NCEngine` if UDP is throttled. |
| **R-11** | **Design** | Frontend looks like generic "AI vibecoded slop" (purple gradients, emoji spam, broken spacing) and loses completeness points. | Low | High | Enforced `/hallmark` v2.0.0 Floor (`sloplint --render` in CI), `/unslop` 9-pass tokens, `/apple-design` springs, and HeroUI v3 compound components (`ADR-0004`). |
| **R-12** | **Traction** | Low verified MAU count when judges paste `App Key` into `console.nexconn.ai`. | Medium | High | Every visitor to `/sandbox` (2 tokens) and `/arena` (60s campus bargaining game) calls `/v4/auth/access-token/issue` + `NCEngine.connect`, generating real verified MAUs. |

---

## 13. Non-Goals (Hackathon MVP Scope Discipline)

1. **Not a general-purpose social network**: Every channel exists to discover, negotiate, verify, lock, or arbitrate a commercial transaction or support claim.
2. **Not holding unregulated fiat custody in MVP**: Escrow state transitions in the hackathon MVP trigger verifiable sandbox UPI ASBA / Razorpay Route webhooks and `System` channel cryptographic receipts rather than custodying live customer bank deposits without an RBI PA license.
3. **No bloated Python microservice sprawl**: All backend compute is consolidated into three fast, typed binaries/runtimes: Go 1.24 (`deal-engine-go`), Rust 1.85 (`assay-verifier-rs` + `assay-wasm-rs`), and Node.js 22 (`nexconn-bridge-node`).

---

## 14. Hackathon Evaluation Criteria Mapping (`Kx` in `index-Dr3TP1Ui.js`)

| Official Criterion | Weight | How SAMADHAN-OS Dominates This Criterion |
|---|---|---|
| **1. Product Value & Innovation** | **30%** | Turns passive chat into an enforceable cross-lingual video-escrow & 90-second dispute arbitration OS solving a ₹38,000 Cr / $48B market failure. |
| **2. Completeness & Execution** | **30%** | Complete beginner-friendly story frontend (`/` → `/auth` → `/onboarding` → `/app` → `/sandbox` → `/arena` → `/dispatch` → `/guide` → `/traction`), polyglot Go+Rust+Node backend, public GitHub repo, 3-minute video, and PDF write-up. |
| **3. Nexconn SDK Integration** | **25%** | Uses **all 4 official packages** (`@nexconn/chatui`, `@nexconn/chat`, `@nexconn/call`, `@nexconn/server-sdk`), **all 5 channel types** (`Direct`, `Group`, `System`, `Open`, `Community`), custom Lit cards, native LLM streaming, and channel freeze lists. |
| **4. Traction & Real-World Validation** | **15%** | Viral `/arena` 60-second AI Shopkeeper Bargaining Challenge + campus/merchant pilot links driving 500–1,000+ verified connected `userId`s (MAUs) in `console.nexconn.ai` and visible on `/traction`. |

---

## 15. Canonical Architecture Decision Records (`ADR-0001` – `ADR-0006`)

All architectural decisions are documented in [`docs/03-engineering/adr/`](../03-engineering/adr/ADR-0000-template.md):

| ADR ID | Decision Title | Status | Core Rationale |
|---|---|---|---|
| **[`ADR-0001`](../03-engineering/adr/ADR-0001-polyglot-go-rust-node-nexconn-architecture.md)** | **Polyglot Go 1.24 + Rust 1.85/WASM + Node.js 22 Architecture** | Accepted | Eliminates generic Python latency; Go (`:4002`) handles `< 1.2ms` Escrow FSM locks, Rust (`:4003` + WASM) handles `< 300µs` DPDP PII scrubbing & `< 5ms` `pHash`/FFT assays, and Node (`:4001`) runs the official TypeScript `@nexconn/server-sdk@0.1.2`. |
| **[`ADR-0002`](../03-engineering/adr/ADR-0002-hybrid-nexconn-chatui-and-chat-sdk-channels.md)** | **Hybrid `@nexconn/chatui` + `@nexconn/chat` (`NCEngine`) Channel Routing** | Accepted | `<nc-chat-ui-app-provider>` renders `Direct`, `Group`, and `System` channels; `NCEngine` directly powers `Community` (`createCommunitySubchannel`) and `Open` (`OpenChannelPriorityControlsApi`) channels (`R-02`). |
| **[`ADR-0003`](../03-engineering/adr/ADR-0003-lit-custom-message-cards-and-shadow-dom-bridge.md)** | **Lit 3.3.2 Custom Message Cards & Shadow DOM Event Bridge** | Accepted | Registers `<nc-escrow-deal-card>` (`x-samadhan-escrow-card`), `<nc-bilingual-bubble>` (`x-samadhan-bilingual-bubble`), `<nc-video-assay-receipt>` (`x-samadhan-assay-receipt`), and `<nc-tribunal-verdict>` (`x-samadhan-tribunal-verdict`) synchronously inside `NCChatUIApplication.initialize({ hooks })` before `app.ready()`, bridging events via `composed: true` (`R-03`). |
| **[`ADR-0004`](../03-engineering/adr/ADR-0004-frontend-design-system-heroui-v3-hallmark-unslop-apple.md)** | **HeroUI v3 React + HeroUI Native v2 + Hallmark + Unslop + Apple Motion** | Accepted | Enforces Hallmark `v2.0.0` Floor, Unslop warm customs-ledger `oklch` tokens, Apple critically damped springs (`damping: 1.0`), and providerless `@heroui/react@^3.0.1` on Tailwind CSS v4 (`R-11`). |
| **[`ADR-0005`](../03-engineering/adr/ADR-0005-postgresql-redis-and-system-channel-immutable-ledger.md)** | **PostgreSQL 17 Optimistic Locking + DragonflyDB / Redis 7.4 Idempotency + `System` Channel Ledger** | Accepted | Combines `WHERE id = $1 AND version = $2` optimistic locking on PostgreSQL 17, `24h` DragonflyDB / Redis 7.4 `Idempotency-Key` deduplication, and SHA-256 hash-chained Ed25519 vouchers dispatched via `SystemMessagesApi`. |
| **[`ADR-0006`](../03-engineering/adr/ADR-0006-gemini-flash-bhashini-and-nexconn-native-stream-api.md)** | **Gemini 2.5 Flash/Pro + Bhashini ASR + Nexconn Native Stream API** | Accepted | Uses `sendDirectChannelStreamMessage` and `sendGroupChannelStreamMessage` (`/v4/*/message/stream/send`) for `< 280ms` TTFT native token streaming after Rust DPDP PII pre-scrubbing. |


