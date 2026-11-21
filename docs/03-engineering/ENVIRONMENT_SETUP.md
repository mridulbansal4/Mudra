# Local Environment Setup Guide (Windows, macOS & Linux) - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (DevEx & Infra Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Nexconn SDK Manual](./NEXCONN_SDK_MANUAL.md) · [Backend](./BACKEND.md) · [Frontend](./FRONTEND.md) · [`.env.example`](../../.env.example)

---

## 1. Prerequisites & Tooling Versions

Ensure the following tools are installed before bootstrapping MUDRA-OS:

| Tool | Required Version | Install Command (Windows PowerShell / Winget) | Install Command (macOS / Linux) |
|---|---|---|---|
| **Node.js & pnpm** | `>= 22.12.0 LTS` & `pnpm >= 9.15` | `winget install OpenJS.NodeJS.LTS; corepack enable` | `nvm install 22 && corepack enable` |
| **Go** | `>= 1.24.0` | `winget install GoLang.Go` | `brew install go` |
| **Rust & `wasm-pack`** | `>= 1.85.0` (2024 Edition) | `winget install Rustlang.Rustup; cargo install wasm-pack` | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh && cargo install wasm-pack` |
| **Docker Desktop** | `>= 27.0` (for PG 17 & Redis 7.4) | `winget install Docker.DockerDesktop` | `brew install --cask docker` |

---

## 2. 5-Minute Step-by-Step Local Setup

### Step 1: Clone Repository & Configure `.env`
```bash
git clone https://github.com/chanakya-team/mudra-os.git
cd mudra-os
cp .env.example .env
```
Open `.env` and fill in your **Nexconn `App Key` and `Secret Key`** from [https://console.nexconn.ai](https://console.nexconn.ai) (follow the step-by-step instructions in [NEXCONN_SDK_MANUAL.md](./NEXCONN_SDK_MANUAL.md) §2) and your `GEMINI_API_KEY`.

### Step 2: Start PostgreSQL 17 & DragonflyDB / Redis 7.4
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```
- Starts **PostgreSQL 17** on `localhost:5432` (`postgres://mudra:mudra_dev_pass@localhost:5432/mudra_os`)
- Starts **DragonflyDB / Redis 7.4** on `localhost:6379`

### Step 3: Build the Rust WebAssembly Module (`packages/assay-wasm-rs`)
```bash
cd packages/assay-wasm-rs
wasm-pack build --target web --out-dir ../nc-lit-cards/wasm
cd ../..
```

### Step 4: Install Node & Workspace Dependencies (`apps/web`, `packages/nc-lit-cards`, `services/nexconn-bridge-node`)
```bash
pnpm install
```

### Step 5: Start All Services in One Command (or Separate Terminals)
```bash
# Terminal 1: Start Node.js 22 Official Nexconn SDK Bridge (:4001)
pnpm --filter @mudra/nexconn-bridge-node dev

# Terminal 2: Start Rust 1.85 Forensic Assay & PII Verifier (:4003)
cd services/assay-verifier-rs && cargo run --release

# Terminal 3: Start Go 1.24 Deal Engine, Auto-Migrations & Seed Data (:4002)
cd services/deal-engine-go && go run ./cmd/server

# Terminal 4: Start React 19 + HeroUI v3 + Lit Story Frontend (http://localhost:5173)
pnpm --filter @mudra/web dev
```

---

## 3. Automatic Seed Data & Verification

When `services/deal-engine-go` starts on `:4002`, it automatically runs SQL migrations (`E-01`..`E-10`) and seeds:
1. **4 Demo Personas (`P-01`..`P-04`)**:
   - `buyer_rajesh_ta_8821` (*Rajesh Natarajan · Tirupur MSME Buyer · Tamil*)
   - `seller_vikram_hi_8821` (*Vikramjeet Singh · Ludhiana Machinery Dealer · Hindi*)
   - `trader_aarav_en_8821` (*Aarav Mehta · Bengaluru Campus GPU Trader · English/Marathi*)
   - `arbitrator_meera_sg_8821` (*Meera Krishnan · Senior Dispute Arbitrator · English/Tamil/Hindi*)
2. **Seeded Deal Room `#8821`**: Juki MO-6814S High-Speed Overlock Machine (`₹1,45,000` / `14500000` paise) with pre-configured checklist items.
3. **Seeded `Open` Flash Lots & 4 `Community` Category Subchannels**: `sub/machinery`, `sub/refurb-tech`, `sub/agri-mandi`, `sub/campus-thrift`.

Verify all three backend services are healthy:
```bash
curl -s http://localhost:4001/health   # Node Bridge (@nexconn/server-sdk@0.1.2)
curl -s http://localhost:4002/health   # Go 1.24 Deal Engine
curl -s http://localhost:4003/health   # Rust 1.85 Assay Verifier
```

---

## 4. Troubleshooting Common Issues

| Symptom | Root Cause | Exact Fix |
|---|---|---|
| `pnpm install` fails on `@nexconn/server-sdk` | Git SSH vs HTTPS clone on Windows | Ensure `package.json` uses `"git+https://github.com/NexconnAI-Dev/nexconn-server-sdk-node.git#v0.1.2"`. |
| `<nc-escrow-deal-card>` renders as plain JSON text inside chat | `registerMessageType` was called after `app.ready()` | Check `apps/web/src/lib/nexconn-boot.ts` - all `registerMessageType` calls must stay inside `NCChatUIApplication.initialize({ hooks: { beforeReady() } })`. |
| `@nexconn/call` `startCall` hangs with no remote ring | `NCCallEngine` invoked before `NCEngine.connect` finished | Ensure `await NCEngine.connect({ token })` resolves before calling `NCCallEngine.getInstance()`. |
| No webcam attached on desktop / permission denied | Browser `NotFoundError` / `NotAllowedError` | Toggle **"Use Simulated HD Inspection Video Stream"** on `/onboarding` or in the `/sandbox` top bar (`FF_SIMULATED_HD_CAMERA=true`). |
