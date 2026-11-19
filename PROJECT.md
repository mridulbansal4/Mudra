# Project: Nexconn Build Challenge 2026 — War-Room Council Research & Winning Strategy (`nexconn2026`)

## Architecture
- **Overview**: End-to-end multi-agent intelligence, company/SDK analysis, global benchmark synthesis, and 6-track War-Room Council ideation & ranking system for the **Nexconn Build Challenge 2026** (`https://reskilll.com/hack/nexconn/`), adhering strictly to `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` and `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md`.
- **Module Boundaries**:
  1. **Recon & Connect-the-Dots Layer (`research/00-source/`, `research/01-facts.md`, `research/A..F`, `war-room/roster-additions.md`)**: Extracts ground-truth hackathon specifications from `https://reskilll.com/hack/nexconn/` and its JS bundles, profiles Reskilll & Nexconn (`RCLOUD GLOBAL PTE. LTD.` / RongCloud), maps all Nexconn SDKs/APIs/primitives (`Chat SDK`, `Chat UI`, `Call SDK`, `AICP`, `A2A`, `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels/metadata`, `moderation`, `e2ee`, `nexconn-skills`, `@nexconn/console-mcp`), analyzes judges and why-now triggers, catalogs global hackathon winners and 2024–2026 research papers, and runs Patrick Jane's Connect-the-Dots synthesis.
  2. **Track Domain Research & War-Room Council Layer (`research/domains/<slug>.md`, `war-room/<slug>.md`, `war-room/<slug>-ideas.md`)**: Executes deep 7-part domain research and 6-round multi-persona War-Room Council debates (11 Core + 6 Extra + Domain Bench + Nexconn AICP/SDK Expert) across all 6 tracks (`nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, `open-innovation`), producing 5 scored, vetted, feasible real-world project ideas per track (**30 ideas total**).
  3. **Winnability, Master Assembly & PDF Rendering Layer (`biblehackathon.md`, `biblehackathon.pdf`, `ideas.md`, `ideas.pdf`, `state.md`)**: Computes the 5-factor Domain Winnability Index across all 6 tracks, selects the #1 winning track and idea (plus dark horse), assembles `biblehackathon.md` and `ideas.md` per `output-templates.md`, updates `state.md`, and renders `biblehackathon.pdf` and `ideas.pdf` via `md2pdf.py`.
  4. **E2E Verification & Hardening Layer (`TEST_INFRA.md`, `TEST_READY.md`, `tests/`)**: Automated opaque-box (Tiers 1–4) and white-box adversarial (Tier 5) verification suite checking file existence, PDF validity, structural schema compliance, zero placeholder markers (`TODO`/`TBD`), source link validity, rubric math accuracy, and content completeness.

## Feature Inventory
Every feature from the Survey phase appears below with its assigned milestone. No feature is left unassigned.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Raw Source & Bundle Archival (`research/00-source/*`) | Archival of raw scraped/extracted hackathon copy, JS bundle constants, rules, and Nexconn documentation/skill summaries | M1 | survey |
| F2 | Canonical Hackathon Facts (`research/01-facts.md`) | Verbatim title, timeline, eligibility (`CN` exclusion), team size (1–4), $5,000 cash + $20,640 Free Chat Plan + cloud perks, all 6 tracks, 50/30/20 judging criteria + App Key pass/fail gate, submission form schema, and resources | M1 | survey |
| F3 | Recon Track A: Organisers & Reskilll Operations (`research/A-organisers.md`) | Deep profile of Reskilll (portal + admin evaluation table from `Admin-_pGkMjvW.js`) and Nexconn (`RCLOUD GLOBAL PTE. LTD.` / RongCloud), leadership (Han Ying, Yang Pan, Cen Yu, Leo, Kai, Amy), mandate, and hidden motives | M1 | survey |
| F4 | Recon Track B: Deep Nexconn Company, Philosophy & SDK Profile (`research/B-sponsors.md`) | 19-year Fetion/RongCloud lineage, carrier-grade & AI-native philosophy, SD-CAN, AICP (`UserID` + `AgentID`), Chat SDK, Chat UI, Call SDK, Streaming Messages, Message Expansion, Targeted Group Whispers, Built-in Translation, Voice-to-Text, E2EE, Moderation, AI Mode, `nexconn-skills`, Console MCP, Lyra, and track leverage blueprints | M1 | survey |
| F5 | Recon Track C: Judges, Evaluator Workflow & Heat-Map (`research/C-judges.md`) | Nexconn engineering/product evaluator profiles, Reskilll admin review workflow, App Key console telemetry verification, pet peeves, and 3-minute Judge Heat-Map | M1 | survey |
| F6 | Recon Track D: Why-Now Triggers (`research/D-why-now.md`) | Policy, incident, geopolitical (Jaishankar lens), historical, and sponsor/industry triggers across all 6 tracks in `Trigger -> Evidence -> Worry -> Proof` format | M1 | survey |
| F7 | Recon Track E: Competition Forecast, 80% Trap & Global Benchmark Catalog (`research/E-competition.md`) | Participating team estimates, 80% default traps per track, GitHub/startup/dataset prior art counts, global hackathon winners (ETHGlobal, Devpost, TreeHacks, Hack the North, DubHacks), and 2024–2026 arXiv research papers mapped to Nexconn tools | M1 | survey |
| F8 | Connect-the-Dots Synthesis (`research/F-connect-the-dots.md`) & Roster Additions (`war-room/roster-additions.md`) | Patrick Jane's 6-section synthesis (real reason, secret fears/hopes, hidden criteria, landmines, 7+ connected dots, 80% trap) and dossiers for custom Nexconn SDK/AICP & domain experts | M1 | survey |
| F9 | Track 01 (`nexconn-social`) Domain Dossier, War-Room Debate & Top 5 Ideas | `research/domains/nexconn-social.md` (7 sections), `war-room/nexconn-social.md` (Rounds 0–5), and `war-room/nexconn-social-ideas.md` (Top 5 scored ideas for Social & Community) | M2 | survey |
| F10 | Track 02 (`nexconn-gaming`) Domain Dossier, War-Room Debate & Top 5 Ideas | `research/domains/nexconn-gaming.md` (7 sections), `war-room/nexconn-gaming.md` (Rounds 0–5), and `war-room/nexconn-gaming-ideas.md` (Top 5 scored ideas for Gaming & Live Streams) | M2 | survey |
| F11 | Track 03 (`nexconn-workplace`) Domain Dossier, War-Room Debate & Top 5 Ideas | `research/domains/nexconn-workplace.md` (7 sections), `war-room/nexconn-workplace.md` (Rounds 0–5), and `war-room/nexconn-workplace-ideas.md` (Top 5 scored ideas for Workplace & Collaboration) | M2 | survey |
| F12 | Track 04 (`nexconn-support`) Domain Dossier, War-Room Debate & Top 5 Ideas | `research/domains/nexconn-support.md` (7 sections), `war-room/nexconn-support.md` (Rounds 0–5), and `war-room/nexconn-support-ideas.md` (Top 5 scored ideas for Marketplace & Support) | M3 | survey |
| F13 | Track 05 (`nexconn-social-good`) Domain Dossier, War-Room Debate & Top 5 Ideas | `research/domains/nexconn-social-good.md` (7 sections), `war-room/nexconn-social-good.md` (Rounds 0–5), and `war-room/nexconn-social-good-ideas.md` (Top 5 scored ideas for Humanitarian & Social Good) | M3 | survey |
| F14 | Track 06 (`open-innovation`) Domain Dossier, War-Room Debate & Top 5 Ideas | `research/domains/open-innovation.md` (7 sections), `war-room/open-innovation.md` (Rounds 0–5), and `war-room/open-innovation-ideas.md` (Top 5 scored ideas for Open Innovation) | M3 | survey |
| F15 | Master Hackathon Bible (`biblehackathon.md` & `biblehackathon.pdf`) | Complete 6-Part + `# Sources` Hackathon Bible integrating R1–R4, rendered to valid A4 PDF via `md2pdf.py` | M4 | survey |
| F16 | Master Ideas & Winning Selection (`ideas.md`, `ideas.pdf`, `state.md`) | Complete `Part 0 — Where to Play` (5-factor Domain Winnability ranking, #1 winning track & idea recommendation + dark horse, 30-idea overview table) + 30 detailed ideas across all 6 tracks + `# Sources`, rendered to `ideas.pdf` and summarized in `state.md` | M4 | survey |
| F17 | Final E2E Verification & Tier 5 Adversarial Hardening | Pass 100% of E2E tests (Tiers 1–4) from `TEST_READY.md` and complete Tier 5 white-box adversarial coverage hardening | M5 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Recon & Connect-the-Dots (`worker_m1_recon`) | F1–F8: Create `research/00-source/*`, `research/01-facts.md`, `research/A-organisers.md`, `research/B-sponsors.md`, `research/C-judges.md`, `research/D-why-now.md`, `research/E-competition.md`, `research/F-connect-the-dots.md`, and `war-room/roster-additions.md` | none | DONE (10 files, 157,751 bytes, 342 URLs, 0 placeholders) |
| M2 | Tracks 01–03 Domain Research & War-Room (`worker_m2_tracks_1_2`, `worker_m2_tracks_3_4`) | F9–F11: Create `research/domains/<slug>.md`, `war-room/<slug>.md`, and `war-room/<slug>-ideas.md` for `nexconn-social`, `nexconn-gaming`, and `nexconn-workplace` (5 ideas per track = 15 ideas) | none | DONE (9 files, >366 KB, 15 scored ideas, 100% E2E Tier 1 & Tier 2 pass) |
| M3 | Tracks 04–06 Domain Research & War-Room (`worker_m2_tracks_3_4`, `worker_m3_tracks_5_6`) | F12–F14: Create `research/domains/<slug>.md`, `war-room/<slug>.md`, and `war-room/<slug>-ideas.md` for `nexconn-support`, `nexconn-social-good`, and `open-innovation` (5 ideas per track = 15 ideas) | none | DONE (9 files, >388 KB, 15 scored ideas, 100% E2E Tier 1 & Tier 2 pass across F1–F14, 30/30 unique idea titles) |
| M4 | Master Assembly, Winnability & PDF Rendering (`worker_m4_assembly`) | F15–F16: Compute Domain Winnability Index across all 6 tracks, select #1 winning track & idea + dark horse, assemble `biblehackathon.md`, `ideas.md`, and `state.md`, and render `biblehackathon.pdf` and `ideas.pdf` via `md2pdf.py` | M1, M2, M3 | DONE (`biblehackathon.md/.pdf`, `ideas.md/.pdf`, `state.md`, 189/189 E2E pass) |
| M5 | Final E2E Pass & Tier 5 Adversarial Hardening (`reviewer_m5_1..2`, `challenger_m5_1..2`, `auditor_m5_1`) | F17: Pass 100% of E2E test suite (`TEST_READY.md` Tiers 1–4) and execute Tier 5 white-box adversarial coverage hardening + forensic audit | M4, E2E_TRACK | DONE (Gate Result: PASS — 2/2 Reviewers APPROVE, 2/2 Challengers APPROVE, 1/1 Auditor CLEAN, 189/189 E2E + 6/6 self-test pass) |
| E2E_TRACK | E2E Testing Track (`test_writer_e2e`) | Design and build `TEST_INFRA.md`, automated verification runner & test cases (`tests/` covering Tiers 1–4), and publish `TEST_READY.md` | none | DONE (`TEST_INFRA.md`, `tests/run_e2e_tests.py` 189+6 tests, `TEST_READY.md` published) |

## Interface Contracts

### Survey Reports ↔ M1, M2, M3, E2E_TRACK
- **Inputs**:
  - `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md` (Full `war-room-council` & `md2pdf.py` spec)
  - `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md` (Verbatim `https://reskilll.com/hack/nexconn/` bundle extraction)
  - `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md` (Deep Nexconn company/SDK profile + global hackathon winners + 2024–2026 arXiv papers)

###Canonical Domain Slugs (`<slug>`) Across M2, M3, M4, and E2E_TRACK
All agents MUST use these exact 6 canonical domain slugs for filenames under `research/domains/` and `war-room/`:
1. `nexconn-social` — Track 01: Social & Community (`"Group messaging and topic-based channels"`)
2. `nexconn-gaming` — Track 02: Gaming & Live Streams (`"Squad chat and live stream interactive chatroom"`)
3. `nexconn-workplace` — Track 03: Workplace & Collaboration (`"Direct messaging and team project threads"`)
4. `nexconn-support` — Track 04: Marketplace & Support (`"Buyer-seller chat and customer service"`)
5. `nexconn-social-good` — Track 05: Humanitarian & Social Good (`"Accessible text chat for seniors and communities"`)
6. `open-innovation` — Track 06: Open Innovation (`"Any interactive chat idea"`, track ID `open`)

### M2 & M3 (`war-room/<slug>-ideas.md`) ↔ M4 (`ideas.md` Assembly)
Each `war-room/<slug>-ideas.md` file MUST start with `# <Track Number & Name>` (H1) followed by `## Domain snapshot` (H2) and `## Idea 1 — <Name>: <one-liner>` through `## Idea 5 — <Name>: <one-liner>` (H2), containing all required fields from `output-templates.md`:
- `**Type:** ... **Score:** X.X/10 **Problem statement:** <Track ID & Name>`
- `**The pain (Mike Ross):**`
- `**Why now:**`
- `**The gap others miss (Jane / Thiel):**`
- `**What exists and why it falls short:**` (Markdown table citing real products, GitHub repos, global hackathon winners, and research papers with URLs)
- `**How it works:**` (4–7 bullet flow explicitly detailing Nexconn SDK/UI/Call/AICP/Webhook primitives used)
- `**The demo moment (Jobs):**` (First 45 seconds)
- `**30-second explanation (Karp):**`
- `**Council jurisdiction (short verdicts, only seats that matter for this idea):**` (Markdown table covering Thiel, Buffett, Harvey/Sharma, Jaishankar, Karpathy, Mike Ross, Munger, Musk, Domain Lead, Godin/Gary Vee, Jony Ive)
- `**Tech stack (basic):**` (Frontend · Backend · AI/ML · Data · India/Global rails · Infra · Sponsor/Nexconn tech used)
- `**Implementation sketch:**` (H0–6, H6–18, H18–30, H30–36, real vs mocked, datasets with links)
- `**Score breakdown:**` (`pain x · novelty x · alignment x · demo x · feasibility x · India x · business x · legal x · moonshot x` matching the weighted total `0.15*(pain+novelty+alignment+demo) + 0.10*(feasibility+India+business) + 0.05*(legal+moonshot)`)
- Source list at the bottom so M4 can merge all sources cleanly into `# Sources`.
- **Strict Rule**: No raw war-room dialogue (`**THIEL:**`) inside `<slug>-ideas.md`; raw dialogue belongs exclusively in `war-room/<slug>.md`.

### M1, M2, M3 ↔ M4 (`biblehackathon.md`, `ideas.md`, `state.md`, PDFs)
- M4 reads all files from M1 (`research/01-facts.md`, `research/A..F`, `war-room/roster-additions.md`), M2, and M3 to compute the 5-factor Domain Winnability Index:
  $$\text{Winnability} = 0.25(\text{CompInv}) + 0.20(\text{SatInv} + \text{Demo} + \text{Align}) + 0.15(\text{Feas})$$
- M4 orders the 6 domain sections in `ideas.md` from highest Winnability score (#1) to lowest (#6), populates `Part 0 — Where to Play` (including the single best winning track and idea + dark horse pick), assembles `biblehackathon.md` (Parts 1–6 + `# Sources`), writes `state.md`, and runs `md2pdf.py` to produce `biblehackathon.pdf` and `ideas.pdf`.

## Code Layout & Strict Write Ownership
To prevent concurrent write collisions across parallel milestones:

```text
d:\Hackathons\Nexconn\
├── PROJECT.md                                    # Owned by: teamwork_orchestrator_main
├── state.md                                      # Owned by: M4 (and M5 for fixes)
├── biblehackathon.md                             # Owned by: M4 (and M5 for fixes)
├── biblehackathon.pdf                            # Owned by: M4 (and M5 for fixes)
├── ideas.md                                      # Owned by: M4 (and M5 for fixes)
├── ideas.pdf                                     # Owned by: M4 (and M5 for fixes)
├── TEST_INFRA.md                                 # Owned by: E2E_TRACK
├── TEST_READY.md                                 # Owned by: E2E_TRACK
├── tests\                                        # Owned by: E2E_TRACK (and M5 Phase 2 for Tier 5 tests)
│   └── run_e2e_tests.py
├── research\
│   ├── 00-source\                                # Owned by: M1
│   ├── 01-facts.md                               # Owned by: M1
│   ├── A-organisers.md                           # Owned by: M1
│   ├── B-sponsors.md                             # Owned by: M1
│   ├── C-judges.md                               # Owned by: M1
│   ├── D-why-now.md                              # Owned by: M1
│   ├── E-competition.md                          # Owned by: M1
│   ├── F-connect-the-dots.md                     # Owned by: M1
│   └── domains\
│       ├── nexconn-social.md                     # Owned by: M2
│       ├── nexconn-gaming.md                     # Owned by: M2
│       ├── nexconn-workplace.md                  # Owned by: M2
│       ├── nexconn-support.md                    # Owned by: M3
│       ├── nexconn-social-good.md                # Owned by: M3
│       └── open-innovation.md                    # Owned by: M3
└── war-room\
    ├── roster-additions.md                       # Owned by: M1
    ├── nexconn-social.md                         # Owned by: M2
    ├── nexconn-social-ideas.md                   # Owned by: M2
    ├── nexconn-gaming.md                         # Owned by: M2
    ├── nexconn-gaming-ideas.md                   # Owned by: M2
    ├── nexconn-workplace.md                      # Owned by: M2
    ├── nexconn-workplace-ideas.md                # Owned by: M2
    ├── nexconn-support.md                        # Owned by: M3
    ├── nexconn-support-ideas.md                  # Owned by: M3
    ├── nexconn-social-good.md                    # Owned by: M3
    ├── nexconn-social-good-ideas.md              # Owned by: M3
    ├── open-innovation.md                        # Owned by: M3
    └── open-innovation-ideas.md                  # Owned by: M3
```
