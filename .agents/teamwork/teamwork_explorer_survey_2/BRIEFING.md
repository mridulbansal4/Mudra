# BRIEFING - 2026-10-31T18:20:20Z

## Mission
Thoroughly inspect `https://reskilll.com/hack/nexconn/` and the Reskilll hackathon ecosystem using `agent-browser` and web tools, documenting all hackathon metadata, tracks/problem statements, judging criteria, resources/SDKs/sponsors/judges, and Reskilll evaluation insights in `handoff.md`.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Investigator, Synthesizer
- Working directory: `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2`
- Original parent: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- Milestone: Survey 2 - Live Hackathon Page & Reskilll Ecosystem Investigation

## 🔒 Key Constraints
- Read-only investigation - do NOT implement or modify files outside `.agents/teamwork/teamwork_explorer_survey_2`
- Use `agent-browser` and web fetch/search tools to inspect `https://reskilll.com/hack/nexconn/` and linked pages

## Current Parent
- Conversation ID: `ce650322-b861-45dd-a12e-c7d3a6871eb0`
- Updated: 2026-10-31T18:20:20Z

## Investigation State
- **Explored paths**:
  - `https://reskilll.com/hack/nexconn/` and all 9 Vite/React bundles (`index-BVD-GoH1.js`, `Rules-DQNF0983.js`, `Submit-R3OJNUmD.js`, `registration-KuSES_RU.js`, `Dashboard-CUXFNqTn.js`, `Admin-_pGkMjvW.js`, `Register-GOMS-xM4.js`, `useDashboard-C_q5GCOp.js`, `Legal-Bh2TY_RJ.js`)
  - `https://www.nexconn.ai/free-chat-api?utm_source=hackathon`
  - `https://docs.nexconn.ai/?utm_source=mktevent&utm_term=hackathon`
  - `https://www.nexconn.ai/blog/nexconn-chat-integration-skill?utm_source=mktevent&utm_term=hackathon`
  - `https://github.com/NexconnAI-Dev` (all 9 repositories via GitHub API + `nexconn-skills` README)
- **Key findings**:
  - Official title: `Nexconn Build Challenge 2026` (`nexconn2026`), Oct 23 – Nov 22, 2026 AoE, judging Nov 23–27, results Dec 1, 2026.
  - Team size 1–4, global online except Mainland China (`CN`).
  - Prize pool: `$5,000` cash across 5 places (`$2,000`, `$1,250`, `$750`, `$500`, `$500`) + 2 years of Nexconn Free Chat Plan (`worth $20,640`) + 1-year AWS (15% off) or Alibaba Cloud (30% off) discount per winner.
  - 6 tracks sharing one unified rubric: `Social & Community`, `Gaming & Live Streams`, `Workplace & Collaboration`, `Marketplace & Support`, `Humanitarian & Social Good`, and `Open Innovation`.
  - Judging rubric: Mandatory pass/fail gate for real `Chat SDK` or `Chat UI` usage (verified via `appKey`), then `50%` Completeness & UX, `30%` Innovation & Scenario Value, `20%` Business & Growth Potential (+ significant traction bonus based on active users in Nexconn console).
- **Unexplored areas**: None - 100% of required scope completed and verified.

## Key Decisions Made
- Extracted all 9 compiled JS route chunks from `https://reskilll.com/hack/nexconn/assets/` in addition to live browser snapshots (`npx agent-browser`), ensuring even auth-gated routes (`/submit`, `/dashboard`, `/admin`) were inspected verbatim.
- Synthesized all 5 deliverables into `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`.

## Artifact Index
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\DISPATCH.md` - Dispatch log
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\BRIEFING.md` - Working memory
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\progress.md` - Liveness heartbeat
- `d:\Hackathons\Nexconn\.agents\teamwork\teamwork_explorer_survey_2\handoff.md` - Final 5-component handoff report
