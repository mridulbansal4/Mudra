# Original User Request

## Initial Request — 2026-10-31T18:04:18Z

Use many agents to research everything like Use as many agents as you want. Use the maximum number of agents but do the work perfectly. Research the Nexconn hackathon (`https://reskilll.com/hack/nexconn/`) and the company Nexconn using the `war-room-council` skill (`C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md`) and the `agent-browser` skill (`C:\Users\Harshad\.gemini\config\skills\agent-browser\SKILL.md`) to analyze all tracks, judging criteria, resources, company services/tools, global hackathon winners, and research papers, debate 2–3+ feasible real-world ideas per track via the war-room council, rank the tracks, and select the best winning track and idea.

Working directory: d:\Hackathons\Nexconn
Integrity mode: development

Reference material:
- Hackathon URL: `https://reskilll.com/hack/nexconn/`
- `war-room-council` skill: `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` (and its `references/` directory)
- `agent-browser` skill: `C:\Users\Harshad\.gemini\config\skills\agent-browser\SKILL.md`

## Requirements

### R1. Hackathon, Track, and Judging Criteria Research
Follow the `war-room-council` skill (`C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md`) and use the `agent-browser` skill (`C:\Users\Harshad\.gemini\config\skills\agent-browser\SKILL.md`) to do full background research on `https://reskilll.com/hack/nexconn/`, covering all tracks (including Open Innovation), judging criteria, required tools/SDKs, and website resources. Incorporate how Reskilll hackathons operate and are evaluated to identify where to build and win.

### R2. Deep Company Research on Nexconn
Study the company Nexconn in depth—its philosophy, mentality, products, services, and tools/SDKs. Connect how Nexconn's services and tools can be leveraged to create a much larger real-world impact and stand out among all participants.

### R3. Global Hackathon Winners and Research Papers
Research global hackathon winners, prior hackathon projects, and relevant research papers that fit the hackathon tracks (or Open Innovation where fitting using Nexconn's tools) and can be replicated or adapted using Nexconn's services, tools, or SDKs.

### R4. Track Ideation, War-Room Council Debate, and Winning Selection
Generate at least 2–3 feasible, actually usable real-world project ideas in every track (and Open Innovation if fitting with Nexconn's tools) that create high impact. Run the full war-room council debate following the `war-room-council` skill (with the `council-roster.md` core+extra personas and relevant domain experts pre-approved so execution completes without blocking on user input) to debate, select, and rank the best ideas and tracks, recommending the single best winning track and idea and producing the `war-room-council` deliverables (`biblehackathon.md`, `biblehackathon.pdf`, `ideas.md`, `ideas.pdf`, `state.md`, `research/`, and `war-room/`) in `d:\Hackathons\Nexconn`.

## Acceptance Criteria

### Deliverables and File Verification
- [ ] `d:\Hackathons\Nexconn\biblehackathon.md` and `d:\Hackathons\Nexconn\ideas.md` exist, are non-empty, and contain no placeholder or `TODO`/`TBD` markers.
- [ ] `d:\Hackathons\Nexconn\biblehackathon.pdf` and `d:\Hackathons\Nexconn\ideas.pdf` exist and are valid non-empty PDF files (`> 0` bytes).
- [ ] `d:\Hackathons\Nexconn\state.md`, `d:\Hackathons\Nexconn\research\`, and `d:\Hackathons\Nexconn\war-room\` exist and contain the completed phase research files and council debate artifacts defined by `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md`.

### Content and War-Room Rubric Verification
- [ ] All tracks on `https://reskilll.com/hack/nexconn/` (plus Open Innovation), all judging criteria, and all listed hackathon resources/tools are documented and verified against the live hackathon page.
- [ ] Nexconn's philosophy, mentality, services, and tools/SDKs are documented in detail and explicitly mapped to how each proposed idea uses them.
- [ ] Global hackathon winners and/or relevant research papers are cited with concrete mappings showing how they can be replicated or adapted using Nexconn's services, tools, or SDKs.
- [ ] Every track has at least 2–3 concrete, feasible, real-world usable project ideas, evaluated through the multi-persona war-room council debate, concluding with a clear track winnability ranking and the single best winning track and idea.
