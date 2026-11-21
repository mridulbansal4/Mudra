## 2026-10-31T18:28:00Z

# Task Assignment: E2E Test Writer (`test_writer_e2e`) - E2E Testing Track (`TEST_INFRA.md`, `tests/run_e2e_tests.py`, `TEST_READY.md`)

- **Your Identity**: `test_writer_e2e`
- **Your Working Directory**: `d:\Hackathons\Nexconn\.agents\teamwork\test_writer_e2e`
- **Parent Conversation ID**: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- **Authoritative User Request**: `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)

## Mandatory Reading
1. `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\Hackathons\Nexconn\PROJECT.md`
3. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md`
4. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`
5. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md`

## Exclusive File Write Ownership
You own and MUST write:
1. **`d:\Hackathons\Nexconn\TEST_INFRA.md`**:
   - Follows the exact `TEST_INFRA.md` template: Test Philosophy, Feature Inventory (all 16 deliverable features F1–F16 from `PROJECT.md § Feature Inventory`), Test Architecture (`python d:\Hackathons\Nexconn\tests\run_e2e_tests.py` supporting `--tier 1`, `--tier 2`, `--tier 3`, `--tier 4`, or `--tier all` / no flags for full suite, plus `--self-test` to validate the test runner against synthetic fixtures), Real-World Application Scenarios (Tier 4), and Coverage Thresholds.
2. **`d:\Hackathons\Nexconn\tests\run_e2e_tests.py`**:
   - A comprehensive, deterministic Python E2E test suite verifying all requirements in `ORIGINAL_REQUEST.md` and `PROJECT.md` across 4 tiers:
     - **Tier 1 - Feature Coverage (`>= 5` test cases per feature across F1–F16 = `>= 80` test cases)**:
       - Checks file existence, non-empty size, required headings/sections, and core factual/structural presence for `research/00-source/*`, `research/01-facts.md`, `research/A-organisers.md`, `research/B-sponsors.md`, `research/C-judges.md`, `research/D-why-now.md`, `research/E-competition.md`, `research/F-connect-the-dots.md`, `war-room/roster-additions.md`, all 6 `research/domains/<slug>.md`, all 6 `war-room/<slug>.md`, all 6 `war-room/<slug>-ideas.md`, `biblehackathon.md`, `biblehackathon.pdf`, `ideas.md`, `ideas.pdf`, and `state.md`.
     - **Tier 2 - Boundary, Corner Cases & Format/Math Validation (`>= 5` test cases per feature = `>= 80` test cases)**:
       - Verifies zero standalone `TODO` or `TBD` placeholder markers across all deliverable markdown files;
       - Verifies `biblehackathon.pdf` and `ideas.pdf` exist, are `> 10,000` bytes, begin with `%PDF-`, and have readable pages via `pypdf` (`>= 5` pages each);
       - Verifies each of the 6 tracks in `war-room/<slug>-ideas.md` and `ideas.md` has at least 5 ideas (`## Idea 1` through `## Idea 5`, totaling `>= 30` ideas across the 6 tracks) with every required template field (`**Type:**`, `**Score:**`, `**Problem statement:**`, `**The pain (Mike Ross):**`, `**Why now:**`, `**The gap others miss`, `**What exists and why it falls short:**`, `**How it works:**`, `**The demo moment (Jobs):**`, `**30-second explanation (Karp):**`, `**Council jurisdiction`, `**Tech stack (basic):**`, `**Implementation sketch:**`, `**Score breakdown:**`);
       - Verifies the 9-criterion weighted score formula (`0.15*(pain+novelty+alignment+demo) + 0.10*(feasibility+India+business) + 0.05*(legal+moonshot)`) for every idea in `ideas.md` matches its stated `Score: X.X/10` within `±0.15`;
       - Verifies no raw war-room transcript turns (`**THIEL:**`, `**MUNGER:**`, `**JANE:**`, `**KARPATHY:**`) leaked into `ideas.md` or `war-room/<slug>-ideas.md`;
       - Verifies negative/malformed input rejection in the test helper functions (tested via `--self-test`).
     - **Tier 3 - Cross-Feature Combinations (`>= 16` pairwise interaction tests)**:
       - Cross-checks that all 6 canonical tracks (`nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, `open` / `open-innovation`) appear consistently across `01-facts.md`, `biblehackathon.md`, `ideas.md`, and `state.md`;
       - Cross-checks that Nexconn's core philosophy, corporate lineage (`RCLOUD GLOBAL PTE. LTD.` / `RongCloud`), and SDK primitives (`Chat SDK`, `Chat UI`, `Call SDK`, `AICP`, `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels`, `moderation`, `nexconn-skills`) are documented in `B-sponsors.md` and `biblehackathon.md` and explicitly mapped into the ideas in `ideas.md`;
       - Cross-checks that global hackathon winners and research papers (`arXiv` / DOI / conference links) are cited with URLs across `E-competition.md`, `research/domains/<slug>.md`, `biblehackathon.md`, and `ideas.md`;
       - Cross-checks that the Domain Winnability ranking in `biblehackathon.md`, `ideas.md` (`Part 0 - Where to Play`), and `state.md` is consistent and orders all 6 tracks with a clear single best winning track and idea.
     - **Tier 4 - Real-World Application Scenarios (`>= 8` application-level verification scenarios)**:
       - End-to-end readiness check for downstream `/bible` execution, Reskilll/Nexconn judge 50/30/20 + App Key audit simulation, and complete per-track deep-dive validation across all 6 tracks.
3. **`d:\Hackathons\Nexconn\TEST_READY.md`**:
   - Published at project root following the exact `TEST_READY.md` template once `d:\Hackathons\Nexconn\tests\run_e2e_tests.py --self-test` passes with exit code `0`.

## Strict Rules
- Do NOT write or modify `biblehackathon.md`, `ideas.md`, `state.md`, `research/*`, or `war-room/*`. Only write to `TEST_INFRA.md`, `TEST_READY.md`, `tests/*`, and your `.agents/teamwork/test_writer_e2e` folder.
- Run `python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --self-test` to verify your test suite has zero syntax/runtime bugs before publishing `TEST_READY.md`.
- Write `handoff.md` in `d:\Hackathons\Nexconn\.agents\teamwork\test_writer_e2e\handoff.md` and notify `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message`.


## 2026-10-31T18:32:36Z

You are `test_writer_e2e` (TypeName: `teamwork_test_writer`).
Your working directory is `d:\Hackathons\Nexconn\.agents\teamwork\test_writer_e2e`.
Your parent orchestrator Conversation ID is `ce650322-b861-45dd-a12e-c7d3a6871eb0`.

MANDATORY FIRST STEP:
Read `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` and `d:\Hackathons\Nexconn\.agents\teamwork\test_writer_e2e\DISPATCH.md` before starting work.
Also read:
- `d:\Hackathons\Nexconn\PROJECT.md`
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md`
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md`

EXCLUSIVE FILE WRITE OWNERSHIP:
Design and write the E2E Testing Track deliverables for `d:\Hackathons\Nexconn\`:
1. `d:\Hackathons\Nexconn\TEST_INFRA.md` (following the exact template in `DISPATCH.md`)
2. `d:\Hackathons\Nexconn\tests\run_e2e_tests.py` (comprehensive 4-tier test suite covering F1-F16: Tier 1 >=80 tests, Tier 2 >=80 tests including PDF validation, zero TODO/TBD check, 30-idea schema check, 9-criterion weighted score math check, and no raw dialogue leak check, Tier 3 >=16 cross-feature tests, Tier 4 >=8 real-world scenario tests, plus `--self-test` mode that validates the test runner logic against synthetic fixtures)
3. `d:\Hackathons\Nexconn\TEST_READY.md` (published once `python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --self-test` passes with exit code 0)

Do NOT modify any implementation/deliverable files (`biblehackathon.md`, `ideas.md`, `state.md`, `research/*`, `war-room/*`). Write `progress.md` and `handoff.md` in `d:\Hackathons\Nexconn\.agents\teamwork\test_writer_e2e`, and notify `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message`.


## 2026-10-31T19:09:08Z

**Context**: Liveness check (>25 minutes since dispatch).
**Content**: You have written `d:\Hackathons\Nexconn\TEST_INFRA.md`, but `d:\Hackathons\Nexconn\tests\run_e2e_tests.py` and `d:\Hackathons\Nexconn\TEST_READY.md` have not been written yet.
**Action**: Immediately write `d:\Hackathons\Nexconn\tests\run_e2e_tests.py`, run `python d:\Hackathons\Nexconn\tests\run_e2e_tests.py --self-test`, write `d:\Hackathons\Nexconn\TEST_READY.md` and `d:\Hackathons\Nexconn\.agents\teamwork\test_writer_e2e\handoff.md`, and reply via `send_message`.
