# CLAUDE.md - AI Coding Agent Instructions for MUDRA-OS (`SamvadDeal`)

Read this file **first** before writing or modifying any code in this repository. For full navigation across all 65+ docs, consult [`docs/MAP.md`](docs/MAP.md) and the canonical single source of truth [`docs/00-overview/PROJECT_BRIEF.md`](docs/00-overview/PROJECT_BRIEF.md).

---

## 1. Project Summary (10 Lines)

1. **Product**: **MUDRA-OS (`SamvadDeal`)** - Multilingual Escrow, Live Video Product Assay & 90-Second Freeze Arbitration OS built on the **Nexconn Unified Communications Platform** (`PS-03 Marketplace & Support`, Nexconn Build Challenge 2026, Team `Chanakya`).
2. **Frontend Web (`apps/web`)**: React 19 + TypeScript 5.7 + Vite 6 + Tailwind CSS v4 + `@heroui/react@^3.0.1` + `@nexconn/chatui@^26.2.5` (Lit `^3.3.2` custom `<nc-escrow-deal-card>` & `<nc-bilingual-bubble>`) + `@nexconn/call@^26.2.0` + `@mudra/assay-wasm-rs` (Rust WASM).
3. **Mobile App (`apps/mobile`)**: Expo SDK 58 + React Native 0.88 + `heroui-native@^1.1.1` + `uniwind` + Supabase (companion Android app; see `apps/mobile/README.md` for its Nexconn status).
4. **Service 1 - Nexconn Bridge (`services/nexconn-bridge-node`, `:4001`)**: Node.js 22 + Fastify 5 hosting the official Nexconn server SDK 0.1.2 (vendored source in `src/vendor/nexconn-server-sdk`), Gemini translation / tribunal / shopkeeper prompts (`GEMINI_FLASH_MODEL`, `GEMINI_PRO_MODEL`) with rule-based fallbacks.
5. **Service 2 - Deal Engine & Public API Gateway (`services/deal-engine-go`, `:4002`)**: **Go 1.24** (standard library `net/http` mux + `pgx/v5`) serving `/api/v1/*`, executing the 8-state Escrow FSM, optimistic version checks (`expected_version`), `X-Idempotency-Key` replay protection (in-memory), HMAC webhooks, and `/traction` telemetry.
6. **Service 3 - Assay Verifier (`services/assay-verifier-rs`, `:4003`)**: **Rust 1.85** (`axum 0.7` + `image` + `rustfft` + `regex` + `ed25519-dalek`) executing regex-based DPDP PII scrubbing (`POST /internal/scrub-pii`), 64-bit DCT `pHash`, 4096-point audio FFT motor RPM checks, and Ed25519 voucher signing.
7. **Data Layer**: PostgreSQL 17 when `DATABASE_URL` is set (`E-01`..`E-10` tables in `docs/03-engineering/DATA_MODEL.md`), otherwise an in-memory store (`/health` reports which).

---

## 2. Canonical Commands (`install` / `dev` / `test` / `lint` / `build` / `eval`)

```bash
# Install all workspace packages
pnpm install

# Build Rust WebAssembly module & Lit custom cards
pnpm --filter @mudra/assay-wasm-rs build:wasm
pnpm --filter @mudra/nc-lit-cards build

# Start all 3 backend services (:4001, :4002, :4003) + web dev server (:5173)
pnpm dev

# Run unit + integration tests across Node, Go, and Rust
pnpm test                           # Frontend + Node bridge Vitest suite
cd services/deal-engine-go && go test -v -race ./...
cd services/assay-verifier-rs && cargo test --all-targets

# Lint & Typecheck + Hallmark Visual Gate
pnpm typecheck && pnpm lint
cd services/deal-engine-go && golangci-lint run ./...
cd services/assay-verifier-rs && cargo clippy --all-targets -- -D warnings
npx sloplint --render http://localhost:5173

# Run AI Evaluation Harness (M-01..M-05 + Rust DPDP PII recall = 1.000)
pnpm eval:ai

# Production Build
pnpm build
```

---

## 3. Non-Negotiable Architecture & Nexconn SDK Rules

Read [`docs/03-engineering/NEXCONN_SDK_MANUAL.md`](docs/03-engineering/NEXCONN_SDK_MANUAL.md) before touching any Nexconn integration code:

1. **Boot order: `NCEngine.initialize` first, cards before `app.ready()`**:
   - In `apps/web/src/lib/nexconn-boot.ts`: call `NCEngine.initialize({ appKey })` **first** (otherwise `NCChatUIApplication.initialize` returns `null`), then `NCChatUIApplication.initialize({ hooks, language: 'en_US' })`, then `app.registerCustomMessages(...)` for `<nc-escrow-deal-card>` (`x-mudra-escrow-card`), `<nc-bilingual-bubble>` (`x-mudra-bilingual-bubble`), `<nc-video-assay-receipt>` (`x-mudra-assay-receipt`) and `<nc-tribunal-verdict>` (`x-mudra-tribunal-verdict`), then `app.ready()`, then `await NCEngine.connect({ token })`.
2. **Initialize `NCEngine` Singleton Before `NCCallEngine`**:
   - `@nexconn/call@26.2.1` (`NCCallEngine`, currently initialized only; inspection video is captured locally) rides on top of the active `@nexconn/engine@^26.2.1` WebSocket session. Never call `NCCallEngine.startCall(...)` until `await NCEngine.connect({ token })` resolves.
3. **Never Expose `NEXCONN_SECRET_KEY` to Browser or Mobile Bundles**:
   - All `/v4/*` `@nexconn/server-sdk` calls (`issueAccessToken`, `sendDirectChannelStreamMessage`, `sendGroupChannelStreamMessage`, `addGroupChannelFreezeList`, `SystemMessagesApi`) MUST execute inside `services/nexconn-bridge-node` (`:4001`).
4. **Channel Routing By Scale**:
   - `Direct` (1-on-1 deals & `/arena`), `Group` (`≤ 3,000` members, multi-party deals & 90s freeze arbitration), `Community` (`createCommunitySubchannel` for vertical marketplaces), `Open` (`OpenChannelPriorityControlsApi` for >3,000 live flash-auction drops), and `System` (`SystemMessagesApi` for immutable Ed25519 escrow vouchers).
5. **Every State Mutation Requires `Idempotency-Key` + `expected_version`**:
   - Never mutate PostgreSQL `escrow_contracts` (`E-04`) from Node.js. Always route public `/api/v1/*` mutations through Go `services/deal-engine-go` (`:4002`), which enforces `WHERE id = $1 AND version = $2`.

---

## 4. Non-Negotiable Frontend Rules (`/hallmark` + `/unslop` + `/apple-design` + `/heroui-react` + `/heroui-native`)

Read [`docs/02-design/DESIGN_SYSTEM.md`](docs/02-design/DESIGN_SYSTEM.md) and [`docs/02-design/UI_SPEC.md`](docs/02-design/UI_SPEC.md):

1. **Hallmark Stamp & Zero Slop (`apps/web/src/styles/globals.css`)**:
   - Line 1 of `globals.css` MUST remain `/* hallmark:v2.0.0 */`.
   - Warm Indian Customs House & Precision Assay Ledger palette in `oklch` (`--bg-canvas: oklch(0.982 0.006 75)`, `--accent-primary: oklch(0.54 0.165 38)` Sealing Wax Vermilion, `--accent-escrow: oklch(0.52 0.135 156)` Assay Emerald).
   - **BANNED**: Purple/indigo gradients (`#6366f1`, `#8b5cf6`), neon glows, emoji prefixes in UI labels/buttons/badges, `UPPERCASE` tracked section headers (`letter-spacing > 0.04em`), `3-equal-card` features rows, fake ticker marquees.
   - **Numeric Discipline**: Every `₹` price, countdown timer, `pHash` score, and latency badge MUST use `font-variant-numeric: tabular-nums`.
2. **HeroUI v3 React (`@heroui/react@^3.0.1` on Tailwind CSS v4)**:
   - **NO `<HeroUIProvider>`** wrapper in v3.
   - Import `@import "@heroui/styles";` after `@import "tailwindcss";` in `globals.css`.
   - Use **compound components** (`<Card><Card.Header>...<Card.Content>...<Card.Footer></Card>`, `<Tabs><Tabs.ListContainer><Tabs.List><Tabs.Tab>...`).
   - Always use `onPress` (never `onClick`) on HeroUI `<Button>`, `<Tabs.Tab>`, and interactive `<Card>`.
3. **HeroUI Native (`heroui-native@^1.1.1` + `uniwind` in `apps/mobile`)**:
   - Wrap root in `<GestureHandlerRootView style={{ flex: 1 }}><HeroUINativeProvider>...</HeroUINativeProvider></GestureHandlerRootView>`.
   - Use `<Card.Body>` (NOT `<Card.Content>`) in `heroui-native`, and HSL theme variables in `global.css`.
4. **Apple Fluid Motion (`apps/web/src/lib/apple-physics.ts`)**:
   - Every interactive control must respond on `:active` within `< 16ms` (`transform: scale(0.97)`).
   - Default UI springs (`APPLE_SPRINGS.snappy` / `smooth`) MUST be **critically damped (`damping = 1.0`, zero bounce)**. Only gesture-driven momentum releases (`APPLE_SPRINGS.bouncy`, `damping = 0.8`) may exhibit subtle underdamped settling per `/apple-design` §4.
   - The WebRTC Video Assay PiP Loupe MUST use `setPointerCapture` for 1:1 drag tracking and `projectMomentum(v, 0.998)` to snap to the nearest corner.

---

## 5. Do / Don't Checklist

| DO | DON'T |
| :--- | :--- |
| Keep every route (`/`, `/auth`, `/onboarding`, `/app`, `/sandbox`, `/arena`, `/dispatch`, `/guide`, `/traction`) reachable in `≤ 2` clicks with a clear `"Next Step"` action. | Never block a judge or first-time visitor with a mandatory email verification or external UPI app redirect before they can test a deal. |
| Route every outbound prompt through Rust `POST /internal/scrub-pii` (`services/assay-verifier-rs`, regex scrubber) before calling Gemini. | Never send raw Aadhaar, PAN, phone, or UPI VPA strings to an external LLM API. |
| Provide the **Simulated HD Inspection Video Stream (`FF_SIMULATED_HD_CAMERA`)** fallback whenever `navigator.mediaDevices.getUserMedia` is unavailable or declined. | Never let `/sandbox` or `/app` crash if a judge runs the demo on a headless machine or desktop without a webcam. |
| Keep `reskilll.com/hack/nexconn` submission fields under `3,800` chars (`pS(n)`/`Dx(n)` 4,000-char hard limit). | Never use Python for backend microservices - keep hot paths in **Go 1.24** (`:4002`) and **Rust 1.85 + WASM** (`:4003`). |

---

## 6. Key Reference Links
- **Navigation Map**: [`docs/MAP.md`](docs/MAP.md)
- **Single Source of Truth**: [`docs/00-overview/PROJECT_BRIEF.md`](docs/00-overview/PROJECT_BRIEF.md)
- **Nexconn SDK Manual**: [`docs/03-engineering/NEXCONN_SDK_MANUAL.md`](docs/03-engineering/NEXCONN_SDK_MANUAL.md)
- **API Specification & OpenAPI 3.1**: [`docs/03-engineering/API_SPEC.md`](docs/03-engineering/API_SPEC.md) & [`api/openapi.yaml`](api/openapi.yaml)
- **Coding Standards**: [`docs/03-engineering/CODING_STANDARDS.md`](docs/03-engineering/CODING_STANDARDS.md)
