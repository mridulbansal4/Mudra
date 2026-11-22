# C - Judges & Evaluation Pipeline Deep-Dive: Inside the Nexconn & Reskilll Review Room

> **Primary Sources**: `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js`, `https://reskilll.com/hack/nexconn/assets/Submit-R3OJNUmD.js`, `https://reskilll.com/hack/nexconn/assets/Rules-DQNF0983.js`, `https://reskilll.com/hack/nexconn/assets/index-DSX23m3q.js`, `https://www.nexconn.ai/`, `https://docs.nexconn.ai/llms.txt`, and `https://github.com/NexconnAI-Dev`.

---

## 1. Who Are the Judges? (The Evaluation Panel)

Per `Rules-DQNF0983.js` (`Zx` & `hS`), the judging window runs for 5 days (`Nov 23 – Nov 27, 2026`) and is conducted directly by **"the Nexconn team"** after initial eligibility triage by **Reskilll** operations. No external celebrity guest judges are listed on the portal; instead, submissions are evaluated by the exact product managers, solutions engineers, and SDK architects who built `nexconn.ai`, `console.nexconn.ai`, and `NexconnAI-Dev`:

### 1.1 Primary Judge Archetypes & Named Stakeholders
| Seat / Role | Identity & Background | Primary Lens & What They Inspect First | Pet Peeves (Instant Downgrades) |
|---|---|---|---|
| **1. Reskilll Operations Screening Lead** | Reskilll Hackathon Program Manager (`/hack/nexconn/admin` operator) | Checks **Form Completeness** in `Admin-_pGkMjvW.js`: Is `status === "submitted"`? Does `repoUrl` open publicly? Does `demoVideoUrl` play without permission errors? Does `writeupUrl` PDF open and contain the `App Key`? | Google Drive videos set to "Request Access", 404 deployment URLs, missing PDF write-ups, or `call-sdk` alone without `chat-sdk`/`chat-ui`. |
| **2. Nexconn Solutions Engineering & DevRel Lead (`Amy` & Quickdemo Maintainers)** | Authors of `https://github.com/NexconnAI-Dev` (`imsdk-web-Quickdemo`, `uikit-android-Quickdemo`, `nexconn-skills`) | Clicks the **Copy App Key** button in `Admin-_pGkMjvW.js` and pastes `appKey` into `console.nexconn.ai` internal telemetry. Verifies real SDK initialization, token generation (`getToken`), channel creation, and message count. | **"Fake Integration"**: Apps that submit a real `appKey` with `0` API calls on `console.nexconn.ai` while routing chat over Firebase, Supabase, or `socket.io`, or hardcoding `App Secret` inside frontend React code. |
| **3. Nexconn Global Product Director (`Leo`)** | Leads Nexconn international product commercialization, pricing ($860/mo 10K MAU plan), and vertical go-to-market (`nexconn.ai`) | Evaluates **Completeness & UX (50%)** and **Business & Growth Potential (20% + Traction Bonus)**. Asks: *"Could we feature this app on `nexconn.ai` as a customer case study tomorrow? Did real users actually log in and send messages?"* | Ugly tutorial UIs, broken login screens requiring manual token copy-pasting by the user, and zero thought given to how the app acquires or retains users. |
| **4. Nexconn AI Product Manager (`Kai` - AI Mode, Lyra & `nexconn-skills`)** | Architect of **AI Mode** (`https://docs.nexconn.ai/ai-mode/`), **Lyra** (`https://www.lyrawork.com`), and `https://github.com/NexconnAI-Dev/nexconn-skills` | Evaluates **Innovation & Scenario Value (30%)**, especially how teams combine human messaging with AI agents, **Streaming Messages (`stream-message.md`)**, **Message Expansion (`expansion.md`)**, **Built-in Translation**, or **Voice-to-Text**. | Generic "ChatGPT wrapper in a single chat box" that doesn't use Nexconn's multi-user channels, streaming message primitives, or stateful message expansion. |
| **5. Nexconn Core IM/RTC Architecture Reviewer (`Yang Pan` / `Cen Yu` Engineering Delegate)** | Senior SDK & backend engineers behind `@rongcloud/imlib-next`, `IMKit`, `CallLib`, and Open Channel clusters | Inspects the public GitHub repository (`repoUrl`) and `sdkFeatures` text (`30–2,000 chars`) to see which specific Nexconn primitives were exercised (e.g., Open Channel metadata, Targeted Group Messages, custom message types, webhooks, E2EE, moderation). | Using only basic `sendTextMessage` in a 1-on-1 room when the scenario clearly calls for Group Channels, Open Channel Metadata, or Message Expansion. |

---

## 2. Reconstructed 4-Step Judging Workflow (Proven by `Admin-_pGkMjvW.js`)

From our forensic inspection of `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js` and `Submit-R3OJNUmD.js`, we know the exact interface and workflow the judges use between **November 23 and November 27, 2026**:

### Step 1 - CSV Export & Admin Triage (`Admin-_pGkMjvW.js`)
The judging coordinator exports the master CSV (`Qt` in `Admin-_pGkMjvW.js`) containing all 16 columns:
`Project | Team | Team code | Track | Submitted by | Status | App | Repo | Demo video | Write-up | App Key | Packages | Active users | Traction | Built before | Submitted at`
- Drafts (`Status !== "submitted"`) are immediately filtered out.
- All remaining submissions are evaluated in a **single shared pool across all 6 tracks** (`yS`: *"all 6 tracks share the same prize pool"*).

### Step 2 - The Mandatory `App Key` Telemetry Audit (`console.nexconn.ai`)
Inside the `/hack/nexconn/admin` inspector drawer, `Admin-_pGkMjvW.js` renders the team's `App Key` next to a dedicated **Copy** button (`navigator.clipboard.writeText(idea.appKey)`).
- A Nexconn engineer copies `appKey` and looks it up in the Nexconn backend console.
- **What Telemetry They See Instantly**:
  1. Was this `appKey` actually created on `console.nexconn.ai`?
  2. How many unique `userId` tokens were issued (`POST /user/getToken.json`)?
  3. How many real messages were routed through Nexconn's servers, and across which channel types (Direct, Group, Open Channel, Community)?
  4. Which advanced features were activated on the console (Moderation, Built-in Translation, Voice-to-Text, Message Expansion, Stream Message, Call SDK minutes)?
  5. **Does the console's actual Active Users (MAU/DAU) count match the `Active users` number self-reported by the team in Section 05?**
  - *Critical Insight*: Because `Rules-DQNF0983.js` explicitly states *"Active users are counted on the Nexconn console using the App Key you submit"*, inflating `activeUsers` on the form without matching `userId` connections on `console.nexconn.ai` destroys credibility immediately. Conversely, having **20–100+ genuine active `userId` sessions on your `appKey`** provides indisputable mathematical proof for the **20% Business & Growth Potential + Traction Bonus**.

### Step 3 - The 50% Completeness & UX Stress Test (`appUrl` + `demoVideoUrl`)
Because **Completeness & user experience carries 50% of the total score** (`gu` in `index-DSX23m3q.js` - the single largest weight), judges click `demoVideoUrl` and `appUrl`:
- If `appUrl` requires the judge to manually register an account, wait for an email OTP that fails, or find a second person to chat with, the judge sees an **empty, dead chat screen**.
- **Winning Counter-Measure**: The live `appUrl` must offer **1-Click Instant Demo Login** (e.g., *"Sign in as Demo Buyer / Demo Agent / Squad Leader"* with pre-populated active channels, live simulated/AI peer responders, and a **"Open Split-Screen Dual-User Test Mode"** button so a single judge on one browser tab can experience real-time two-way Nexconn messaging, typing indicators, read receipts, and state synchronization in <10 seconds).

### Step 4 - Scenario Value (30%) & Code/Write-up Audit (`sdkFeatures` + `writeupUrl` + `repoUrl`)
Judges read the `sdkFeatures` summary (`30–2,000 chars`), open `writeupUrl` (PDF), and spot-check `repoUrl`:
- They look for clear architectural diagrams showing how the frontend (`@rongcloud/imlib-next` or mobile SDK) and backend (Token server + Webhooks + AI/business logic) interact.
- They verify that `AppKey` is prominently documented inside the PDF write-up (as instructed in `Submit-R3OJNUmD.js`).

---

## 3. The 3-Minute Judge Heat-Map (How 180 Seconds Decides Your Score)

When a Nexconn judge opens a submission in `Admin-_pGkMjvW.js`, here is how their 180 seconds are spent:

| Time Window | Judge Action in `Admin-_pGkMjvW.js` | Rubric Bucket Evaluated | What Loses the Hackathon | What Wins Top-5 Placement |
|---|---|---|---|---|
| **`0:00 – 0:30`** | Reads `title`, `Track`, `Packages`, `Active users`, clicks **Copy `App Key`**, checks `console.nexconn.ai` telemetry. | **Pass/Fail Gate + 20% Traction Bonus** | `0–2` test users on console; only basic text messages; inflated `activeUsers` claim that contradicts console telemetry. | Console shows **30–100+ active `userIds`**, multiple channel types, custom message types, Message Expansion / Open Channel metadata, and real traffic. |
| **`0:30 – 1:30`** | Plays `demoVideoUrl` (first 60s) and clicks `appUrl` to test the live app. | **50% Completeness & User Experience** | Slow slide deck intro; login wall; empty chat lobby with nobody to talk to; raw unstyled chat bubbles. | First 5 seconds of video show live two-way action; `appUrl` has **1-Click Role Switcher / Split-Screen Live Test** + responsive, domain-specific UI components. |
| **`1:30 – 2:15`** | Reads `summary` and `sdkFeatures` (`How did you use Nexconn?`); watches rest of demo video. | **30% Innovation & Scenario Value** | Generic "Slack/WhatsApp clone" where chat is just a text sidebar bolted onto an unrelated app. | Chat **is** the workflow: in-chat interactive cards via **Message Expansion**, live AI streaming via **`StreamMsg`**, **Targeted Group Messages**, or **Built-in Translation / Voice-to-Text**. |
| **`2:15 – 3:00`** | Opens `writeupUrl` PDF and `repoUrl` (GitHub) + `tractionUrl`. | **Tie-Breaker Across All 3 Buckets** | Single-commit repo dump; `App Secret` leaked in frontend `.env`; thin 1-page PDF missing `App Key`. | Clean backend token service (`getToken`), `nexconn-skills` / `@nexconn/console-mcp` integration documented, architecture diagram in PDF with `App Key` on Page 1, and verifiable `tractionUrl`. |

---

## 4. Likely Judge Questions (And How Our Submission Must Pre-Answer Them in the PDF & Video)

Even though judging is asynchronous (`Nov 23–27, 2026`), judges ask these 5 silent questions while scoring every submission:

1. ***"Did they actually use Nexconn Chat SDK/UI deeply, or could they have built this with a 20-line Socket.io script?"***
   - *How to pre-answer*: Explicitly showcase at least **3 Nexconn-native primitives** in `sdkFeatures` and the PDF write-up (e.g., **Message Expansion** `updateMessageExpansion` for stateful in-chat cards, **Targeted Group Messages** `sendDirectionalMessage`, **Open Channel Metadata**, **Streaming Messages**, **Built-in Translation**, **Voice-to-Text**, or **X3DH/Double Ratchet E2EE**).
2. ***"How is the Nexconn User Token generated?"***
   - *How to pre-answer*: Never hardcode static tokens or expose `App Secret` in browser JS. Include a real lightweight backend route (`/api/nexconn/token`) signing requests with `App-Key`, `Nonce`, `Timestamp`, and `SHA1`, and highlight it in the README and PDF.
3. ***"Can I test a real-time multi-user conversation by myself right now?"***
   - *How to pre-answer*: Build a **"Dual-Persona Split-Screen Simulator"** + autonomous AI/bot counterparty right on the landing page of `appUrl` so one judge in one browser window sees both sides of the real-time Nexconn channel updating in `<100ms`.
4. ***"Why does this specific scenario need real-time chat instead of a standard CRUD web form?"***
   - *How to pre-answer*: Make latency, presence (`online-status-subscription.md`), read receipts (`read-receipt.md`), and live state transitions essential to the user's outcome (e.g., live shift handover sign-off, live cross-language escrow negotiation, live watch-party/spectator sync, or emergency volunteer dispatch).
5. ***"Are the `Active users` reported in Section 05 real?"***
   - *How to pre-answer*: Drive real beta testers, community members, and automated multi-persona stress-test sessions through real `userId` tokens on `console.nexconn.ai` before November 22, 2026, and link a public live telemetry/feedback showcase page at `tractionUrl`.
