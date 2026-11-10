# Coding Standards & Polyglot Linting — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Engineering Standards Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [Testing](./TESTING.md)

---

## 1. Language-Specific Style Guides & Tooling

| Language / Layer | Style Guide & Compiler Flags | Linter & Formatter | Zero-Warning Gate in CI |
|---|---|---|---|
| **Go 1.24 (`services/deal-engine-go`)** | Effective Go + Uber Go Style Guide | `golangci-lint` (`govet`, `errcheck`, `staticcheck`, `revive`, `gosec`) + `gofumpt` | `golangci-lint run ./...` (`0` issues) + `go test -race ./...` |
| **Rust 1.85 (`services/assay-verifier-rs`, `packages/assay-wasm-rs`)** | Rust 2024 Edition Idioms (`#![forbid(unsafe_code)]`) | `cargo clippy --all-targets -- -D warnings` + `rustfmt` | Zero `unwrap()` / `expect()` in request handlers; all errors mapped via `thiserror` |
| **TypeScript 5.8 (`apps/web`, `apps/mobile-expo`, `services/nexconn-bridge-node`, `packages/nc-lit-cards`)** | `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` | **Biome 1.9** (`biome check --write`) + `tsc --noEmit` | Zero `any` in domain models (`packages/shared-types`); 100% typed OpenAPI contracts |
| **CSS & Design System (`apps/web`)** | `/hallmark` v2.0.0 Floor + `/unslop` + `/apple-design` + HeroUI v3 (`oklch`) | `node scripts/sloplint.mjs --render` + Stylelint | `Floor 0 FAIL`: no literal hex outside `:root`, no `transition: all`, no uppercase tracked eyebrows |

---

## 2. Naming Conventions Across Polyglot Boundaries

- **JSON Wire Payloads (`API-01`..`API-18`)**: `snake_case` (`deal_id`, `nexconn_channel_id`, `amount_paise`, `buyer_refund_bps`, `frame_phash_hex`).
- **Database Columns (`PostgreSQL 17`)**: `snake_case` matching JSON wire fields (`E-01`..`E-10`); monetary values always carry `_paise` suffix (`BIGINT`) and basis-point splits carry `_bps` suffix (`INTEGER`, `10000 = 100%`).
- **Go Symbols**: `PascalCase` exported (`TransitionEscrowState`), `camelCase` internal, short receiver names (`s *EscrowService`).
- **Rust Symbols**: `snake_case` functions/modules (`compute_dct_phash`, `scrub_dpdp_pii`), `PascalCase` types/traits (`AssayVerdict`, `VoucherSignature`).
- **React 19 & HeroUI v3 Components**: `PascalCase` files & components (`DealWorkbenchPage.tsx`, `VideoAssayPiPLoupe.tsx`), compound subcomponents (`<Card><Card.Header>...`), event props always `onPress` (never `onClick` on HeroUI buttons).
- **Custom Lit Web Components (`packages/nc-lit-cards`)**:
  - Custom element tag names: `kebab-case` prefixed with `nc-` (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`, `<nc-video-assay-receipt>`, `<nc-tribunal-verdict-card>`).
  - Nexconn `objectName` registration identifiers: `x-samadhan-escrow-card`, `x-samadhan-bilingual-bubble`, `x-samadhan-assay-receipt`, `x-samadhan-tribunal-verdict`.

---

## 3. Error Handling & Structured Logging Rules

1. **No Swallowed Errors**:
   - In Go: Every error is wrapped with context (`fmt.Errorf("transition deal %s: %w", dealID, err)`).
   - In Rust: Every handler returns `Result<Json<T>, AppError>` implementing `axum::response::IntoResponse`.
2. **Structured JSON Logging with PII Redaction (`OBSERVABILITY.md`)**:
   - Go uses `log/slog` (JSON handler); Rust uses `tracing` + `tracing-subscriber` (JSON); Node.js uses Fastify `pino`.
   - Every log line includes `trace_id`, `service`, `deal_id`, and `latency_us`.
   - **Strict Security Rule**: Never log `NEXCONN_SECRET_KEY`, `access_token`, raw un-scrubbed chat messages, or base64 video frames.

---

## 4. Code Review & Pre-Merge Checklist

- [ ] Does any frontend change violate `/hallmark` Floor (e.g., `transition: all`, emojis, purple gradients, `<HeroUIProvider>` v2 pattern)?
- [ ] Are all custom Lit components registered **before** `app.ready()`, and is `await NCEngine.connect({ token })` awaited **before** `NCCallEngine`?
- [ ] Are all monetary calculations performed in integer `amount_paise` (`int64` / `i64` / `BigInt`) with zero `float64` rounding risk?
- [ ] Do `go test -race ./...`, `cargo test`, `pnpm typecheck`, and `sloplint --render` pass cleanly?
