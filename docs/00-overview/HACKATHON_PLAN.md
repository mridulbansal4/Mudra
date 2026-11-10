# Hackathon Build Plan & Submission Playbook — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Delivery Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](./PROJECT_BRIEF.md) · [Pitch](./PITCH.md) · [Backlog](../08-project/BACKLOG.md) · [Nexconn SDK Manual](../03-engineering/NEXCONN_SDK_MANUAL.md)

---

## 1. Hackathon Constraints & Deadlines

- **Hackathon**: Nexconn Build Challenge 2026 (`https://reskilll.com/hack/nexconn`)
- **Submission Portal**: `https://reskilll.com/hack/nexconn/dashboard`
- **Hard Deadline**: **Sun, Nov 22, 2026, 23:59 AoE** (**Mon, Nov 23, 2026, 5:29 PM IST / GMT+5:30**) — *Team `Chanakya` internal freeze target: **Sun, Nov 22, 2026, 11:00 PM IST** (18.5 hours buffer).*
- **Core Build Sprint**: **36-Hour High-Velocity Engineering Sprint** (`H00` to `H36`) followed by continuous MAU traction harvesting (`/arena` & campus/merchant trials) until deadline.
- **Team Roster (`Chanakya` — 4 Engineers)**:
  - **Dev 1 (`Lead Architect & Nexconn SDK Specialist`)**: `services/nexconn-bridge-node` (`@nexconn/server-sdk@0.1.2`), `@nexconn/chatui` (`<nc-chat-ui-app-provider>`), `@nexconn/chat` (`NCEngine`), `@nexconn/call` (`NCCallEngine`), and `packages/nc-lit-cards` (`lit@^3.3.2`).
  - **Dev 2 (`Systems Backend — Go & Rust Lead`)**: `services/deal-engine-go` (Go 1.24 FSM, PostgreSQL 17, Redis, webhooks, `/traction` telemetry) and `services/assay-verifier-rs` + `packages/assay-wasm-rs` (Rust 1.85 `pHash`, audio FFT, `<300µs` PII scrubber, Ed25519 signing).
  - **Dev 3 (`Frontend Story UX & Design Lead`)**: `apps/web` (React 19, Vite 6, Tailwind v4, HeroUI v3 `@heroui/react`, `/hallmark` Floor, `/unslop` tokens, `/apple-design` springs, routes `/` → `/auth` → `/onboarding` → `/app` → `/sandbox` → `/arena` → `/dispatch` → `/guide` → `/traction`) + `apps/mobile-expo` (`heroui-native`).
  - **Dev 4 (`AI Streaming, Evals, QA & Growth/Pitch Lead`)**: Gemini 2.5 Flash/Pro + Bhashini prompts (`M-01`..`M-05`), Playwright E2E + `sloplint --render`, `/arena` viral MAU rollout, 3-minute demo video, and PDF write-up.

---

## 2. Hour-by-Hour 36-Hour Build Plan (`H00` – `H36`)

```mermaid
gantt
    title SAMADHAN-OS 36-Hour Sprint Critical Path
    dateFormat  HH
    axisFormat  H%H
    section Phase 1: Foundation (H00-H06)
    Nexconn Console + Node Bridge + Go FSM + PG17   :a1, 00, 6h
    HeroUI v3 + Hallmark/Unslop Tokens + Routing    :a2, 00, 6h
    section Phase 2: Core SDKs & Lit Cards (H06-H16)
    Lit Custom Cards + ChatUI + NCEngine Hybrid     :b1, 06, 10h
    Go Deal APIs + Rust PII Scrubber & Assay Core   :b2, 06, 10h
    Story Landing (/) + /auth + /onboarding         :b3, 06, 10h
    section Phase 3: Video Assay & Freeze Tribunal (H16-H26)
    NCCallEngine Video + Rust WASM + CallLog Receipt:c1, 16, 10h
    addGroupChannelFreezeList + AI Stream Tribunal  :c2, 16, 10h
    Split-Screen /sandbox + /arena + /dispatch      :c3, 16, 10h
    section Phase 4: Polish, MAU & Submission (H26-H36)
    Open/Community Sidebar + /guide + /traction     :d1, 26, 5h
    Playwright E2E + sloplint + Load Testing        :d2, 26, 5h
    Viral MAU Campaign + Video + PDF + Portal Submit:d3, 31, 5h
```

| Hour Block | Dev 1 (Nexconn SDKs & Lit) | Dev 2 (Go 1.24 + Rust 1.85) | Dev 3 (Story Frontend & HeroUI v3) | Dev 4 (AI Models, QA & MAU Growth) | Gate / Milestone |
|---|---|---|---|---|---|
| **H00–H03** | Configure `console.nexconn.ai` (`App Key`, `Secret Key`, activate 10k Call SDK mins); scaffold `services/nexconn-bridge-node` (`API-01` `issueAccessToken`). | Scaffold `services/deal-engine-go` (`Chi`/`pgx`, PostgreSQL 17 migrations `E-01`..`E-10`) and `services/assay-verifier-rs` (Axum 0.8). | Scaffold `apps/web` (React 19 + Vite + Tailwind v4 + `@heroui/react@^3.0.1`), write Hallmark stamp & `tokens.css` (`oklch` warm ledger ramp). | Configure Gemini 2.5 Flash/Pro & Bhashini keys; build `M-01` bilingual translation + JSON term extraction prompt templates. | **M1 (`H03`)**: `API-01` issues real Nexconn token & `NCEngine.connect` succeeds in browser. |
| **H03–H06** | Build `nexconn-boot.ts` enforcing `NCEngine.initialize` → `await NCEngine.connect` → `NCCallEngine.getInstance()` order (`R-01`). | Implement Go deterministic escrow FSM (`API-03`, `API-04`, `API-06`) with PostgreSQL optimistic locking (`version`). | Build Story Landing Page `/` (Hallmark Floor `1280x800` hero + 3 story chapters) and `/auth` (1-Tap Persona Login). | Build Rust `<300µs` Aho-Corasick DPDP PII scrubber module in `assay-verifier-rs` (`API-05` pre-hook). | **M2 (`H06`)**: User can go `/` → `/auth` (1-tap Rajesh login) → authenticated Nexconn session. |
| **H06–H11** | Build `packages/nc-lit-cards` (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`, `<nc-video-assay-receipt>`, `<nc-tribunal-verdict-card>`) and register via `registerMessageType` before `app.ready()`. | Build `packages/assay-wasm-rs` (Rust → WASM 60fps blur variance, serial bounding box, frame watermark) + Rust server `pHash` & Ed25519 signer (`API-08`). | Build `/onboarding` (3-step wizard with language selector + **Simulated HD Inspection Video Stream** fallback toggle) and `/app` shell with 4-Stage Story Bar. | Wire `M-01` & `M-02` into `services/nexconn-bridge-node` using `MessageManagementApi.sendGroupChannelStreamMessage`. | **M3 (`H11`)**: Live Tamil ↔ Hindi streaming translation + interactive `<nc-escrow-deal-card>` inside `<nc-chat-ui-app-provider>`. |
| **H11–H16** | Wire `SystemMessagesApi` in Node Bridge to push Ed25519-signed escrow & DPDP receipts into user's `System` channel (`F-09`). | Build `/api/v1/sandbox/provision` (`API-02`) in Go + Node to spin up paired Buyer + Seller tokens & pre-seeded `Group` room in `<400ms`. | Build `/sandbox` **1-Click Split-Screen Buyer + Seller + AI Judge Mode** with synchronized dual panes and 5-step guided coachmarks. | Run initial eval dataset (`AI_EVALS.md`) on 50 Tamil/Hindi/Marathi/English deal negotiation utterances; tune JSON schema accuracy to `>98%`. | **M4 (`H16`)**: 1-Click `/sandbox` launches dual Buyer+Seller chat with live Lit escrow cards. |
| **H16–H21** | Integrate `@nexconn/call@^26.2.0` (`startCall`, `inviteToCall`, `requestChangeMediaType(NCCallMediaType.VIDEO)`, `onServerCallLogReceived`) (`F-05`). | Implement Rust `rustfft` audio motor/fan RPM anomaly detector (`4,820 RPM` check) in `services/assay-verifier-rs` (`API-08`). | Build Apple-design draggable Picture-in-Picture Video Assay Loupe (`setPointerCapture`, velocity handoff, `project()` corner snap, `damping: 0.8` spring). | Wire `M-03` (Gemini 2.5 Flash Vision) into `API-08` to verify serial plate & physical condition alongside Rust `pHash`. | **M5 (`H21`)**: In-channel 1-click audio-to-video inspection + Rust WASM overlay + `onServerCallLogReceived` badge working end-to-end. |
| **H21–H26** | Wire `GroupChannelModerationApi.addGroupChannelFreezeList` (`API-09`) + arbitrator assignment (`API-10`) + settlement (`API-11`). | Build Go dispute state transitions (`DISPUTE_FROZEN` → `SETTLED_SPLIT`) and HMAC webhook handler (`API-17`). | Build `/dispatch` (Human Agent Dispatch Center queue) and `/arena` (60-Second Chanakya AI Shopkeeper Bargaining Challenge UI). | Wire `M-04` (AI Tribunal streaming settlement via `sendGroupChannelStreamMessage`) and `M-05` (`/arena` AI Shopkeeper via `sendDirectChannelStreamMessage`). | **M6 (`H26`)**: 1-Click `Raise Dispute` freezes channel in `<150ms`, dispatches human agent, and streams AI Tribunal split. |
| **H26–H31** | Wire `@nexconn/chat` (`NCEngine`) `Open` channel ticker (`OpenChannelPriorityControlsApi`, `API-13`) and `Community` subchannels (`createCommunitySubchannel`, `API-14`). | Build `/api/v1/traction/telemetry` (`API-18`) aggregating verified Nexconn `userId` MAUs, channel stats, and latency histograms. | Build `/guide` (Interactive Beginner & Judge SDK Inspector), `/traction` (Live MAU Proof Dashboard), and `apps/mobile-expo` (`heroui-native` companion screen). | Run `sloplint --render` across all routes (fix all FAIL/REFLEX); run Playwright E2E suite across `/`, `/auth`, `/onboarding`, `/sandbox`, `/arena`. | **M7 (`H31`)**: All 9 web routes + all 5 Nexconn channel types live in production; 0 `sloplint` errors. |
| **H31–H36** | Audit `console.nexconn.ai` telemetry; verify every SDK package & endpoint shows active logs under our `App Key`. | Load-test Go & Rust services (`k6` 500 VUs); verify zero secret leaks and Docker production health checks. | Final responsive, dark/light theme, and `prefers-reduced-motion` polish across all screens. | Seed `/arena` & campus/merchant links for real MAUs; record 3-minute 1080p60 demo video; compile Write-up PDF; validate Reskilll `pS(n)` submission payload. | **M8 (`H36`)**: Production live, `500+` verified MAUs, submission uploaded & verified on `reskilll.com/hack/nexconn/dashboard`. |

---

## 3. What Is 100% Real vs. What Is Deterministically Simulated in MVP

 Judges respect radical engineering honesty. Here is our exact boundary:

| Subsystem | Status in Hackathon MVP | Technical Implementation Details |
|---|---|---|
| **Nexconn Authentication & Token Issuance (`F-01`)** | **100% Real** | Calls live `https://api.nexconn.ai/v4/auth/access-token/issue` via `@nexconn/server-sdk` (`UserManagementApi.issueAccessToken`). |
| **Nexconn Client Connections & All 5 Channel Types (`F-03`, `F-09`, `F-10`)** | **100% Real** | Live `<nc-chat-ui-app-provider>` (`Direct`, `Group`, `System`) + live `@nexconn/chat` `NCEngine` (`Open`, `Community`). |
| **Custom Lit Message Components (`F-04`)** | **100% Real** | Real `lit@^3.3.2` `BaseMessageContent` subclasses registered via `registerMessageType` before `app.ready()`. |
| **WebRTC Audio/Video Calls & Media Escalation (`F-05`)** | **100% Real (+ Fallback Stream)** | Live `@nexconn/call` (`NCCallEngine.startCall`, `requestChangeMediaType`, `onServerCallLogReceived`), plus a 1-click **Simulated HD Camera Stream** canvas injector for webcam-less judges. |
| **Server-Side AI Streaming & Channel Freeze (`F-03`, `F-07`, `F-08`)** | **100% Real** | Live `sendDirectChannelStreamMessage`, `sendGroupChannelStreamMessage`, and `addGroupChannelFreezeList` against `https://api.nexconn.ai`. |
| **Go 1.24 Escrow FSM & Rust 1.85 Forensic Verifier (`F-04`, `F-06`)** | **100% Real** | Real compiled Go 1.24 and Rust 1.85 + WASM binaries executing `pHash`, audio FFT, PII scrubbing, and Ed25519 signatures. |
| **UPI ASBA / RBI PA-Escrow Bank Settlement (`API-17`)** | **Sandbox / Webhook Simulated** | Uses cryptographically signed HMAC-SHA256 sandbox webhook events simulating Razorpay Route / UPI One-Time Mandate blocks (since holding real public bank deposits requires an RBI PA license). |

---

## 4. Cut List (If Behind Schedule at `H24`)

1. **Never Cut (Sacred Core)**:
   - Story routing flow (`/` → `/auth` → `/onboarding` → `/sandbox` → `/app` → `/traction`).
   - All 4 Nexconn packages (`@nexconn/chatui`, `@nexconn/chat`, `@nexconn/call`, `@nexconn/server-sdk`).
   - Custom Lit `<nc-escrow-deal-card>` + `sendGroupChannelStreamMessage` + `addGroupChannelFreezeList` + `SystemMessagesApi`.
   - Go 1.24 FSM + Rust 1.85 `pHash`/Ed25519 verifier.
2. **Cut Priority 1 (Safe to simplify at `H24`)**:
   - Keep `apps/mobile-expo` (`heroui-native`) as a single-screen companion QR-scanner + live video inspection view rather than duplicating the full arbitrator `/dispatch` queue on mobile.
3. **Cut Priority 2 (Safe to simplify at `H28`)**:
   - Limit `/onboarding` language presets to top 6 languages (Tamil, Hindi, Marathi, Punjabi, Malayalam, English) instead of all 22 scheduled Indian languages.

---

## 5. Forensic Submission Payload for `https://reskilll.com/hack/nexconn/dashboard`

As reverse-engineered in `research/01-facts.md` (`Submit-CDxOt6c5.js` / `Dashboard-O5nz5ong.js`), the Reskilll portal packs all submission fields using `pS(n)` into a single 4,000-character `solutionDescription` string and parses them back in the Judge Admin View (`AdminParts-DCOz_uK5.js`) via `Dx(n)`.

**CRITICAL SERIALIZER RULES**:
1. Total character count of all text fields combined MUST stay **under 3,500 characters** (hard limit is 4,000).
2. **NEVER** start any line inside `Summary` or `SDK Features Used` with `Track:`, `Summary:`, `Nexconn Packages:`, `Nexconn App Key:`, `SDK Features Used:`, `Active Users:`, or `Prior Work:`.
3. Ensure the GitHub repository is **Public** (`api.github.com/repos/chanakya-team/samadhan-os` returns `private: false`) before pasting the URL into the form.

### Ready-to-Paste Submission Fields

- **Project Name**: `SAMADHAN-OS (SamvadDeal)`
- **Track**: `Marketplace & Support`
- **Nexconn Packages Checked**: `[x] Chat SDK` · `[x] Chat UI` · `[x] Call SDK`
- **Nexconn App Key**: `<PASTE_PRODUCTION_NEXCONN_APP_KEY_FROM_CONSOLE>`
- **Prior Work**: `No, built for this challenge`
- **Summary (742 chars — well under 2,000 char limit)**:
  ```text
  SAMADHAN-OS (SamvadDeal) transforms Nexconn Chat UI, Chat SDK, Call SDK, and v4 Server SDK into a real-time cross-lingual video-escrow commerce desk and 90-second dispute arbitration operating system. Addressing the $48B global and Rs 38,000 Cr Indian B2B/P2P marketplace fraud gap, it embeds the transaction state machine directly inside the chat timeline. Buyers and sellers negotiate across Tamil, Hindi, Marathi, Punjabi, and English with live streaming translations, lock milestones inside custom Lit <nc-escrow-deal-card> components backed by a Go 1.24 FSM, verify physical goods over 1-click @nexconn/call WebRTC video with Rust 1.85 + WASM frame/audio forensics, and resolve disputes in 90s via channel-freeze AI + human arbitration.
  ```
- **SDK Features Used (896 chars — single paragraph, zero reserved newline prefixes)**:
  ```text
  1) @nexconn/chatui (^26.2.5) + Lit (^3.3.2): Mounted <nc-chat-ui-app-provider> for Direct, Group, and System channels; registered 4 custom BaseMessageContent cards (<nc-escrow-deal-card>, <nc-bilingual-bubble>, <nc-video-assay-receipt>, <nc-tribunal-verdict-card>) via registerMessageType inside NCChatUIApplication.initialize({ hooks }) before app.ready(). 2) @nexconn/chat & @nexconn/engine (^26.2.1): Initialized NCEngine.initialize({ appKey }) and NCEngine.connect({ token }) to power Open channel flash-lot broadcasts, Community category subchannels (createCommunitySubchannel), and browser voice capture. 3) @nexconn/call (^26.2.0): Wired NCCallEngine over NCEngine for 1:1 audio calls escalating to HD video via requestChangeMediaType(NCCallMediaType.VIDEO) and immutable audit logging via onServerCallLogReceived. 4) @nexconn/server-sdk (0.1.2): Used UserManagementApi.issueAccessToken, MessageManagementApi.sendDirectChannelStreamMessage & sendGroupChannelStreamMessage, GroupChannelModerationApi.addGroupChannelFreezeList, OpenChannelPriorityControlsApi, and SystemMessagesApi.
  ```

---

## 6. Pre-Submission Checklist Mapped to Official Evaluation Rubric

| Check # | Rubric Criterion | Verification Action | Owner |
|---|---|---|---|
| **[ ] 1** | **Nexconn SDK Gate (25%)** | Paste our `App Key` and verify `console.nexconn.ai` shows >500 connected `userId`s, active `Direct`/`Group`/`System`/`Open`/`Community` channels, v4 stream messages, and Call SDK minutes. | Dev 1 |
| **[ ] 2** | **Completeness & Execution (30%)** | Open `Live App` URL in an Incognito browser tab with no webcam attached; verify `/` → `/sandbox` 1-Click Split-Screen Demo completes all 4 deal stages in `<60s` with zero console errors. | Dev 3 |
| **[ ] 3** | **Public Repo Check (30%)** | Run `curl -s https://api.github.com/repos/<org>/samadhan-os \| jq .private` and confirm output is `false`. Verify zero secrets in git history (`gitleaks`). | Dev 2 |
| **[ ] 4** | **Product Value & Innovation (30%)** | Verify Write-up PDF clearly displays the `App Key` on Page 1, architectural diagrams, and benchmark comparison. Verify 3-minute demo video is public on YouTube/Loom with no login wall. | Dev 4 |
| **[ ] 5** | **Traction & MAU Bonus (15%)** | Verify `/traction` URL loads in `<800ms` and displays live verifiable MAU counter, `/arena` leaderboard, and merchant/campus trial receipts. | Dev 4 |
