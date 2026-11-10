# User Stories & Gherkin Acceptance Criteria — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Product Owner) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [PRD](./PRD.md) · [Features](./FEATURES.md) · [Backlog](../08-project/BACKLOG.md)

---

## Epic 1: Story-Driven Onboarding, Auth & Solo-Judge Sandbox (`F-01`, `F-02`, `F-11`)

### `US-01` — 1-Tap Persona & Guest Authentication (`F-01` · Priority: `Must` · Estimate: `S`)
> **As a** first-time user (`P-01`, `P-02`) or arbitrator (`P-04`),
> **I want** to sign in using either standard credentials or 1-Tap Demo Persona Quick-Fill buttons on `/auth`,
> **so that** I receive a real cryptographic Nexconn access token and connect to `NCEngine` in under 400ms without tedious form friction.

```gherkin
Scenario: 1-Tap Persona Login issues real Nexconn token and initializes NCEngine
  Given I am on the "/auth" route
  When I press the "Login as Rajesh (Tamil MSME Buyer)" quick-fill button
  Then the frontend calls "POST /api/v1/auth/session" (API-01)
  And "services/nexconn-bridge-node" invokes "UserManagementApi.issueAccessToken" ("POST /v4/auth/access-token/issue")
  And the client executes "NCEngine.initialize({ appKey })" followed by "await NCEngine.connect({ token })"
  And I am redirected to "/onboarding" (if first visit) or "/app" within 400ms
```

### `US-02` — 45-Second Beginner Onboarding Wizard & Camera Fallback (`F-02` · Priority: `Must` · Estimate: `M`)
> **As a** beginner user (`P-01`) or laptop user without an external camera (`P-05`),
> **I want** a 3-step `/onboarding` wizard that configures my preferred language, tests my camera/mic or enables a Simulated HD Inspection Video Stream, and previews the 4 deal steps,
> **so that** I never feel lost or blocked by missing hardware when entering a deal room.

```gherkin
Scenario: Enabling Simulated HD Inspection Video Stream when webcam is unavailable
  Given I am on Step 2 of "/onboarding"
  When camera permission is denied or I toggle "Use Simulated HD Inspection Stream"
  Then the app binds a 60fps HTMLCanvasElement machinery/electronics stream as the media track source for "NCCallEngine"
  And completing Step 3 routes me to "/app" with Step 1 highlighted in the top 4-Stage Deal Story Bar
```

### `US-03` — 1-Click Split-Screen Buyer + Seller + AI Judge Sandbox (`F-11` · Priority: `Must` · Estimate: `L`)
> **As an** exhausted hackathon judge evaluating at 2 AM (`P-05`),
> **I want** to click `"Launch 1-Click Split-Screen Live Demo"` on `/` and immediately control both Buyer (`left pane`) and Seller (`right pane`) with 5-step guided coachmarks,
> **so that** I can verify the entire multi-party Nexconn stack in 60 seconds without needing a second human or a second device.

```gherkin
Scenario: Zero-login split-screen sandbox provisions two real Nexconn sessions
  Given I am on the "/" Story Landing Page at 1280x800 resolution
  When I press "Launch 1-Click Split-Screen Live Demo"
  Then "POST /api/v1/sandbox/provision" (API-02) issues two distinct Nexconn tokens ("buyer_demo_<id>" and "seller_demo_<id>")
  And both panes connect to the same seeded Nexconn "Group" channel
  And Coachmark Step 1 ("Send Tamil Offer") points directly to the Buyer input bar
```

---

## Epic 2: Cross-Lingual Chat & Custom Lit Escrow State Machine (`F-03`, `F-04`, `F-09`)

### `US-04` — Real-Time Streaming Translation & Contract Extraction (`F-03` · Priority: `Must` · Estimate: `L`)
> **As a** Tamil-speaking buyer (`P-01`) negotiating with a Hindi-speaking seller (`P-02`),
> **I want** my Tamil messages to stream in fluent Hindi and English inside a custom `<nc-bilingual-bubble>` with extracted price and warranty chips,
> **so that** neither of us misunderstands technical specifications.

```gherkin
Scenario: Tamil buyer message is scrubbed by Rust and streamed via sendGroupChannelStreamMessage
  Given Buyer (ta-IN) and Seller (hi-IN) are in an active Deal Room
  When Buyer sends a Tamil message offering "₹1,45,000 with 4,800 RPM test"
  Then "services/assay-verifier-rs" scrubs any raw PII in under 300 microseconds (API-05)
  And "services/nexconn-bridge-node" invokes "MessageManagementApi.sendGroupChannelStreamMessage"
  And "<nc-bilingual-bubble>" streams the Hindi and English translation with first token under 280ms
  And extracted deal chips ("₹1,45,000", "4,800 RPM Assay") render inside the bubble footer
```

### `US-05` — Voice Note Capture & Vernacular ASR Translation (`F-03` · Priority: `Must` · Estimate: `M`)
> **As a** factory-floor buyer or seller (`P-01`, `P-02`),
> **I want** to record a voice note via `@nexconn/chat` and have it transcribed and translated automatically,
> **so that** I can negotiate hands-free on a noisy shop floor.

```gherkin
Scenario: Browser voice capture triggers M-02 ASR and streams bilingual bubble
  Given I hold the voice record button powered by "@nexconn/chat" (NCEngine)
  When I release the button after speaking for 5 seconds in Punjabi or Tamil
  Then M-02 transcribes the audio and streams the translated text via "sendGroupChannelStreamMessage"
```

### `US-06` — Interactive Lit Escrow Milestone Card (`<nc-escrow-deal-card>`) (`F-04` · Priority: `Must` · Estimate: `L`)
> **As a** buyer (`P-01`) and seller (`P-02`),
> **I want** an interactive `<nc-escrow-deal-card>` rendered directly inside the `<nc-chat-ui-app-provider>` message timeline,
> **so that** we can lock funds, trigger video inspection, and release payouts without leaving the chat room.

```gherkin
Scenario: Custom Lit escrow card is registered before app.ready() and mutates Go FSM
  Given "NCChatUIApplication.initialize({ hooks })" registered "x-samadhan-escrow-card" before "app.ready()"
  When Buyer presses "Lock ₹1,45,000 Escrow" inside "<nc-escrow-deal-card>"
  Then "POST /api/v1/deals/:dealId/escrow/transition" (API-06) updates "escrow_contracts" in Go 1.24 FSM from "CREATED" to "FUNDED" in under 1.2ms
  And the card badge updates to "Locked in vault" across both Buyer and Seller screens
  And the top 4-Stage Deal Story Bar advances from Stage 2 to Stage 3 ("Live Video Assay")
```

### `US-07` — Immutable `System` Channel Cryptographic Receipt (`F-09` · Priority: `Must` · Estimate: `M`)
> **As a** transacting party (`P-01`, `P-02`),
> **I want** every escrow state change and DPDP consent action to emit an Ed25519-signed receipt into my read-only `System` channel,
> **so that** I have an unforgeable audit trail if a dispute ever arises.

```gherkin
Scenario: Escrow lock dispatches signed voucher via SystemMessagesApi
  Given an escrow transition from "DRAFT" to "LOCKED" succeeds in "services/deal-engine-go"
  When "services/assay-verifier-rs" signs the hash-chained receipt with Ed25519
  Then "services/nexconn-bridge-node" sends the voucher to Buyer and Seller via "SystemMessagesApi"
  And the receipt appears inside "<nc-chat-ui-app-provider>" under the read-only "System" channel tab
```

---

## Epic 3: Live WebRTC Video Assay & Rust + WASM Forensics (`F-05`, `F-06`, `F-14`)

### `US-08` — 1-Click Audio-to-HD-Video Call Escalation (`F-05` · Priority: `Must` · Estimate: `L`)
> **As a** buyer (`P-01`, `P-03`),
> **I want** to click `"Verify on Live Video"` inside `<nc-escrow-deal-card>` to launch a 1:1 `@nexconn/call` session and escalate to HD video inside a draggable Apple-design PiP Loupe,
> **so that** I can visually inspect the physical product without switching apps.

```gherkin
Scenario: Starting NCCallEngine call after NCEngine.connect and escalating to video
  Given "await NCEngine.connect({ token })" has resolved
  When Buyer presses "Verify on Live Video"
  Then "NCCallEngine.getInstance().startCall" initiates the 1:1 call
  And "requestChangeMediaType(NCCallMediaType.VIDEO)" escalates the stream to HD video
  And the draggable PiP Loupe tracks pointer movement 1:1 via "setPointerCapture" and snaps to corners using Apple momentum projection
```

### `US-09` — Client Rust WASM 60fps Blur & Serial Plate Lock (`F-06` · Priority: `Must` · Estimate: `M`)
> **As a** seller showing a machine or laptop on camera (`P-02`, `P-03`),
> **I want** real-time visual feedback in the video overlay showing when the frame is sharp and the serial plate is locked,
> **so that** we capture court-grade evidence on the first try.

```gherkin
Scenario: Rust WASM module validates frame sharpness and serial bounding box at 60fps
  Given an "@nexconn/call" video stream is active in the PiP Loupe
  When the video frames pass through "packages/assay-wasm-rs"
  Then frames with Laplacian variance >= 120.0 highlight the serial plate bounding box in Vault Emerald
  And clicking "Capture Forensic Proof" sends the watermarked frame + audio buffer to "API-08"
```

### `US-10` — Server Rust `pHash`, Audio FFT Motor Check & Call Log Receipt (`F-05`, `F-06` · Priority: `Must` · Estimate: `L`)
> **As a** buyer (`P-01`),
> **I want** the server to compute a perceptual hash (`pHash`), verify motor/fan acoustic RPM via FFT, run multimodal Vision defect checks (`M-03`), and log the call receipt via `onServerCallLogReceived`,
> **so that** the seller cannot swap the machine before shipping.

```gherkin
Scenario: Rust assay-verifier-rs completes pHash + FFT + Ed25519 signature and logs call receipt
  Given the client submits a captured video frame and 2-second audio PCM slice to "POST /api/v1/deals/:dealId/assay/verify-frame" (API-08)
  When "services/assay-verifier-rs" computes the 64-bit pHash and 4096-point FFT peak (4820 RPM) in under 5ms
  And "M-03" confirms serial plate "JUKI-MO-6814S-8821" with zero external cracks
  Then "<nc-video-assay-receipt>" renders in the chat timeline bound to the "onServerCallLogReceived" callId
  And "escrow_contracts" transitions to "ASSAY_VERIFIED"
```

---

## Epic 4: Channel-Freeze Dispute Lock & AI + Human Tribunal (`F-07`, `F-08`)

### `US-11` — Instant Room Freeze on Dispute (`addGroupChannelFreezeList`) (`F-07` · Priority: `Must` · Estimate: `M`)
> **As a** buyer or seller facing a delivery discrepancy (`P-01`, `P-02`),
> **I want** clicking `"Raise Dispute"` to immediately freeze the group channel via `GroupChannelModerationApi.addGroupChannelFreezeList`,
> **so that** neither party can delete context, spam threats, or manipulate the chat while arbitration begins.

```gherkin
Scenario: Raising a dispute freezes the Nexconn Group channel in under 150ms
  Given a Deal Room is in "ASSAY_VERIFIED" state
  When Buyer presses "Raise Dispute / Flag Transit Defect"
  Then "POST /api/v1/deals/:dealId/dispute/freeze" (API-09) invokes "GroupChannelModerationApi.addGroupChannelFreezeList"
  And both Buyer and Seller chat composers transition to locked state with a Vermilion Freeze Banner within 150ms
  And the Go FSM updates the deal state to "DISPUTE_FROZEN"
```

### `US-12` — Human Agent Dispatch Center Triage (`/dispatch`) (`F-08` · Priority: `Must` · Estimate: `M`)
> **As a** human dispute arbitrator (`P-04` Meera),
> **I want** a `/dispatch` console that lists all frozen channels with side-by-side pre-shipment vs. post-delivery `pHash` / video logs and 1-click channel join,
> **so that** I can step into any frozen deal room with moderation override permissions in seconds.

```gherkin
Scenario: Arbitrator claims frozen deal room from /dispatch
  Given Deal Room "deal_8821" is frozen via "addGroupChannelFreezeList"
  When Arbitrator Meera clicks "Join & Arbitrate" on "/dispatch" (API-10)
  Then "GroupChannelManagementApi" adds Meera to the Group channel with moderator bypass privileges
```

### `US-13` — Streamed AI Tribunal Verdict & 1-Tap Binding Split (`F-08`, `F-09` · Priority: `Must` · Estimate: `L`)
> **As a** buyer, seller, and arbitrator (`P-01`, `P-02`, `P-04`),
> **I want** the AI Tribunal (`M-04`) to analyze the signed `System` vouchers and video assay logs and stream an evidence-backed settlement split into `<nc-tribunal-verdict-card>` via `sendGroupChannelStreamMessage`,
> **so that** we can settle the dispute in 90 seconds instead of 14 days.

```gherkin
Scenario: AI Tribunal streams 88/12 split and arbitrator executes settlement
  Given Deal Room "deal_8821" is in "DISPUTE_FROZEN" state
  When "M-04" compares pre-shipment Assay Log #1 against delivery Assay Log #2
  Then "MessageManagementApi.sendGroupChannelStreamMessage" streams the rationale and proposed split (88% Seller / 12% Buyer Repair Rebate) into "<nc-tribunal-verdict-card>"
  And when Arbitrator or both parties press "Approve & Settle Split" (API-11)
  Then Go FSM transitions to "SETTLED_SPLIT" and "SystemMessagesApi" emits the final Ed25519 payout receipt
```

---

## Epic 5: Open/Community Channels, Viral MAU Arena & Telemetry (`F-10`, `F-12`, `F-13`)

### `US-14` — Live `Open` Channel Flash-Lot Ticker & `Community` Subchannels (`F-10` · Priority: `Must` · Estimate: `M`)
> **As a** wholesale or campus trader (`P-02`, `P-03`),
> **I want** to browse priority flash lots in an `Open` channel ticker (`OpenChannelPriorityControlsApi`) and category-specific `Community` subchannels (`createCommunitySubchannel`),
> **so that** I can discover verified deals and spawn a 1:1 or Group escrow room in one click.

```gherkin
Scenario: Verified seller broadcasts priority flash lot into Open channel
  Given "NCEngine" is connected in the left marketplace sidebar
  When Seller Vikram broadcasts a flash lot via "POST /api/v1/marketplace/open-lots/broadcast" (API-13)
  Then "OpenChannelPriorityControlsApi" marks Vikram as a priority sender and broadcasts the lot to all connected viewers
  And clicking "Negotiate Lot" opens a seeded Deal Room inside "<nc-chat-ui-app-provider>"
```

### `US-15` — Interactive SDK Guide (`/guide`) & Live MAU Proof (`/traction`) (`F-13` · Priority: `Should` · Estimate: `M`)
> **As a** hackathon judge (`P-05`),
> **I want** `/guide` to show exact Nexconn SDK hook mappings and `/traction` to display live verified MAU telemetry matching `console.nexconn.ai`,
> **so that** I can award full marks on the 25% SDK Integration and 15% Traction rubrics with 100% confidence.

```gherkin
Scenario: /traction displays live verified MAU count and SDK breakdown
  Given I navigate to "/traction"
  When the page fetches "GET /api/v1/traction/telemetry" (API-18)
  Then I see the total connected unique Nexconn "userId" count, active Direct/Group/System/Open/Community channel counts, and p95 latencies
```

### `US-16` — 60-Second Viral AI Shopkeeper Bargaining Challenge (`/arena`) (`F-12` · Priority: `Should` · Estimate: `M`)
> **As a** college student (`P-03`),
> **I want** to open `/arena` and bargain against Chanakya AI Shopkeeper for 60 seconds with responses streamed via `sendDirectChannelStreamMessage`,
> **so that** I can win a discount rank badge, share it on WhatsApp, and register a real verified MAU session on Nexconn.

```gherkin
Scenario: Playing /arena issues a real Nexconn token and streams AI Shopkeeper responses
  Given I open "/arena" from a campus WhatsApp link
  When I press "Start 60s Bargain Duel"
  Then "POST /api/v1/arena/start" (API-15) issues a real Nexconn token via "UserManagementApi.issueAccessToken" and connects "NCEngine"
  And each counter-offer I send ("POST /api/v1/arena/:runId/bid", API-16) streams the AI Shopkeeper's reply via "MessageManagementApi.sendDirectChannelStreamMessage"
```
