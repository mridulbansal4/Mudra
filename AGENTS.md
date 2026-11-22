# AGENTS.md - Universal AI Agent Instructions for MUDRA-OS (`SamvadDeal`)

> **Primary Agent Specification**: Read **[`CLAUDE.md`](CLAUDE.md)** for full build/test/eval commands, architecture rules, and design system constraints, and **[`docs/MAP.md`](docs/MAP.md)** for the complete documentation index.

---

## Quick Rules Summary for All Coding Agents (Cursor, Windsurf, Copilot, Claude Code, Antigravity)

1. **Single Source of Truth**:
   - Canonical IDs (`F-01`..`F-14`, `P-01`..`P-05`, `E-01`..`E-10`, `API-01`..`API-18`, `M-01`..`M-05`, `R-01`..`R-12`, `ADR-0001`..`ADR-0006`) live in **[`docs/00-overview/PROJECT_BRIEF.md`](docs/00-overview/PROJECT_BRIEF.md)**. Never invent conflicting entity or endpoint names.
2. **Polyglot Fast Systems Stack (Zero Generic Python)**:
   - **Go 1.24 (`services/deal-engine-go`, `:4002`)**: Public API Gateway (`/api/v1/*`) & deterministic 8-state Escrow FSM (`< 1.2ms` p99), PostgreSQL 17 optimistic locking (`version`), DragonflyDB / Redis 7.4 `24h` idempotency, HMAC-SHA256 webhook verification, and `/traction` telemetry.
   - **Rust 1.85 (`services/assay-verifier-rs`, `:4003`) & WASM (`packages/assay-wasm-rs`)**: `< 300µs` Aho-Corasick DPDP PII scrubber (`POST /internal/scrub-pii`), `< 5ms` 64-bit DCT `pHash` video frame comparator, 4096-point `rustfft` acoustic RPM verifier, and Ed25519 voucher signer.
   - **Node.js 22 Fastify (`services/nexconn-bridge-node`, `:4001`)**: Official TypeScript `@nexconn/server-sdk@0.1.2` orchestration, Gemini 2.5 Flash/Pro (`M-01`, `M-03`, `M-04`, `M-05`), and Bhashini ASR (`M-02`).
3. **Nexconn SDK Golden Rules**:
   - Register custom Lit v3 elements (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`) **before** `await NCChatUIApplication.ready()`.
   - Connect `NCEngine` (`await NCEngine.connect({ token })`) **before** starting `NCCallEngine` WebRTC video inspection calls.
   - Never leak `NEXCONN_SECRET_KEY` to `apps/web` or `apps/mobile`.
   - Follow [`docs/03-engineering/NEXCONN_SDK_MANUAL.md`](docs/03-engineering/NEXCONN_SDK_MANUAL.md) for all 4 SDKs and all 5 channel types (`Direct`, `Group`, `Community`, `Open`, `System`).
4. **Frontend Craft (`/hallmark` + `/unslop` + `/apple-design` + `/heroui-react` + `/heroui-native`)**:
   - Keep `/* hallmark:v2.0.0 */` on line 1 of `apps/web/src/styles/globals.css`.
   - In `@heroui/react@^3.0.1` (Tailwind CSS v4): **no `<HeroUIProvider>`**, use compound components (`<Card.Header>`, `<Card.Content>`, `<Card.Footer>`), and use `onPress` instead of `onClick`.
   - In `heroui-native@^2.0.1` (`apps/mobile`): wrap with `<GestureHandlerRootView>` + `<HeroUINativeProvider>`, and use `<Card.Body>`.
   - Preserve the beginner-friendly 9-route story flow (`/` → `/auth` → `/onboarding` → `/app` → `/sandbox` → `/arena` → `/dispatch` → `/guide` → `/traction`) with the **Simulated HD Inspection Video Stream** fallback always working.
