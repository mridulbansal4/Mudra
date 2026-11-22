# Contributing to MUDRA-OS (`SamvadDeal`)

Thank you for contributing to **MUDRA-OS (`SamvadDeal`)** by Team `Chanakya`! To keep our polyglot monorepo (`Go 1.24` + `Rust 1.85/WASM` + `Node.js 22` + `React 19 / HeroUI v3` + `Expo 53 / heroui-native`) fast, deterministic, and regression-free during the **Nexconn Build Challenge 2026**, please follow this guide.

For detailed engineering rules, also read [`docs/03-engineering/CODING_STANDARDS.md`](../docs/03-engineering/CODING_STANDARDS.md) and [`docs/03-engineering/GIT_WORKFLOW.md`](../docs/03-engineering/GIT_WORKFLOW.md).

---

## 1. Local Development Setup

1. Follow [`docs/03-engineering/ENVIRONMENT_SETUP.md`](../docs/03-engineering/ENVIRONMENT_SETUP.md) to install **Node.js 22.12+**, **pnpm 9.15+**, **Go 1.24+**, **Rust 1.85+ (`wasm-pack`)**, and **Docker Compose**.
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Start PostgreSQL 17 and DragonflyDB / Redis 7.4:
   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d postgres redis
   ```
4. Install dependencies, compile the Rust WebAssembly package, and start all services:
   ```bash
   pnpm install
   pnpm --filter @mudra/assay-wasm-rs build:wasm
   pnpm --filter @mudra/nc-lit-cards build
   pnpm dev
   ```

---

## 2. Branch Naming Convention (Trunk-Based Development)

All feature branches are cut from `main` and merge back via squash Pull Requests within `< 12 hours`:

```text
<type>/<canonical-id>-<kebab-case-slug>
```

- **Examples**:
  - `feat/F-04-go-escrow-optimistic-lock`
  - `feat/F-05-rust-phash-fft-verifier`
  - `feat/F-11-sandbox-split-screen-tour`
  - `fix/R-03-lit-card-pre-ready-hook`
  - `docs/API-08-freeze-arbitration-spec`

---

## 3. Commit Message Format (Conventional Commits 1.0)

```text
<type>(<scope>): <imperative summary in <= 72 chars> [<canonical-id>]
```

- **Valid `<type>`**: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `ci`, `chore`
- **Valid `<scope>`**: `web`, `mobile`, `lit-cards`, `assay-wasm`, `bridge-node`, `deal-go`, `assay-rs`, `api`, `docs`
- **Examples**:
  - `feat(deal-go): enforce optimistic version lock on escrow release [F-04]`
  - `feat(assay-rs): add 4096-point Hann window FFT acoustic motor check [F-05]`
  - `fix(web): preserve 1:1 pointer capture on WebRTC assay PiP loupe [F-05]`

---

## 4. Pull Request Checklist & Definition of Done (DoD)

Before marking a PR ready for review, verify every item below:

- [ ] **Canonical ID Alignment**: All referenced features (`F-01`..`F-14`), entities (`E-01`..`E-10`), and APIs (`API-01`..`API-18`) match [`docs/00-overview/PROJECT_BRIEF.md`](../docs/00-overview/PROJECT_BRIEF.md) and [`api/openapi.yaml`](../api/openapi.yaml).
- [ ] **Nexconn SDK Safety**:
  - Custom Lit cards (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`) are registered before `await NCChatUIApplication.ready()`.
  - `NCEngine` is connected before `NCCallEngine` starts or accepts a call.
  - `NEXCONN_SECRET_KEY` is never imported or referenced in `apps/web` or `apps/mobile`.
- [ ] **Design & Accessibility Craft (`/hallmark` + `/unslop` + `/apple-design` + `/heroui-react`)**:
  - `/* hallmark:v2.0.0 */` remains on line 1 of `apps/web/src/styles/globals.css`.
  - No `<HeroUIProvider>` in React v3; compound `<Card.Header>` / `<Card.Content>` / `<Card.Footer>` and `onPress` handlers used throughout.
  - All prices (`₹`), timers, and scores use `font-variant-numeric: tabular-nums`.
  - `npx sloplint --render http://localhost:5173` passes with `0` errors.
- [ ] **Tests & Performance Budgets**:
  - `pnpm test`, `go test -race ./...`, and `cargo test --all-targets` pass.
  - Go FSM transition latency remains `< 1.2ms` p99; Rust DPDP PII scrub remains `< 300µs` with `1.000` recall on `ai/evals/datasets/dpdp-pii-corpus.jsonl`.
