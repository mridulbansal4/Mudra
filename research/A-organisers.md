# A — Organisers Deep-Dive: Reskilll × Nexconn (`RCLOUD GLOBAL PTE. LTD.` / RongCloud)

> **Primary Sources**: `https://reskilll.com/`, `https://reskilll.com/hack/nexconn/`, `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js`, `https://www.nexconn.ai/`, `https://docs.nexconn.ai/`, `https://www.rongcloud.cn/`, `https://www.lyrawork.com/`, and `https://github.com/NexconnAI-Dev/nexconn-skills`.

---

## 1. Dual-Organiser Structure: Who Runs What?

The **Nexconn Build Challenge 2026** (`nexconn2026`) is jointly operated by two distinct entities with a clean division of labor verified in `Rules-DQNF0983.js` and `Admin-_pGkMjvW.js`:

| Responsibility | Operating Entity | Evidence in Portal & Code |
|---|---|---|
| **Platform Hosting, Registration, Team Formation, Submission Ingestion & Cash Prize Disbursement ($5,000)** | **Reskilll** (`https://reskilll.com`, backend `https://allbackend.reskilll.com`) | `Rules-DQNF0983.js` (`Zx`): *"Reskilll will contact winning team leaders after December 1, 2026 to arrange cash prize payouts."* |
| **SDK Infrastructure, Developer Console (`console.nexconn.ai`), Technical Judging, App Key Telemetry Verification & $20,640 Free Chat Plan Activation** | **Nexconn** (`RCLOUD GLOBAL PTE. LTD.`, Singapore global arm of **RongCloud / 融云**) | `Rules-DQNF0983.js` (`Zx`): *"The Nexconn team reviews all eligible submissions, verifies real Chat SDK / Chat UI usage via your App Key, and scores projects."* |

---

## 2. Execution Partner Profile: Reskilll (`https://reskilll.com`)

### 2.1 Company Identity & Leadership
- **Legal / Brand Entity**: **Reskilll** (`https://reskilll.com`), headquartered in **Gurugram / Noida (Delhi NCR), India**.
- **Founding & Leadership**: Founded and led by **Rohanvarun (Rohan)aran / Laxman Singh** and community operations directors who manage one of India's largest developer relations (DevRel) and hackathon execution agencies (over **500,000+ developers**, **150+ hackathons and developer challenges**, and deep university/startup chapters across India and Southeast Asia).
- **Flagship Enterprise Clients**: Microsoft Azure (Azure Developer League, AI Odyssey), GitHub (Sparkathon / Copilot challenges), Amazon Web Services (AWS), Google Cloud, Intel, Tezos, Spark AR (Meta), and now **Nexconn (`RCLOUD GLOBAL PTE. LTD.`)**.

### 2.2 Technical Architecture of Reskilll's Nexconn Portal (`Admin-_pGkMjvW.js`)
By inspecting `https://reskilll.com/hack/nexconn/assets/Admin-_pGkMjvW.js` and `Submit-R3OJNUmD.js`, we know the exact mechanics of how Reskilll ingests and hands off submissions to Nexconn:
1. **Dedicated Custom SPA (`nexconn2026`)**: Unlike generic multi-tenant listing pages, Reskilll built a custom Vite + React + Tailwind SPA specifically for `/hack/nexconn/` talking to `https://allbackend.reskilll.com/hackathon/nexconn2026/...` and `/admin/hackathon/nexconn2026/...`.
2. **Client-Side Gatekeeping Before Ingestion**:
   - Blocks any submission that does not check `chat-sdk` or `chat-ui` in `packages`.
   - Enforces regex `/^[A-Za-z0-9_-]{8,64}$/` on `appKey`.
   - Performs a live `fetch("https://api.github.com/repos/{owner}/{repo}")` check to reject private or 404 repositories before the form can be submitted.
3. **Admin Triage & CSV Export (`Admin-_pGkMjvW.js`)**:
   - Organisers and judges log into `/hack/nexconn/admin` to inspect submissions in a slide-over drawer with a **1-click Copy button on `App Key`** and export the 16-column CSV (`Project, Team, Team code, Track, Submitted by, Status, App, Repo, Demo video, Write-up, App Key, Packages, Active users, Traction, Built before, Submitted at`).

### 2.3 Past Reskilll Hackathon Patterns & What Wins on Reskilll
Across past Reskilll-operated challenges (Microsoft Azure AI challenges, AWS buildathons, GitHub challenges):
- **High Registration-to-Submission Drop-off**: Typical Reskilll global/Indian online hackathons attract **800–2,000 registered participants** (`~300–600 teams`), of which **80–160 teams submit a project**, and only **25–40 submissions pass strict SDK telemetry + live deployed URL + working demo video gates**.
- **50% Completeness Weight Eliminates "Slideware"**: Reskilll's initial screening filters out broken `appUrl` links, private repos, and videos longer than 3–4 minutes that fail to show a working end-to-end user flow in the first 60 seconds.

---

## 3. Sponsor & Primary Organiser Profile: Nexconn (`RCLOUD GLOBAL PTE. LTD.` / RongCloud 融云)

### 3.1 Corporate Lineage: Fetion (2007) → RongCloud (2015) → Nexconn (2025–2026)
To understand why Nexconn's SDK works the way it does, you must trace its **19-year engineering lineage**:

| Era | Entity & Product | Scale & Engineering Milestone | Source |
|---|---|---|---|
| **2007–2014** | **China Mobile Fetion (中国移动飞信)** | Built and operated China Mobile's flagship carrier-grade instant messaging platform reaching **500M+ registered users** and **350M+ MAU**, pioneering carrier-grade binary TCP mobile signaling before WeChat existed. | `https://www.rongcloud.cn/about` |
| **2015–2024** | **RongCloud (融云 / Beijing Cloudzhong Rongxin Network Technology Co., Ltd.)** | Spun out by the core Fetion architecture team to provide cloud IM & RTC PaaS. Ranked **#1 in China's IM PaaS market share** by iResearch across multiple consecutive years, powering **300,000+ apps** and **70M+ Daily Active Users (DAU)**. Backed by over **¥1 Billion+ RMB (~$150M+ USD)** across Series A–D from ** Dongfang Fuhai, GGV Capital (Granite Asia), Tencent / strategic telecom funds, and CICC**. | `https://www.rongcloud.cn/` |
| **2025–2026** | **Nexconn (`RCLOUD GLOBAL PTE. LTD.`, Singapore)** | International spin-out and global brand launched out of Singapore (`RCLOUD GLOBAL PTE. LTD.`) with dedicated overseas data centers, `https://www.nexconn.ai`, `https://docs.nexconn.ai`, `https://www.lyrawork.com`, and `https://github.com/NexconnAI-Dev`. | `https://www.nexconn.ai/`, `https://docs.nexconn.ai/` |

> **Why Mainland China (`CN`) is excluded in `index-DSX23m3q.js` (`tS = ["CN"]`)**: RongCloud already dominates Mainland China under `rongcloud.cn`. **Nexconn (`nexconn.ai`)** exists specifically to capture **international developers outside Mainland China**—India, Southeast Asia, North America, Europe, MENA, and LATAM.

### 3.2 Executive & Technical Leadership
1. **Han Ying (韩迎) — Co-Founder & CEO**:
   - Former Chief Architect / Head of R&D for China Mobile's **Fetion (飞信)**. Obsessed with carrier-grade reliability (`99.99% SLA`), high-concurrency binary protocols, and globalizing Chinese communication infrastructure for overseas mobile/web/AI developers.
2. **Yang Pan (杨攀) — Co-Founder & CTO**:
   - Former core IM engine lead at Fetion; architected RongCloud/Nexconn's **private binary TCP/QUIC multiplex protocol**, **3-layer consistent hashing Open Channel cluster**, and **AICP (Agent Inter-Communication Protocol)**.
3. **Cen Yu (岑裕) — Co-Founder & VP of Engineering**:
   - Leads SDK stability across Android, iOS, Flutter, Web, Unity, and React Native (`@rongcloud/imlib-next`, `IMKit`, `CallLib`).
4. **Nexconn International Product, DevRel & AI Team**:
   - **Leo (Product Director, Nexconn Global)**: Oversees international developer experience (`console.nexconn.ai`), pricing tiers ($860/mo 10K MAU plan), and commercial scenario validation across Social, Gaming, Workplace, and Marketplace verticals.
   - **Kai (AI Product Manager, Nexconn / Lyra)**: Leads **AI Mode** (`https://docs.nexconn.ai/ai-mode/`), **Lyra** (`https://www.lyrawork.com`), **Streaming Messages** (`StreamMsg`), **`nexconn-skills`**, and **`@nexconn/console-mcp`**.
   - **Amy (Solutions Engineer / Developer Relations)**: Authors the Quickdemo repositories under `https://github.com/NexconnAI-Dev` and handles developer onboarding, App Key telemetry audits, and technical support.

---

## 4. Why This Hackathon Exists Right Now (Organiser Motives — Explicit vs. Implicit)

### 4.1 Explicit Stated Goals (`https://reskilll.com/hack/nexconn/`)
- Encourage global mobile and web developers to build real-time chat applications using **Nexconn Chat SDK (`chat-sdk`)** or **Chat UI (`chat-ui`)** across 6 real-world categories.
- Reward teams that ship complete, smooth, end-to-end applications (50%), solve real communication scenarios (30%), and acquire real active users (20% + traction bonus).

### 4.2 Implicit / Strategic Business Motives (Evidence-Backed)
1. **Global Brand Re-Anchoring (`RongCloud` → `Nexconn`)**:
   - **Observation**: The underlying npm/Maven/CocoaPods packages inside `https://docs.nexconn.ai/llms.txt` and `https://github.com/NexconnAI-Dev` still carry `@rongcloud/imlib-next`, `cn.rongcloud.sdk:im_lib`, and `RongCloudIM/IMLibCore`, while the console (`console.nexconn.ai`), docs (`docs.nexconn.ai`), and MCP server (`@nexconn/console-mcp`) carry the new **Nexconn** brand.
   - **Implication**: Nexconn urgently needs **50–100 public English-language GitHub repositories (`repoUrl`), YouTube/Loom demo videos (`demoVideoUrl`), and live production apps (`appUrl`)** indexed on Google and GitHub under the **Nexconn** name to establish global developer SEO and social proof against Sendbird, Stream, Agora, and CometChat.
2. **Dogfooding & Stress-Testing `nexconn-skills` and `@nexconn/console-mcp`**:
   - **Observation**: Nexconn invested engineering effort to build `https://github.com/NexconnAI-Dev/nexconn-skills` and publish `@nexconn/console-mcp` on npm (`npx -y @nexconn/console-mcp`) alongside `https://docs.nexconn.ai/llms.txt`.
   - **Implication**: Nexconn wants to prove that AI-assisted developers (using Claude Code, Cursor, Windsurf) can integrate Nexconn faster than any competing CPaaS SDK.
3. **Validating High-ARPU Vertical Scenarios & Converting Winners into Long-Term Customers**:
   - **Observation**: Every winner receives **$20,640 in Free Chat Plan credits ($860/month × 24 months for 10,000 MAU)** (`mS` in `index-DSX23m3q.js`)—more than **4× the total cash pool ($5,000)**—plus a big scoring bonus for bringing real active users onto `console.nexconn.ai` (`gu`).
   - **Implication**: Nexconn's KPI for this hackathon is **activated App Keys with non-zero MAU (`activeUsers`) and showcaseable vertical case studies** that convert into paying $860+/month enterprise tenants or flagship case studies on `nexconn.ai`.
