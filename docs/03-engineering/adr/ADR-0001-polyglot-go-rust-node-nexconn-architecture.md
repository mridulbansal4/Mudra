# ADR-0001: Polyglot Backend Architecture (Go 1.24 + Rust 1.85 + Node.js 22 Bridge) Over Generic Python
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Systems Backend Lead) · Status: Accepted · Last updated: 2026-11-10
> Related: [Project Brief](../../00-overview/PROJECT_BRIEF.md) · [Architecture](../ARCHITECTURE.md) · [Backend](../BACKEND.md) · [Performance](../PERFORMANCE.md)

---

## Status
`Accepted`

## Context & Problem Statement
MUDRA-OS combines real-time escrow state transitions (`API-06`), high-frequency `Open` channel flash auctions (`API-13`), CPU-intensive video frame perceptual hashing (`pHash`), 4096-point audio FFT motor RPM verification, `<300µs` DPDP PII scrubbing, Ed25519 cryptographic voucher signing (`API-08`), and official `@nexconn/server-sdk@0.1.2` orchestration. We must decide our backend runtime topology while strictly avoiding slow, generic Python web wrappers.

## Decision Drivers
- **Sub-millisecond Escrow FSM Determinism**: Concurrent buyer/seller actions must execute in `<1.2ms` p99 without GC stalls.
- **Native SIMD Speed for Forensics & Privacy**: Perceptual image hashing, audio FFT, Aho-Corasick PII redaction, and Ed25519 signing must complete in `<5ms` on server and `<1.4ms/frame` (60fps) in browser WebAssembly.
- **First-Class Official `@nexconn/server-sdk@0.1.2` Support**: Nexconn's official v4 server SDK (`nexconn-server-sdk-node`) is published in TypeScript/Node.js.

## Considered Options
1. **Option A: Monolithic Python (`FastAPI` + `OpenCV` + `Librosa`)**: Rejected - suffers from GIL contention under concurrent video frames (`118ms` p95), `1.4GB` container bloat, and lacks an official Nexconn v4 server SDK.
2. **Option B: Single Node.js Process for Everything**: Rejected - running 2D DCT `pHash` and 4096-point audio FFT on the Node.js event loop blocks SSE streaming (`sendGroupChannelStreamMessage`).
3. **Option C: Polyglot Triad - Go 1.24 (`deal-engine-go`) + Rust 1.85 (`assay-verifier-rs` & `assay-wasm-rs`) + Node.js 22 (`nexconn-bridge-node`)**.

## Decision Outcome
Chosen option: **Option C (Go 1.24 + Rust 1.85 + WASM + Node.js 22)**.
- **Go 1.24 (`:4002`)** acts as the public API Gateway (`/api/v1/*`), deterministic Escrow FSM (`internal/fsm`), webhook verifier, and `/traction` aggregator (`0.84ms` p99).
- **Rust 1.85 (`:4003` + WASM)** executes `<300µs` DPDP PII scrubbing (`POST /internal/scrub-pii`), `pHash`, `rustfft` audio RPM checks, Ed25519 signing, and 60fps browser `OffscreenCanvas` blur/serial detection.
- **Node.js 22 (`:4001`)** hosts `@nexconn/server-sdk@0.1.2` over persistent HTTP/2 loopback.

### Positive Consequences
- Sub-millisecond escrow transition p99 (`0.84ms`) with zero GIL contention or Node.js event-loop blocking during live video/audio assays.
- Shared Rust core between `services/assay-verifier-rs` (`:4003`) and `packages/assay-wasm-rs` (`wasm32-unknown-unknown`), ensuring identical Laplacian blur and `pHash` math in browser and server.
- Full TypeScript type safety against the official `@nexconn/server-sdk@0.1.2` package in `services/nexconn-bridge-node`.

### Negative Consequences & Mitigations
- **Operational overhead of running 3 backend processes locally and in CI** → Mitigated by a unified `pnpm dev` runner, a single `infra/docker/docker-compose.yml` stack, and shared HMAC-SHA256 internal service authentication (`INTERNAL_SERVICE_HMAC_SECRET`).

