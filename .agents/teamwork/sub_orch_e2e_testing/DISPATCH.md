## 2026-10-31T18:25:00Z

# Task Assignment: E2E Testing Track Orchestrator (`sub_orch_e2e_testing`)

- **Your Identity**: `sub_orch_e2e_testing` (E2E Testing Orchestrator)
- **Your Working Directory**: `d:\Hackathons\Nexconn\.agents\teamwork\sub_orch_e2e_testing`
- **Parent Conversation ID**: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- **Authoritative User Request**: `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first and include in every subagent dispatch)
- **Project Scope Document**: `d:\Hackathons\Nexconn\PROJECT.md`

## Mandatory Reading Before Dispatching
1. `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\Hackathons\Nexconn\PROJECT.md`
3. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md`
4. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`
5. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md`

## Scope & Exclusive Write Ownership (E2E Testing Track)
You own and must produce:
1. **`d:\Hackathons\Nexconn\TEST_INFRA.md`**:
   - Follows the exact `TEST_INFRA.md` template from the Project Pattern: Test Philosophy, Feature Inventory (covering all 16 deliverable features F1–F16 from `PROJECT.md § Feature Inventory`), Test Architecture (`python d:\Hackathons\Nexconn\tests\run_e2e_tests.py` supporting `--tier 1`, `--tier 2`, `--tier 3`, `--tier 4`, or full suite), Real-World Application Scenarios (Tier 4), and Coverage Thresholds.
2. **`d:\Hackathons\Nexconn\tests\run_e2e_tests.py`** (and any modular test files under `d:\Hackathons\Nexconn\tests\`):
   - A comprehensive, deterministic, self-contained Python test suite (`unittest` or `pytest` or standalone runner with exit code `0` on pass and non-zero on failure, plus `--tier <1|2|3|4|all>` CLI flag) covering:
     - **Tier 1 - Feature Coverage (`>= 5` test cases per feature across F1–F16 = `>= 80` test cases)**:
       - Verifies existence, non-emptiness, required headings/sections, and core content for `research/00-source/*`, `research/01-facts.md`, `research/A..F-*.md`, `war-room/roster-additions.md`, all 6 `research/domains/<slug>.md`, all 6 `war-room/<slug>.md`, all 6 `war-room/<slug>-ideas.md`, `biblehackathon.md`, `biblehackathon.pdf`, `ideas.md`, `ideas.pdf`, and `state.md`.
     - **Tier 2 - Boundary, Corner Cases & Negative/Format Validation (`>= 5` test cases per feature = `>= 80` test cases)**:
       - Verifies zero `TODO` / `TBD` / `[placeholder]` markers across all markdown files;
       - Verifies `biblehackathon.pdf` and `ideas.pdf` are valid PDFs (`> 0` bytes, valid `%PDF-` header, readable pages via `pypdf` / `fitz`, multi-page output);
       - Verifies no raw war-room dialogue (`**THIEL:**`, `**MUNGER:**`, etc.) leaked into `ideas.md` or `<slug>-ideas.md`;
       - Verifies every track has `>= 5` ideas (`Idea 1` through `Idea 5`) and each idea has all required fields (`Type`, `Score`, `Problem statement`, `The pain`, `Why now`, `The gap others miss`, `What exists and why it falls short`, `How it works`, `The demo moment`, `30-second explanation`, `Council jurisdiction`, `Tech stack`, `Implementation sketch`, `Score breakdown`);
       - Verifies weighted rubric math (`0.15*(pain+novelty+alignment+demo) + 0.10*(feasibility+India+business) + 0.05*(legal+moonshot)`) matches the stated `Score: X.X/10` within rounding tolerance (`±0.15`);
       - Verifies Domain Winnability Index math (`0.25*CompInv + 0.20*(SatInv+Demo+Align) + 0.15*Feas`) and ensures all 6 tracks are ranked;
       - Verifies negative/invalid input handling in the test parser/validator functions so the test harness itself handles missing/corrupt inputs gracefully.
     - **Tier 3 - Cross-Feature Combinations (`>= 16` pairwise interaction tests)**:
       - Cross-checks consistency between `01-facts.md` and `biblehackathon.md` (all 6 tracks, $5,000 / $20,640 prizes, 50/30/20 weights, App Key rule);
       - Cross-checks consistency between `B-sponsors.md` Nexconn primitives (`Chat SDK`, `Chat UI`, `Call SDK`, `AICP`, `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels`, `moderation`, `nexconn-skills`) and the ideas in `ideas.md`;
       - Cross-checks consistency between `E-competition.md` / `domains/<slug>.md` global hackathon winners & research papers and the prior-art tables in `ideas.md`;
       - Cross-checks consistency between `war-room/<slug>-ideas.md`, `ideas.md`, `biblehackathon.md` Domain Winnability table, and `state.md`.
     - **Tier 4 - Real-World Application Scenarios (`>= 8` end-to-end user/judge/downstream-skill scenarios)**:
       - Scenario 1: Downstream `/bible` skill handoff contract check (`state.md` + `ideas.md` + `biblehackathon.md` readiness to feed `/bible <idea-name>`);
       - Scenario 2: Reskilll/Nexconn Judge 3-minute evaluation audit simulation (verifying #1 recommended track & idea satisfies 50% Completeness/UX, 30% Innovation/Scenario, 20% Business/Traction + mandatory `Chat SDK`/`Chat UI` App Key gate);
       - Scenario 3–8: Full track-by-track end-to-end audit for each of the 6 tracks (`nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, `open-innovation`).
3. **`d:\Hackathons\Nexconn\TEST_READY.md`**:
   - Published at project root once the test runner (`d:\Hackathons\Nexconn\tests\run_e2e_tests.py`) and all Tier 1–4 tests are built, syntax-checked, and self-verified against mock/fixture data.

## Strict Rules
- Do NOT write or modify `biblehackathon.md`, `ideas.md`, `state.md`, `research/*`, or `war-room/*`. Only write to `TEST_INFRA.md`, `TEST_READY.md`, `tests/*`, and your `.agents/teamwork/` folders.
- Follow the Project Pattern (Explorer → Worker/`teamwork_test_writer` → Reviewer → Challenger → Forensic Auditor → Gate) and notify `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message` once `TEST_READY.md` is published.
