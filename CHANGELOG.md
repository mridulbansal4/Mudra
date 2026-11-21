# Changelog

All notable changes to **MUDRA-OS (`SamvadDeal`)** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Automated k6 load-test baseline profile (`tests/load/escrow-fsm-k6.js`) targeting `500 RPS` sustained on `services/deal-engine-go` (`:4002`).
- Extended Marathi-English (`mr-IN` ↔ `en-US`) and Tamil-English (`ta-IN` ↔ `en-US`) colloquial bargaining idioms in `ai/evals/datasets/bargain-multilingual-160.jsonl`.
- Live ONDC `1.2.0` (`on_confirm` / `on_status`) sandbox adapter mappings in `services/deal-engine-go` (`FF_ONDC_ADAPTER=false` by default).

---

## [0.1.0] - 2026-11-10

### Added
- **Complete 65+ File Engineering & Product Bible (`docs/00-overview` .. `docs/08-project`)**:
  - Canonical `PROJECT_BRIEF.md` locking `F-01`..`F-14`, `P-01`..`P-05`, `E-01`..`E-10`, `API-01`..`API-18`, `M-01`..`M-05`, `R-01`..`R-12`, and `ADR-0001`..`ADR-0006`.
  - Complete OpenAPI 3.1 contract (`api/openapi.yaml`) and dedicated step-by-step Nexconn SDK integration manual (`docs/03-engineering/NEXCONN_SDK_MANUAL.md`).
- **Polyglot Fast Systems Backend Architecture**:
  - **`services/deal-engine-go` (`Go 1.24`, `:4002`)**: Public API Gateway (`/api/v1/*`) & deterministic 8-state Escrow FSM (`< 1.2ms` p99), PostgreSQL 17 optimistic concurrency (`version`), DragonflyDB / Redis 7.4 `24h` idempotency, HMAC-SHA256 webhook verification, and `/traction` telemetry aggregator (`F-04`, `F-13`).
  - **`services/assay-verifier-rs` (`Rust 1.85`, `:4003`) & `packages/assay-wasm-rs` (`WASM`)**: `< 300µs` Aho-Corasick SIMD DPDP PII scrubber (`POST /internal/scrub-pii`), `< 5ms` 64-bit DCT `pHash` frame verification, 4096-point `rustfft` acoustic motor/fan RPM assay, and Ed25519 cryptographic voucher signing (`F-05`, `F-09`).
  - **`services/nexconn-bridge-node` (`Node.js 22 + Fastify 5`, `:4001`)**: Official `@nexconn/server-sdk@0.1.2` orchestration across all 5 Nexconn channel types (`Direct`, `Group`, `Community`, `Open`, `System`), Gemini 2.5 Flash/Pro (`M-01`, `M-03`, `M-04`, `M-05`), and Bhashini ASR (`M-02`).
- **Crafted Beginner-First Story Frontend (`apps/web` & `apps/mobile-expo`)**:
  - Applied **Hallmark (`v2.0.0`)**, **Unslop**, **Apple Fluid Motion**, **HeroUI v3 React (`@heroui/react@^3.0.1` on Tailwind CSS v4)**, and **HeroUI Native (`heroui-native@^2.0.1` + `uniwind`)** (`F-14`).
  - Designed all 9 story routes (`/` → `/auth` → `/onboarding` → `/app` → `/sandbox` → `/arena` → `/dispatch` → `/guide` → `/traction`) with **4 One-Tap Demo Personas (`F-01`)**, **Simulated HD Inspection Video Stream** fallback (`FF_SIMULATED_HD_CAMERA`), **Solo Judge Split-Screen Mode (`F-11`)**, and **60s Chanakya AI Bargaining Challenge (`F-10`)**.
