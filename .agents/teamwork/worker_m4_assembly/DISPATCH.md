## 2026-10-31T18:48:00Z

# Task Assignment: Milestone M4 Master Assembly & PDF Rendering Worker (`worker_m4_assembly`) — Domain Winnability Index, `biblehackathon.md`, `ideas.md`, `state.md`, `biblehackathon.pdf`, `ideas.pdf`

- **Your Identity**: `worker_m4_assembly`
- **Your Working Directory**: `d:\Hackathons\Nexconn\.agents\teamwork\worker_m4_assembly`
- **Parent Conversation ID**: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- **Authoritative User Request**: `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- **Domain Skill to Load**: `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` (and `references\output-templates.md`, `scripts\md2pdf.py`)

> **MANDATORY INTEGRITY WARNING**:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Reading
1. `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\Hackathons\Nexconn\PROJECT.md`
3. `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` and `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\output-templates.md`
4. All M1 Recon deliverables:
   - `d:\Hackathons\Nexconn\research\01-facts.md`
   - `d:\Hackathons\Nexconn\research\A-organisers.md`
   - `d:\Hackathons\Nexconn\research\B-sponsors.md`
   - `d:\Hackathons\Nexconn\research\C-judges.md`
   - `d:\Hackathons\Nexconn\research\D-why-now.md`
   - `d:\Hackathons\Nexconn\research\E-competition.md`
   - `d:\Hackathons\Nexconn\research\F-connect-the-dots.md`
   - `d:\Hackathons\Nexconn\war-room\roster-additions.md`
5. All M2 & M3 Domain Dossiers, War-Room Transcripts, and War-Room Ideas:
   - `d:\Hackathons\Nexconn\research\domains\nexconn-social.md`, `d:\Hackathons\Nexconn\war-room\nexconn-social.md` & `d:\Hackathons\Nexconn\war-room\nexconn-social-ideas.md`
   - `d:\Hackathons\Nexconn\research\domains\nexconn-gaming.md`, `d:\Hackathons\Nexconn\war-room\nexconn-gaming.md` & `d:\Hackathons\Nexconn\war-room\nexconn-gaming-ideas.md`
   - `d:\Hackathons\Nexconn\research\domains\nexconn-workplace.md`, `d:\Hackathons\Nexconn\war-room\nexconn-workplace.md` & `d:\Hackathons\Nexconn\war-room\nexconn-workplace-ideas.md`
   - `d:\Hackathons\Nexconn\research\domains\nexconn-support.md`, `d:\Hackathons\Nexconn\war-room\nexconn-support.md` & `d:\Hackathons\Nexconn\war-room\nexconn-support-ideas.md`
   - `d:\Hackathons\Nexconn\research\domains\nexconn-social-good.md`, `d:\Hackathons\Nexconn\war-room\nexconn-social-good.md` & `d:\Hackathons\Nexconn\war-room\nexconn-social-good-ideas.md`
   - `d:\Hackathons\Nexconn\research\domains\open-innovation.md`, `d:\Hackathons\Nexconn\war-room\open-innovation.md` & `d:\Hackathons\Nexconn\war-room\open-innovation-ideas.md`
6. E2E Test Suite Contracts (MUST inspect before assembling so all 189 tests pass):
   - `d:\Hackathons\Nexconn\TEST_INFRA.md`
   - `d:\Hackathons\Nexconn\TEST_READY.md`
   - `d:\Hackathons\Nexconn\tests\run_e2e_tests.py` (specifically inspect `run_tier1_tests` for `F15`/`F16`, `run_tier2_tests` for `F15`/`F16`, `run_tier3_tests`, and `run_tier4_tests`)

## Exclusive File Write Ownership (Features F15 & F16)
You own and MUST write/render the following 5 master deliverables under `d:\Hackathons\Nexconn\`:
1. **`d:\Hackathons\Nexconn\biblehackathon.md`**:
   - Complete, executive-grade Hackathon Intelligence Bible following `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\output-templates.md` (`biblehackathon.md` template) verbatim:
     - Title (`# Nexconn Build Challenge 2026 — Hackathon Bible`), metadata block, `## Executive Summary` (5 bullets + `Where to play`), `## Table of Contents`
     - `# Part 1 — The Hackathon at a Glance` (`1.1 Key facts`, `1.2 Evaluation criteria — stated vs effective`, `1.3 Submission checklist & disqualifiers`, `1.4 Listed resources, datasets, and tools`)
     - `# Part 2 — Who Is in the Room` (`2.1 Organisers`, `2.2 Sponsors & partners — and the free tech they want used` covering Nexconn's full philosophy, lineage, SD-CAN, AICP, Chat SDK, Chat UI, Call SDK, Streaming Messages, Message Expansion, Targeted Group Whispers, Built-in Translation, Voice-to-Text, Moderation, E2EE, `nexconn-skills`, Console MCP, Lyra, AWS & Alibaba Cloud perks, `2.3 Jury & mentors — profiles and pet peeves`, `2.4 The 3-minute judge heat-map`)
     - `# Part 3 — Why This Hackathon Exists Now` (`3.1 The trigger map`, `3.2 The geopolitical & regulatory frame (Jaishankar + Sharma lens)`, `3.3 What the organisers secretly fear — and what they want to announce`)
     - `# Part 4 — Connecting the Dots (Patrick Jane's synthesis)` (`4.1 Ten things nobody else will notice` with dated evidence and explicit `HUNCH:` labels, `4.2 The unwritten rubric`, `4.3 Traps that will kill 80% of teams`, `4.4 The sweet spot`)
     - `# Part 5 — Domain Landscape & Winnability Ranking` (`5.1 Domain comparison table` using the 5-factor Domain Winnability Index `0.25*(10-Comp) + 0.20*(10-Sat) + 0.20*Demo + 0.20*Align + 0.15*Feas`, `5.2 Per-domain deep-dives` for all 6 tracks covering Pain map, Urgency, Prior art landscape including startups/GitHub repos/2024–2026 research papers/global hackathon winners, 3-bucket gaps, Why previous attempts failed, Data/APIs/Nexconn SDK rails, and The 80% trap in this domain, `5.3 Council recommendation — where to play` with #1 Pick and Dark Horse Pick)
     - `# Part 6 — The War-Room Council Roster` (`6.1 Core council`, `6.2 Domain & sponsor bench for this hackathon`)
     - `# Sources` (Numbered markdown link list of all cited URLs).
2. **`d:\Hackathons\Nexconn\ideas.md`**:
   - Complete War-Room Ideas & Where-to-Play Strategy document following `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\output-templates.md` (`ideas.md` template) verbatim:
     - Title (`# Nexconn Build Challenge 2026 — War-Room Ideas`), metadata block (`Domains covered: 6 · Total shortlisted ideas: 30 (5 per domain)`), `## How to read this document`
     - `# Part 0 — Where to Play` (`## Domain Winnability Ranking` table across all 6 tracks, `## Our Recommendation` with **#1 Winning Track & Idea** + **Dark Horse Pick**, `## All Ideas at a Glance` table listing all **30 ideas** across the 6 tracks with Domain, Rank, Idea Name, Type, Score, and One-line hook)
     - All **6 Domain Sections** ordered by Winnability Rank (#1 highest to #6 lowest), integrating the full 5 ideas per domain from `war-room/<slug>-ideas.md` (**30 detailed ideas total**), ensuring every idea has all required fields, exact 9-criterion score math (`0.15*(pain+novelty+alignment+demo) + 0.10*(feasibility+India+business) + 0.05*(legal+moonshot)`), explicit Nexconn SDK primitive mappings, global hackathon winner / research paper citations, and zero raw war-room dialogue turns (`**THIEL:**`, etc.).
     - `# Sources` (Numbered markdown link list of all cited URLs).
3. **`d:\Hackathons\Nexconn\state.md`**:
   - Complete project state index (`Hackathon metadata`, `Approved Council Roster table` with all 22 seats, `All 6 Canonical Tracks table`, `Domain Winnability Index Ranking table`, `#1 Winning Track & Idea + Dark Horse summary`, `Complete 30-Idea Registry`, and `Deliverable & Verification Artifact Checklist`).
4. **`d:\Hackathons\Nexconn\biblehackathon.pdf`** and **`d:\Hackathons\Nexconn\ideas.pdf`**:
   - Render both PDFs using `md2pdf.py`:
     ```powershell
     python "C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py" "d:\Hackathons\Nexconn\biblehackathon.md" --subtitle "Nexconn Build Challenge · 2026"
     python "C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py" "d:\Hackathons\Nexconn\ideas.md" --subtitle "Nexconn Build Challenge · Top Ideas by Domain"
     ```
5. **Run E2E Test Suite Verification**:
   - Once `TEST_READY.md` and `tests/run_e2e_tests.py` are present, run:
     ```powershell
     python "d:\Hackathons\Nexconn\tests\run_e2e_tests.py"
     ```
   - Fix any formatting, schema, math, or missing citation issues until `run_e2e_tests.py` passes 100% (exit code `0`), and re-render PDFs if `biblehackathon.md` or `ideas.md` were updated.

## Verification Requirements
- Document all verification outputs (`md2pdf.py` output, PDF byte sizes and page counts, and `run_e2e_tests.py` output) in `d:\Hackathons\Nexconn\.agents\teamwork\worker_m4_assembly\handoff.md` and notify `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message`.


## 2026-10-31T19:38:57Z

You are `worker_m4_assembly` (Role: Milestone M4 Master Assembly, Winnability & PDF Rendering Worker).
Your working directory is `d:\Hackathons\Nexconn\.agents\teamwork\worker_m4_assembly`.
Your parent orchestrator is `teamwork_orchestrator_main` with Conversation ID `ce650322-b861-45dd-a12e-c7d3a6871eb0`.

### Mandatory First Steps:
1. Read `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (mandatory before starting work).
2. Read `d:\Hackathons\Nexconn\.agents\teamwork\worker_m4_assembly\DISPATCH.md` and `d:\Hackathons\Nexconn\PROJECT.md`.
3. Read `d:\Hackathons\Nexconn\TEST_INFRA.md`, `d:\Hackathons\Nexconn\TEST_READY.md`, and inspect `d:\Hackathons\Nexconn\tests\run_e2e_tests.py` (especially the assertions for `F15`, `F16`, `Tier 3`, and `Tier 4`) so your generated files satisfy 100% of the 189 E2E tests.
4. Load the `war-room-council` skill at `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` and read `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\output-templates.md`.
5. Initialize `BRIEFING.md` and `progress.md` in `d:\Hackathons\Nexconn\.agents\teamwork\worker_m4_assembly`.

### Exclusive File Write Ownership (Milestone M4 — Features F15 & F16):
Write and verify the following 5 master deliverables at the root of `d:\Hackathons\Nexconn\`:
1. `d:\Hackathons\Nexconn\biblehackathon.md`
2. `d:\Hackathons\Nexconn\ideas.md`
3. `d:\Hackathons\Nexconn\state.md`
4. `d:\Hackathons\Nexconn\biblehackathon.pdf` and `d:\Hackathons\Nexconn\ideas.pdf`
5. Run Full E2E Test Suite (`189` tests across Tiers 1–4) until 189/189 tests PASS with exit code 0.
