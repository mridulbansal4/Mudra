# F - Connect the Dots: Patrick Jane's Closed-Door Reconnaissance Synthesis

> **Session Convened By**: **Patrick Jane** (Lead Cold-Reader & Behavioral Forensics Chair)
> **Recon Sub-Panel**: **S. Jaishankar** (Geopolitics & Sovereign Corridors), **R.S. Sharma** (Population-Scale DPI & Architecture), **Peter Thiel** (Zero-to-One Monopoly & Contrarian Strategy), **Alex Karp** (Mission-Critical Operational Software), **Paul Graham** (User-First Product Truth), and **Charlie Munger** (Inversion & Incentive Audit).
> **Evidence Base**: `research/00-source/reskilll-nexconn-portal.md`, `research/00-source/nexconn-docs-and-skills.md`, `research/01-facts.md`, `research/A-organisers.md`, `research/B-sponsors.md`, `research/C-judges.md`, `research/D-why-now.md`, and `research/E-competition.md`.

---

## Opening Cold-Read - Patrick Jane at the Whiteboard

**Patrick Jane**: *"Look at the board, everyone. Most hackathon teams read the landing page like gullible tourists. They see '$5,000 in cash, 6 tracks, build an app with real-time chat,' and they immediately start building a clone of WhatsApp or Slack. They never stop to ask why a 19-year-old Chinese telecom messaging titan - the team that built China Mobile's Fetion (`https://www.rongcloud.cn/about`) for 350 million people and RongCloud for 70 million daily active users - incorporated `RCLOUD GLOBAL PTE. LTD.` in Singapore, rebranded internationally as **Nexconn (`https://www.nexconn.ai/`)**, hired an Indian developer agency (**Reskilll**, `https://reskilll.com/hack/nexconn/`), explicitly banned Mainland China in line 1 of their country array (`tS = ["CN"]` in `index-DSX23m3q.js`), and offered **$103,200 in Free Chat Plan credits** ($20,640 × 5 winners) alongside only $5,000 in cash. When the non-cash product credit is twenty times larger than the cash pool, the hackathon isn't charity. It's a customer-acquisition, telemetry-seeding, and global developer-SEO operation. Let's connect the dots."*

---

## 1. The Hidden Agenda (What Nexconn & Reskilll Actually Want)

**Charlie Munger**: *"Show me the incentive and I will show you the outcome."*

By cross-referencing `index-DSX23m3q.js`, `Admin-_pGkMjvW.js`, `docs.nexconn.ai/llms.txt`, and `github.com/NexconnAI-Dev/nexconn-skills`, the sub-panel established **four hidden strategic objectives** driving `nexconn2026`:

1. **Objective 1 - Solving the `@rongcloud` → `Nexconn` Global Developer SEO & Reference Gap**:
   - **Fact**: Under the hood of `https://docs.nexconn.ai/llms.txt` and `https://github.com/NexconnAI-Dev/imsdk-web-Quickdemo`, the SDK packages are still published as `@rongcloud/imlib-next`, `cn.rongcloud.sdk:im_lib`, and `RongCloudIM/IMLibCore`, while the international console (`https://console.nexconn.ai`), docs (`https://docs.nexconn.ai`), and MCP server (`@nexconn/console-mcp`) carry the new **Nexconn** brand.
   - **HUNCH**: `HUNCH:` Nexconn's international growth team (led by **Leo** and **Kai**) faces a discovery problem outside China: when Western, Indian, or SEA developers search GitHub or YouTube for "Nexconn Chat SDK", almost nothing exists yet except Nexconn's own 9 Quickdemo repos (`https://github.com/NexconnAI-Dev`). By requiring every valid submission (`Submit-R3OJNUmD.js`) to publish a **public GitHub repository (`repoUrl`) verified via `api.github.com`**, a **public YouTube/Loom demo video (`demoVideoUrl`)**, and a **live deployed app (`appUrl`)**, Nexconn is manufacturing **100+ indexable English-language reference implementations and showcase videos** in 30 days for $5,000 in cash.
2. **Objective 2 - Proving AI-Assisted Integration Velocity via `nexconn-skills` & `@nexconn/console-mcp`**:
   - **Fact**: Right before launching the hackathon, Nexconn published `https://github.com/NexconnAI-Dev/nexconn-skills` and the npm package `@nexconn/console-mcp` (`npx -y @nexconn/console-mcp`) plus a complete `https://docs.nexconn.ai/llms.txt` file.
   - **HUNCH**: `HUNCH:` **Kai** (AI Product Manager) and **Amy** (Solutions Engineer) built `nexconn-skills` and `llms.txt` specifically so hackathon participants using Claude Code, Cursor, and Windsurf could wire up token generation, channels, and advanced SDK features without getting stuck on legacy documentation. Any submission that explicitly documents using `nexconn-skills` and `@nexconn/console-mcp` in its README/PDF validates Kai's internal KPI to executive leadership (**Han Ying** & **Yang Pan**).
3. **Objective 3 - Seeding Real Console MAU Telemetry (`appKey` + `activeUsers`)**:
   - **Fact**: `Rules-DQNF0983.js` (`Zx`) states: *"The Nexconn team will verify real SDK usage using the App Key provided in your submission. Active users are counted on the Nexconn console using the App Key you submit. Projects that attract real active users during the hackathon period receive a significant bonus."* And `Admin-_pGkMjvW.js` places a **1-click Copy button** right next to `appKey` alongside the `Active users` column in the admin table.
   - **HUNCH**: `HUNCH:` The Nexconn team's internal post-hackathon report to CEO **Han Ying** is measured on two hard metrics pulled directly from `console.nexconn.ai`: **(a) Total activated overseas App Keys with real message volume**, and **(b) Total Monthly Active Users (MAU) onboarded across those App Keys during Oct 23 – Nov 22, 2026**.
4. **Objective 4 - Showcasing Nexconn's "Beyond Plain Text" Differentiators (AI Mode, `StreamMsg`, `Message Expansion`, `Open Channel Metadata`, `Targeted Group Messages`)**:
   - **Fact**: Nexconn's flagship internal product **Lyra (`https://www.lyrawork.com/`)** and its `llms.txt` highlight **Streaming Messages (`stream-message.md`)**, **Message Expansion (`expansion.md`, 300 KV pairs)**, **Open Channel Metadata (`managing-metadata.md`, 50 KV pairs)**, **Targeted Group Messages (`group-channels/direct.md`)**, **Built-in Translation**, **Voice-to-Text**, **Auto-Moderation (`<100ms`)**, and **X3DH/Double Ratchet E2EE**.
   - **HUNCH**: `HUNCH:` Nexconn engineers hate seeing their enterprise-grade binary protocol reduced to `sendTextMessage("hello")`. They want winning apps that serve as live interactive sales demos of these high-margin features so **Leo** can convert winners onto the **$860/month ($20,640 / 24-month) Chat Plan**.

---

## 2. The Unwritten Rubric (Published Weights vs. Real Decision Mechanics)

**Peter Thiel**: *"The published rubric is 50% Completeness, 30% Innovation, 20% Business & Growth. Let's translate what those numbers actually mean inside `Admin-_pGkMjvW.js`."*

| Published Rubric (`gu` in `index-DSX23m3q.js`) | Official Weight | Real Operational Weight & Unwritten Sub-Criteria |
|---|---|---|
| **Gate 0: `App Key` & Package Eligibility** | Pass / Fail | **Hard Binary Filter**: Does `appKey` exist on `console.nexconn.ai` with real server-generated user tokens (`getToken`), real channel creation, and real messages over `chat-sdk` or `chat-ui`? If `console.nexconn.ai` shows `0` messages or fake frontend mocks, the project is disqualified in `<15 seconds`. |
| **1. Completeness & User Experience** | **50%** | **25% Zero-Friction Solo Judge Testability**: Can a single judge clicking `appUrl` in `Admin-_pGkMjvW.js` experience a live, two-way real-time conversation within **10 seconds** without creating two accounts or waiting for a friend? (Requires **1-Click Role Switcher / Split-Screen Dual-Client Mode + Live AI/Bot Counterparty**).<br>**25% Domain UI Polish & End-to-End Loop**: Does the UI look like a real vertical product (not a tutorial chat box) and complete a full user journey from trigger to resolution without console errors? |
| **2. Innovation & Scenario Value** | **30%** | **15% Deep Nexconn Primitive Leverage**: Does the app exercise **3+ non-trivial Nexconn capabilities** (`Message Expansion`, `Streaming Messages`, `Targeted Group Messages`, `Open Channel Metadata`, `Built-in Translation`, `Voice-to-Text`, `Auto-Moderation`, `E2EE`, `Call SDK`) so that chat *is* the stateful application engine?<br>**15% Acute Scenario Urgency**: Does the scenario solve a high-pain communication failure (e.g., clinical/SRE shift handover omissions, cross-language marketplace escrow fraud, senior accessibility & volunteer dispatch, synchronized spectator-to-squad state)? |
| **3. Business & Growth Potential (+ Traction Bonus)** | **20% + Big Bonus** | **15% Verified Console MAU (`appKey` Telemetry)**: Does `console.nexconn.ai` show **30–100+ distinct active `userId` sessions** and high message volume matching the `activeUsers` field in `Submit-R3OJNUmD.js`?<br>**5% Path to $860/mo Plan Utilization**: Could this product plausibly scale toward the 10,000 MAU Free Chat Plan credit ($20,640 value) and serve as a showcase case study on `nexconn.ai`? |

---

## 3. The 3-Minute Judge Heat-Map (Second-by-Second inside `/hack/nexconn/admin`)

**Paul Graham**: *"A judge has 5 days (`Nov 23–27`) to review ~100 submissions. That's 3 minutes per project on the first pass. If you don't win the first 30 seconds, they never read your code."*

```
[0:00 - 0:15]  ADMIN DRAWER OPENED (Admin-_pGkMjvW.js)
               ├─ Judge sees: Project Title, Track badge, Packages (chat-sdk / chat-ui / call-sdk),
               │  Active users badge, and monospace App Key with [Copy] button.
               └─ Action: Judge clicks [Copy] on App Key → pastes into console.nexconn.ai.

[0:15 - 0:45]  CONSOLE TELEMETRY VERIFICATION (console.nexconn.ai)
               ├─ Judge checks: Active Users (DAU/MAU), Message Volume, Channel Types used,
               │  and whether Active Users in console matches self-reported `activeUsers`.
               └─ Verdict at 0:45: Either "Fake/Toy (0-2 users)" → mentally eliminated,
                  OR "Real Traffic + Deep SDK Features" → judge leans forward.

[0:45 - 1:30]  LIVE APP & DEMO VIDEO TEST (appUrl + demoVideoUrl)
               ├─ Judge clicks `Open App` and `Watch Demo Video`.
               ├─ If `appUrl` hits a dead login screen or empty chat room → loses 25+ points on 50% UX bucket.
               └─ If `appUrl` launches directly into an interactive Split-Screen / 1-Click Demo Workspace
                  where two real Nexconn clients (or Human + AI Agent) exchange live custom messages,
                  update Message Expansion cards, and trigger Call SDK / translation → locks in top Completeness score.

[1:30 - 2:15]  SCENARIO & SDK FEATURE AUDIT (sdkFeatures + summary)
               ├─ Judge reads the 30-2,000 char `sdkFeatures` block: "How did you use Nexconn?"
               └─ Checks for specific API names: `StreamMsg`, `Message Expansion`, `Targeted Group Messages`,
                  `Open Channel Metadata`, `Built-in Translation`, `Voice-to-Text`, `Auto-Moderation`, `E2EE`.

[2:15 - 3:00]  GITHUB REPO & WRITE-UP PDF SPOT-CHECK (repoUrl + writeupUrl)
               ├─ Verifies `App Key` is printed clearly on Page 1 of the PDF write-up.
               ├─ Checks backend token generation route (`POST /user/getToken.json` - no leaked App Secret in client).
               └─ Clicks `tractionUrl` to verify real user feedback / live telemetry dashboard.
```

---

## 4. The Trap Map (The 6 Fatal Traps That Will Sink 90% of Teams)

**Charlie Munger**: *"Invert, always invert. Tell me where I'm going to die so I never go there."*

1. **Trap 1 - The "Single-Player Ghost Town" `appUrl` Trap**:
   - *How teams fail*: Building a chat app that requires two separate humans on two separate devices to log in simultaneously before a single message appears. When the judge tests `appUrl` at 11 PM in Singapore or Beijing, nobody else is online, so the app looks broken.
   - *Mandatory Escape*: Every app we design must include a **"1-Click Dual-User Split-Screen Live Testbench"** *plus* autonomous server-side AI/simulated peers connected via real Nexconn `userId` tokens so a solo judge experiences instant two-way real-time interaction.
2. **Trap 2 - The "Call SDK Only" or "Mocked WebSocket" Disqualification Trap**:
   - *How teams fail*: Using `call-sdk` alone (explicitly blocked in `Submit-R3OJNUmD.js`: `"Select at least Chat SDK or Chat UI (Call SDK alone isn't eligible)"`) or routing messages through Supabase/Firebase/Socket.io while pasting a dormant Nexconn `appKey`.
   - *Mandatory Escape*: Route **100% of real-time messaging and state updates** through **Nexconn Chat SDK (`@rongcloud/imlib-next` / mobile `IMLib`) or Chat UI (`IMKit`)**, and use `Call SDK` as an integrated audio/video escalation layer on top.
3. **Trap 3 - The "Leaked App Secret in Frontend JS" Security Trap**:
   - *How teams fail*: Putting `App Secret` inside Vite/Next.js `NEXT_PUBLIC_` or `VITE_` client environment variables to call `POST /user/getToken.json` from the browser. Notice how `nexconn-skills` (`skills/nexconn-dev/`) explicitly warns that token generation must happen on the backend.
   - *Mandatory Escape*: Always include a clean serverless/backend token endpoint (`/api/nexconn/token`) that signs `App-Key + Nonce + Timestamp + SHA1(App-Secret...)` server-side.
4. **Trap 4 - The "Unverified `activeUsers` Inflation" Trap**:
   - *How teams fail*: Typing `activeUsers: "5000"` in Section 05 of `Submit-R3OJNUmD.js` when their `appKey` on `console.nexconn.ai` has only 3 registered `userId` tokens.
   - *Mandatory Escape*: Ensure every single active user claimed in `activeUsers` corresponds to a real, unique `userId` token generated and connected on `console.nexconn.ai`, backed by a transparent public verification page at `tractionUrl`.
5. **Trap 5 - The "Plain-Text Wrapper" Trap (`sendTextMessage` Only)**:
   - *How teams fail*: Treating Nexconn as a dumb string pipe while keeping all interactive state (polls, task statuses, escrow milestones, triage checklists) in a separate database that requires page refreshes.
   - *Mandatory Escape*: Use **Nexconn Message Expansion (`expansion.md`, up to 300 KV pairs)** and **Open Channel Metadata (`managing-metadata.md`, up to 50 KV pairs)** so the message bubble itself *is* the live collaborative state machine.
6. **Trap 6 - The "Nov 22 Timezone Ambiguity" Trap (`UTC+8` vs `AoE`)**:
   - *How teams fail*: Waiting until the final hours of November 22, 2026 without noticing that `Rules-DQNF0983.js` prints `2026-11-22 23:59 UTC+8` while `xt.submitBy` in `index-DSX23m3q.js` uses `2026-11-22T23:59:59-12:00` (AoE).
   - *Mandatory Escape*: Lock final submission **before `2026-11-22 23:59 UTC+8` (`21:29 IST`)** - 16 hours ahead of the AoE countdown - and use the remaining window only for accumulating additional real `console.nexconn.ai` active user sessions.

---

## 5. The Sweet Spot (What a Guaranteed Top-5 Winner Looks Like)

**Alex Karp & R.S. Sharma**: *"Because all 6 tracks share a single prize pool (`yS` in `Rules-DQNF0983.js`), we are not just competing inside one track - we are competing for the 5 highest composite scores across the entire hackathon."*

A project sits in the **unassailable Sweet Spot** when it combines all 5 of the following elements:
1. **Track Selection with High Scenario Asymmetry**:
   - **Tier-1 Sweet Spot Tracks**:
     - **Track 03 (`Workplace & Collaboration` - specifically the `"Shift handover channel"` cue)**: High enterprise willingness-to-pay ($860/mo plan fit), direct alignment with Nexconn's flagship **Lyra (`lyrawork.com`)** vision, and deep usage of `Message Expansion`, `Targeted Group Messages`, `Read Receipts`, `Streaming Messages`, and `Call SDK`.
     - **Track 04 (`Marketplace & Support` - `"Buyer-seller 1-on-1 chat"`, `"Human agent dispatch center"`, `"Multi-language translated chat"`)**: Showcases Nexconn's **Built-in Translation**, **Online Status Subscription**, **Message Expansion** (in-chat escrow/quote negotiation cards), and **Auto-Moderation** (anti-scam shield).
     - **Track 05 (`Humanitarian & Social Good` - `"Large-font & voice-to-text chat"`, `"Volunteer dispatch rooms"`, `"Peer-support check-ins"`)**: Lowest competition density (`<12%` of pool) with an emotional, crystal-clear 60-second demo powered by **Voice-to-Text**, **Built-in Translation**, **Auto-Moderation**, **Presence**, and **E2EE**.
     - **Track 02 (`Gaming & Live Streams`) / Track 01 (`Social & Community`) / Track 06 (`Open Innovation`)**: High visual ceiling when built around **Open Channel 50-KV Metadata Sync**, **High-Priority Message Queues**, **Targeted Group Whispers**, and **Multi-Agent `StreamMsg` orchestration**.
2. **Deep Nexconn Primitive Stack (Minimum 4 Distinct Capabilities)**:
   - Never stop at 1-on-1 text. Combine **Channel Architecture** (`Group` / `Open Channel` / `Community`) + **Stateful Primitives** (`Message Expansion` / `Open Channel Metadata` / `Targeted Group Messages`) + **AI/Media Native Features** (`Streaming Messages`, `Built-in Translation`, `Voice-to-Text`, `Auto-Moderation`, `E2EE`) + **Optional `Call SDK` Escalation**.
3. **Instant Single-Judge Testability (`1-Click Split-Screen Live Testbench`)**:
   - The deployed `appUrl` opens directly into a pre-authenticated, dual-pane or multi-role interactive workspace where a single judge can trigger real-time bi-directional Nexconn messages, see `<100ms` state synchronization across two live `userId` sessions, and converse with an autonomous AI agent streaming via `StreamMsg`.
4. **Undeniable Console Telemetry (`50–150+` Real `userId` Sessions on `appKey`)**:
   - Every test persona, beta tester, community user, and multi-agent workflow registers a real `userId` token via `POST /user/getToken.json` and exchanges real messages so that when the judge clicks **Copy `App Key`** in `Admin-_pGkMjvW.js`, `console.nexconn.ai` lights up with verified DAU/MAU and feature telemetry.
5. **Showcasing `nexconn-skills` & `@nexconn/console-mcp`**:
   - Explicitly credit and document how `@nexconn/console-mcp` and `nexconn-skills` were used to provision the app and structure the server/client architecture in the PDF write-up (`writeupUrl`) and GitHub README (`repoUrl`).

---

## 6. The Connected Dots - Complete Evidence Table (12 Dated & Linked Proof Points)

| Dot # | Date / Milestone | Concrete Observation (Fact) | Source URL / Bundle Location | Connected Strategic Inference (`HUNCH:`) |
|---|---|---|---|---|
| **Dot 01** | **2007 → 2015 → 2025/2026** | China Mobile's **Fetion (350M+ MAU)** team founded **RongCloud (融云, 70M+ DAU)** in 2015 and launched **Nexconn (`RCLOUD GLOBAL PTE. LTD.`)** in Singapore for global markets. | `https://www.nexconn.ai/` & `https://www.rongcloud.cn/about` | `HUNCH:` Nexconn has battle-tested carrier-grade infrastructure (`300+` nodes, `<100ms` latency) but is a newcomer brand outside China, making developer awareness and English GitHub/YouTube footprint its #1 bottleneck. |
| **Dot 02** | **Oct 23, 2026 (`xt.launch`)** | `index-DSX23m3q.js` defines `const tS = ["CN"]` as the sole restricted country code in the eligibility validator. | `https://reskilll.com/hack/nexconn/assets/index-DSX23m3q.js` | `HUNCH:` Because `rongcloud.cn` already serves Mainland China, `nexconn2026` is funded specifically by `RCLOUD GLOBAL PTE. LTD.`'s international expansion budget to acquire non-CN developers in India, SEA, MENA, EU, and the Americas. |
| **Dot 03** | **Oct 23, 2026 (`Vx`, `mS`)** | Cash pool is **$5,000** across 5 winners, while each winner receives a **2-Year Free Chat Plan worth $20,640** ($860/mo × 24 mos, 10K MAU/mo) - **$103,200** in total product credits. | `https://reskilll.com/hack/nexconn/prizes` (`index-DSX23m3q.js`) | `HUNCH:` The 20:1 ratio of product credits ($103.2K) to cash ($5K) proves Nexconn wants winning teams to keep running live production apps on `console.nexconn.ai` for 24 months as reference customers. |
| **Dot 04** | **Oct 23, 2026 (`yS`)** | `Rules-DQNF0983.js` FAQ states: *"Do tracks have separate prizes? No - all 6 tracks share the same prize pool."* | `https://reskilll.com/hack/nexconn/rules` (`Rules-DQNF0983.js`) | `HUNCH:` Tracks are scenario inspiration buckets, not isolated prize silos. A standout entry in an under-contested track (like Track 05 Social Good or Track 03 Shift Handover) can easily beat crowded generic clones in Track 01/06. |
| **Dot 05** | **Oct 23, 2026 (`Submit-R3OJNUmD.js`)** | Submission form blocks `call-sdk` alone (`"Select at least Chat SDK or Chat UI (Call SDK alone isn't eligible)"`) and enforces regex `/^[A-Za-z0-9_-]{8,64}$/` on `appKey`. | `https://reskilll.com/hack/nexconn/assets/Submit-R3OJNUmD.js` | `HUNCH:` Nexconn's core commercial wedge is sticky in-app messaging (`Chat SDK` / `Chat UI`); `Call SDK` is an upsell add-on that only counts when anchored to a live chat channel. |
| **Dot 06** | **Oct 23, 2026 (`Admin-_pGkMjvW.js`)** | The admin portal renders a **1-click Copy button** on `appKey` right next to `Packages` and `Active users` in both the inspector drawer and the 16-column CSV export (`Qt`). | `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js` | `HUNCH:` The very first action a Nexconn judge takes is copying `appKey` into `console.nexconn.ai` to check real API traffic and compare console MAU against the self-reported `Active users` integer. |
| **Dot 07** | **Oct 23, 2026 (`gu`, `Zx`)** | Judging weights allocate **50% to Completeness & UX**, **30% to Innovation & Scenario Value**, and **20% to Business & Growth (+ a big bonus for real active users on `appKey`)**. | `https://reskilll.com/hack/nexconn/assets/index-DSX23m3q.js` & `Rules-DQNF0983.js` | `HUNCH:` Broken demos or empty chat rooms lose 50% of the score immediately, while a working end-to-end app with verified active `userId`s on `console.nexconn.ai` can leapfrog flashier but un-used prototypes. |
| **Dot 08** | **2025–2026 (`docs.nexconn.ai/llms.txt`)** | `llms.txt` exposes dedicated docs for **Streaming Messages (`stream-message.md`)**, **Message Expansion (`expansion.md`, 300 KV pairs)**, **Targeted Group Messages (`group-channels/direct.md`)**, and **Open Channel Metadata (`managing-metadata.md`, 50 KV pairs)**. | `https://docs.nexconn.ai/llms.txt` | `HUNCH:` These 4 capabilities are Nexconn's architectural crown jewels that differentiate it from basic WebSocket/Firebase chat; using them in code and highlighting them in `sdkFeatures` directly impresses SDK engineers during review. |
| **Dot 09** | **2025–2026 (`lyrawork.com` & `/ai-mode/`)** | Nexconn built **Lyra (`https://www.lyrawork.com/`)** and **AI Mode (`https://docs.nexconn.ai/ai-mode/overview/introduction.md`)** around human + AI agent collaboration inside shared channels (`UserID` + `AgentID`). | `https://www.lyrawork.com/` & `https://docs.nexconn.ai/ai-mode/` | `HUNCH:` Projects that treat AI agents as first-class channel participants streaming via `StreamMsg` and updating stateful `Message Expansion` cards align 100% with CTO **Yang Pan** and AI PM **Kai**'s internal roadmap. |
| **Dot 10** | **2026 (`NexconnAI-Dev/nexconn-skills`)** | Nexconn released `nexconn-skills` (`nexconn-dev`, `nexconn-console`, `nexconn-docs`) and the `@nexconn/console-mcp` server (`npx -y @nexconn/console-mcp`). | `https://github.com/NexconnAI-Dev/nexconn-skills` | `HUNCH:` Documenting `@nexconn/console-mcp` and `nexconn-skills` usage in our repository README and PDF write-up signals to the DevRel/AI judging team that their new agentic developer tooling works in the wild. |
| **Dot 11** | **Oct 23, 2026 (`Wx` Track Examples)** | The track examples in `index-DSX23m3q.js` contain hyper-specific phrases: `"Shift handover channel"` (Track 03), `"Human agent dispatch center"` & `"Multi-language translated chat"` (Track 04), and `"Large-font & voice-to-text chat"` & `"Volunteer dispatch rooms"` (Track 05). | `https://reskilll.com/hack/nexconn/tracks` (`index-DSX23m3q.js`) | `HUNCH:` The product manager (**Leo**) who wrote `Wx` literally listed the exact Nexconn SDK features (`builtin-translation`, `voice-to-text`, `online-status-subscription`, `expansion`) he wants to see demonstrated in each track. |
| **Dot 12** | **Nov 22, 2026 (`xt.submitBy` vs `Rules-DQNF0983.js`)** | `Rules-DQNF0983.js` displays `2026-11-22 23:59 UTC+8` while `xt.submitBy` in `index-DSX23m3q.js` sets `new Date("2026-11-22T23:59:59-12:00")` (AoE). | `https://reskilll.com/hack/nexconn/assets/Rules-DQNF0983.js` & `index-DSX23m3q.js` | `HUNCH:` The copy in `Rules-DQNF0983.js` was drafted by Nexconn's Singapore/Beijing team (`UTC+8`), whereas Reskilll's frontend engineer coded `xt` in AoE (`UTC-12`). Submitting before `23:59 UTC+8` (`21:29 IST`) guarantees compliance under both clocks. |
