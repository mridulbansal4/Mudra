# Engineering Backlog & GitHub Issues - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Scrum Master & Delivery Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Hackathon Plan](../00-overview/HACKATHON_PLAN.md) · [User Stories](../01-product/USER_STORIES.md) · [Features](../01-product/FEATURES.md)

---

## 1. Sprint Backlog Summary (24 Actionable Tickets Across 5 Epics)

Every ticket below is formatted ready-to-import into GitHub Issues and mapped to a 36-hour sprint block (`H00`–`H36`), Feature ID (`F-xx`), User Story (`US-xx`), and Engineer Owner (`Dev 1`..`Dev 4`).

---

## Epic 1: Foundation, Nexconn Auth & Polyglot Core (`H00–H06`)

| Ticket ID | Title | Mapped `F-xx` / `US-xx` | Acceptance Criteria (Verifiable Pass Check) | Est. | Owner | Block |
|---|---|---|---|---|---|---|
| **SAM-101** | Configure `console.nexconn.ai` App Key, Secret Key, 5 Channel Types & Call SDK Credits | `F-01` | `App Key` & `Secret Key` stored in `.env`; `Direct`, `Group`, `System`, `Community`, and `Open` channels enabled; 10,000 Call SDK minutes active (`Green`). | `1h` | Dev 1 | `H00–H03` |
| **SAM-102** | Build `services/nexconn-bridge-node` (`:4001`) with `@nexconn/server-sdk@0.1.2` Token Service | `F-01`, `US-01`, `API-01` | Calls `UserManagementApi.issueAccessToken` (`POST /v4/auth/access-token/issue`); zero `NEXCONN_SECRET_KEY` exposure to client. | `2h` | Dev 1 | `H00–H03` |
| **SAM-103** | Build `services/deal-engine-go` (`:4002`) + PostgreSQL 17 Migrations (`E-01`..`E-10`) & Escrow FSM | `F-04`, `US-06`, `API-03`, `API-06` | Advisory-locked SQL migrations auto-run on boot; `go test -race ./internal/fsm/...` passes 50-goroutine concurrency test (`p99 < 1.2ms`). | `3h` | Dev 2 | `H00–H06` |
| **SAM-104** | Build `services/assay-verifier-rs` (`:4003`) `<300µs` Aho-Corasick DPDP PII Scrubber | `F-03`, `R-09`, `API-05` | Redacts Aadhaar, PAN, phone, and raw UPI handles in `<300µs` (`cargo test` passes 100/100 recall). | `2.5h` | Dev 2 | `H03–H06` |
| **SAM-105** | Scaffold `apps/web` (React 19 + Vite 6 + Tailwind v4 + HeroUI v3) & Hallmark/Unslop `tokens.css` | `F-02`, `R-11` | Zero `<HeroUIProvider>`, `@import "tailwindcss"` before `@import "@heroui/styles"`, Hallmark stamp at line 1, `oklch` warm-ledger ramp. | `2.5h` | Dev 3 | `H00–H06` |
| **SAM-106** | Implement `nexconn-boot.ts` Strict Lifecycle (`registerMessageType` → `NCEngine.connect` → `NCCallEngine`) | `F-01`, `R-01`, `R-03` | Enforces `registerMessageType` inside `beforeReady()` hook and awaits `NCEngine.connect({ token })` before `NCCallEngine.getInstance()`. | `2h` | Dev 1 | `H03–H06` |

---

## Epic 2: Story Routing UX, Custom Lit Cards & Streaming Translation (`H06–H16`)

| Ticket ID | Title | Mapped `F-xx` / `US-xx` | Acceptance Criteria (Verifiable Pass Check) | Est. | Owner | Block |
|---|---|---|---|---|---|---|
| **SAM-201** | Build Story Landing Page (`/`) (`1280x800` Hallmark Hero + 3 Visual Story Chapters) | `F-02`, `US-03` | Headline ≤7 words, 1 sentence, 2 CTAs visible at `1280x800` without scroll; interactive deal preview on right half of stage. | `3h` | Dev 3 | `H06–H11` |
| **SAM-202** | Build `/auth` (Login/Signup Tabs + 4 One-Tap Demo Persona Cards) & `/onboarding` (3-Step Wizard) | `F-01`, `F-02`, `US-01`, `US-02` | Clicking Rajesh/Vikram/Meera/Guest connects `NCEngine` in `<400ms`; `/onboarding` includes **Simulated HD Inspection Video Stream** toggle & DPDP `System` consent receipt. | `3.5h` | Dev 3 | `H06–H11` |
| **SAM-203** | Build `packages/nc-lit-cards` (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`, `<nc-video-assay-receipt>`, `<nc-tribunal-verdict-card>`) | `F-04`, `US-06`, `ADR-0003` | Subclasses `BaseMessageContent` (`lit@^3.3.2`), emits `composed: true` custom events across Shadow DOM, displays `[SYS-VOUCHER]` strip. | `4.5h` | Dev 1 | `H06–H11` |
| **SAM-204** | Wire `M-01` (Gemini 2.5 Flash) & `M-02` (Bhashini ASR/NMT) to `sendGroupChannelStreamMessage` | `F-03`, `US-04`, `US-05`, `API-05` | Streams Tamil ↔ Hindi ↔ English translation + JSON contract footer token-by-token (`TTFT < 280ms`) into `<nc-bilingual-bubble>`. | `4h` | Dev 4 + Dev 1 | `H06–H16` |
| **SAM-205** | Build `SystemMessagesApi` + Rust Ed25519 Hash-Chained Audit Ledger (`voucher_crypto.rs`) | `F-09`, `US-07`, `E-08` | Every escrow transition and DPDP consent emits a SHA-256 chained, Ed25519-signed voucher to the user's read-only `System` channel. | `3h` | Dev 2 + Dev 1 | `H11–H16` |
| **SAM-206** | Build `/sandbox` **1-Click Split-Screen Buyer + Seller + AI Judge Mode** (`API-02`) | `F-11`, `US-03`, `R-04` | Provisions `buyer_demo_<id>` (left) & `seller_demo_<id>` (right) in `<400ms` with a 5-step guided coachmark bar. | `4h` | Dev 3 + Dev 2 | `H11–H16` |

---

## Epic 3: Live WebRTC Video Assay (`@nexconn/call`) & Rust + WASM Forensics (`H16–H21`)

| Ticket ID | Title | Mapped `F-xx` / `US-xx` | Acceptance Criteria (Verifiable Pass Check) | Est. | Owner | Block |
|---|---|---|---|---|---|---|
| **SAM-301** | Build `packages/assay-wasm-rs` (60fps Browser WebAssembly Blur, Glare & Serial Bounding Lock) | `F-06`, `US-09` | Runs in `assay-wasm.worker.ts` at `<1.4ms/frame`, highlights serial plate in Vault Emerald when Laplacian variance `>= 120.0`. | `3.5h` | Dev 2 | `H06–H16` |
| **SAM-302** | Integrate `@nexconn/call` (`startCall`, `requestChangeMediaType(VIDEO)`, `onServerCallLogReceived`) | `F-05`, `US-08` | Escalates 1:1 audio call to HD video (or Simulated HD Juki Canvas Stream) and binds server call log to `video_assay_logs` (`E-06`). | `3.5h` | Dev 1 | `H16–H21` |
| **SAM-303** | Build Apple-Design Draggable Video Assay PiP Loupe (`setPointerCapture` + `projectMomentum()`) | `F-05`, `US-08` | Tracks pointer 1:1 preserving grab offset, projects flick velocity (`d=0.998`) to snap to 4 corners with `damping: 0.8` spring. | `3h` | Dev 3 | `H16–H21` |
| **SAM-304** | Build Server Rust `pHash` + 4096-pt `rustfft` Motor RPM Verifier + `M-03` Vision Check (`API-08`) | `F-06`, `US-10` | Computes 64-bit DCT `pHash` and `4,820 RPM` peak in `<5ms`, verifies `JUKI-MO-6814S-8821`, and emits `<nc-video-assay-receipt>`. | `4h` | Dev 2 + Dev 4 | `H16–H21` |

---

## Epic 4: Instant Channel Freeze & AI + Human Tribunal (`H21–H26`)

| Ticket ID | Title | Mapped `F-xx` / `US-xx` | Acceptance Criteria (Verifiable Pass Check) | Est. | Owner | Block |
|---|---|---|---|---|---|---|
| **SAM-401** | Wire `GroupChannelModerationApi.addGroupChannelFreezeList` (`API-09`) on `Raise Dispute` | `F-07`, `US-11` | Freezes `Group` channel in `<150ms`; locks Buyer & Seller composers with Vermilion Tribunal Seal; updates Go FSM to `DISPUTE_FROZEN`. | `2.5h` | Dev 1 + Dev 2 | `H21–H26` |
| **SAM-402** | Build `/dispatch` Human Arbitrator Triage Console & `API-10` / `API-11` Split Execution | `F-08`, `US-12`, `US-13` | Arbitrator Meera (`P-04`) views pre/post `pHash` Hamming diff, joins frozen channel, and executes binding basis-point split (`88% / 12%`). | `3.5h` | Dev 3 + Dev 2 | `H21–H26` |
| **SAM-403** | Wire `M-04` (Gemini 2.5 Pro Tribunal) Streaming Verdict into `<nc-tribunal-verdict-card>` | `F-08`, `US-13` | Streams evidence-cited settlement split via `sendGroupChannelStreamMessage` immediately after channel freeze. | `3h` | Dev 4 | `H21–H26` |

---

## Epic 5: Open/Community Channels, Viral `/arena`, Mobile & Submission (`H26–H36`)

| Ticket ID | Title | Mapped `F-xx` / `US-xx` | Acceptance Criteria (Verifiable Pass Check) | Est. | Owner | Block |
|---|---|---|---|---|---|---|
| **SAM-501** | Build Hybrid `@nexconn/chat` (`NCEngine`) `Open` Flash Ticker & `Community` Subchannels Sidebar | `F-10`, `US-14`, `API-13`, `API-14` | Uses `OpenChannelPriorityControlsApi` and `createCommunitySubchannel` (`Machinery`, `Refurb-Tech`, `Agri-Mandi`, `Campus-Thrift`). | `3.5h` | Dev 1 + Dev 3 | `H26–H31` |
| **SAM-502** | Build `/arena` 60-Second Viral Chanakya AI Shopkeeper Bargaining Challenge (`API-15`, `API-16`) | `F-12`, `US-16`, `R-12` | Auto-issues real Nexconn token (`issueAccessToken`), enforces Go floor price, streams replies via `sendDirectChannelStreamMessage`. | `3.5h` | Dev 3 + Dev 4 | `H21–H28` |
| **SAM-503** | Build `/guide` (Interactive SDK Manual), `/traction` (`API-18` MAU Proof) & `apps/mobile-expo` (`heroui-native`) | `F-13`, `F-14`, `US-15` | `/traction` displays live MAU & channel stats; `apps/mobile-expo` uses `HeroUINativeProvider`, `Uniwind`, and compound `Card.Body`. | `4h` | Dev 2 + Dev 3 | `H26–H31` |
| **SAM-504** | Run Playwright E2E Suite, `sloplint --render` Gate, `k6` Load Test & Golden AI Evals | `R-11` | `0 FAIL` on `sloplint --render`, `100%` Playwright E2E green, `>=96.5%` AI eval F1, `0` data races. | `3h` | Dev 4 + Dev 2 | `H28–H33` |
| **SAM-505** | Execute Viral MAU Campaign (`500+` MAUs), Record 3m Demo Video, Render PDF & Submit on Reskilll | All | `>500` verified MAUs in `console.nexconn.ai`, `App Key` on Page 1 of PDF, `pS(n)` serializer validated (`<2,900` chars). | `5h` | All 4 Devs | `H31–H36` |
