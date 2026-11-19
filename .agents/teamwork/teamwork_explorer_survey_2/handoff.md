# Handoff Report — Reskilll / Nexconn Build Challenge 2026 Investigation

**Executive Summary**: The **Nexconn Build Challenge 2026** (`https://reskilll.com/hack/nexconn/`, internal slug `nexconn2026`) is a fully online, global hackathon (Oct 23 – Nov 22, 2026 AoE; results Dec 1, 2026) organized by **Nexconn** (`RCLOUD GLOBAL PTE. LTD.` / RongCloud) and operated by **Reskilll**, offering **$5,000 in cash prizes across 5 winners** ($2,000 / $1,250 / $750 / $500 / $500) plus **$20,640 in Nexconn Free Chat Plan credits (2 years at $860/mo)** and **1-year AWS (15% off) or Alibaba Cloud (30% off) discounts** per winning team. All tracks share a single unified rubric heavily weighted toward **Completeness & UX (50%)**, **Innovation & Scenario Value (30%)**, and **Business & Growth Potential / Active Users on Nexconn (20% + significant traction bonus)**, with a strict **mandatory pass/fail gate requiring real Nexconn Chat SDK or Chat UI usage** verified via the team's submitted **Nexconn App Key** (`8–64` alphanumeric/underscore/hyphen characters).

---

## 1. Observation

All observations below were directly extracted and verified from the live SPA at `https://reskilll.com/hack/nexconn/`, its compiled Vite/React bundles (`index-BVD-GoH1.js`, `Rules-DQNF0983.js`, `Submit-R3OJNUmD.js`, `registration-KuSES_RU.js`, `Dashboard-CUXFNqTn.js`, `Admin-_pGkMjvW.js`, `Register-GOMS-xM4.js`, `useDashboard-C_q5GCOp.js`, `Legal-Bh2TY_RJ.js`), and the official linked Nexconn documentation, blog, free-tier landing page, and `NexconnAI-Dev` GitHub repositories.

### 1.1 Exact Hackathon Title, Dates, Timeline, Format, Eligibility, Team Size, Prize Pool & Submission Requirements

*Source: `https://reskilll.com/hack/nexconn/assets/index-BVD-GoH1.js` (constants `st`, `xt`, `hS`, `Fp`, `fS`, `pS`, `tS`, `Vx`, `mS`, `Jx`, `Kx`, `sS`, `Yx`, `Gx`, `Zx`, `yS`), `Rules-DQNF0983.js`, `Submit-R3OJNUmD.js` (`nn`), `registration-KuSES_RU.js`, and `Legal-Bh2TY_RJ.js`.*

#### A. Identity & Core Framing
| Field | Verbatim Value / Quote | Source Constant |
|---|---|---|
| **Full Title** | `"Nexconn Build Challenge 2026"` | `st.name` (`index-BVD-GoH1.js`) |
| **Short Name / Slug** | `"Build Challenge"` / `"nexconn2026"` | `st.shortName`, `st.slug` |
| **Canonical URL** | `"https://reskilll.com/hack/nexconn"` | `st.url` |
| **Hero Eyebrow** | `"Online hackathon · Oct 23 – Nov 22"` | `pS.eyebrow` |
| **Hero Tagline** | `"Build a real-time chat-driven app with the Nexconn Chat SDK. Win up to $2,000."` | `pS.line` |
| **Rules Intro (`fS`)** | `"This challenge is for developers, creators and anyone who wants to build with real-time chat. Build a functional app that uses the Nexconn Chat SDK. Chat UI counts as Chat SDK usage. The Call SDK is optional. Use it if your app needs voice or video calls. For example, build a social app, a support bot that uses AI or a shared workspace."` | `fS` (`index-BVD-GoH1.js`) |
| **Format** | `"Fully online"` / `"Free to build"` | `Fp`, `pS` |

#### B. Exact Dates & Timeline (`xt` and `hS` in `index-BVD-GoH1.js`)
- **Machine-Readable Deadlines (`xt`)**:
  - `launch`: `"2026-10-23T00:00:00-12:00"` (Anywhere on Earth / UTC-12)
  - `submissionDeadline`: `"2026-11-22T23:59:59-12:00"` (AoE — corresponds to **Monday, Nov 23, 2026 at 17:29:59 IST**)
  - `judgingStart`: `"2026-11-23T00:00:00-12:00"`
  - `results`: `"2026-12-01T00:00:00-12:00"`
- **Human-Readable Schedule (`hS`)**:
  1. **Launch (`launch`)** — **`Oct 23, 2026`**: `"Registration and submissions open on the same day."`
  2. **Build & submit (`build`)** — **`Oct 23 – Nov 22, 2026`**: `"Submit at any time. You can edit your submission until the deadline: Nov 22, 23:59 Anywhere on Earth."`
  3. **Judging (`judging`)** — **`Nov 23 – 27, 2026`**: `"Nexconn judges score each complete submission."`
  4. **Results (`results`)** — **`Dec 1, 2026`**: `"Nexconn and Reskilll announce the winners on this site and by email."`

#### C. Eligibility & Team Size (`tS`, `Yx`, `yS`, `registration-KuSES_RU.js`, `Dashboard-CUXFNqTn.js`)
- **Geographic & Participant Eligibility (`Yx`, `yS`, `tS`)**:
  - Verbatim (`yS` FAQ): `"Any developer, designer or student can take part, except residents of Mainland China. The Nexconn Free Chat Plan is not available there. The challenge is fully online, and it is free."`
  - Blocked country code constant: `tS = ["CN"]` (`registration-KuSES_RU.js` enforces `!tS.includes(e.country)` with error message `"Residents of Mainland China are not eligible because the Nexconn Free Chat Plan is not available there."`).
  - Occupation categories during registration (`registration-KuSES_RU.js`):
    - `"student"` — requires `organization` (College or university) and `gradYear` (2024–2032).
    - `"professional"` — requires `organization` (Company) and `role` (Role).
    - `"other"` — `"Indie maker, designer, researcher…"` (`organization` and `role` optional).
- **Team Size & Mechanics (`Yx`, `Zx`, `Dashboard-CUXFNqTn.js`)**:
  - **Team Size**: **1–4 members** (`"Work alone or in a team of up to 4 people."`).
  - **Solo Participation**: `"You can also take part alone. To take part alone, create a team of one on your dashboard."`
  - **Team Codes & Leadership**: Teams share an invite link (`https://reskilll.com/hack/nexconn/dashboard?join=<CODE>`) or a 6-character team code. `"Only the team leader can select the track and submit."` `"A person can join only one team."`

#### D. Prize Pool & Winner Perks (`Vx`, `mS`, `Jx`, `yS` in `index-BVD-GoH1.js`)
- **Total Cash Pool**: **`$5,000`** across **5 winning teams** (`Fp`, `Vx`):

| Rank (`Vx.rank`) | Label (`Vx.label`) | Cash Prize (`Vx.cash`) | Extra Perks (`Vx.extras`) |
|---|---|---|---|
| **`1st`** | `"First place"` | **`$2,000`** | `"2 years of Free Chat Plan + cloud discount"` |
| **`2nd`** | `"Second place"` | **`$1,250`** | `"2 years of Free Chat Plan + cloud discount"` |
| **`3rd`** | `"Third place"` | **`$750`** | `"2 years of Free Chat Plan + cloud discount"` |
| **`4th`** | `"Fourth place"` | **`$500`** | `"2 years of Free Chat Plan + cloud discount"` |
| **`5th`** | `"Fifth place"` | **`$500`** | `"2 years of Free Chat Plan + cloud discount"` |

- **Additional Perks for Every Winning Team (`mS`)**:
  1. **`2 years of Nexconn Free Chat Plan`** (`value: "worth $20,640"`):
     - Verbatim body: `"Every winning team gets this plan to keep its app running after the challenge. You can use the plan only for your challenge project."`
     - Calculation note (`yS` FAQ): Standard Free Chat Plan gives 1 year free ($860/month × 12 = $10,320/year); winning teams receive **1 additional year** (total 24 months × $860/mo = **$20,640**).
  2. **`Discounted AWS or Alibaba Cloud account`** (`value: "1 year"`):
     - Verbatim body: `"Only for an email address that is not already registered with AWS or Alibaba Cloud. Winners give us an email address for the setup."`
     - Exact discount rates from `https://www.nexconn.ai/free-chat-api?utm_source=hackathon`: **15% OFF on AWS** or **30% OFF on Alibaba Cloud**.
- **Prize Distribution (`Jx`)**:
  - Verbatim: `"Reskilll pays the cash prizes to the winning teams after the results on Dec 1. Nexconn sets up the Free Chat Plan and the cloud accounts with each winner."`

#### E. Submission Requirements, Form Schema & Validation Rules (`Kx`, `sS`, `Zx`, `Submit-R3OJNUmD.js`)
- **5 Core Deliverables (`Kx` in `index-BVD-GoH1.js`)**:
  1. **`Project write-up (PDF)`** (`required: !0`):
     - `"Tell us why you built the app and which problem it solves. Name the features that use the Nexconn SDK. Include your Nexconn App Key."`
     - File upload limits (`Submit-R3OJNUmD.js`): PDF only (`application/pdf` or `.pdf`), **max 25 MB** (`25 * 1024 * 1024` bytes), uploaded via `POST /hackathon/nexconn2026/submissions/writeup`.
  2. **`Demo video`** (`required: !0`):
     - `"A video that shows your main features working. Use a YouTube, Vimeo, Loom or Google Drive link. Make sure that anyone with the link can watch it."`
  3. **`Runnable app`** (`required: !0`):
     - `"A live URL for a website, or a direct download link for an app (APK, TestFlight or app store)."`
  4. **`Source code`** (`required: !0`):
     - `"A public GitHub repository"` (validated live against `https://api.github.com/repos/{owner}/{repo}` to ensure the repo exists and is public).
  5. **`User traction proof`** (`required: !1` — optional but awards a significant judging bonus):
     - `"Proof that real people use your app. Find early users to test the app, then make it better. Traction gives a significant bonus in judging."`

- **Complete Submission Form Schema & Client/Server Validation (`nn` in `Submit-R3OJNUmD.js`)**:

| Field Name | UI Label | Validation Rule in `Submit-R3OJNUmD.js` | Notes / Help Text |
|---|---|---|---|
| `title` | Project title | Required; `5–200` chars | `"Project title must be at least 5 characters."` |
| `track` | Track | Required (selected on team dashboard or inherited) | Defaults to `"open"` if unset |
| `summary` | Short summary | Required; `10–2,000` chars | `"Write at least 10 characters about what your app does."` |
| `packages` | Nexconn packages used | Required; must include `"chat-sdk"` and/or `"chat-ui"` | Options (`sS`): `chat-sdk` (`Chat SDK`), `chat-ui` (`Chat UI`), `call-sdk` (`Call SDK`). Selecting only `call-sdk` fails validation: `"Your app must use the Chat SDK or Chat UI. The Call SDK is optional."` |
| `appKey` | Nexconn App Key | Required; regex `/^[A-Za-z0-9_-]{8,64}$/` | `"Find this in the Nexconn console under your application settings. Judges use it to verify SDK usage."` |
| `sdkFeatures` | How your app uses the Nexconn SDK | Required; minimum `30` chars | `"For example: group channels, message history, typing indicators, 1:1 video calls. Tell us where the app uses them."` |
| `writeupUrl` | Project write-up (PDF) | Required; valid `https://` URL from PDF upload | Max 25 MB PDF; must include the Nexconn App Key |
| `demoVideoUrl` | Demo video link | Required; valid `http(s)://` URL | YouTube, Vimeo, Loom, or public Google Drive link |
| `appUrl` | Runnable app link | Required; valid `http(s)://` URL | Live web URL, APK, TestFlight, or store link |
| `repoUrl` | Public GitHub repository | Required; regex `/^https?:\/\/(www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/` | Verified live via `fetch("https://api.github.com/repos/...")` for HTTP 200 and `!private` |
| `tractionUrl` | Traction proof link (optional) | Optional; if provided, must be valid URL | `"A public link to screenshots, analytics, user feedback or a short write-up."` |
| `activeUsers` | Active users on Nexconn (optional) | Optional integer `0–1,000,000` | `"Check your Nexconn console for the count."` |
| `builtBefore` | Did any of this code exist before Oct 23? | `"no"` (`"No, we built all of it during the challenge"`) or `"yes"` (`"Yes, we built on earlier work"`) | Pre-existing code rule (`Zx`): `"Tell us in your write-up if you built part of the project before the challenge. Only the work that you do during the challenge counts."` |
| `builtBeforeDetails` | Conditional on `builtBefore === "yes"` | Required if `"yes"`; `10–2,000` chars | `"Explain what existed before Oct 23 and what you built during the challenge (at least 10 characters)."` |
| `agreed` | Rules & IP agreement | Required boolean (`true`) | `"I confirm that this is our team's work, we followed the challenge rules, and Nexconn and Reskilll can show our submission to promote the challenge."` (IP ownership stays with builders per `Gx`: `"You keep full ownership of your code and your project."`) |

---

### 1.2 Every Track / Theme / Problem Statement (Verbatim & Complete)

*Source: `https://reskilll.com/hack/nexconn/assets/index-BVD-GoH1.js` (constants `Wx`, `Xx`, `gS`, `yS`) and `useDashboard-C_q5GCOp.js` (function `xe`).*

- **Overarching Track Policy**:
  - Landing Page Subheader: `"All areas are examples. The only requirement: your app must use the Nexconn Chat SDK."`
  - Rules Page (`gS`): `"The Open Innovation track accepts any interactive chat idea. Use the other tracks as ideas, not as limits. Your app must use the Nexconn Chat SDK."`
  - FAQ (`yS`): `"Do tracks have separate prizes? No. All tracks share the same prize pool and judging criteria. Tracks only help you frame your idea."`

#### Track 1: `Social & Community` (`id: "nexconn-social"`, `num: "01"`)
- **Verbatim Body**: `"Group messaging and topic-based channels"`
- **Verbatim Sample Ideas (`ideas`)**:
  1. `"Live room for a watch party"`
  2. `"Group chat for shared interests"`
  3. `"Creator fan channel"`

#### Track 2: `Gaming & Live Streams` (`id: "nexconn-gaming"`, `num: "02"`)
- **Verbatim Body**: `"Squad chat and live stream interactive chatroom"`
- **Verbatim Sample Ideas (`ideas`)**:
  1. `"Squad chat room"`
  2. `"In-match quick chat"`
  3. `"Spectator chat overlay"`

#### Track 3: `Workplace & Collaboration` (`id: "nexconn-workplace"`, `num: "03"`)
- **Verbatim Body**: `"Direct messaging and team project threads"`
- **Verbatim Sample Ideas (`ideas`)**:
  1. `"Direct messaging for teams"`
  2. `"Project discussion threads"`
  3. `"Shift handover channel"`

#### Track 4: `Marketplace & Support` (`id: "nexconn-support"`, `num: "04"`)
- **Verbatim Body**: `"Buyer-seller chat and customer service"`
- **Verbatim Sample Ideas (`ideas`)**:
  1. `"Buyer-seller 1-on-1 chat"`
  2. `"Human agent dispatch center"`
  3. `"Multi-language translated chat"`

#### Track 5: `Humanitarian & Social Good` (`id: "nexconn-social-good"`, `num: "05"`)
- **Verbatim Body**: `"Accessible text chat for seniors and communities"`
- **Verbatim Sample Ideas (`ideas`)**:
  1. `"Large-font & voice-to-text chat"`
  2. `"Volunteer dispatch rooms"`
  3. `"Peer-support check-ins"`

#### Track 6: `Open Innovation` (`id: "open"`, `num: "06"`)
- **Verbatim Body**: `"Any interactive chat idea"`
- **Verbatim Rules Description (`gS`)**: `"The Open Innovation track accepts any interactive chat idea. Use the other tracks as ideas, not as limits. Your app must use the Nexconn Chat SDK."`
- **Verbatim Tags on Landing Page**:
  1. `"Any real-time idea"`
  2. `"Chat SDK required, Call SDK optional"`
  3. `"Web, iOS, Android or Flutter"`

---

### 1.3 All Judging Criteria, Rubrics, and Weightages

*Source: `https://reskilll.com/hack/nexconn/assets/index-BVD-GoH1.js` (constant `gu`, `Zx`, `yS`) and `Rules-DQNF0983.js`.*

#### A. Mandatory Pre-Scoring Gate (Pass/Fail Disqualification Check)
- **Verbatim Gate Rule (`Rules-DQNF0983.js` & `Zx`)**:
  > `"Judges first check for real Chat SDK usage. The Chat SDK or Chat UI is required. The Call SDK is optional. Judges disqualify projects that do not use the Chat SDK."`
  > `"Your app must use the Nexconn Chat SDK in a real feature. Chat UI counts as Chat SDK usage. The Call SDK is optional. Put the App Key in your write-up and in the submission form. Judges use it to verify your SDK usage."`

#### B. Weighted Scoring Rubric (`gu` in `index-BVD-GoH1.js` — Total: 100%)

| Weight (`gu.weight`) | Criterion (`gu.title`) | Short Summary (`gu.short`) | Full Rubric Description (`gu.body`) |
|---|---|---|---|
| **`50%`** | **`Completeness & user experience`** | `"It works from start to end and is easy to use."` | `"The demo works fully and runs smoothly. The interface is clean, and the interaction is clear and easy to understand."` |
| **`30%`** | **`Innovation & scenario value`** | `"A new idea that solves a real communication problem."` | `"Judges look at how new the idea is. They also look at whether it solves a real communication problem or adds a new, interesting interaction."` |
| **`20%`** | **`Business & growth potential`** | `"Real users on Nexconn and a path to a product."` | `"Judges look at traction and viability. They count early users as active users on Nexconn. They also look at whether the app can become a real product."` |

#### C. Traction Verification & Bonus Mechanics (`yS`, `Kx`)
- **How Judges Measure Traction (`yS`)**:
  > `"How do judges measure traction? Judges count the active users on your Nexconn app. They also look at any proof that you give, for example analytics screenshots or user feedback."`
- **Traction Bonus (`Kx`)**:
  > `"Proof that real people use your app. Find early users to test the app, then make it better. Traction gives a significant bonus in judging."`

---

### 1.4 All Resources, Tools, SDKs, APIs, Mentors, Judges, Sponsors, and Organisers

*Source: `index-BVD-GoH1.js` (`ft`, `vS`, `xS`), `Legal-Bh2TY_RJ.js`, `https://www.nexconn.ai/blog/nexconn-chat-integration-skill`, `https://www.nexconn.ai/free-chat-api?utm_source=hackathon`, `https://docs.nexconn.ai/`, and `https://api.github.com/orgs/NexconnAI-Dev/repos`.*

#### A. Organisers, Sponsors, Judges & Mentors
- **Primary Organiser & Sponsor — Nexconn (`https://www.nexconn.ai`)**:
  - Corporate entity (`Legal-Bh2TY_RJ.js`): **`RCLOUD GLOBAL PTE. LTD.`** (Singapore-headquartered global communication cloud platform of RongCloud).
  - Scale & positioning: Powers **`250K+ Apps`** with **`99.99% Uptime`** across social, gaming, live streaming, workplace, and marketplace scenarios.
  - Related product shown on `nexconn.ai` navigation: **Lyra** (`https://lyrawork.com/?utm_source=nexconn_official` — *"Unified Interface for LLMs"*).
  - Contact channels: `hackathon@nexconn.ai`, `customercare@nexconn.ai`, Telegram `@NexconnBot` (`https://t.me/NexconnBot`), GitHub Issue Support (`https://github.com/NexconnAI-Dev/hackathon/issues`).
- **Platform Partner & Co-Organiser — Reskilll (`https://reskilll.com`)**:
  - Role (`Legal-Bh2TY_RJ.js` & `Jx`): `"Reskilll runs this website and the submission system for Nexconn."` `"Reskilll pays the cash prizes to the winning teams after the results on Dec 1."`
- **Cloud Perk Sponsors**:
  - **AWS** (15% discount for 1 year for new email accounts) and **Alibaba Cloud** (30% discount for 1 year for new email accounts).
- **Judges & Mentors**:
  - Individual judge/mentor names are **not** disclosed on the website. Instead, the site states: `"Nexconn judges score each complete submission"` (`hS`) and `"Nexconn engineers give you direct support"` (`xS`), checking GitHub issues **"three times a day (morning, afternoon and evening) and reply within 12 hours."**

#### B. Official URLs & Developer Entry Points (`ft` in `index-BVD-GoH1.js`)
| Resource Key | Official URL | Purpose |
|---|---|---|
| `freePlan` | `https://www.nexconn.ai/free-chat-api?utm_source=hackathon` | Claim the 1-year Free Chat Plan (`Chat Growth Credit`, $860/mo → $0) |
| `console` | `https://console.nexconn.ai/agile/register?utm_source=mktevent&utm_term=hackathon` | Register on Nexconn Console, create an App, and obtain the **App Key** |
| `docs` | `https://docs.nexconn.ai/?utm_source=mktevent&utm_term=hackathon` | Full Chat SDK, Chat UI, Call SDK, Server API, and Webhook documentation |
| `llmsTxt` | `https://docs.nexconn.ai/llms.txt` | LLM-ready documentation index |
| `aiSkill` | `https://www.nexconn.ai/blog/nexconn-chat-integration-skill?utm_source=mktevent&utm_term=hackathon` | Official guide to integrating Nexconn Chat in 10 minutes with AI Coding Agents (`nexconn-skills`) |
| `github` | `https://github.com/NexconnAI-Dev` | Official Nexconn developer GitHub organization (9 public repositories) |
| `issues` | `https://github.com/NexconnAI-Dev/hackathon/issues` | Official hackathon Q&A, bug report, and mentor support tracker |
| `demo` | `https://www.nexconn.ai/demos/chat` | Interactive web demo of Nexconn Chat |
| `help` | `https://help.nexconn.ai/` | Nexconn Help Center |

#### C. SDKs, Packages, Supported Platforms & Technical Capabilities (`vS`, `docs.nexconn.ai`, `free-chat-api`)
- **3 SDK / UI Product Lines (`vS`)**:
  1. **`Chat SDK`** (**Required** — or `Chat UI`):
     - `"Send and receive messages, manage channels and groups, and sync message history."`
     - Supported Platforms: **Web** (`JavaScript / TypeScript`), **iOS** (`Swift`), **Android** (`Kotlin / Java`), **Flutter** (`Dart`).
     - Channel types (`docs.nexconn.ai`):
       - **Direct Channel**: 1-to-1 private messaging.
       - **Group Channel**: Up to **3,000 members per group**, up to **5,000 joined groups per user**.
       - **Community Channel**: **Unlimited members & channels** (scales with MAU), nested sub-channels, topic categorization (Discord/Slack style).
       - **Open Channel**: **Unlimited concurrent users** for high-traffic live stream chatrooms and spectator overlays.
     - Message & Rich Features: Text, Image, Audio, Video, File (up to **10 GB file storage**), Emoji, **Custom Messages (up to 25 KB)**, Message Edit & Recall, Delete, Read Receipts, Unread Counts, Typing Indicators, `@` Mentions, Quote Messages, Metadata, **180-day Cloud Message History**, Message Search, Friend Management (up to 3,000 friends), User Presence (online/offline/custom status), Push Notifications (APNs, FCM, Huawei Push).
  2. **`Chat UI`** (**Counts as Chat SDK usage**):
     - `"Ready-made chat screens that you can add to your app and customize."`
     - Supported Platforms: **Web**, **iOS**, **Android**, **Flutter**.
  3. **`Call SDK`** (**Optional** — does not satisfy the Chat SDK requirement alone):
     - `"Add 1-to-1 or group voice and video calls to your chat app."`
     - Supported Platforms: **Web**, **iOS**, **Android** (`Flutter` is marked `"Coming soon"` in `vS`).
     - Free tier: **10,000 free call minutes** (requires card binding).
- **Backend Server APIs & Webhooks (`docs.nexconn.ai`)**:
  - **Chat Server API** (`/platform-chat-api`): Server-side user token generation, message sending/broadcasting, group/community/open channel management, moderation.
  - **Call Server API** (`/server-call-api`) & **Console API** (`/console-api`).
  - **Webhooks**: Real-time HTTP callbacks for user status, **pre-message sending webhook** (ideal for synchronous AI moderation, translation, or AI agent interception), **post-message synchronization webhook** (ideal for RAG indexing, analytics, or triggering async AI bots), group changes, and open channel events.
- **Free Chat Plan (`Chat Growth Credit`) Quotas (`https://www.nexconn.ai/free-chat-api`)**:
  - Value: **$860/month → $0 for 12 months** (saves $10,320/year; **no credit card required**).
  - Includes: **10,000 Monthly Active Users (MAU)** + **10,000 Peak Concurrent Connections (PCU)** for Open Channels + all advanced Pro features unlocked.

#### D. All 9 Public Repositories in `https://github.com/NexconnAI-Dev`
Verified via `https://api.github.com/orgs/NexconnAI-Dev/repos`:

| Repository | Language | Description & Relevance |
|---|---|---|
| `NexconnAI-Dev/nexconn-skills` | Skill / Markdown | **AI Agent Skills** (`npx skills add https://github.com/NexconnAI-Dev/nexconn-skills.git`) for Claude Code, Cursor, Codex, Gemini CLI + optional **Nexconn Console MCP Server** (`@nexconn/console-mcp`) to auto-fetch App Keys and integrate Chat SDK/UIKit/Server APIs in ~10 minutes. |
| `NexconnAI-Dev/hackathon` | Issue Tracker | Official hackathon support repository (`https://github.com/NexconnAI-Dev/hackathon/issues`). |
| `NexconnAI-Dev/nexconn-chat-sample-web` | HTML / JS / TS | Official Web Chat SDK sample application. |
| `NexconnAI-Dev/nexconn-chat-sample-flutter` | Dart / Flutter | Official Flutter Chat SDK sample application. |
| `NexconnAI-Dev/nexconn-chat-sample-ios` | Swift | Official iOS Chat SDK sample application. |
| `NexconnAI-Dev/nexconn-chat-sample-android` | Kotlin | Official Android Chat SDK sample application. |
| `NexconnAI-Dev/nexconn-chat-sdk-ios` | C / Swift | Official iOS Chat SDK binary/package repository. |
| `NexconnAI-Dev/nexconn-server-sdk-java` | Java | Official Java Server SDK for Nexconn Chat Server API. |
| `NexconnAI-Dev/nexconn-server-sdk-go` | Go | Official Go Server SDK for Nexconn Chat Server API. |

---

### 1.5 How Reskilll Hackathons Operate & What Evaluators Prioritize

*Source: Direct inspection of `Admin-_pGkMjvW.js`, `Submit-R3OJNUmD.js`, `useDashboard-C_q5GCOp.js` on `https://reskilll.com/hack/nexconn/`, combined with web research on Reskilll's hackathon operations.*

1. **Centralized SPA Portal + Backend API (`api-req.reskilll.com/api/v3/hackathon/nexconn2026`)**:
   - Reskilll runs a custom multi-step portal handling Registration (`/register`), Team Formation (`/dashboard` with 6-character team codes), Track Selection, and Project Submission (`/submit`), plus an internal Admin/Evaluator portal (`/admin`, `Admin-_pGkMjvW.js`).
2. **How Evaluators Review Submissions in the Admin Portal (`Admin-_pGkMjvW.js`)**:
   - In `Admin-_pGkMjvW.js`, the Reskilll/Nexconn evaluation table and CSV export surface the following exact columns side-by-side for every submitted project:
     - `Title`, `Track`, `Summary`, `App Key` (`appKey`), `Packages` (`chat-sdk`, `chat-ui`, `call-sdk`), `SDK Features` (`sdkFeatures`), `Active Users` (`activeUsers`), `Built Before` (`builtBefore` / `builtBeforeDetails`), and direct one-click links to **`Write-up PDF`**, **`Demo Video`**, **`Runnable App`**, **`GitHub Repo`**, and **`Traction Proof`**.
3. **Evaluator Filtering & Scoring Workflow**:
   - **Step 1 — Hard Telemetry Audit (Pass/Fail Gate)**: Evaluators inspect the submitted `appKey` in the Nexconn backend console to verify:
     1. That the `appKey` is a real Nexconn application created by the team.
     2. That real SDK API calls / connections / messages flowed through that `appKey` (not mocked WebSockets or local state).
     3. The actual **Active Users count** registered against that `appKey` in the Nexconn console.
   - **Step 2 — 50% Completeness & UX Check via Live App URL + Demo Video**:
     - Half of the entire score (`50%`) is `"Completeness & user experience: The demo works fully and runs smoothly. The interface is clean, and the interaction is clear and easy to understand."`
     - Reskilll/Nexconn evaluators click the `Runnable app` link (`appUrl`) and watch the `Demo video` (`demoVideoUrl`). If the live URL requires complex setup, fails to log in immediately, has broken flows, or looks like an unpolished prototype, it loses the largest single block of points (`50%`).
   - **Step 3 — 30% Innovation & Scenario Value via Write-Up PDF & SDK Depth**:
     - Evaluators check whether chat is **central to a fresh workflow** (e.g., AI-augmented multi-party workflows, custom interactive message cards up to 25 KB, pre/post-message webhooks, real-time collaborative state, accessible communication) rather than a generic clone of WhatsApp/Slack.
   - **Step 4 — 20% Business & Growth Potential + Traction Bonus**:
     - Unlike typical hackathons where business potential is judged purely on pitch slides, Nexconn explicitly ties this `20%` criterion (plus a `"significant bonus in judging"`) to **measurable active users on the team's Nexconn App Key** (`activeUsers` in the Nexconn console) and concrete `tractionUrl` proof (analytics screenshots, real user sessions, tester feedback).

---

## 2. Logic Chain

1. **From Bundle Inspection (`index-BVD-GoH1.js`) to Complete Ground-Truth Extraction**:
   - Because `https://reskilll.com/hack/nexconn/` is a client-side Vite + React SPA, inspecting only the initial HTML shell or rendered home view misses gated routes (`/submit`, `/dashboard`, `/admin`). By extracting all 9 route bundles (`index`, `Rules`, `Submit`, `registration`, `Dashboard`, `Admin`, `Register`, `useDashboard`, `Legal`), we obtained 100% of the verbatim copy, validation regexes, API endpoints, and admin review fields.
2. **From Track Policy (`Wx`, `Xx`, `gS`, `yS`) to Strategic Track Selection**:
   - Since `yS` explicitly confirms `"Do tracks have separate prizes? No. All tracks share the same prize pool and judging criteria"`, track choice does not partition the prize pool. Instead, choosing a track is a framing device to highlight **Innovation & Scenario Value (30%)**.
3. **From the Judging Rubric (`gu`: 50% Completeness/UX, 30% Innovation/Scenario, 20% Business/Traction) + Admin View (`Admin-_pGkMjvW.js`) to Winning Strategy**:
   - The Admin dashboard (`Admin-_pGkMjvW.js`) puts `appKey`, `packages`, `activeUsers`, `Write-up PDF`, `Demo Video`, `Runnable App`, `GitHub Repo`, and `Traction` right in front of the judge.
   - Because **50% of the score is Completeness & UX**, a frictionless, zero-setup live web deployment (`appUrl`) with instant one-click demo personas / guest login and polished UI is the single highest-leverage engineering requirement.
   - Because **Nexconn judges verify the `appKey` in their console and count active users (`20%` + traction bonus)**, every real user session, multi-user test room, or bot/human participant registered as a distinct user ID on the Nexconn `appKey` directly increases both the automated console telemetry and the team's score.
   - Furthermore, Nexconn explicitly published the `nexconn-skills` AI coding agent skill (`https://github.com/NexconnAI-Dev/nexconn-skills`) and featured `"a support bot that uses AI"` in `fS`, signaling strong enthusiasm for AI + real-time chat integrations that leverage Nexconn's rich primitives (Custom Messages up to 25 KB, Group/Community/Open channels, typing indicators, read receipts, and pre/post-message webhooks).

---

## 3. Caveats

- **Unauthenticated Backend Endpoints**: Calling `https://api-req.reskilll.com/api/v3/hackathon/nexconn2026/problem-statements` directly without a bearer token returns HTTP 403 (`Forbidden`). However, inspecting `useDashboard-C_q5GCOp.js` (function `xe`) proved that the client maps any backend problem statements directly onto the hardcoded `je` (`Wx`) and `_e`/`Le` (`Xx`) track definitions in `index-BVD-GoH1.js`, so no track details were missed.
- **Individual Judge Names Not Published**: Neither `https://reskilll.com/hack/nexconn/` nor `https://github.com/NexconnAI-Dev/hackathon` lists individual judge names; the site refers to them collectively as `"Nexconn judges"` and `"Nexconn engineers"`.

---

## 4. Conclusion

To maximize win probability in the **Nexconn Build Challenge 2026** (`$5,000` cash pool, `$2,000` 1st place + `$20,640` in Nexconn Free Chat Plan credits + cloud discounts):

1. **Mandatory Technical Foundation**:
   - Register a Nexconn Console account (`https://console.nexconn.ai/agile/register?utm_source=mktevent&utm_term=hackathon`), claim the Free Chat Plan, and obtain a valid **App Key** (`^[A-Za-z0-9_-]{8,64}$`).
   - Integrate **`Chat SDK`** and/or **`Chat UI`** (selecting `chat-sdk` / `chat-ui` in the submission form) using the official `NexconnAI-Dev/nexconn-skills` skill and sample repos. Optional **`Call SDK`** can be layered on for 1-to-1 or group voice/video calls.
2. **Optimize for the 50% Completeness & UX Weight**:
   - Ship a rock-solid, live `https://` web app (`appUrl`) with **zero-friction onboarding** (e.g., instant one-click demo personas / dual-pane or multi-tab live simulation + real multi-user rooms) so judges can experience end-to-end real-time messaging within 5 seconds of clicking `appUrl`.
3. **Optimize for the 30% Innovation & Scenario Value Weight**:
   - Go beyond basic text bubbles: use Nexconn **Custom Messages (up to 25 KB)**, **Group / Community / Open Channels**, **Read Receipts**, **Typing Indicators**, **`@` Mentions**, **Quote Messages**, **User Presence**, and **Server API / Webhooks** to power an interactive, high-value communication workflow (e.g., AI-mediated workplace/support/community/accessibility workflows).
4. **Optimize for the 20% Business & Growth Potential + Significant Traction Bonus**:
   - Drive real active user accounts and message volume through the live `appKey` before Nov 22, 2026 so that the Nexconn Console telemetry shows strong **Active Users** (`activeUsers`), and document user sessions, analytics screenshots, and tester feedback in `tractionUrl` and the **Write-up PDF** (`writeupUrl`).

---

## 5. Verification Method

Any agent or human can independently verify every finding in this report using the following commands or file inspections:

1. **Verify Live Page & JS Bundles**:
   - Fetch `https://reskilll.com/hack/nexconn/` and inspect the main bundle `https://reskilll.com/hack/nexconn/assets/index-BVD-GoH1.js` (cached in session artifact `C:\Users\Harshad\.gemini\antigravity\brain\85d4f418-6320-4683-8ed4-5ecbf06bfac9\.system_generated\steps\19\content.md`) for constants `st`, `xt`, `hS`, `Fp`, `fS`, `pS`, `tS`, `Vx`, `mS`, `Jx`, `Wx`, `Xx`, `gS`, `gu`, `Kx`, `sS`, `vS`, `xS`, `Yx`, `Gx`, `Zx`, `yS`.
2. **Verify Submission Validation & Admin Columns**:
   - Inspect `https://reskilll.com/hack/nexconn/assets/Submit-R3OJNUmD.js` (`steps\30\content.md`) for function `nn(e)` and `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js` (`steps\42\content.md`) for the admin evaluation table and CSV export schema.
3. **Verify Official GitHub Repositories & AI Skill**:
   - Query `https://api.github.com/orgs/NexconnAI-Dev/repos` (`steps\85\content.md`) and `https://raw.githubusercontent.com/NexconnAI-Dev/nexconn-skills/main/README.md` (`steps\87\content.md`).
