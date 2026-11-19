## 2026-10-31T18:28:00Z

# Task Assignment: Milestone M1 Implementation Worker (`worker_m1_recon`) — Phase 1 Recon & Phase 3 Connect-the-Dots Deliverables

- **Your Identity**: `worker_m1_recon`
- **Your Working Directory**: `d:\Hackathons\Nexconn\.agents\teamwork\worker_m1_recon`
- **Parent Conversation ID**: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- **Authoritative User Request**: `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- **Domain Skill to Load**: `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` (and `references\recon-playbook.md`, `references\council-roster.md`, `references\law-checklist.md`, `references\output-templates.md`)

> **MANDATORY INTEGRITY WARNING**:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Reading
1. `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\Hackathons\Nexconn\PROJECT.md`
3. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md`
4. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`
5. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md`
6. `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` and `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\recon-playbook.md`

## Exclusive File Write Ownership (Features F1–F8)
You own and MUST write the following files under `d:\Hackathons\Nexconn\`:
1. **`d:\Hackathons\Nexconn\research\00-source\reskilll-nexconn-portal.md`**:
   - Complete verbatim archive of the extracted `https://reskilll.com/hack/nexconn/` SPA copy, JS bundle constants (`st`, `xt`, `hS`, `Fp`, `fS`, `pS`, `tS`, `Vx`, `mS`, `Jx`, `Wx`, `Xx`, `gS`, `gu`, `Kx`, `sS`, `vS`, `xS`, `Yx`, `Gx`, `Zx`, `yS`, `nn`), and Admin Portal schema (`Admin-_pGkMjvW.js`).
2. **`d:\Hackathons\Nexconn\research\00-source\nexconn-docs-and-skills.md`**:
   - Complete archive of official Nexconn platform endpoints (`https://www.nexconn.ai/`, `https://docs.nexconn.ai/llms.txt`), all 9 `NexconnAI-Dev` GitHub repositories, `nexconn-skills`, and `@nexconn/console-mcp`.
3. **`d:\Hackathons\Nexconn\research\01-facts.md`** (Feature F2):
   - All 9 mandatory subsections from `recon-playbook.md § 1`: Name/edition/dates/rounds, Format, Eligibility & team size (`CN` exclusion, 1–4 members), Prizes ($5,000 cash across 5 winners + $20,640 2-year Free Chat Plan + 15% AWS / 30% Alibaba Cloud discount), Evaluation/judging criteria (50% Completeness & UX, 30% Innovation & Scenario Value, 20% Business & Growth Potential + mandatory `Chat SDK`/`Chat UI` App Key pass/fail gate + activeUsers/tractionUrl bonus), Submission requirements & form validation rules, All 6 tracks (`01 Social & Community`, `02 Gaming & Live Streams`, `03 Workplace & Collaboration`, `04 Marketplace & Support`, `05 Humanitarian & Social Good`, `06 Open Innovation`), Every track/problem statement verbatim with sample builds, and All listed resources, SDKs, sponsors, organisers, and support channels.
4. **`d:\Hackathons\Nexconn\research\A-organisers.md`** (Feature F3):
   - Deep investigation of **Reskilll** (platform mechanics, evaluator workflow in `Admin-_pGkMjvW.js`, payout role) and **Nexconn** (`RCLOUD GLOBAL PTE. LTD.` Singapore / **RongCloud** 融云), 19-year Fetion (350M+ MAU) lineage, executive leadership (**Han Ying**, **Yang Pan**, **Cen Yu**) and international leadership (**Leo**, **Kai**, **Amy**), hidden motives (global developer acquisition outside China, Free Chat Plan adoption, AICP/A2A showcase, `nexconn-skills` adoption), and past Reskilll hackathon patterns.
5. **`d:\Hackathons\Nexconn\research\B-sponsors.md`** (Feature F4):
   - Exhaustive company and technical dossier on **Nexconn**: engineering philosophy (carrier-grade weak-network resilience + AI-native AICP), proprietary binary TCP/QUIC transport protocol, 300+ node SD-CAN (120ms latency, 99.99% uptime, 100% delivery), 3-layer consistent hashing for Open Channels, X3DH/Double Ratchet E2EE, AICP (`UserID` + `AgentID`), complete feature breakdown of **Chat SDK** (Direct, Group, Community, Open channels, `stream-message.md`, `expansion.md`, `group-channels/direct.md`, `builtin-translation`, Voice-to-Text), **Chat UI**, **Call SDK**, **Server SDKs & Webhooks** (pre-send, post-sync, online status), **Content Moderation (`<100ms`)**, **AI Mode**, **Lyra (`lyrawork.com`)**, **`nexconn-skills` & `@nexconn/console-mcp`**, AWS & Alibaba Cloud perks, marquee customers (**HoYoLAB, Bondee, Jaco, Falla, Blockman Go, Miniso, DeBox, Saudi Beem, JioChat, Lenovo, Epson**), and explicit track-by-track leverage blueprints.
6. **`d:\Hackathons\Nexconn\research\C-judges.md`** (Feature F5):
   - Detailed profile of the Nexconn judging panel ("Nexconn judges" & "Nexconn engineers" — Product Director Leo, AI PM Kai, Solutions Engineer Amy, and core IM/RTC SDK engineers), the 4-step evaluation pipeline via Reskilll's Admin Portal (`Admin-_pGkMjvW.js`) + `console.nexconn.ai` App Key telemetry verification, judge psychology, pet peeves, most likely questions, and the **3-Minute Judge Heat-Map**.
7. **`d:\Hackathons\Nexconn\research\D-why-now.md`** (Feature F6):
   - Why-now triggers for all 6 tracks across all 5 dimensions (Indian & global policy/DPI, recent incidents/outages/scams, Jaishankar geopolitical lens, recurring historical failures, and Nexconn 2026 strategic triggers) formatted strictly as:
     `Trigger → Evidence [source] → What the authors are actually worried about → What a winning answer must prove`.
8. **`d:\Hackathons\Nexconn\research\E-competition.md`** (Feature F7):
   - Participating team count forecast, the **80% default trap** for each of the 6 tracks, prior art counts (GitHub repos, Kaggle datasets, startups), and a comprehensive catalog of **global hackathon winners** (ETHGlobal, Devpost, TreeHacks, Hack the North, DubHacks) and **2024–2026 research papers** (arXiv/ACM/IEEE) with concrete architectural mappings showing how each is adapted using Nexconn's SDKs/primitives.
9. **`d:\Hackathons\Nexconn\research\F-connect-the-dots.md`** (Feature F8a):
   - Patrick Jane's synthesis session (chaired by Patrick Jane with S. Jaishankar, Dr. R.S. Sharma, Peter Thiel, Alex Karp, Paul Graham, and Charlie Munger) containing all 6 mandatory sections from `recon-playbook.md § 3`:
     1. The real reason this hackathon exists
     2. What the organisers secretly fear & what they would love to announce afterwards
     3. Hidden evaluation criteria
     4. Landmines (topics, claims, or tech that will annoy this jury)
     5. **Dots nobody else will connect (at least 10 connected dots, each with dated evidence & URLs)**
     6. The 80% trap across all 6 tracks
10. **`d:\Hackathons\Nexconn\war-room\roster-additions.md`** (Feature F8b):
    - Full persona dossiers (`rise`, `how they decide`, `asks`, `attacks`, `voice`, `blind spot`) for the custom domain & sponsor seats added to the War-Room Council:
      1. **Kai / Yang Pan Composite — Nexconn AICP & SDK Chief Architect** (Sponsor-Tech Expert seat required by `war-room-council/SKILL.md` Line 74)
      2. **Justin Lin / Emmett Shear Composite — Live Streaming, Danmaku & Gaming Real-Time Architect** (for Track 02 `nexconn-gaming` & Track 01 `nexconn-social`)
      3. **Charity Majors / Kelsey Hightower Composite — Incident Response, SRE & Workplace Shift-Handover Lead** (for Track 03 `nexconn-workplace`)
      4. **Habermann / Accessibility Assistive Tech Specialist** (supporting Track 05 `nexconn-social-good`)

## Verification Requirements
- Verify every created file exists, is non-empty, contains zero `TODO` or `TBD` markers, and has real URL citations.
- Document your verification commands and outputs in `d:\Hackathons\Nexconn\.agents\teamwork\worker_m1_recon\handoff.md` and notify `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message`.


## 2026-10-31T18:32:36Z

You are `worker_m1_recon` (TypeName: `teamwork_worker`).
Your working directory is `d:\Hackathons\Nexconn\.agents\teamwork\worker_m1_recon`.
Your parent orchestrator Conversation ID is `ce650322-b861-45dd-a12e-c7d3a6871eb0`.
Domain Skill to load: `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` (and `references\recon-playbook.md`, `references\council-roster.md`, `references\output-templates.md`).

> **MANDATORY INTEGRITY WARNING**:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` and `d:\Hackathons\Nexconn\.agents\teamwork\worker_m1_recon\DISPATCH.md` before starting work.
Also read:
- `d:\Hackathons\Nexconn\PROJECT.md`
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md`
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md`
- `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` and `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\recon-playbook.md`

EXCLUSIVE FILE WRITE OWNERSHIP (Features F1-F8):
Write the following 10 comprehensive, evidence-backed files under `d:\Hackathons\Nexconn\` (with zero `TODO` or `TBD` markers, real URLs, and full adherence to `recon-playbook.md`):
1. `d:\Hackathons\Nexconn\research\00-source\reskilll-nexconn-portal.md`
2. `d:\Hackathons\Nexconn\research\00-source\nexconn-docs-and-skills.md`
3. `d:\Hackathons\Nexconn\research\01-facts.md`
4. `d:\Hackathons\Nexconn\research\A-organisers.md`
5. `d:\Hackathons\Nexconn\research\B-sponsors.md`
6. `d:\Hackathons\Nexconn\research\C-judges.md`
7. `d:\Hackathons\Nexconn\research\D-why-now.md`
8. `d:\Hackathons\Nexconn\research\E-competition.md`
9. `d:\Hackathons\Nexconn\research\F-connect-the-dots.md`
10. `d:\Hackathons\Nexconn\war-room\roster-additions.md`

Do NOT touch any other project files outside this list and your `.agents/teamwork/worker_m1_recon` folder. Run verification checks confirming all 10 files exist, are non-empty, and have zero `TODO`/`TBD` tokens, document results in `d:\Hackathons\Nexconn\.agents\teamwork\worker_m1_recon\handoff.md`, and notify `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message`.
