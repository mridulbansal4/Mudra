# UI Specification & Story Routing Flow - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Frontend & Story UX Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Design System](./DESIGN_SYSTEM.md) · [User Journeys](../01-product/USER_JOURNEYS.md) · [Frontend Engineering](../03-engineering/FRONTEND.md) · [Mobile Spec](../03-engineering/MOBILE.md)

---

## 1. Story-Driven Routing Architecture Overview

A first-time user (`P-01`..`P-04`) or an exhausted hackathon judge at 2 AM (`P-05`) is guided through a **deliberate, self-explanatory narrative arc**. Every route answers four questions immediately (`/apple-design` Wayfinding): *Where am I? What is happening? What is the next single button I should press? How do I switch modes?*

| Route Path | Screen Name | Target Persona(s) | Core Job & Beginner Guidance Mechanism |
|---|---|---|---|
| **`/`** | **Story Landing Page** | All (`P-01`..`P-05`) | Explains the ₹38,000 Cr problem in 3 visual chapters; above-the-fold `1280x800` hero gives 2 clear doors: **"Launch 1-Click Split-Screen Live Demo"** (`/sandbox`) or **"Sign in / Create account"** (`/auth`). |
| **`/auth`** | **1-Tap Beginner Login, Signup & Persona Switcher** | `P-01`..`P-04`, `P-05` | HeroUI v3 `<Tabs>` for Login / Signup + **4 One-Tap Demo Persona Cards** (*Rajesh - Tamil Buyer*, *Vikram - Hindi Seller*, *Meera - Arbitrator*, *Instant Guest*) calling `API-01` (`issueAccessToken`). |
| **`/onboarding`** | **45-Second Interactive Setup & Guide Wizard** | First-time users | 3-step visual setup: (1) Native Language & Role, (2) Camera/Mic test OR **1-Click Simulated HD Inspection Video Stream** toggle, (3) 30-second interactive preview of the 4 Deal Stages. |
| **`/app`** & **`/app/deals/:channelId`** | **Main Deal Desk Workbench** | `P-01`, `P-02`, `P-03` | Full-viewport workbench with top **4-Stage Deal Story Bar** + pulsing **"Next Step"** coachmark, left hybrid sidebar (`Direct`/`Group`/`System` + `Open`/`Community`), center `<nc-chat-ui-app-provider>` with custom Lit cards, and draggable `@nexconn/call` PiP Loupe. |
| **`/sandbox`** | **1-Click Split-Screen Buyer + Seller + AI Judge Mode** | `P-05` (Judge), Beginners | Zero-login dual-pane view (`Left: Buyer Rajesh` · `Right: Seller Vikram`) connected to a real seeded Nexconn `Group` channel, driven by a top **5-Step Guided Story Director** bar. |
| **`/arena`** | **60-Second Chanakya AI Shopkeeper Bargaining Challenge** | `P-03` (Campus), Public | Gamified 1:1 bargaining duel (`sendDirectChannelStreamMessage`, `API-15`/`API-16`) that auto-issues real Nexconn user tokens to generate 500–1,000+ verified MAUs. |
| **`/dispatch`** | **Human Agent & Arbitrator Dispatch Center** | `P-04` (Meera), `P-05` | Live triage console for frozen `Group` channels (`addGroupChannelFreezeList`), side-by-side Rust `pHash`/FFT evidence comparison, and 1-click AI Tribunal split execution. |
| **`/guide`** | **Interactive Beginner Tour & Nexconn SDK Inspector** | `P-05`, Developers | Interactive visual manual mapping every UI button to its exact `@nexconn/chatui`, `@nexconn/chat`, `@nexconn/call`, `@nexconn/server-sdk`, Go, and Rust implementation. |
| **`/traction`** | **Live Verified MAU & Telemetry Proof Dashboard** | `P-05` (Judge) | Verifiable public telemetry ledger (`API-18`) showing unique connected Nexconn `userId`s, channel counts, and latency histograms matching `console.nexconn.ai`. |

---

## 2. Screen-by-Screen Wireframes, States & Specifications

### Screen 1: `/` - Story Landing Page (`/hallmark` Floor + `/unslop` Pass)

- **Purpose**: Hook the visitor in 5 seconds without a single word of AI slop, prove the product is real by rendering a live interactive preview on the right half of the stage, and route beginners or judges to `/sandbox`, `/auth`, or `/arena`.
- **Layout (ASCII Wireframe - `1280x800` First Fold + 3 Story Chapters Below)**:
```text
+--------------------------------------------------------------------------------------------------+
| MUDRA-OS          Story   How it works   Bargain arena   SDK guide   Traction     Sign in     |
|                                                                      [ Launch 1-click demo ]     |
+--------------------------------------------------------------------------------------------------+
|                                                |                                                 |
|  Trade across languages.                       |  +-------------------------------------------+  |
|  Verify on live video.                         |  | Deal #8821 · Juki MO-6814S Overlock       |  |
|                                                |  | [1. Negotiate] -> [2. Escrow] -> [3. Video]|  |
|  Negotiate in Tamil or Hindi, inspect goods    |  |-------------------------------------------|  |
|  over WebRTC video, and settle escrow in       |  | Rajesh (ta-IN -> hi-IN streamed 240ms):   |  |
|  90 seconds inside one Nexconn channel.        |  | "மோட்டார் 4800 RPM சோதனை தேவை"           |  |
|                                                |  | "मोटर 4800 RPM लाइव वीडियो टेस्ट चाहिए"    |  |
|  [ Launch 1-click split-screen demo ]          |  |-------------------------------------------|  |
|  [ Sign in or create merchant account ]        |  | <nc-escrow-deal-card>         ₹1,45,000   |  |
|                                                |  | Status: Locked in vault · Assay verified  |  |
|  Built on Nexconn ChatUI, Chat, Call & v4 API  |  | [SYS-VOUCHER · ED25519:8f9a...2c1b]       |  |
+------------------------------------------------+  +-------------------------------------------+  |
|                                                                                                  |
|  --- Scroll Below Fold: Chapter 1 (The Rs 38,000 Cr Problem) -> Chapter 2 (4-Step Covenant) ---  |
|  --- Chapter 3: Pick Your Entry Persona (MSME Buyer | Dealer | Campus Arena | Judge Sandbox) --- |
+--------------------------------------------------------------------------------------------------+
```
- **Component & State Rules**:
  - **Above-the-Fold Check**: Headline is 7 words (`39 chars`), subhead is 1 sentence, Primary CTA (`variant="primary"`) launches `/sandbox`, Secondary CTA (`variant="outline"`) opens `/auth`.
  - **States**:
    - *Loading*: Hero text and interactive Lit preview render immediately from static SSR/bundle (`0ms` skeleton flash).
    - *Offline*: Displays cached interactive preview and allows offline inspection of `/guide`.
- **Analytics Events Fired**: `story_landing_viewed`, `story_cta_pressed`.

---

### Screen 2: `/auth` - 1-Tap Beginner Login, Signup & Persona Switcher

- **Purpose**: Make authentication effortless for both real merchants/students creating an account AND beginners/judges who want to step into a pre-configured persona in 1 click.
- **Layout (ASCII Wireframe)**:
```text
+--------------------------------------------------------------------------------------------------+
| <- Back to story (/)                        MUDRA-OS                        Need help? /guide |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|     +----------------------------------------+   +--------------------------------------------+  |
|     | Sign in or create account              |   | Instant 1-tap demo & judge personas        |  |
|     | [ Sign in ]  [ Create account ]        |   | Zero typing required. Issues a live        |  |
|     |                                        |   | cryptographic token via API-01.            |  |
|     | Phone or work email                    |   |                                            |  |
|     | [ rajesh@tirupurknit.in              ] |   | +----------------------------------------+ |  |
|     |                                        |   | | Rajesh Natarajan · Tamil Buyer (ta-IN) | |  |
|     | Preferred language                     |   | | Tirupur MSME · Buying Rs 1.45L machine | |  |
|     | [ Tamil (ta-IN)                    v ] |   | +----------------------------------------+ |  |
|     |                                        |   | +----------------------------------------+ |  |
|     | Role                                   |   | | Vikram Singh · Hindi Seller (hi-IN)    | |  |
|     | (o) Buyer  ( ) Seller  ( ) Arbitrator  |   | | Ludhiana Dealer · Live video assay     | |  |
|     |                                        |   | +----------------------------------------+ |  |
|     | [ Continue to deal desk              ] |   | +----------------------------------------+ |  |
|     |                                        |   | | Meera Krishnan · Arbitrator (en-SG)    | |  |
|     | Protected by DPDP consent receipt in   |   | | Opens /dispatch freeze triage console  | |  |
|     | your Nexconn System channel            |   | +----------------------------------------+ |  |
|     +----------------------------------------+   | [ Or launch dual split-screen (/sandbox) ] |  |
|                                                  +--------------------------------------------+  |
+--------------------------------------------------------------------------------------------------+
```
- **States**:
  - *Submitting*: Button shows inline spinner + `"Issuing Nexconn access token (/v4/auth/access-token/issue)..."` (`<400ms`).
  - *Error*: Inline HeroUI v3 validation message below field (never a jarring browser alert).
- **Analytics Events Fired**: `nexconn_session_connected`.

---

### Screen 3: `/onboarding` - 45-Second Interactive First-Time User Setup & Guide

- **Purpose**: Eliminate beginner confusion and hardware blockers (missing webcam/mic) in 3 quick visual steps before entering `/app`.
- **Layout (ASCII Wireframe)**:
```text
+--------------------------------------------------------------------------------------------------+
| MUDRA-OS Onboarding                     Step 2 of 3: Video & audio assay check      [ Skip ]  |
+--------------------------------------------------------------------------------------------------+
|  (1) Language & role  ========>  (2) Video assay source  -------->  (3) 30s interactive preview  |
|                                                                                                  |
|  +--------------------------------------------------------------------------------------------+  |
|  | Configure your live inspection camera (@nexconn/call + Rust WASM)                          |  |
|  |                                                                                            |  |
|  |  +--------------------------------------+   Camera source mode                             |  |
|  |  | [LIVE 60FPS PREVIEW]                 |   ( ) Use my device webcam & microphone          |  |
|  |  |  +--------------------------------+  |   (o) Use simulated HD inspection video stream   |  |
|  |  |  | SERIAL: JUKI-MO-6814S-8821     |  |       (Recommended for desktop demos or devices  |  |
|  |  |  | Sharpness: 148.2 (Pass)        |  |        without a physical product on camera)     |  |
|  |  |  +--------------------------------+  |                                                  |  |
|  |  |  Audio FFT: 4,820 RPM (Nominal)      |   DPDP Act 2023 & Singapore PDPA consent         |  |
|  |  +--------------------------------------+   [x] Log signed consent receipt in my System    |  |
|  |                                                 channel via SystemMessagesApi              |  |
|  |                                                                                            |  |
|  |  [ <- Back: Language ]                                  [ Next: 30s deal preview -> ]      |  |
|  +--------------------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------------+
```
- **Analytics Events Fired**: `onboarding_completed`.

---

### Screen 4: `/app` (`/app/deals/:channelId`) - Main Deal Desk Workbench

- **Purpose**: Primary production workspace uniting all 5 Nexconn channel types (`Direct`, `Group`, `System`, `Open`, `Community`), the 4 custom Lit cards, the top **4-Stage Deal Story Bar**, and the draggable Apple-design `@nexconn/call` PiP Loupe.
- **Layout (ASCII Wireframe - `1440x900` Desktop Workbench)**:
```text
+--------------------------------------------------------------------------------------------------+
| MUDRA-OS   [Stage 1: Negotiate ✓] -> [Stage 2: Escrow ✓] -> [Stage 3: Video Assay ●] -> [4]   |
|               Next recommended step: Click "Verify on live video" inside the escrow card below   |
+---------------------------+----------------------------------------------------------------------+
| Channels (260px)          | Deal #8821 · Juki MO-6814S Overlock            [Split view] [Guide]  |
| [Deals] [System] [Market] | Buyer: Rajesh (ta-IN) · Seller: Vikram (hi-IN) · Vault: ₹1,45,000    |
|---------------------------+----------------------------------------------------------------------|
| Direct & Group (@chatui)  |                                                                      |
| > #8821 Juki Overlock     |  [Rajesh · 10:14 AM · <nc-bilingual-bubble>]                         |
|   #8819 RTX 3080 GPU      |  TA: நான் ₹1,45,000-க்கு வாங்க தயார், வீடியோ சோதனை தேவை              |
|   #8814 Basmati Lot 12T   |  HI (Streamed 240ms): मैं ₹1,45,000 में खरीदने को तैयार हूँ...       |
|                           |  Extracted: [ Price: ₹1,45,000 ] [ Assay: 4800 RPM Video ]           |
| System Ledger (@chatui)   |                                                                      |
|   [SYS] Consent #401      |  [MUDRA Vault · 10:15 AM · <nc-escrow-deal-card>]                 |
|   [SYS] Escrow Lock #402  |  +----------------------------------------------------------------+  |
|                           |  | Escrow Milestone Contract · ₹1,45,000           [LOCKED VAULT] |  |
| Open Flash Ticker (@chat) |  | [x] Terms extracted   [x] ₹1,45,000 locked   [ ] Video assay   |  |
|   [LIVE] Ludhiana CNC Lot |  | [ Verify on live video (@nexconn/call) ]   [ Raise dispute ]   |  |
|   [LIVE] Pune MacBook M2  |  | [SYS-VOUCHER · PREV:9a1c · CURR:8f9a2c1b · ED25519 VERIFIED]   |  |
|                           |  +----------------------------------------------------------------+  |
| Community (@chat)         |                                  +--------------------------------+  |
|   # sub/machinery         |                                  | PiP Video Assay Loupe (Drag)   |  |
|   # sub/refurb-tech       |                                  | [JUKI-MO-6814S-8821 LOCKED]    |  |
|   # sub/agri-mandi        |                                  | FFT: 4820 RPM | [Capture Proof]|  |
|   # sub/campus-thrift     |                                  +--------------------------------+  |
|---------------------------+----------------------------------------------------------------------|
| Role: Rajesh (ta-IN)      | [Mic] Type in Tamil or English...                            [Send]  |
+---------------------------+----------------------------------------------------------------------+
```
- **All 5 UI States Defined**:
  1. **Empty State**: If no deal room is selected, shows a warm ledger illustration and 2 buttons: `"Start a new deal room"` or `"Load seeded Juki Overlock demo deal"`.
  2. **Streaming State**: When `sendGroupChannelStreamMessage` is active, `<nc-bilingual-bubble>` and `<nc-tribunal-verdict-card>` show a subtle ink-cursor progress indicator (no bouncing dots).
  3. **Frozen Dispute State (`DISPUTE_FROZEN`)**: When `addGroupChannelFreezeList` fires (`API-09`), the bottom composer locks with a Vermilion seal banner: `"Channel frozen for arbitration via GroupChannelModerationApi.addGroupChannelFreezeList - Arbitrator Meera & AI Tribunal active"`.
  4. **Offline / Reconnecting State**: Top hairline banner shows `"Reconnecting NCEngine socket - signed vouchers queued locally"`.
  5. **Success / Settled State (`SETTLED_RELEASED` / `SETTLED_SPLIT`)**: Vault Emerald seal + link to view the full hash chain in the `System` channel tab.

---

### Screen 5: `/sandbox` - 1-Click Split-Screen Buyer + Seller + AI Judge Mode

- **Purpose**: Allow a solo judge (`P-05`) or curious beginner to experience the entire multi-party conversation, translation, WebRTC video inspection, and channel-freeze arbitration in one browser tab with zero login.
- **Layout (ASCII Wireframe)**:
```text
+--------------------------------------------------------------------------------------------------+
| MUDRA-OS SANDBOX   Guided Tour: [Step 1: Send Tamil Offer] -> [2: Lock] -> [3: Video] -> [4]  |
|                       [ Auto-Play 45s Demo ]  [ Camera: Simulated HD Stream ON ]  [ Exit -> / ]  |
+------------------------------------------------+-------------------------------------------------+
| LEFT PANE: Buyer · Rajesh (ta-IN)              | RIGHT PANE: Seller · Vikram (hi-IN)             |
| Nexconn userId: buyer_demo_991a                | Nexconn userId: seller_demo_991b                |
|------------------------------------------------+-------------------------------------------------|
| <nc-chat-ui-app-provider> (Instance A)         | <nc-chat-ui-app-provider> (Instance B)          |
|                                                |                                                 |
| [Coachmark -> Click quick-send below]          | [Receives live streamed Hindi translation &     |
|                                                |  synchronized <nc-escrow-deal-card> in <280ms]  |
| +--------------------------------------------+ | +---------------------------------------------+ |
| | <nc-escrow-deal-card>           ₹1,45,000  | | | <nc-escrow-deal-card>            ₹1,45,000  | |
| | [ Lock Escrow ] [ Verify Video ] [Dispute] | | | [ Confirm Serial on Video ] [ Accept Split] | |
| +--------------------------------------------+ | +---------------------------------------------+ |
|------------------------------------------------+-------------------------------------------------|
| Quick Pills: [1. Tamil Offer] [2. Lock] [3.Video] | Quick Pills: [Reply in Hindi] [Stream Camera]|
+------------------------------------------------+-------------------------------------------------+
```
- **Analytics Events Fired**: `nexconn_session_connected` (x2), `bilingual_stream_completed`, `escrow_card_transitioned`, `video_assay_verified`, `dispute_channel_frozen`, `tribunal_split_settled`.

---

### Screen 6: `/arena` - 60-Second Chanakya AI Shopkeeper Bargaining Challenge

- **Purpose**: Viral campus & social loop (`F-12`) where every player gets a real Nexconn user token (`API-15`) and haggles with Chanakya AI Shopkeeper over a `Direct` channel (`sendDirectChannelStreamMessage`, `API-16`).
- **Layout Summary**:
  - Top bar: `tabular-nums` `00:60` countdown timer + current item (`Refurbished MacBook Air M2 - Ask: ₹52,000 · Floor: Hidden`) + live discount meter (`Current Offer: ₹41,500 · -20.2%`).
  - Center: `<nc-chat-ui-app-provider>` (`Direct` channel) streaming witty multilingual counter-offers from Chanakya AI Shopkeeper.
  - Completion Modal: Displays rank badge, verified Nexconn `userId` receipt, **"Share Challenge on WhatsApp"**, and **"Open Real Escrow Room"**.

---

### Screen 7: `/dispatch` - Human Agent & Arbitrator Dispatch Center

- **Purpose**: Fulfill sub-prompt #2 (*Human agent dispatch center*) by giving Arbitrator Meera (`P-04`) a dedicated queue of frozen `Group` channels (`addGroupChannelFreezeList`).
- **Layout Summary**:
  - Left column (`320px`): Live queue of frozen disputes sorted by escrow value (`₹1,45,000 · #8821 · Frozen 12s ago`).
  - Center column: Frozen `<nc-chat-ui-app-provider>` timeline where Meera can post with moderator override and trigger or edit `<nc-tribunal-verdict-card>`.
  - Right column (`380px`): Forensic Comparison Inspector showing Pre-Shipment `pHash` (`8f9a...`) vs. Post-Delivery `pHash` (`8f9b...`, Hamming distance `3`), `onServerCallLogReceived` call logs, and 1-click **"Execute Binding Split (`API-11`)"**.

---

### Screen 8 & 9: `/guide` (Interactive SDK Manual) & `/traction` (Live MAU Proof)

- **`/guide`**: Interactive split view where clicking any feature (*Custom Lit Cards*, *Server Stream API*, *Call Escalation*, *Channel Freeze*, *Open Priority Ticker*, *Community Subchannels*) highlights the exact file path, method call, and live request/response log.
- **`/traction`**: Displays the 4 Hallmark stat cards (`Verified Nexconn MAUs`, `Channels by Type`, `Video Assays & Frozen Tribunals`, `Go/Rust/Nexconn p95 Latency`) + live recent anonymized `nexconn_user_id` connection feed (`API-18`).
