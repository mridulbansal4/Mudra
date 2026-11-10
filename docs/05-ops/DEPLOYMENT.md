# Deployment Playbook (Hackathon MVP & Production) — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Release & Cloud Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Infrastructure](./INFRASTRUCTURE.md) · [CI/CD](./CICD.md) · [Runbook](./RUNBOOK.md)

---

## 1. Hackathon MVP Deployment Architecture (Zero-Cold-Start Guarantee)

Red Team Seat `R26` (Corey Quinn) and `R25` (Exhausted Judge) warn that free-tier containers that sleep after 15 minutes of inactivity fail when a judge clicks the Live App link at 2:00 AM.

**Our Guarantee**:
1. **Frontend (`apps/web`)**: Deployed on **Vercel Edge / Cloudflare Pages** (`https://samadhan-os.vercel.app`) — globally cached static HTML/CSS/JS + `.wasm` binary with `<60ms` TTFB and zero cold start.
2. **Polyglot Backend (`deal-engine-go`, `assay-verifier-rs`, `nexconn-bridge-node`, PostgreSQL 17, Redis)**: Deployed on **Always-On Railway Pro / AWS `ap-south-1` / Alibaba Cloud ECS** with `minReplicas: 1` and a 60-second synthetic heartbeat cron (`GET /api/v1/traction/telemetry`), guaranteeing `0ms` cold-start penalty during the entire Nov 23–27, 2026 judging window.

---

## 2. Step-by-Step Deployment Commands

### 2.1 Deploy Polyglot Backend Stack via Docker Compose / Railway
```bash
# 1. Build optimized multi-stage images (Go 14MB, Rust 16MB, Node 64MB)
docker compose -f infra/docker/docker-compose.prod.yml build

# 2. Verify environment variables (NEXCONN_APP_KEY, NEXCONN_SECRET_KEY, GEMINI_API_KEY, DATABASE_URL)
./scripts/verify-env.sh

# 3. Start stack with automatic advisory-locked PostgreSQL 17 migrations & persona seed
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

### 2.2 Deploy Web Story Frontend (`apps/web`)
```bash
# 1. Compile Rust WASM forensic module into packages/nc-lit-cards/wasm
cd packages/assay-wasm-rs && wasm-pack build --target web --release && cd ../..

# 2. Build Vite 6 + React 19 + HeroUI v3 bundle & run Hallmark sloplint gate
pnpm --filter @samadhan/web build
node scripts/sloplint.mjs apps/web/dist --render

# 3. Deploy to production edge
npx vercel deploy --prod
```

---

## 3. Zero-Downtime Database Migration & Release Process

All SQL schema migrations in `services/deal-engine-go/internal/db/migrations/` follow the **Expand-and-Contract** pattern:
1. **Expand**: Add nullable columns or new tables (`CREATE TABLE IF NOT EXISTS ...`) inside an advisory lock (`pg_advisory_lock(882101)`) before rolling out new Go/Rust/Node container instances.
2. **Health Gate**: Load balancer waits for `GET /health` on `:4002` (which checks `:4001` Node Bridge, `:4003` Rust Verifier, PostgreSQL 17, and Redis) to return HTTP `200 OK` three consecutive times before draining old containers.
3. **Feature Flag Activation**: Runtime feature flags (`FEATURES.md` §2) can be toggled via environment config or query parameters (`?camera=simulated_hd`) without redeploying binaries.
