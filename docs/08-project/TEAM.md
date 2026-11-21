# Team Topology, RACI Matrix & Governance - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Hackathon Plan](../00-overview/HACKATHON_PLAN.md) · [Backlog](./BACKLOG.md)

---

## 1. Team `Chanakya` Roster & Role Ownership

| Seat | Role Title | Core Technical & Domain Ownership | Primary Directories Owned |
|---|---|---|---|
| **Dev 1** | **Lead Architect & Nexconn SDK Specialist** | `console.nexconn.ai` configuration, `@nexconn/server-sdk@0.1.2` Node Bridge (`:4001`), `@nexconn/chatui` (`<nc-chat-ui-app-provider>`), `@nexconn/chat` (`NCEngine` `Open` & `Community` channels), `@nexconn/call` (`NCCallEngine`), and `packages/nc-lit-cards` (`lit@^3.3.2`). | `services/nexconn-bridge-node/`, `packages/nc-lit-cards/`, `apps/web/src/lib/nexconn-boot.ts` |
| **Dev 2** | **Systems Backend Lead (Go 1.24 + Rust 1.85 + WASM)** | Go 1.24 Deal & Escrow FSM (`:4002`), PostgreSQL 17 schema & optimistic locking (`E-01`..`E-10`), Rust 1.85 Forensic Verifier (`:4003`: `<300µs` DPDP PII scrubber, 64-bit `pHash`, 4096-pt `rustfft`, Ed25519 voucher signer), and `packages/assay-wasm-rs` (60fps browser WASM). | `services/deal-engine-go/`, `services/assay-verifier-rs/`, `packages/assay-wasm-rs/`, `infra/` |
| **Dev 3** | **Frontend Story UX, Apple Motion & Mobile Lead** | 9-route Story Frontend (`/` → `/auth` → `/onboarding` → `/app` → `/sandbox` → `/arena` → `/dispatch` → `/guide` → `/traction`), HeroUI v3 (`@heroui/react`), `/hallmark` Floor, `/unslop` tokens, `/apple-design` PiP physics, Simulated HD Camera Stream, and `apps/mobile-expo` (`heroui-native` + Uniwind). | `apps/web/`, `apps/mobile-expo/`, `packages/shared-types/` |
| **Dev 4** | **AI Streaming, Golden Evals, QA & Viral MAU Growth Lead** | Gemini 2.5 Flash/Pro + Bhashini ULCA prompts (`M-01`..`M-05`), Golden JSONL Evals (`ai/evals/`), Playwright E2E suite, `/arena` campus viral MAU rollout (`500–1,000+` MAUs), 3-minute demo video, and Write-up PDF. | `ai/`, `tests/`, `scripts/`, `docs/` |

---

## 2. RACI Matrix Across Core Workstreams

*(**R** = Responsible · **A** = Accountable · **C** = Consulted · **I** = Informed)*

| Workstream / Deliverable | Dev 1 (Nexconn & Lit) | Dev 2 (Go & Rust/WASM) | Dev 3 (Story UX & HeroUI) | Dev 4 (AI, Evals & MAU) |
|---|---|---|---|---|
| **Nexconn v4 Server SDK & Client Boot Lifecycle (`F-01`, `R-01`)** | **A / R** | C | C | I |
| **Custom Lit Message Cards (`<nc-escrow-deal-card>`, `F-04`)** | **A / R** | C | R (Styling) | I |
| **Go 1.24 Escrow FSM & PostgreSQL 17 Schema (`E-01`..`E-10`)** | C | **A / R** | I | I |
| **Rust 1.85 `<300µs` PII Scrubber, `pHash`, `rustfft` & Ed25519 (`F-06`)**| I | **A / R** | C (WASM Worker)| C (Vision `M-03`) |
| **Story Frontend (`/` → `/auth` → `/onboarding` → `/app` → `/sandbox`)** | C | C | **A / R** | C |
| **Hallmark `sloplint --render`, Unslop & Apple Fluid Motion (`R-11`)** | I | I | **A / R** | R (CI Gate) |
| **Mobile Field Companion (`apps/mobile-expo` `heroui-native`)** | C | I | **A / R** | I |
| **Cross-Lingual Streaming (`M-01`/`M-02`) & Tribunal (`M-04`)** | R (Stream API)| C (PII Scrub) | I | **A / R** |
| **Viral `/arena` MAU Campaign (`500+` MAUs) & `/traction` Proof** | C | R (`API-18`) | R (`/arena` UI)| **A / R** |
| **3-Minute Demo Video, PDF Write-Up & Reskilll `pS(n)` Submission** | C (`App Key`) | C | C | **A / R** |

---

## 3. Communication Cadence & Architectural Decision Protocol

1. **6-Hour Milestone Checkpoints (`M1` at `H03` through `M8` at `H36`)**:
   - At each milestone gate in `HACKATHON_PLAN.md`, all 4 engineers run a 5-minute live integration check against `main` (`docker compose up` + Playwright smoke test).
2. **Single Source of Truth (`PROJECT_BRIEF.md` + `api/openapi.yaml`)**:
   - No endpoint path, JSON field name, or Lit custom element tag name may be changed without updating `PROJECT_BRIEF.md` and `api/openapi.yaml` first.
3. **15-Minute Rule for Blockers**:
   - If any engineer is blocked for more than 15 minutes (e.g., Shadow DOM event propagation or WebRTC ICE candidate timing), immediately pair-debug using the patterns in `NEXCONN_SDK_MANUAL.md`.
