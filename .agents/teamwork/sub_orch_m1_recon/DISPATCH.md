## 2026-10-31T18:25:00Z

# Task Assignment: Milestone M1 Sub-Orchestrator (`sub_orch_m1_recon`) — Phase 1 Recon & Phase 3 Connect-the-Dots

- **Your Identity**: `sub_orch_m1_recon` (Sub-Orchestrator for Milestone M1)
- **Your Working Directory**: `d:\Hackathons\Nexconn\.agents\teamwork\sub_orch_m1_recon`
- **Parent Conversation ID**: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- **Authoritative User Request**: `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first and include in every subagent dispatch)
- **Project Scope Document**: `d:\Hackathons\Nexconn\PROJECT.md`

## Mandatory Reading Before Dispatching
1. `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\Hackathons\Nexconn\PROJECT.md`
3. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md` (Full `war-room-council` specification)
4. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md` (Verbatim `https://reskilll.com/hack/nexconn/` bundle extraction)
5. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md` (Deep Nexconn company/SDK profile + global hackathon winners + 2024–2026 arXiv papers)

## Scope & Exclusive Write Ownership (Milestone M1: Features F1–F8)
You own and must produce the following files under `d:\Hackathons\Nexconn\`:
1. **`d:\Hackathons\Nexconn\research\00-source\`**:
   - Raw reference files documenting the extracted `https://reskilll.com/hack/nexconn/` SPA copy, JS bundle constants (`index-BVD-GoH1.js`, `Rules-DQNF0983.js`, `Submit-R3OJNUmD.js`, `Admin-_pGkMjvW.js`), and `docs.nexconn.ai/llms.txt` / `NexconnAI-Dev` repo summaries.
2. **`d:\Hackathons\Nexconn\research\01-facts.md`** (Feature F2):
   - Canonical hackathon facts: full title (`Nexconn Build Challenge 2026`), slug (`nexconn2026`), timeline (Oct 23 – Nov 22, 2026 AoE / UTC+8, judging Nov 23–27, winners Dec 1), format, eligibility (`CN` exclusion), team size (`1–4`), prize pool ($5,000 cash across 5 winners + $20,640 2-year Free Chat Plan + 15% AWS / 30% Alibaba Cloud discount), all 6 tracks verbatim (`nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, `open`), 50/30/20 judging criteria + mandatory `Chat SDK`/`Chat UI` App Key pass/fail gate, all submission deliverables & validation regexes, and all official developer URLs & repositories.
3. **`d:\Hackathons\Nexconn\research\A-organisers.md`** (Feature F3):
   - Deep profile of **Reskilll** (how Reskilll hackathons operate, centralized portal, admin evaluator dashboard columns from `Admin-_pGkMjvW.js`, payout mechanics) and **Nexconn** (`RCLOUD GLOBAL PTE. LTD.` / RongCloud), leadership profiles (**Han Ying**, **Yang Pan**, **Cen Yu**, **Leo**, **Kai**, **Amy**), mandate, and hidden motives (global developer acquisition, Free Chat Plan adoption, AICP/A2A showcase, AI coding skill `nexconn-skills` adoption).
4. **`d:\Hackathons\Nexconn\research\B-sponsors.md`** (Feature F4):
   - Deep company research on **Nexconn**: 19-year Fetion (350M+ MAU) & RongCloud (250K+ apps, 500M+ users) engineering lineage, carrier-grade reliability philosophy (private binary TCP/QUIC protocol, 300+ node SD-CAN, 120ms latency, 99.99% uptime, 3-layer consistent hashing), AI-native mentality (**AICP** with `UserID` + `AgentID`), complete technical breakdown of **Chat SDK** (Direct, Group, Community, Open channels, `stream-message.md`, `expansion.md`, `group-channels/direct.md`, `builtin-translation`, Voice-to-Text, X3DH/Double Ratchet E2EE), **Chat UI**, **Call SDK**, **Server SDKs & Webhooks**, **Content Moderation**, **AI Mode**, **Lyra** (`lyrawork.com`), **`nexconn-skills` & `@nexconn/console-mcp`**, AWS/Alibaba Cloud co-sponsor perks, and explicit track-by-track leverage blueprints.
5. **`d:\Hackathons\Nexconn\research\C-judges.md`** (Feature F5):
   - Detailed analysis of Nexconn's judging panel ("Nexconn judges" & "Nexconn engineers": Product Director Leo, AI PM Kai, Solutions Engineer Amy, and IM/RTC SDK engineers), their 4-step evaluation workflow via Reskilll's Admin Portal (`Admin-_pGkMjvW.js`) + `console.nexconn.ai` App Key telemetry check, pet peeves, most likely questions, and the **3-Minute Judge Heat-Map**.
6. **`d:\Hackathons\Nexconn\research\D-why-now.md`** (Feature F6):
   - Why-now triggers for all 6 tracks across 5 dimensions (Indian & global policy/DPI, recent industry incidents/outages/scams, Jaishankar geopolitical lens, recurring historical failures, and Nexconn 2026 product/market triggers) in the required `Trigger → Evidence [source] → What the authors are actually worried about → What a winning answer must prove` format.
7. **`d:\Hackathons\Nexconn\research\E-competition.md`** (Feature F7):
   - Estimated participating team counts, predicted **80% default trap ideas** per track, prior art counts (GitHub repos, Kaggle datasets, startups), comprehensive catalog of **global hackathon winners** (ETHGlobal, Devpost, TreeHacks, Hack the North, DubHacks) and **2024–2026 research papers** (arXiv/ACM/IEEE) with concrete architectural mappings showing how each can be replicated/adapted using Nexconn's SDKs/primitives.
8. **`d:\Hackathons\Nexconn\research\F-connect-the-dots.md`** (Feature F8a):
   - Patrick Jane's synthesis session (with Jaishankar, Sharma, Thiel, Karp, Graham, and Munger) containing all 6 mandatory sections: (1) Real reason this hackathon exists, (2) What organisers secretly fear & want to announce afterwards, (3) Hidden evaluation criteria, (4) Landmines that annoy the jury, (5) **At least 7 connected dots** with dated evidence, and (6) The 80% trap across tracks.
9. **`d:\Hackathons\Nexconn\war-room\roster-additions.md`** (Feature F8b):
   - Full persona dossiers (`rise`, `how they decide`, `asks`, `attacks`, `voice`, `blind spot`) for the custom domain/sponsor seats added to the War-Room Council (including the **Nexconn AICP & SDK Chief Architect** seat plus gaming/live-stream and workplace/SRE domain specialists).

## Strict Rules
- Do NOT write to any files outside `d:\Hackathons\Nexconn\research\00-source\*`, `01-facts.md`, `A..F-*.md`, `war-room/roster-additions.md`, and your `.agents/teamwork/` folders.
- Zero `TODO` or `TBD` markers anywhere. Every factual claim must include a real URL link or `[S#]` citation.
- Follow the Project Pattern (Explorer → Worker → Reviewer → Challenger → Forensic Auditor → Gate) and report completion to `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message`.
