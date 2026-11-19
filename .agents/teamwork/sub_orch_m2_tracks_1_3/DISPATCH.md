## 2026-10-31T18:25:00Z

# Task Assignment: Milestone M2 Sub-Orchestrator (`sub_orch_m2_tracks_1_3`) — Tracks 01–03 Domain Research & War-Room Council Debates

- **Your Identity**: `sub_orch_m2_tracks_1_3` (Sub-Orchestrator for Milestone M2)
- **Your Working Directory**: `d:\Hackathons\Nexconn\.agents\teamwork\sub_orch_m2_tracks_1_3`
- **Parent Conversation ID**: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- **Authoritative User Request**: `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first and include in every subagent dispatch)
- **Project Scope Document**: `d:\Hackathons\Nexconn\PROJECT.md`

## Mandatory Reading Before Dispatching
1. `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\Hackathons\Nexconn\PROJECT.md`
3. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\handoff.md` (Full `war-room-council` specification, council roster, 9-criterion scoring rubric, and `ideas.md` template)
4. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md` (Verbatim `https://reskilll.com/hack/nexconn/` tracks, rubric, and SDK rules)
5. `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_3\handoff.md` (Deep Nexconn company/SDK primitives + global hackathon winners + 2024–2026 arXiv papers)

## Scope & Exclusive Write Ownership (Milestone M2: Features F9–F11)
You own and must produce the complete Phase 2 Domain Deep Research and Phase 3 War-Room Council Deliverables for **Tracks 01, 02, and 03**:

1. **Track 01 — `01 Social & Community` (`nexconn-social`: *"Group messaging and topic-based channels"*)**:
   - `d:\Hackathons\Nexconn\research\domains\nexconn-social.md` (All 7 mandatory sections: Pain map with 5+ real voices & URLs, Urgency 1–10 with reasons, Prior art table of products + GitHub repos + 2024–2026 research papers + global hackathon winners mapped to Nexconn SDK, 3-bucket Gap analysis [`Exists-but-weak`, `Doesn't exist`, `Exists abroad, not in India`], India/Global rails & Nexconn SDK primitives, Tech frontier, and 15+ tagged raw idea seeds).
   - `d:\Hackathons\Nexconn\war-room\nexconn-social.md` (Full 6-round War-Room Council debate transcript: Round 0 Brief by Patrick Jane, Round 1 Idea Storm with 20–30 candidate ideas including contrarian ideas from Thiel & Musk, Round 2 Ordered Attack `Munger → Harvey+Sharma → Buffett → Karpathy → Mike Ross → Graham → Domain Leads` with standing vetoes enforced/resolved, Round 3 Rebuild & Merge, Round 4 9-criterion weighted scoring chaired by Paul Graham selecting the Top 5 ideas, Round 5 Polish by Jobs, Karp, Godin, Gary Vee, and Jony Ive).
   - `d:\Hackathons\Nexconn\war-room\nexconn-social-ideas.md` (Polished Top 5 ideas section for `01 Social & Community` formatted strictly per `PROJECT.md § Interface Contracts` and `output-templates.md`, with zero raw transcript lines, explicit Nexconn SDK/UI/Call/AICP/Webhook feature mappings, global hackathon winner & research paper citations, and exact weighted score breakdowns).

2. **Track 02 — `02 Gaming & Live Streams` (`nexconn-gaming`: *"Squad chat and live stream interactive chatroom"*)**:
   - `d:\Hackathons\Nexconn\research\domains\nexconn-gaming.md` (All 7 mandatory sections)
   - `d:\Hackathons\Nexconn\war-room\nexconn-gaming.md` (Full 6-round War-Room Council debate transcript)
   - `d:\Hackathons\Nexconn\war-room\nexconn-gaming-ideas.md` (Polished Top 5 ideas section for `02 Gaming & Live Streams`)

3. **Track 03 — `03 Workplace & Collaboration` (`nexconn-workplace`: *"Direct messaging and team project threads"*)**:
   - `d:\Hackathons\Nexconn\research\domains\nexconn-workplace.md` (All 7 mandatory sections)
   - `d:\Hackathons\Nexconn\war-room\nexconn-workplace.md` (Full 6-round War-Room Council debate transcript)
   - `d:\Hackathons\Nexconn\war-room\nexconn-workplace-ideas.md` (Polished Top 5 ideas section for `03 Workplace & Collaboration`)

## Strict Rules
- Only write to the 9 files listed above (plus your `.agents/teamwork/` folders).
- Every track MUST have **5 complete, feasible, real-world usable project ideas** (`Idea 1` through `Idea 5`) in `<slug>-ideas.md` (including at least one `Doesn't exist` and one `Exists abroad, not in India` idea), with verified weighted rubric math:
  `Score = 0.15*(pain + novelty + alignment + demo) + 0.10*(feasibility + India + business) + 0.05*(legal + moonshot)`.
- Zero `TODO` or `TBD` placeholders anywhere. Every factual claim, GitHub repo, hackathon winner, and research paper must have a real URL citation.
- Follow the Project Pattern (Explorer → Worker → Reviewer → Challenger → Forensic Auditor → Gate) and report completion to `ce650322-b861-45dd-a12e-c7d3a6871eb0` via `send_message`.
