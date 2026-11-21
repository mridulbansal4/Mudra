# Verbatim Portal & SPA Bundle Capture - Nexconn Build Challenge 2026 (`reskilll.com/hack/nexconn`)

- **Captured From**: `https://reskilll.com/hack/nexconn/` (and SPA routes `/tracks`, `/prizes`, `/rules`, `/schedule`, `/submit`, `/login`, `/register`, `/dashboard`, `/admin`)
- **Production SPA Bundle Assets**:
  - Main App Entry & Constants: `https://reskilll.com/hack/nexconn/assets/index-DSX23m3q.js`
  - Rules Route Bundle: `https://reskilll.com/hack/nexconn/assets/Rules-DQNF0983.js`
  - Submit Route Bundle: `https://reskilll.com/hack/nexconn/assets/Submit-R3OJNUmD.js`
  - Schedule Route Bundle: `https://reskilll.com/hack/nexconn/assets/Schedule-B3uB_Csm.js`
  - Dashboard Route Bundle: `https://reskilll.com/hack/nexconn/assets/Dashboard-Clp-o1A3.js`
  - Admin Portal Bundle: `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js`
  - Stylesheet: `https://reskilll.com/hack/nexconn/assets/index-CDc4hL2f.css`
- **Backend API Base**: `https://allbackend.reskilll.com`
- **Hackathon Identifier (`st`)**: `"nexconn2026"`

---

## 1. Portal Hero, Metadata & Core Value Proposition

### 1.1 HTML Document `<head>` (`https://reskilll.com/hack/nexconn/`)
- **Title**: `Nexconn Build Challenge 2026 - Build an App with Real-Time Chat`
- **Meta Description**: `Build any mobile or web app using Nexconn Chat SDK or Chat UI. $5,000 in cash prizes, $20,640 in Free Chat Plan credits, and 1-year cloud discounts. Submit by November 22, 2026.`
- **Fonts**: `Space Grotesk` (headings), `Plus Jakarta Sans` (body), `JetBrains Mono` (code/monospace).

### 1.2 Hero Section Copy (`index-DSX23m3q.js`)
- **Badge**: `Online Hackathon · Free to Enter · Submit by Nov 22, 2026`
- **Headline**: `Build an App with Real-Time Chat`
- **Sub-headline**: `Pick a track, integrate Nexconn Chat SDK or Chat UI into your mobile or web app, and compete for $5,000 in cash, $20,640 in Free Chat Plan credits, and 1-year cloud discounts.`
- **Primary CTAs**: `Register Now` (`/hack/nexconn/register`), `Submit Project` (`/hack/nexconn/submit`), `Explore Docs` (`https://docs.nexconn.ai/`).
- **Quick Stats Strip (`fS`)**:
  - `$5,000` - `Total Cash Prizes (5 Winners)`
  - `$20,640` - `Free Chat Plan (2 Years per Winner)`
  - `6 Tracks` - `Social, Gaming, Workplace, Support, Social Good & Open`
  - `Nov 22, 2026` - `Submission Deadline (23:59 AoE)`

---

## 2. Verbatim Timeline & Milestones (`xt`, `hS`, `Fp` in `index-DSX23m3q.js` & `Schedule-B3uB_Csm.js`)

### 2.1 Programmatic Milestone Constants (`xt`)
```javascript
const st = "nexconn2026";
const xt = {
  launch:       new Date("2026-10-23T00:00:00-12:00"),
  submissions:  new Date("2026-10-23T00:00:00-12:00"),
  submitBy:     new Date("2026-11-22T23:59:59-12:00"),
  judgingStart: new Date("2026-11-23T00:00:00-12:00"),
  judgingEnd:   new Date("2026-11-27T23:59:59-12:00"),
  results:      new Date("2026-12-01T00:00:00-12:00")
};
```

### 2.2 Public Schedule Table (`hS` / `/hack/nexconn/schedule`)
| Phase | Date | Verbatim Description |
|---|---|---|
| **Hackathon Launch & Registration Open** | `Oct 23, 2026` | Registration opens on Reskilll. Create a Nexconn console account, get your App Key, and start building alone or in a team of up to 4. |
| **Submissions Open** | `Oct 23, 2026` | Project submission portal opens. Teams can save drafts and update their submission at any time before the deadline. |
| **Submission Deadline** | `Nov 22, 2026 (23:59 AoE)` | Final deadline to submit your project, GitHub repository, demo video, PDF write-up, and Nexconn App Key. *(Note: `Rules-DQNF0983.js` displays `2026-11-22 23:59 UTC+8`; `xt.submitBy` enforces `2026-11-22T23:59:59-12:00` AoE in the frontend countdown).* |
| **Judging Period** | `Nov 23 – Nov 27, 2026` | The Nexconn team reviews all eligible submissions, verifies real Chat SDK / Chat UI usage via your App Key, and scores projects across Completeness (50%), Innovation (30%), and Business & Growth Potential (20%). |
| **Winners Announced** | `Dec 1, 2026` | The 5 winning teams are announced. Reskilll contacts team leaders directly to coordinate prize payouts, Nexconn Free Chat Plan activation, and cloud discount redemption. |

---

## 3. Verbatim Tracks & Example Ideas (`Wx`, `Xx`, `gS` in `index-DSX23m3q.js`)

All 6 tracks compete in a single shared pool for the top 5 overall winner slots (`yS` FAQ: *"Do tracks have separate prizes? No - all 6 tracks share the same prize pool."*).

```javascript
const Wx = [
  {
    num: "01",
    id: "nexconn-social",
    name: "Social & Community",
    sub: "Group messaging and topic-based channels",
    desc: "Build apps where people connect around shared interests, live events, creators, or local communities using group chat, communities, or open channels.",
    examples: [
      "Live room for a watch party",
      "Group chat for shared interests",
      "Creator fan channel"
    ]
  },
  {
    num: "02",
    id: "nexconn-gaming",
    name: "Gaming & Live Streams",
    sub: "Squad chat and live stream interactive chatroom",
    desc: "Power real-time communication for players and viewers - from low-latency squad coordination to massive live-stream spectator chatrooms.",
    examples: [
      "Squad chat room",
      "In-match quick chat",
      "Spectator chat overlay"
    ]
  },
  {
    num: "03",
    id: "nexconn-workplace",
    name: "Workplace & Collaboration",
    sub: "Direct messaging and team project threads",
    desc: "Create productivity and operational messaging tools that help distributed teams, frontline staff, or AI-assisted workspaces coordinate faster.",
    examples: [
      "Direct messaging for teams",
      "Project discussion threads",
      "Shift handover channel"
    ]
  },
  {
    num: "04",
    id: "nexconn-support",
    name: "Marketplace & Support",
    sub: "Buyer-seller chat and customer service",
    desc: "Enable trusted transactional conversations between buyers and sellers, on-demand service providers, or multi-language customer support teams.",
    examples: [
      "Buyer-seller 1-on-1 chat",
      "Human agent dispatch center",
      "Multi-language translated chat"
    ]
  },
  {
    num: "05",
    id: "nexconn-social-good",
    name: "Humanitarian & Social Good",
    sub: "Accessible text chat for seniors and communities",
    desc: "Design inclusive, accessible real-time communication tools for seniors, differently-abled users, emergency volunteers, or peer-support networks.",
    examples: [
      "Large-font & voice-to-text chat",
      "Volunteer dispatch rooms",
      "Peer-support check-ins"
    ]
  },
  {
    num: "06",
    id: "open",
    name: "Open Innovation",
    sub: "Any interactive chat idea",
    desc: "Have a wild or cross-category idea that doesn't fit neatly above? Build any interactive experience powered by Nexconn Chat SDK or Chat UI.",
    examples: [
      "Any real-time idea",
      "Chat SDK required, Call SDK optional",
      "Web, iOS, Android or Flutter"
    ]
  }
];
```

---

## 4. Verbatim Prizes & Perks (`Vx`, `mS`, `Jx` in `index-DSX23m3q.js`)

### 4.1 Cash Prize Breakdown (`Vx` - $5,000 Total across 5 Winners)
| Rank | Cash Prize (`Vx.cash`) | Additional Per-Winner Perks (`mS` / `Jx`) |
|---|---|---|
| **1st Place** | **$2,000 USD** | 2-Year Nexconn Free Chat Plan ($20,640 value) + 1-Year Cloud Discount (15% OFF AWS or 30% OFF Alibaba Cloud) |
| **2nd Place** | **$1,250 USD** | 2-Year Nexconn Free Chat Plan ($20,640 value) + 1-Year Cloud Discount (15% OFF AWS or 30% OFF Alibaba Cloud) |
| **3rd Place** | **$750 USD** | 2-Year Nexconn Free Chat Plan ($20,640 value) + 1-Year Cloud Discount (15% OFF AWS or 30% OFF Alibaba Cloud) |
| **4th Place** | **$500 USD** | 2-Year Nexconn Free Chat Plan ($20,640 value) + 1-Year Cloud Discount (15% OFF AWS or 30% OFF Alibaba Cloud) |
| **5th Place** | **$500 USD** | 2-Year Nexconn Free Chat Plan ($20,640 value) + 1-Year Cloud Discount (15% OFF AWS or 30% OFF Alibaba Cloud) |

### 4.2 Non-Cash Winner Perks (`mS` & `Jx`)
1. **2-Year Free Chat Plan (worth $20,640 per winning team)**:
   - Valued at **$860/month × 24 months = $20,640**.
   - Includes **up to 10,000 Monthly Active Users (MAU)** per month on the Nexconn Chat platform.
2. **1-Year Cloud Discount (choose one)**:
   - **15% OFF AWS** for 1 year, OR **30% OFF Alibaba Cloud** for 1 year.
   - **Condition (`Jx`)**: *"Available only for newly registered cloud email accounts."*
3. **Free Build Tier During the Hackathon**:
   - Every participant receives a free Nexconn developer account at `https://console.nexconn.ai` with **1,000 free Monthly Active Users (MAU)** and **10,000 free audio/video call minutes** (no credit card required).

---

## 5. Verbatim Judging Criteria & Scoring Weights (`gu` in `index-DSX23m3q.js` & `Zx` in `Rules-DQNF0983.js`)

```javascript
const gu = [
  {
    weight: "50%",
    title: "Completeness & user experience",
    desc: "The app works from start to end, runs smoothly, and has a clean UI and clear interaction."
  },
  {
    weight: "30%",
    title: "Innovation & scenario value",
    desc: "The idea is new and actually solves a real communication problem or adds an interesting interaction."
  },
  {
    weight: "20%",
    title: "Business & growth potential",
    desc: "The app has potential to attract real users and grow into a real product. Apps that already bring in active users during the hackathon get a big bonus."
  }
];
```

### 5.1 Mandatory Technical Gate (`Zx` in `Rules-DQNF0983.js`)
- **Verbatim Rule**: *"Every project must use Nexconn Chat SDK or Chat UI. Call SDK is optional and cannot be used alone. The Nexconn team will verify real SDK usage using the App Key provided in your submission."*
- **Traction Verification**: *"Active users are counted on the Nexconn console using the App Key you submit. Projects that attract real active users during the hackathon period receive a significant bonus under Business & growth potential."*

---

## 6. Verbatim Rules, Eligibility, IP & Terms (`Yx`, `Gx`, `Zx`, `tS`, `yS` in `Rules-DQNF0983.js`)

### 6.1 Eligibility & Geographic Restrictions (`Yx`, `tS`)
- **Team Size**: 1 to 4 members (`Solo builders are treated as a team of 1`).
- **Role Constraint**: Only the **Team Leader** can select the team's competition track and submit/update the project (`Submit-R3OJNUmD.js`).
- **Geographic Restriction (`tS`)**:
  ```javascript
  const tS = ["CN"]; // Restricted countries array: Mainland China excluded
  ```
  Verbatim rule: *"Open to developers worldwide, excluding residents of Mainland China."*

### 6.2 Prior Work Policy (`Kx`, `Zx`)
- Teams may submit a brand-new project or build on top of an existing project, provided they explicitly declare `builtBefore: "yes"` or `"no"` on the submission form and detail (`builtBeforeDetails`, 10–2,000 characters) exactly what was built before October 23, 2026 versus what was built and integrated with Nexconn during the hackathon window.

### 6.3 Intellectual Property & License (`Gx`)
- **Code Ownership**: *"Your team retains full ownership of all code and intellectual property you create during the hackathon."*
- **Promotional License**: *"By submitting, you grant Nexconn and Reskilll a non-exclusive, royalty-free license to display, demonstrate, and promote your submission (including project name, summary, screenshots, demo video, and public repository link) for marketing and community showcase purposes."*

### 6.4 Prize Disbursement (`Zx`, `yS`)
- *"Reskilll will contact winning team leaders after December 1, 2026 to arrange cash prize payouts and coordinate with Nexconn for Free Chat Plan activation and cloud discount onboarding."*

---

## 7. Verbatim Submission Form Schema & Client-Side Validation (`Kx`, `sS`, `vS`, `xS` in `Submit-R3OJNUmD.js`)

### 7.1 Required & Optional Submission Fields (`Submit-R3OJNUmD.js`)
| Section | Field Key | Label / UI Prompt | Validation Rule (`Submit-R3OJNUmD.js`) |
|---|---|---|---|
| **Track** | `trackId` | Selected Track | Must be one of `nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, `open`. Team leader only. |
| **01 Project** | `title` | Project Name | Required string, trimmed length `5` to `200` characters. |
| **01 Project** | `summary` | Project Summary | Required string, trimmed length `10` to `2,000` characters. |
| **02 Proof of Nexconn Integration** | `packages` | Nexconn Packages Used (`sS`) | Array of selected IDs from `["chat-sdk", "chat-ui", "call-sdk"]`. **Hard Validation**: Must include `"chat-sdk"` or `"chat-ui"`. Selecting only `"call-sdk"` triggers: `"Select at least Chat SDK or Chat UI (Call SDK alone isn't eligible)"`. |
| **02 Proof of Nexconn Integration** | `appKey` | Nexconn App Key (`vS`) | Required string matching regex `/^[A-Za-z0-9_-]{8,64}$/`. Verified against `console.nexconn.ai`. |
| **02 Proof of Nexconn Integration** | `sdkFeatures` | How did you use Nexconn? | Required string, trimmed length `30` to `2,000` characters. Prompt: *"Describe which Nexconn Chat SDK / Chat UI features you integrated (e.g., 1-on-1 chat, group channels, open channels, custom messages, moderation, translation) and where they appear in your app."* |
| **03 Links** | `appUrl` | Live App / Download URL | Required valid `http://` or `https://` URL (web deployment, APK, TestFlight, or store listing). |
| **03 Links** | `repoUrl` | Public GitHub Repository | Required GitHub URL matching `/^https?:\/\/(www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/`. **Live API Check**: Client fetches `https://api.github.com/repos/{owner}/{repo}` to verify the repository exists and is public (`private === false`). |
| **03 Links** | `demoVideoUrl` | Demo Video URL | Required URL hosted on **YouTube** (`youtube.com`, `youtu.be`), **Loom** (`loom.com`), **Google Drive** (`drive.google.com`), or **Vimeo** (`vimeo.com`). |
| **04 Write-up** | `writeupUrl` | Project Write-up (PDF) | Required PDF upload (`application/pdf`, max `25 MB` = `26,214,400` bytes) POSTed to `https://allbackend.reskilll.com/upload/document`. Prompt reminds teams to include their Nexconn App Key inside the PDF. |
| **05 Traction (Optional Bonus)** | `tractionUrl` | Proof of Traction URL | Optional valid `http://` or `https://` URL (analytics dashboard, social post, community link, or user feedback). |
| **05 Traction (Optional Bonus)** | `activeUsers` | Active Users Count | Optional digits-only string (`/^\d{1,9}$/`). Cross-checked by judges against the submitted `appKey` on the Nexconn console. |
| **06 Prior Work** | `builtBefore` | Was any part built before Oct 23, 2026? | Required enum: `"no"` or `"yes"`. |
| **06 Prior Work** | `builtBeforeDetails` | Prior Work Details | Required if `builtBefore === "yes"`, length `10` to `2,000` characters explaining what existed prior to Oct 23, 2026 vs. what was built during the hackathon. |
| **Terms** | `agreed` | Official Rules Agreement | Required boolean `true`. |

---

## 8. Verbatim Admin & Judge Review Portal (`Admin-_pGkMjvW.js`)

Inspecting `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js` reveals the exact operational dashboard used by Reskilll organisers and Nexconn judges:

- **Admin API Endpoints** (`https://allbackend.reskilll.com/admin/hackathon/nexconn2026/...`):
  - `GET /admin/hackathon/nexconn2026/stats` - Total registrations, teams, submissions, and track distribution.
  - `GET /admin/hackathon/nexconn2026/users` - Participant roster, countries, and registration metadata.
  - `GET /admin/hackathon/nexconn2026/teams` - Team compositions, invite codes, and selected tracks.
  - `GET /admin/hackathon/nexconn2026/ideas` - Full project submissions list with filter by status (`submitted`, `draft`) and track.
  - `GET /admin/hackathon/nexconn2026/analytics` - Funnel conversion and daily signup/submission velocity.
  - `PATCH /admin/hackathon/nexconn2026/registration` - Toggle registration open/closed state.
- **Judge CSV Export Schema (`Qt` in `Admin-_pGkMjvW.js`)**:
  ```javascript
  const headers = [
    "Project",
    "Team",
    "Team code",
    "Track",
    "Submitted by",
    "Status",
    "App",
    "Repo",
    "Demo video",
    "Write-up",
    "App Key",
    "Packages",
    "Active users",
    "Traction",
    "Built before",
    "Submitted at"
  ];
  ```
- **Submission Inspector Drawer (`Admin-_pGkMjvW.js`)**:
  - Displays `appKey` in a monospace badge with a **1-click Copy button** (`navigator.clipboard.writeText(idea.appKey)`) so Nexconn engineers can paste it directly into their internal `console.nexconn.ai` telemetry lookup.
  - Renders direct clickable buttons for `Open App`, `GitHub Repo`, `Watch Demo Video`, `Read Write-up PDF`, and `Traction Proof`.
  - Displays the self-reported `Active users` badge right next to `App Key` and `Packages` (`chat-sdk`, `chat-ui`, `call-sdk`).
