# Handoff Report - `teamwork_spec_miner_survey_1`

## 1. Observation

### 1.1 Authoritative Sources Inspected
1. `d:\Hackathons\Nexconn\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1–41)
2. `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` (Lines 1–123)
3. `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\council-roster.md` (Lines 1–281)
4. `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\recon-playbook.md` (Lines 1–82)
5. `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\war-room-protocol.md` (Lines 1–80)
6. `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\law-checklist.md` (Lines 1–61)
7. `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\output-templates.md` (Lines 1–112)
8. `C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py` (Lines 1–117)
9. `C:\Users\Harshad\.gemini\config\skills\bible\SKILL.md` (Lines 1–85, inspected to verify `state.md` downstream contract)
10. `C:\Users\Harshad\.gemini\config\skills\agent-browser\SKILL.md` (Lines 1–52) and `npx --yes agent-browser skills get core` output (592 lines).

### 1.2 Direct Toolchain & Environment Observations
- **Workspace listing (`d:\Hackathons\Nexconn`)**: Contains only `.agents/` directory (`0` project files exist yet).
- **Python & Packages**:
  - `python --version`: `Python 3.13.13`
  - `markdown` (`python-markdown`): `INSTALLED`
  - `reportlab`: `INSTALLED`
  - `pypdf`: `INSTALLED`
  - `fitz` (PyMuPDF): `INSTALLED`
  - `playwright`, `weasyprint`, `fpdf`: `MISSING`
- **Browsers for Headless PDF Rendering**:
  - `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`: `True`
  - `C:\Program Files\Google\Chrome\Application\chrome.exe`: `True`
- **End-to-End Test of `scripts/md2pdf.py`**:
  - Command: `python "C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py" $testMd $testPdf --subtitle "Test · 2026"`
  - Result: Exit code `0`, output `PDF written: D:\Hackathons\Nexconn\.agents\teamwork\teamwork_spec_miner_survey_1\_test_render.pdf (30 KB)`, verified file size `31483 bytes` (temporary test files removed immediately after verification).
- **`agent-browser` CLI**:
  - Direct invocation `agent-browser --version` failed with `CommandNotFoundException` because `agent-browser` is not installed globally in `C:\Users\Harshad\AppData\Roaming\npm`.
  - Invocation via `npx --yes agent-browser skills get core` succeeded with exit code `0` and returned the full 592-line core specification.

---

## 2. Logic Chain

1. **Workspace Target Path Resolution**: While `war-room-council/SKILL.md` (Line 51) defaults to `~/hackathons/<slug>/`, `ORIGINAL_REQUEST.md` (Lines 7, 27, 32–34) explicitly overrides the target root to `d:\Hackathons\Nexconn`. Therefore, all output files (`state.md`, `biblehackathon.md`, `biblehackathon.pdf`, `ideas.md`, `ideas.pdf`, `research/*`, and `war-room/*`) MUST be written directly under `d:\Hackathons\Nexconn\`.
2. **Pre-Approved Council Gate Resolution**: `war-room-council/SKILL.md` (Lines 68–78) normally pauses at Step 2 to ask the user to approve the council roster. However, `ORIGINAL_REQUEST.md` (Line 27) explicitly states: *"with the `council-roster.md` core+extra personas and relevant domain experts pre-approved so execution completes without blocking on user input"*. Thus, the orchestrator/agents must record the approved roster directly in `d:\Hackathons\Nexconn\state.md` and write dossiers for any custom/new domain experts (such as a Nexconn platform/SDK specialist or custom track experts) in `d:\Hackathons\Nexconn\war-room\roster-additions.md` without blocking on user input.
3. **Idea Count per Domain Requirement**: `ORIGINAL_REQUEST.md` (Lines 5, 27, 40) asks for *"at least 2–3 feasible, actually usable real-world project ideas in every track (and Open Innovation if fitting with Nexconn's tools)"* while also requiring compliance with `war-room-council/SKILL.md`, where `output-templates.md` (Lines 58, 69–100) and `war-room-protocol.md` (Line 46) specify **top 5 ideas per domain** (`Idea 1` through `Idea 5`). Producing **5 ideas per track/domain** (including Open Innovation) satisfies both the `>= 2–3` floor in `ORIGINAL_REQUEST.md` and the strict `top 5 ideas per domain` template in `war-room-council`.
4. **PDF Rendering Reliability**: Since `Python 3.13.13`, `python-markdown`, and `msedge.exe` / `chrome.exe` are all present and `C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py` was verified to produce valid 30+ KB PDFs, the exact command specified in `war-room-council/SKILL.md` (Lines 112–113) is guaranteed to work without installing extra dependencies.
5. **Browser Automation Invocation**: Since `agent-browser` is not on the global `PATH`, any agent executing `agent-browser` commands must either invoke `npx --yes agent-browser ...` or first run `npm i -g agent-browser && agent-browser install`.

---

## 3. Caveats

- `npx --yes agent-browser` downloads/resolves the package if not cached locally; if multiple subagents run `agent-browser` concurrently, installing it once globally (`npm i -g agent-browser`) or using isolated `--session <name>` flags avoids npm cache lock contention and shared browser session collisions.
- `md2pdf.py` launches headless Edge/Chrome with `--user-data-dir={tmp}\profile` and a 180-second timeout; running two `md2pdf.py` invocations sequentially (or in separate temp directories, which `tempfile.TemporaryDirectory()` handles automatically) avoids any browser profile lock conflict.

---

## 4. Conclusion

The environment and skill specifications are fully mined and verified. Below are the three required deliverable specifications plus the Specification Miner feature/edge-case matrices.

---

# Deliverable 1: Complete Specification of `war-room-council`

## 1.1 Ground Rules (`SKILL.md` Lines 27–35)
- **Truth over theatre**: Every fact, number, GitHub repo, research paper, and news item must come from a real search result with an inline URL link (`[S#]` or markdown link). Never invent sources, star counts, quotes, or judges. Unknown → state `unknown`. Hunches must be labelled `HUNCH:` and tied to specific evidence.
- **In-character reconstructions**: Council members are thinking models. Lines spoken in the war room are in-character reconstructions, never presented as real-world quotes unless sourced from research.
- **Recency**: Use current dates; prefer news/incidents from the last 12–18 months.
- **No placeholders**: `ORIGINAL_REQUEST.md` (Line 32) strictly forbids `TODO` or `TBD` markers in deliverables.

## 1.2 Complete Phase Workflow & File Architecture

All files must be created under `d:\Hackathons\Nexconn\`:

```text
d:\Hackathons\Nexconn\
├── state.md                              # Step 0, Step 2, Step 6 state tracker
├── biblehackathon.md                     # Step 3 & Step 5 Deliverable 1 (Markdown)
├── biblehackathon.pdf                    # Step 5 Deliverable 1 (Rendered PDF)
├── ideas.md                              # Step 5 Deliverable 2 (Markdown)
├── ideas.pdf                             # Step 5 Deliverable 2 (Rendered PDF)
├── research\
│   ├── 00-source\                        # Raw scraped pages, rules, FAQs, problem statements, Nexconn docs
│   ├── 01-facts.md                       # Extracted canonical hackathon facts, tracks, judging criteria, resources
│   ├── A-organisers.md                   # Track A: Organisers (Reskilll + Nexconn), mandate, motives, past editions
│   ├── B-sponsors.md                     # Track B: Sponsors/Nexconn business model, tools/SDKs, products to use
│   ├── C-judges.md                       # Track C: Judges/mentors background, psychology, pet peeves, judge heat-map
│   ├── D-why-now.md                      # Track D: Policy, incident, geopolitical & sponsor triggers per track/PS
│   ├── E-competition.md                  # Track E: Team count estimates, 80% default ideas, prior art counts
│   ├── F-connect-the-dots.md             # Step 3: Patrick Jane's synthesis session (6 mandatory sections)
│   └── domains\
│       └── <domain-slug>.md              # Phase 2: One file per track/domain (including Open Innovation)
└── war-room\
    ├── roster-additions.md               # Step 2: Dossiers for any newly added domain/Nexconn experts
    ├── <domain-slug>.md                  # Phase 3: Full war-room debate transcript (Rounds 0–5) per domain
    └── <domain-slug>-ideas.md            # Phase 3: Formatted Top-5 ideas section for that domain (for ideas.md)
```

### Detailed Phase-by-Phase Requirements

#### Step 0 - Set Up (`SKILL.md` Lines 49–53)
- Create directory structure: `d:\Hackathons\Nexconn\research\00-source\`, `d:\Hackathons\Nexconn\research\domains\`, `d:\Hackathons\Nexconn\war-room\`.
- Initialize `d:\Hackathons\Nexconn\state.md` with:
  - Hackathon link (`https://reskilll.com/hack/nexconn/`)
  - Date, team info / defaults (e.g., 4 people, 36 hours, full-stack JS/Python, per `bible/SKILL.md` Line 31)
  - Later updated in Step 2 (approved council roster table) and Step 6 (domains, idea names, scores, winnability ranking, #1 recommendation + dark horse).

#### Step 1 - Get the Facts (`SKILL.md` Lines 55–58, `recon-playbook.md` Section 1)
- Fetch `https://reskilll.com/hack/nexconn/` (and associated Reskilll/Nexconn pages) using web fetch and `agent-browser`.
- Save raw sources in `d:\Hackathons\Nexconn\research\00-source\`.
- Extract into `d:\Hackathons\Nexconn\research\01-facts.md`:
  1. Name, edition, dates & rounds
  2. Format (online/offline, hours)
  3. Eligibility & team size
  4. Prizes
  5. Evaluation / judging criteria (with weights if given)
  6. Submission requirements (PPT, video, repo, prototype)
  7. Themes / tracks / domains (all tracks + Open Innovation)
  8. Every problem statement verbatim with ID and author
  9. Listed resources, required tools/SDKs, sponsors and tiers, judges/mentors/jury, partner institutions, contact persons.

#### Step 2 - Parallel Recon Tracks (A–E) + Phase 2 Domain Deep Research + Council Roster (`SKILL.md` Lines 60–83)
1. **Recon Track A (`research/A-organisers.md`)**:
   - Who owns/runs the hackathon (Reskilll, Nexconn, partners), mandate, budget/business line, leadership's public statements.
   - Hidden motives (hiring pipeline, API/platform/SDK adoption, R&D, PR, ecosystem building).
   - Committee/jury/organising team profiles (LinkedIn/X posts in last 12 months, talks, papers).
   - Previous Reskilll / Nexconn hackathons: themes, winners, winning projects, tech used, what didn't win.
2. **Recon Track B (`research/B-sponsors.md`)**:
   - Deep company research on **Nexconn** (and any co-sponsors): philosophy, mentality, business model, latest strategy, services, products, APIs, SDKs, tools they want developers to use, recent news, expansion plans.
   - Explicit mapping of **which Nexconn/sponsor tech/tools/SDKs we must visibly use** and how they create outsized impact.
3. **Recon Track C (`research/C-judges.md`)**:
   - Career path, companies founded/invested in, sectors, public opinions, pet peeves, past judging patterns, most likely question for each judge/mentor (or archetype if judges are unannounced, clearly noting what is known vs inferred).
   - **Judge heat-map**: what each judge wants to see in 3 minutes.
4. **Recon Track D (`research/D-why-now.md`)**:
   - Triggers for every theme/track/problem statement across 5 dimensions:
     - **Indian policy** (Union Budget, IndiaAI, Digital Public Infrastructure, etc.)
     - **Incidents** (recent outages, security events, frauds, industry failures)
     - **Geopolitics (Jaishankar's lens)** (supply chains, sovereign tech, Global South, enterprise dependencies)
     - **History** (recurring unsolved problems)
     - **Sponsor/industry trigger** (Nexconn product launches, regulatory deadlines like DPDP, market entry)
   - Required output format per PS/track: `Trigger → Evidence [source] → What the authors are actually worried about → What a winning answer must prove`.
5. **Recon Track E (`research/E-competition.md`)**:
   - Estimated number of participating teams.
   - Predicted **default ideas (the 80% trap)** teams will submit per track.
   - Prior work counts: GitHub repos (queries + counts), Kaggle datasets, startups (Tracxn/Crunchbase/Inc42), research papers (arXiv/Semantic Scholar/Google Scholar in last 3 years), global hackathon winners (Devpost/Devfolio/SIH).
6. **Phase 2 Domain Deep Research (`research/domains/<domain>.md`, one file per track/domain)**:
   Each file MUST contain these 7 sections (`war-room-protocol.md` Lines 7–24):
   1. **The pain map**: Who suffers, how many (cited stats), cost (₹/$, lives, hours), why current fixes fail, plus **5+ real voices** (news quotes, Reddit/X/YouTube/GitHub comments, field reports) with links.
   2. **Urgency**: Recent news (last 12 months with dates), policy/industry deadlines, budget/funding lines, incidents. **Score urgency 1–10 with reasons**.
   3. **Prior art**: Table of existing startups/products (India + global, funding, traction, why they fall short), **GitHub repos** (name, stars, last commit, what it does), **research papers** (title, year, venue, key result, link), deployed systems, and **global hackathon winners / previous hackathon projects** that can be replicated or adapted using Nexconn's tools/SDKs.
   4. **Gap analysis in three buckets**:
      - `Exists but weak` - what exists, specific weakness, 10x improvement.
      - `Doesn't exist` - nobody is doing it; why (schlep, data, regulation, timing) and why solvable now.
      - `Exists abroad, not in India` (or exists in another ecosystem, not yet on Nexconn/target ecosystem) - foreign/external product, why it works there, what must change for India/Nexconn.
   5. **India rails, Nexconn SDKs/tools & data available**: Which DPI/APIs/datasets and Nexconn services/tools/SDKs can be used in the hackathon.
   6. **Tech frontier**: Newest models, techniques, protocols, hardware making something newly possible (with sources).
   7. **Raw idea seeds**: **15+ seeds**, each one line, tagged with its gap bucket.
7. **Council Roster Confirmation & Additions**:
   - Save full approved roster table (`seat · person · why · mode: lead/support per domain`) to `state.md`.
   - Write full dossiers (`rise`, `how they decide`, `asks`, `attacks`, `voice`, `blind spot`) for any new domain/Nexconn experts into `war-room/roster-additions.md`.

#### Step 3 - Connect the Dots & Write `biblehackathon.md` (`SKILL.md` Lines 84–88, `recon-playbook.md` Section 3)
- Run Patrick Jane's synthesis session (chaired by Patrick Jane with Jaishankar, Sharma, Thiel, Karp, Graham, and Munger) and write `d:\Hackathons\Nexconn\research\F-connect-the-dots.md` with 6 mandatory sections:
  1. **The real reason this hackathon exists** (one paragraph, with evidence).
  2. **What the organisers secretly fear** and **what they would love to announce afterwards**.
  3. **Hidden evaluation criteria** (what the rubric doesn't state but the jury rewards, including Nexconn tool usage, deployability, etc.).
  4. **Landmines** (topics, claims, or tech that will annoy this jury).
  5. **Dots nobody else will connect** (**at least 7**, each with evidence).
  6. **The 80% trap** (what most teams will build, so we avoid it).
- Write `d:\Hackathons\Nexconn\biblehackathon.md` following the exact template in `output-templates.md`.

#### Step 4 - The War Room (`SKILL.md` Lines 90–101, `war-room-protocol.md` Phase 3)
- For each domain/track, run the 6-round War Room session and log the full transcript to `d:\Hackathons\Nexconn\war-room\<domain>.md`:
  - **Round 0 - Brief (Jane, 5 lines)**: What this domain's PS authors really want, the 80% trap, the best dots.
  - **Round 1 - Idea storm**: Every LEAD seat proposes 1–3 ideas from their lens + research seeds (**aim for 20–30 candidates**; Thiel and Musk must each propose at least one crazy/contrarian idea).
  - **Round 2 - Attack**: Aggressive, idea-by-idea attack in strict order:
    `Munger (pre-mortem)` → `Harvey + Sharma (legal/regulatory)` → `Buffett (who pays)` → `Karpathy (can we build & demo it, is AI/Nexconn integration real)` → `Mike Ross (does it actually help; ethics)` → `Graham (tarpit? would judges care?)` → `Domain leads (field reality)`.
    Musk and Thiel defend or rescue. Ideas with a standing veto die or get restructured.
  - **Round 3 - Rebuild & merge**: Combine survivors; sharpen the secret (Thiel), the human (Mike), the rail/compliance (Sharma), the moat (Buffett), the stack & Nexconn integration (Karpathy).
  - **Round 4 - Score & vote**: Score using the 9-criterion weighted rubric. **Top 5 go forward** (must include at least one `"Doesn't exist"` idea and at least one `"Exists abroad, not in India"` idea if supported by research).
  - **Round 5 - Polish**: Jobs names each top-5 idea and writes the one-liner; Karp writes the 30-second explanation; Godin defines who it's for; Gary Vee defines the first-10k-users channel; Ive defines the 3-screen UX flow.
- Write the polished Top-5 ideas section for the domain to `d:\Hackathons\Nexconn\war-room\<domain>-ideas.md` following the exact `ideas.md` template.

#### Step 5 - Winnability, Assemble, Render (`SKILL.md` Lines 103–115, `war-room-protocol.md` Phase 4)
1. Compute the **Domain Winnability Index** across all tracks/domains, select the **#1 recommended domain + idea**, and select a **dark horse** pick.
2. Complete Part 5 (`Domain Winnability ranking`) and Part 6 (`The Council`) of `d:\Hackathons\Nexconn\biblehackathon.md`.
3. Assemble `d:\Hackathons\Nexconn\ideas.md`:
   - `Part 0 - Where to Play` (Domain Winnability ranking table, Council's #1 pick and dark horse with 5-line reason, All ideas at a glance table)
   - Every `war-room/<domain>-ideas.md` ordered by Domain Winnability rank (highest to lowest)
   - Merged numbered `# Sources` section at the end.
4. Verification checks before rendering:
   - Every idea has all template fields populated.
   - No raw war-room transcript leaked into `ideas.md` (transcripts belong only in `war-room/<domain>.md`).
   - No `TODO` / `TBD` placeholders anywhere.
   - Links are real and verified.
   - No duplicate ideas across domains.
5. Render both PDFs using `md2pdf.py`:
   ```powershell
   python "C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py" "d:\Hackathons\Nexconn\biblehackathon.md" --subtitle "Nexconn Hackathon · 2026"
   python "C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py" "d:\Hackathons\Nexconn\ideas.md" --subtitle "Nexconn Hackathon · Top ideas by domain"
   ```
6. Verify both `d:\Hackathons\Nexconn\biblehackathon.pdf` and `d:\Hackathons\Nexconn\ideas.pdf` exist and are `> 0` bytes.

#### Step 6 - Hand Over (`SKILL.md` Lines 116–122)
- Append final summary (domains, idea names, scores, winnability ranking, #1 recommendation + dark horse) to `d:\Hackathons\Nexconn\state.md`.

---

## 1.3 Complete Council Roster, Jurisdiction & Veto Rules (`council-roster.md`)

### Jurisdiction Modes (Per Idea/Domain)
| Mode | Who | Behaviour |
|---|---|---|
| **LEAD (aggressive)** | All Core + Extra seats that own that dimension + Domain Bench for the idea's home domain | Attack, rebuild, veto power on their dimension |
| **SUPPORT (constructive)** | Domain experts from *other* domains whose knowledge transfers | Add one cross-domain insight (1 line, marked `"support"`), no vetoes, no long arguments |
| **SILENT** | Domain experts with nothing real to add | Do not speak |

### Standing Vetoes (An idea CANNOT pass while a veto stands)
1. **Harvey Specter / R.S. Sharma**: Illegal, or requires a licence the team cannot obtain → veto until restructured (e.g., partnering with or acting as TSP to a licensed entity).
2. **Mike Ross**: Hurts, exploits, or adds unpaid burden to the people/frontline workers it claims to help → veto.
3. **Andrej Karpathy**: Cannot be demoed credibly within the hackathon time box → veto unless scope is cut to a real, working demo.
4. **Charlie Munger**: Has an obvious, fatal "how does this die" failure mode that nobody can rebut → veto.

### Speaking Protocol Inside `war-room/<domain>.md`
- Format: `**SEAT_NAME:** <1–4 sentences>`.
- Every factual claim in a turn must end with a source tag `[S#]` mapped to the research dossier, or `[unverified]`.
- No seat may say "this is impossible" except as a concrete constraint; Musk counters every "impossible" with a first-principles cut.
- **Session Chairs**: **Patrick Jane** chairs the recon debate (`research/F-connect-the-dots.md` & Round 0); **Paul Graham** chairs idea scoring (Round 4).

### The 11 Core Seats (Always Present)
| # | Persona | Dimension / Role | Core Framework & Key Questions |
|---|---|---|---|
| 1 | **Peter Thiel** | Market Gaps, Monopoly, Contrarian Truth | 0→1 vs 1→n, monopoly first in a small concentric market, 7 questions (Engineering 10x, Timing, Monopoly, People, Distribution, Durability, Secret). Asks: *"Who is the first 1,000 users, by name?"*, *"What's the secret?"* |
| 2 | **Alex Karp** | The Explainer / Philosophy of the Pitch | Moral/civilisational framing, Ontology first (what the system models about the world), speaks to decision-maker's fear & pride. Writes the **30-second plain-language explanation** for every surviving idea. |
| 3 | **Patrick Jane ◇** | Dot-Connector, Mind-Reader (*The Mentalist*) | Cold-reads organisers, sponsors, judges, PS writers, and competitors (the 80% trap). Every insight traced to evidence or labelled `HUNCH:`. Chairs Recon & Round 0. |
| 4 | **Warren Buffett** | Money, Unit Economics, Durability | Economic moat, pricing power, margin of safety, float. Defines revenue model, who writes the cheque (B2B, B2G, B2B2C, enterprise), ₹ pricing, CAC vs LTV, fintech hooks. |
| 5 | **Harvey Specter ◇** | Legal Strategy, Global & Indian Law (*Suits*) | Liability, IP, licensing, regulatory structuring (`law-checklist.md`). Asks: *"Who sues us first?"*, *"Which licence does this need, and who holds it that we can partner with?"* |
| 6 | **Mike Ross ◇** | Human Pain, Empathy, Emotional Truth (*Suits*) | Names a composite human grounded in cited data; builds the before/after emotional arc; enforces ethics (works on cheap phone, low bandwidth, no dark patterns). |
| 7 | **Steve Jobs †** | Positioning, Simplicity, Delivery | Focus by cutting features, customer experience first, rule of three. Names each product, writes the **one-liner**, and scripts the **45-second demo wow moment**. |
| 8 | **Elon Musk** | Delusional Ambition, First Principles | Physics/raw-material cost collapse; 5-step algorithm (question requirement → delete part → simplify → accelerate → automate). Writes the **Year-10 Moonshot** for each idea. |
| 9 | **Andrej Karpathy** | AI & Technology Architect | Simplest baseline first, data > model, human-in-the-loop ("autonomy slider"), exact tech stack, Nexconn SDK/tool integration, datasets, eval plan, what is real vs mocked in the time box. |
| 10 | **S. Jaishankar** | India Strategy & Geopolitics | Links ideas to national/strategic priorities (Viksit Bharat 2047, Atmanirbhar Bharat, IndiaAI, DPI exports, sovereign tech, supply chain resilience). |
| 11 | **Dr. R.S. Sharma** | India Compliance & Government Machinery | Open standards, consent architecture (DEPA, DPDP Act 2023 / Rules 2025), India Stack rails (Aadhaar, DigiLocker, UPI, AA, ABDM, ONDC, Bhashini), GeM procurement. |

### The 6 Extra Strategy Seats (Always Present)
| # | Persona | Dimension / Role | Core Job in Council |
|---|---|---|---|
| 12 | **Charlie Munger †** | Inversion, Devil's Advocate | Runs pre-mortem (*"It's 6 months later and this failed. Why?"*); analyses incentives; vetoes ideas with fatal flaws. |
| 13 | **Seth Godin** | Positioning & Remarkability | Defines smallest viable audience (*who this is for and who it is NOT for*) and the word-of-mouth story. |
| 14 | **Gary Vaynerchuk** | Distribution & Attention | Concrete path to first 10,000 users (WhatsApp groups, creators, developer communities, CSCs, FPOs, colleges, cost per user). |
| 15 | **Tim Cook** | Operations & Scale | Day-to-day operations, onboarding, support, field ops, SLAs, cost to serve at 100k users. |
| 16 | **Jony Ive** | Product Craft & UX | Reduces UX to an essential **3-screen flow**, accessibility, voice/low-literacy design where needed. |
| 17 | **Paul Graham** | Startup Judgement & Judge Simulator | Flags "tarpit ideas", evaluates schlep blindness, chairs Round 4 scoring like a hackathon judge panel. |

### Default Domain Bench (`council-roster.md` Lines 244–270)
Include the relevant bench seats for domains present in the hackathon (and add custom domain/Nexconn experts to `war-room/roster-additions.md`):
- **HealthTech**: Dr. Devi Shetty, Eric Topol, Atul Gawande
- **FinTech**: Vijay Shekhar Sharma, Patrick Collison, Nandan Nilekani
- **AgriTech**: M.S. Swaminathan †, Ashok Gulati, Verghese Kurien †
- **EdTech**: Sal Khan, Sugata Mitra
- **Climate / Energy / Sustainability**: Bill Gates, Sunita Narain
- **Cybersecurity**: Bruce Schneier, Mikko Hyppönen
- **Smart Cities / Infra / Mobility**: E. Sreedharan
- **Defence / Space / Strategic Tech**: Dr. APJ Abdul Kalam †, K. Sivan
- **AI / DeepTech**: Demis Hassabis (with Andrej Karpathy)
- **Web3 / Blockchain**: Vitalik Buterin
- **Social Impact / Inclusion / Rural**: Muhammad Yunus, Aruna Roy
- **Logistics / Retail / Supply Chain**: Tim Cook, Kishore Biyani
- **Media / Entertainment / Creator Economy**: Ronnie Screwvala
- **Optional/Custom Role Seats**: Hardware/IoT expert, Manufacturing/Industry 4.0 (Anand Mahindra), Women & Child (Ela Bhatt †), Water (Rajendra Singh), plus **Sponsor/Nexconn Platform & SDK Architect** (mandatory per `SKILL.md` Line 74: *"a sponsor-tech expert"*, documented in `war-room/roster-additions.md`).

---

## 1.4 Scoring Rubrics (`war-room-protocol.md` Lines 52–79)

### A. Idea Scoring Rubric (Round 4 - Weighted Total out of 10.0)
Every top-5 idea in every domain MUST display its individual criterion scores (1–10) and weighted total out of 10:

| # | Criterion | Weight | Owner |
|---|---|---|---|
| 1 | **Pain severity & scale** (`pain`) | **15%** | Mike Ross + Domain Lead |
| 2 | **Novelty / secret (gap others miss)** (`novelty`) | **15%** | Thiel + Jane |
| 3 | **Alignment with organiser/judge/sponsor intent** (`alignment`) | **15%** | Jane + Jaishankar |
| 4 | **Demo-ability & wow in the time box** (`demo`) | **15%** | Jobs + Karpathy |
| 5 | **Technical feasibility for this team** (`feasibility`) | **10%** | Karpathy |
| 6 | **India fit & deployability (rails, language, cost)** (`India`) | **10%** | Sharma + Jaishankar |
| 7 | **Business viability** (`business`) | **10%** | Buffett |
| 8 | **Legal/compliance cleanliness** (`legal`) | **5%** | Harvey + Sharma |
| 9 | **Moonshot scale** (`moonshot`) | **5%** | Musk |
| **Total** | **Weighted Score** | **100% (10.0)** | **Chaired by Paul Graham** |

Formula:
$$\text{Score} = 0.15(\text{pain} + \text{novelty} + \text{alignment} + \text{demo}) + 0.10(\text{feasibility} + \text{India} + \text{business}) + 0.05(\text{legal} + \text{moonshot})$$

### B. Domain Winnability Index (Phase 4 - Weighted Total out of 10.0)
Computed for every track/domain (including Open Innovation) to rank where the team has the highest odds of winning:

| # | Factor | Weight | How to Measure |
|---|---|---|---|
| 1 | **Competition density (inverse)** | **25%** | Predicted share of teams choosing this domain (10 = least crowded / blue ocean; 1 = overcrowded tarpit) |
| 2 | **Prior-work saturation (inverse)** | **20%** | GitHub repo counts, past-hackathon projects, existing startups for the PS (10 = fresh gap; 1 = saturated) |
| 3 | **Excitement / demo factor** | **20%** | How visual, live, interactive, and surprising a 3-minute demo can be |
| 4 | **Jury & organiser alignment** | **20%** | From Tracks A, B, C, D: how strongly Nexconn / Reskilll / decision-makers care about this track |
| 5 | **Feasibility for the team in the time box** | **15%** | Data/API/Nexconn SDK access, hardware needs, build complexity within the hackathon window |

Formula:
$$\text{Winnability} = 0.25(\text{CompInv}) + 0.20(\text{SatInv} + \text{Demo} + \text{Align}) + 0.15(\text{Feas})$$

---

## 1.5 Exact Output Templates & Formatting Rules (`output-templates.md`)

### Formatting Rules for Markdown → PDF (`md2pdf.py`)
- Use `#` (`H1`) **only** for major Parts (`# Part 1 - ...`, `# <Domain 1>`, `# Sources`) because CSS in `md2pdf.py` applies `page-break-before: always` to every `h1` after the first.
- Use `##` (`H2`) for sections (`md2pdf.py` generates the automatic Table of Contents from `H1` and `H2` headings via `toc_depth: "1-2"`).
- Tables render cleanly with styled headers; avoid raw HTML blocks.
- Every factual claim must have an inline source link or `[S#]` reference, and both `biblehackathon.md` and `ideas.md` must end with `# Sources` containing a numbered list of real URLs.

### Template 1: `d:\Hackathons\Nexconn\biblehackathon.md`
Must contain these exact top-level H1 parts and H2 sections:
```markdown
# <Hackathon Name> - The Hackathon Bible
> One-paragraph verdict: what this hackathon really is, why it exists, and how to win it.

# Part 1 - The Facts
## At a glance
## Evaluation criteria
## Themes & problem statements
## Timeline & deliverables checklist

# Part 2 - The People
## Organisers & committee
## Sponsors
## Judges & jury
## Judge heat-map

# Part 3 - Why This Hackathon, Why Now
## The real reason it exists
## Policy & scheme drivers
## Incidents & history behind the problem statements
## Geopolitical lens (global + India)
## What the organisers want to announce afterwards

# Part 4 - Connecting the Dots
## Dots nobody else will connect
## Hidden evaluation criteria
## Landmines - what will annoy this jury
## The 80% trap - what most teams will build

# Part 5 - The Battlefield
## Competition forecast
## Prior work by domain
## Domain Winnability ranking

# Part 6 - The Council
## Who sat in the war room

# Sources
```
*(Note: To satisfy `ORIGINAL_REQUEST.md` R2, Part 2 `## Sponsors` / `## Organisers & committee` and Part 4 must deeply document Nexconn's philosophy, mentality, products, services, and tools/SDKs and how leveraging them creates outsized impact.)*

### Template 2: `d:\Hackathons\Nexconn\ideas.md`
Must contain these exact top-level H1 parts and H2 sections, with **5 ideas per domain** ordered by Domain Winnability:
```markdown
# <Hackathon Name> - Top Ideas by Domain
> How to read this: 5 ideas per domain, ranked. Scores are the council's weighted rubric (out of 10).
> Winnability ranking of domains is in Part 0.

# Part 0 - Where to Play
## Domain Winnability ranking
## The council's #1 pick and dark horse
## All ideas at a glance

# <Domain 1>
## Domain snapshot

## Idea 1 - <Name>: <one-liner>
**Type:** Exists-but-weak / Doesn't exist / Exists abroad, not in India   **Score:** X.X/10   **Problem statement:** <ID>

**The pain (Mike Ross):** ...
**Why now:** ...
**The gap others miss (Jane / Thiel):** ...
**What exists and why it falls short:** (table: product/repo/paper · what it does · gap · link)
**How it works:** (4–7 bullet flow from user action to outcome, explicitly showing Nexconn tool/service/SDK usage)
**The demo moment (Jobs):** (what judges see in the first 45 seconds)
**30-second explanation (Karp):** (plain-language paragraph anyone can repeat)

**Council jurisdiction (short verdicts, only seats that matter for this idea):**
| Seat | Verdict |
|---|---|
| Thiel - market & moat | … |
| Buffett - money | revenue model, who pays, ₹ pricing, fintech hooks |
| Harvey / Sharma - legal & India compliance | laws that apply + how the MVP stays clean |
| Jaishankar - India alignment | national priority, scheme, ministry that will own it |
| Karpathy - AI & tech | model choices, Nexconn SDK/service integration, why the AI is load-bearing |
| Mike Ross - human & ethics | … |
| Munger - how it dies | top risk + mitigation |
| Musk - year-10 moonshot | … |
| <Domain lead> - field reality | … |
| Godin / Gary Vee - first 10k users | … |

**Tech stack (basic):** Frontend · Backend · AI/ML (models, APIs) · Data (sources, DB) · India rails · Infra · Sponsor/Nexconn tech used.
**Implementation sketch:** MVP scope for the hackathon time box in phases (H0–6, H6–18, H18–30, H30–36), what is real vs mocked in the demo, datasets with links.
**Score breakdown:** pain x · novelty x · alignment x · demo x · feasibility x · India x · business x · legal x · moonshot x.

(Repeat ## Idea 2 through ## Idea 5 for <Domain 1>, then repeat # <Domain 2> ... for all tracks including Open Innovation)

# Sources
```

---

# Deliverable 2: `agent-browser` Usage Specification

## 2.1 How to Invoke in This Environment
Because `agent-browser` is not installed globally in `C:\Users\Harshad\AppData\Roaming\npm`, invoke it via `npx --yes agent-browser ...` (or install globally first via `npm i -g agent-browser && agent-browser install`).

## 2.2 Session Isolation (Mandatory Best Practice)
Never use the unnamed default session (which collides across parallel agents). Always pass `--session <unique-session-name>`:
```powershell
npx --yes agent-browser --session nexconn_recon open https://reskilll.com/hack/nexconn/
```

## 2.3 Core Inspection Workflow for Live Hackathon & Company Pages
```powershell
# 1. Open target URL in an isolated session
npx --yes agent-browser --session nexconn_recon open https://reskilll.com/hack/nexconn/

# 2. Wait for page load / key content
npx --yes agent-browser --session nexconn_recon wait --load domcontentloaded

# 3. Read full rendered text / markdown from active tab DOM
npx --yes agent-browser --session nexconn_recon read

# 4. Snapshot interactive elements + URLs (compact ~200-400 tokens)
npx --yes agent-browser --session nexconn_recon snapshot -i -u

# 5. Scroll down to trigger lazy-loaded sections (tracks, judges, FAQs, sponsors)
npx --yes agent-browser --session nexconn_recon scroll down 1000
npx --yes agent-browser --session nexconn_recon snapshot -i -u

# 6. Click interactive tabs/accordions (e.g., problem statement modals or FAQ items)
npx --yes agent-browser --session nexconn_recon click @e5
npx --yes agent-browser --session nexconn_recon snapshot -i

# 7. Extract structured DOM data via JS evaluation (stdin heredoc / pipeline)
@"
Array.from(document.querySelectorAll('a')).map(a => ({text: a.innerText.trim(), href: a.href}))
"@ | npx --yes agent-browser --session nexconn_recon eval --stdin

# 8. Capture full-page screenshot if visual verification is needed
npx --yes agent-browser --session nexconn_recon screenshot --full "d:\Hackathons\Nexconn\research\00-source\nexconn-page.png"

# 9. Close session when done
npx --yes agent-browser --session nexconn_recon close
```

---

# Deliverable 3: Workspace & Toolchain Audit

## 3.1 Current Contents of `d:\Hackathons\Nexconn`
- `d:\Hackathons\Nexconn\.agents\` (Teamwork metadata directory only).
- No hackathon research or deliverable files exist yet in `d:\Hackathons\Nexconn\`.

## 3.2 Environment & PDF Generation Toolchain Audit
| Component | Status | Path / Details |
|---|---|---|
| **OS / Shell** | Available | Windows / PowerShell |
| **Python** | Available (`3.13.13`) | `python` on `PATH` |
| **`python-markdown`** | Installed | Required by `md2pdf.py` (`tables`, `fenced_code`, `toc`, `sane_lists`, `attr_list` extensions all work) |
| **Microsoft Edge** | Installed | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` (auto-detected first by `md2pdf.py`) |
| **Google Chrome** | Installed | `C:\Program Files\Google\Chrome\Application\chrome.exe` (fallback in `md2pdf.py`) |
| **`war-room-council/scripts/md2pdf.py`** | **Verified Working** | Tested end-to-end on Windows; converts `.md` to styled A4 `.pdf` with Cover Page, Table of Contents, and styled tables via headless Edge (`--headless=new --print-to-pdf`). |
| **`pypdf` & `fitz` (PyMuPDF) & `reportlab`** | Installed | Available in Python 3.13 if PDF page-count/text inspection is needed during verification. |
| **Node.js / npm / npx** | Installed | `C:\Program Files\nodejs\node.EXE`, `npm.CMD`, `npx.CMD` |
| **`agent-browser`** | Available via `npx` | Run via `npx --yes agent-browser ...` |
| **`curl`** | Installed | `C:\Windows\system32\curl.EXE` |

---

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | `war-room-council` | Step 0 Workspace & `state.md` Initialization | Creates `research/00-source/`, `research/domains/`, `war-room/`, and `state.md` | Hackathon URL, team size, time box, skills | Directory tree + `state.md` | Prompts for link if missing | `war-room-council/SKILL.md:49-53` |
| 2 | `war-room-council` | Step 1 Fact Extraction (`01-facts.md`) | Scrapes hackathon page + fallbacks, saves raw files, extracts verbatim tracks/PS/rules/criteria | Live URL / `agent-browser` / web search | `research/00-source/*`, `research/01-facts.md` | Falls back to API, search, social posts, browser tool | `recon-playbook.md:6-18` |
| 3 | `war-room-council` | Step 2 Parallel Recon Tracks A–E | 5 parallel recon tracks: Organisers (A), Sponsors (B), Judges (C), Why-Now Triggers (D), Competition Forecast (E) | `research/01-facts.md` + web search | `research/A-organisers.md` .. `research/E-competition.md` | Unknown facts must be marked `unknown`, hunches `HUNCH:` | `recon-playbook.md:19-68` |
| 4 | `war-room-council` | Phase 2 Domain Deep Research | Per-domain 7-part deep research (Pain map with 5+ voices, Urgency 1–10, Prior art repos/papers/winners, 3-bucket Gap analysis, India/Sponsor rails, Tech frontier, 15+ raw seeds) | `01-facts.md` + web/paper/repo searches | `research/domains/<domain>.md` | Must cite real links; never invent repos/papers | `war-room-protocol.md:3-25` |
| 5 | `war-room-council` | Step 2 Council Roster & `roster-additions.md` | Assembles 11 Core + 6 Extra + Domain Bench + custom role/sponsor seats with LEAD/SUPPORT/SILENT modes | `council-roster.md` + domain list | Roster table in `state.md` + `war-room/roster-additions.md` | Pre-approved per `ORIGINAL_REQUEST.md:27` | `SKILL.md:68-82`, `council-roster.md:1-281` |
| 6 | `war-room-council` | Step 3 Connect the Dots (`F-connect-the-dots.md`) | Patrick Jane synthesis session producing 6 sections including 7+ connected dots, hidden criteria, landmines, and 80% trap | `research/A..E` | `research/F-connect-the-dots.md` | Every insight must trace to dated evidence | `recon-playbook.md:69-79` |
| 7 | `war-room-council` | Phase 3 War Room Debate (Rounds 0–5) | Per-domain 6-round debate (Brief, 20–30 Idea Storm, Ordered Attack with Vetoes, Rebuild, 9-criterion Scoring, Polish) | Recon + Domain dossier + Roster + `law-checklist.md` | `war-room/<domain>.md` (transcript) + `war-room/<domain>-ideas.md` (Top 5) | Ideas with standing veto from Harvey/Sharma, Mike, Karpathy, or Munger cannot pass | `war-room-protocol.md:26-64` |
| 8 | `war-room-council` | Phase 4 Domain Winnability Index | 5-factor weighted ranking of all domains + #1 domain/idea pick + dark horse | Recon + Domain research + War room scores | Winnability table in `biblehackathon.md`, `ideas.md`, `state.md` | Must state data/uncertainty basis | `war-room-protocol.md:66-80` |
| 9 | `war-room-council` | Step 5 Markdown Assembly & PDF Rendering (`md2pdf.py`) | Assembles `biblehackathon.md` (6 Parts + Sources) and `ideas.md` (Part 0 + Top 5 per domain + Sources) and renders A4 PDFs via headless Edge/Chrome | `.md` file + `--subtitle` | `biblehackathon.pdf`, `ideas.pdf` | Exits non-zero if `markdown` missing, browser missing, or PDF size is 0 | `output-templates.md:1-112`, `scripts/md2pdf.py:1-117` |
| 10 | `agent-browser` | CDP Browser Automation CLI | Opens JS-rendered pages, takes accessibility snapshots (`@eN`), extracts DOM text/links, clicks tabs/accordions, takes screenshots | `--session <name>` + subcommands (`open`, `read`, `snapshot -i`, `eval --stdin`) | Rendered text, JSON/accessibility tree, screenshots | Fails if called without `npx` when not globally installed | `agent-browser/SKILL.md`, `npx agent-browser skills get core` |

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---|---|---|
| 1 | `agent-browser` CLI invocation | Running `agent-browser` directly in PowerShell | Fails with `CommandNotFoundException`; must use `npx --yes agent-browser <args>` unless globally installed via `npm i -g agent-browser`. |
| 2 | `war-room-council` Workspace Path | Default `~/hackathons/<slug>/` vs `ORIGINAL_REQUEST.md` | `ORIGINAL_REQUEST.md` requires all deliverables directly in `d:\Hackathons\Nexconn\` (`biblehackathon.md/.pdf`, `ideas.md/.pdf`, `state.md`, `research/`, `war-room/`). |
| 3 | `war-room-council` User Approval Gate | Step 2 mandatory roster confirmation gate | Explicitly pre-approved in `ORIGINAL_REQUEST.md` Line 27 so execution must NOT block on user input. |
| 4 | `md2pdf.py` Heading Levels | Using `#` (H1) inside idea descriptions | Every `#` (H1) triggers a CSS `page-break-before: always` in `md2pdf.py`; only major Parts/Domains may use `#`, while sections and ideas must use `##` or `###`. |
| 5 | `ideas.md` Transcript Separation | Including raw `**THIEL:**` dialogue inside `ideas.md` | Explicitly forbidden by `output-templates.md` Line 108 ("No war-room transcript; only conclusions"). Raw dialogue goes only in `war-room/<domain>.md`. |

---

## 5. Verification Method

To independently verify the findings in this report:
1. **Verify `war-room-council` skill files**:
   Inspect `C:\Users\Harshad\.gemini\config\skills\war-room-council\SKILL.md` and all 5 files in `C:\Users\Harshad\.gemini\config\skills\war-room-council\references\`.
2. **Verify PDF generation pipeline (`md2pdf.py`)**:
   Run:
   ```powershell
   python "C:\Users\Harshad\.gemini\config\skills\war-room-council\scripts\md2pdf.py" "<path-to-md>" --subtitle "Verification"
   ```
   and confirm exit code `0` and output `.pdf` size `> 0` bytes (or inspect page count with `python -c "import pypdf; r=pypdf.PdfReader('<path-to-pdf>'); print(len(r.pages))"`).
3. **Verify `agent-browser` execution**:
   Run `npx --yes agent-browser --version` or `npx --yes agent-browser skills get core` in PowerShell.
