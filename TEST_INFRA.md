# Test Infrastructure Specification - Nexconn Build Challenge 2026 (`nexconn2026`)

## 1. Test Philosophy

1. **Authoritative Ground-Truth Oracle**:
   Every test case derives its expected values strictly from:
   - `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (R1–R4 and Acceptance Criteria)
   - `d:\Hackathons\Nexconn\PROJECT.md` (Feature Inventory F1–F16, Canonical Domain Slugs, and Interface Contracts)
   - `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` and `references/{output-templates.md,war-room-protocol.md,council-roster.md,recon-playbook.md,law-checklist.md}`
   - Primary source extraction from `https://reskilll.com/hack/nexconn/` JS bundles (`index-BVD-GoH1.js`, `Rules-DQNF0983.js`, `Submit-R3OJNUmD.js`, `Admin-_pGkMjvW.js`) and `https://docs.nexconn.ai/llms.txt`.

2. **Opaque-Box & Structural/Mathematical Determinism**:
   - Tests inspect the observable deliverables in `d:\Hackathons\Nexconn\` (`research/*`, `war-room/*`, `biblehackathon.md`, `biblehackathon.pdf`, `ideas.md`, `ideas.pdf`, `state.md`) without relying on agent internals.
   - All rubric calculations - both the **9-Criterion Idea Weighted Score** ($0.15(\text{pain}+\text{novelty}+\text{alignment}+\text{demo}) + 0.10(\text{feasibility}+\text{India}+\text{business}) + 0.05(\text{legal}+\text{moonshot})$) and the **5-Factor Domain Winnability Index** ($0.25(\text{CompInv}) + 0.20(\text{SatInv}+\text{Demo}+\text{Align}) + 0.15(\text{Feas})$) - are independently parsed and mathematically verified.
   - Rendered PDF deliverables (`biblehackathon.pdf` and `ideas.pdf`) are validated for binary header integrity (`%PDF-`), minimum file size (`> 10,000` bytes), and multi-page readability (`>= 5` pages) via `pypdf`.

3. **Self-Testing Harness (`--self-test`)**:
   - Because the E2E test suite runs in parallel with deliverable generation milestones (M1–M4), `d:\Hackathons\Nexconn\tests\run_e2e_tests.py --self-test` builds an isolated temporary workspace with synthetic valid fixtures (verifying 100% pass across Tiers 1–4) and mutated invalid fixtures (verifying deterministic detection of `TODO`/`TBD` markers, raw `**THIEL:**` dialogue leaks, corrupted rubric math, missing template fields, and malformed PDFs).

---

## 2. Feature Inventory (F1–F16)

| Feature ID | Feature Name | Target Artifact(s) | Authoritative Oracle | Tier 1 Tests | Tier 2 Tests |
|---|---|---|---|---|---|
| **F1** | Raw Source & Bundle Archival | `research/00-source/*` | `PROJECT.md` F1, `recon-playbook.md` §1 | `T1_F01_01` – `T1_F01_05` (5) | `T2_F01_01` – `T2_F01_05` (5) |
| **F2** | Canonical Hackathon Facts | `research/01-facts.md` | `ORIGINAL_REQUEST.md` R1, `index-BVD-GoH1.js` | `T1_F02_01` – `T1_F02_05` (5) | `T2_F02_01` – `T2_F02_05` (5) |
| **F3** | Recon Track A: Organisers & Reskilll Operations | `research/A-organisers.md` | `recon-playbook.md` Track A, `Admin-_pGkMjvW.js` | `T1_F03_01` – `T1_F03_05` (5) | `T2_F03_01` – `T2_F03_05` (5) |
| **F4** | Recon Track B: Deep Nexconn Company, Philosophy & SDK Profile | `research/B-sponsors.md` | `ORIGINAL_REQUEST.md` R2, `docs.nexconn.ai/llms.txt` | `T1_F04_01` – `T1_F04_05` (5) | `T2_F04_01` – `T2_F04_05` (5) |
| **F5** | Recon Track C: Judges, Evaluator Workflow & Heat-Map | `research/C-judges.md` | `recon-playbook.md` Track C, `Admin-_pGkMjvW.js` | `T1_F05_01` – `T1_F05_05` (5) | `T2_F05_01` – `T2_F05_05` (5) |
| **F6** | Recon Track D: Why-Now Triggers | `research/D-why-now.md` | `recon-playbook.md` Track D | `T1_F06_01` – `T1_F06_05` (5) | `T2_F06_01` – `T2_F06_05` (5) |
| **F7** | Recon Track E: Competition Forecast & Global Benchmarks | `research/E-competition.md` | `ORIGINAL_REQUEST.md` R3, `recon-playbook.md` Track E | `T1_F07_01` – `T1_F07_05` (5) | `T2_F07_01` – `T2_F07_05` (5) |
| **F8** | Connect-the-Dots Synthesis & Roster Additions | `research/F-connect-the-dots.md`, `war-room/roster-additions.md` | `recon-playbook.md` §3, `council-roster.md` | `T1_F08_01` – `T1_F08_05` (5) | `T2_F08_01` – `T2_F08_05` (5) |
| **F9** | Track 01 (`nexconn-social`) Dossier, Debate & Top 5 Ideas | `research/domains/nexconn-social.md`, `war-room/nexconn-social.md`, `war-room/nexconn-social-ideas.md` | `PROJECT.md` F9, `war-room-protocol.md`, `output-templates.md` | `T1_F09_01` – `T1_F09_05` (5) | `T2_F09_01` – `T2_F09_05` (5) |
| **F10** | Track 02 (`nexconn-gaming`) Dossier, Debate & Top 5 Ideas | `research/domains/nexconn-gaming.md`, `war-room/nexconn-gaming.md`, `war-room/nexconn-gaming-ideas.md` | `PROJECT.md` F10, `war-room-protocol.md`, `output-templates.md` | `T1_F10_01` – `T1_F10_05` (5) | `T2_F10_01` – `T2_F10_05` (5) |
| **F11** | Track 03 (`nexconn-workplace`) Dossier, Debate & Top 5 Ideas | `research/domains/nexconn-workplace.md`, `war-room/nexconn-workplace.md`, `war-room/nexconn-workplace-ideas.md` | `PROJECT.md` F11, `war-room-protocol.md`, `output-templates.md` | `T1_F11_01` – `T1_F11_05` (5) | `T2_F11_01` – `T2_F11_05` (5) |
| **F12** | Track 04 (`nexconn-support`) Dossier, Debate & Top 5 Ideas | `research/domains/nexconn-support.md`, `war-room/nexconn-support.md`, `war-room/nexconn-support-ideas.md` | `PROJECT.md` F12, `war-room-protocol.md`, `output-templates.md` | `T1_F12_01` – `T1_F12_05` (5) | `T2_F12_01` – `T2_F12_05` (5) |
| **F13** | Track 05 (`nexconn-social-good`) Dossier, Debate & Top 5 Ideas | `research/domains/nexconn-social-good.md`, `war-room/nexconn-social-good.md`, `war-room/nexconn-social-good-ideas.md` | `PROJECT.md` F13, `war-room-protocol.md`, `output-templates.md` | `T1_F13_01` – `T1_F13_05` (5) | `T2_F13_01` – `T2_F13_05` (5) |
| **F14** | Track 06 (`open-innovation`) Dossier, Debate & Top 5 Ideas | `research/domains/open-innovation.md`, `war-room/open-innovation.md`, `war-room/open-innovation-ideas.md` | `PROJECT.md` F14, `war-room-protocol.md`, `output-templates.md` | `T1_F14_01` – `T1_F14_05` (5) | `T2_F14_01` – `T2_F14_05` (5) |
| **F15** | Master Hackathon Bible (`biblehackathon.md` & `.pdf`) | `biblehackathon.md`, `biblehackathon.pdf` | `ORIGINAL_REQUEST.md` AC1–AC2, `output-templates.md` Template 1 | `T1_F15_01` – `T1_F15_05` (5) | `T2_F15_01` – `T2_F15_05` (5) |
| **F16** | Master Ideas & Winning Selection (`ideas.md`, `.pdf`, `state.md`) | `ideas.md`, `ideas.pdf`, `state.md` | `ORIGINAL_REQUEST.md` AC1–AC3, `output-templates.md` Template 2 | `T1_F16_01` – `T1_F16_05` (5) | `T2_F16_01` – `T2_F16_05` (5) |

---

## 3. Test Architecture & Execution Commands

### Test Runner Location
- `d:\Hackathons\Nexconn\tests\run_e2e_tests.py`

### CLI Invocation Modes
```powershell
# Run full E2E test suite across Tiers 1, 2, 3, and 4 against d:\Hackathons\Nexconn
python d:\Hackathons\Nexconn\tests\run_e2e_tests.py

# Run a specific tier (1, 2, 3, 4, or all)
python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --tier 1
python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --tier 2
python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --tier 3
python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --tier 4
python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --tier all

# Run self-test mode (validates positive & negative synthetic fixtures and exits 0)
python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --self-test
```

### 4-Tier Verification Structure
1. **Tier 1 - Feature Coverage (`80` tests = `5` per feature × `16` features)**:
   - Verifies file existence, non-empty size, required H1/H2 headings, and core factual entities across all 16 features (`F1`–`F16`).
2. **Tier 2 - Boundary, Corner Cases & Format/Math Validation (`85` tests = `5` per feature × `16` features + `5` negative validator checks)**:
   - Zero standalone `TODO` or `TBD` placeholder markers across all deliverable markdown files;
   - Binary PDF header (`%PDF-`), file size (`> 10,000` bytes), and `pypdf` readable page count (`>= 5` pages) for `biblehackathon.pdf` and `ideas.pdf`;
   - Full 14-field template compliance across all `30` ideas (`5` ideas × `6` tracks) in `war-room/<slug>-ideas.md` and `ideas.md`;
   - Exact 9-criterion weighted rubric math validation (`±0.15` tolerance) for all `30` ideas;
   - Strict separation check confirming zero raw war-room dialogue turns (`**THIEL:**`, `**MUNGER:**`, `**JANE:**`, `**KARPATHY:**`, `**MUSK:**`, `**HARVEY:**`, `**SHARMA:**`, `**BUFFETT:**`, `**MIKE ROSS:**`, `**GRAHAM:**`, `**JOBS:**`) leaked into `ideas.md` or `war-room/<slug>-ideas.md`.
3. **Tier 3 - Cross-Feature Combinations (`16` pairwise interaction tests)**:
   - `T3_01`–`T3_04`: Canonical 6-track consistency across `01-facts.md`, `biblehackathon.md`, `ideas.md`, and `state.md`, plus prize pool (`$5,000` / `$20,640`), judging rubric (`50%`/`30%`/`20%`), and App Key (`^[A-Za-z0-9_-]{8,64}$`) alignment.
   - `T3_05`–`T3_08`: Nexconn corporate lineage (`RCLOUD GLOBAL PTE. LTD.` / `RongCloud`) and SDK primitives (`Chat SDK`, `Chat UI`, `Call SDK`, `AICP`, `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels`, `moderation`, `nexconn-skills`) mapped from `B-sponsors.md` into `biblehackathon.md` and `ideas.md`.
   - `T3_09`–`T3_12`: Global hackathon winners (`Industry.ai`, `Truman AI Live`, `OmniBet`, `Ephemeral`, `TxGPT`, `Snaption Live`) and research papers (`arXiv` citations with URLs) traced across `E-competition.md`, `research/domains/<slug>.md`, `biblehackathon.md`, and `ideas.md`.
   - `T3_13`–`T3_16`: Domain Winnability ranking order, #1 winning track and idea recommendation, dark horse pick, and `# Sources` integrity across `biblehackathon.md`, `ideas.md` (`Part 0 - Where to Play`), `war-room/<slug>-ideas.md`, and `state.md`.
4. **Tier 4 - Real-World Application Scenarios (`8` end-to-end scenarios)**:
   - Described in Section 4 below.

---

## 4. Real-World Application Scenarios (Tier 4)

| Scenario ID | Scenario Name | Real-World Persona / Consumer | What Is Verified End-to-End |
|---|---|---|---|
| **T4_01** | Downstream `/bible` Skill Handoff Readiness | `/bible` Skill Automation (`C:\Users\Harshad\.gemini\config\skills\bible\SKILL.md`) | Verifies `state.md`, `biblehackathon.md`, and `ideas.md` contain all required downstream metadata (team defaults, approved council roster, 6 ranked domains, 30 scored ideas, #1 winning recommendation, tech stack, and implementation sketch) to immediately run `/bible <winning-idea>`. |
| **T4_02** | Reskilll / Nexconn Judge 3-Minute Evaluation & App Key Audit Simulation | Nexconn Engineering Judge & Reskilll Admin (`Admin-_pGkMjvW.js`) | Simulates the judge's 4-step evaluation workflow on the #1 recommended idea: (1) Pass/Fail `Chat SDK`/`Chat UI` + `App Key` (`^[A-Za-z0-9_-]{8,64}$`) telemetry check, (2) 50% Completeness & UX 45-second demo flow, (3) 30% Innovation & Nexconn primitive depth, and (4) 20% Business viability & active users traction strategy. |
| **T4_03** | Track 01 (`nexconn-social`) End-to-End Deep Dive Audit | Social & Community Track Builder | Verifies complete trace from `research/domains/nexconn-social.md` (pain map, urgency, prior art, 3-bucket gap, 15+ seeds) → `war-room/nexconn-social.md` (Rounds 0–5 debate) → `war-room/nexconn-social-ideas.md` (5 vetted ideas using Community/Open Channels) → `ideas.md`. |
| **T4_04** | Track 02 (`nexconn-gaming`) End-to-End Deep Dive Audit | Gaming & Live Streams Track Builder | Verifies complete trace from `research/domains/nexconn-gaming.md` → `war-room/nexconn-gaming.md` → `war-room/nexconn-gaming-ideas.md` (5 vetted ideas using Open Channels, Targeted Group Messages, or Call SDK) → `ideas.md`. |
| **T4_05** | Track 03 (`nexconn-workplace`) End-to-End Deep Dive Audit | Workplace & Collaboration Track Builder | Verifies complete trace from `research/domains/nexconn-workplace.md` → `war-room/nexconn-workplace.md` → `war-room/nexconn-workplace-ideas.md` (5 vetted ideas using AICP `AgentID`, `stream-message`, `expansion`) → `ideas.md`. |
| **T4_06** | Track 04 (`nexconn-support`) End-to-End Deep Dive Audit | Marketplace & Support Track Builder | Verifies complete trace from `research/domains/nexconn-support.md` → `war-room/nexconn-support.md` → `war-room/nexconn-support-ideas.md` (5 vetted ideas using Direct Channels, Built-in Translation, Webhooks, Moderation) → `ideas.md`. |
| **T4_07** | Track 05 (`nexconn-social-good`) End-to-End Deep Dive Audit | Humanitarian & Social Good Track Builder | Verifies complete trace from `research/domains/nexconn-social-good.md` → `war-room/nexconn-social-good.md` → `war-room/nexconn-social-good-ideas.md` (5 vetted ideas using Voice-to-Text, accessible UX, scam moderation, Call SDK) → `ideas.md`. |
| **T4_08** | Track 06 (`open-innovation`) End-to-End Deep Dive Audit | Open Innovation Track Builder | Verifies complete trace from `research/domains/open-innovation.md` → `war-room/open-innovation.md` → `war-room/open-innovation-ideas.md` (5 vetted ideas using multi-agent A2A/AICP and custom interactive chat primitives) → `ideas.md`. |

---

## 5. Coverage Thresholds & Quality Gates

| Metric | Minimum Required | Implemented in `run_e2e_tests.py` | Pass Threshold |
|---|---|---|---|
| **Deliverable Features Covered (F1–F16)** | `16 / 16` (`100%`) | `16 / 16` (`100%`) | `100%` |
| **Tier 1 (Feature Coverage Tests)** | `>= 80` (`>= 5` per feature) | `80` (`5` per feature × `16`) | `100%` (`80 / 80`) |
| **Tier 2 (Boundary, Format, PDF & Math Tests)** | `>= 80` (`>= 5` per feature) | `85` (`5` per feature × `16` + `5` negative parser tests) | `100%` (`85 / 85`) |
| **Tier 3 (Cross-Feature Combination Tests)** | `>= 16` | `16` | `100%` (`16 / 16`) |
| **Tier 4 (Real-World Application Scenarios)** | `>= 8` | `8` | `100%` (`8 / 8`) |
| **Total Automated E2E Test Cases** | `>= 184` | `189` | `100%` (`189 / 189`) |
| **`--self-test` Fixture & Mutation Suite** | Exit code `0` | `189` positive + `12` negative mutation assertions | `100%` (Exit code `0`) |
