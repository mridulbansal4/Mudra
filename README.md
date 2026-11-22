# MUDRA-OS (`SamvadDeal`)

Multilingual P2P and B2B escrow deal room with live WebRTC hardware inspection, deterministic state transitions, and 90-second freeze arbitration built on the Nexconn Unified Communications Platform.

## Live Links

| Resource | URL |
| :--- | :--- |
| Production Web App | https://mudra.duckdns.org |
| Interactive Two-Phone Demo | https://mudra.duckdns.org/demo |
| Live Split-Screen Sandbox | https://mudra.duckdns.org/sandbox |
| Traction & Latency Ledger | https://mudra.duckdns.org/traction |
| Public Product Analytics (PostHog) | https://us.posthog.com/shared/CwmP3aEjYmfq2bKNZiCoFmKjlscC4Q |
| Android APK (`v1.0.0`, `arm64`, 53.7 MB) | https://mudra.duckdns.org/downloads/mudra-v1.0.0-arm64.apk |
| Android APK (`v1.0.0`, universal, 105.3 MB) | https://mudra.duckdns.org/downloads/mudra-v1.0.0.apk |
| GitHub Releases | https://github.com/mridulbansal4/Mudra/releases/tag/v1.0.0 |
| Service Health Endpoint | https://mudra.duckdns.org/health |

---

## Problem & Methodology

High-value peer-to-peer and regional B2B trades over chat break at three points: language barriers (Hindi, Tamil, Marathi, English), payment trust (advance UPI vs. blind shipping), and post-delivery hardware disputes.

MUDRA-OS embeds the escrow contract and physical verification loop directly inside a Nexconn chat room:

1. **Bilingual Negotiation**: Buyers and sellers write in their native script. Every outbound prompt is scrubbed for PII (Aadhaar, PAN, UPI VPA, IFSC, phone) in `< 300µs` by a Rust Aho-Corasick automaton before Gemini 2.5 Flash streams dual-script translations via `RC:StreamMsg`.
2. **Deterministic Escrow Lock**: Funds lock into an 8-state Go 1.24 finite state machine (`CREATED -> FUNDED -> INSPECTION_LIVE -> ASSAY_VERIFIED -> SHIPPED -> DELIVERED -> RELEASED` / `DISPUTED_FROZEN`) with optimistic CAS locking and 24-hour idempotency.
3. **Live WebRTC Hardware Assay**: Parties start an in-room Nexconn Call (`NCCallEngine`) session. The Rust verifier checks frame sharpness (Laplacian variance), computes a 64-bit DCT perceptual hash (`pHash`) of the serial plate, and runs a 4096-point Cooley-Tukey FFT on the audio stream to verify motor RPM.
4. **Ed25519 Receipts & 90-Second Freeze Tribunal**: Every verified milestone posts an Ed25519-signed, SHA-256 hash-chained voucher to the Nexconn `System` channel. On defect or `pHash` mismatch, the room freezes for 90 seconds while an AI + human arbitrator resolves the split.

---

## Nexconn SDK & Channel Integration

| Component | Package / Primitive | Usage in MUDRA-OS |
| :--- | :--- | :--- |
| Realtime Core | `@nexconn/engine@26.2.1` | Singapore cluster (`AreaCode.SG`), WebSocket multiplexing, presence |
| Messaging & Media | `@nexconn/chat@26.2.1` | Direct, Group, Community, Open, and System channels + `RC:SightMsg`, `RC:FileMsg`, `RC:ImgMsg` |
| Inline Deal UI | `@nexconn/chatui@26.2.5` | Custom Lit v3 Web Components (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`) |
| Live Video Assay | `@nexconn/call@26.2.1` | `NCCallEngine` WebRTC SFU calls (Voice, SD `640x480`, HD `1280x720`) + Polaris telemetry |
| Server Orchestration | `@nexconn/server-sdk@0.1.2` | Token issuance, room lifecycle, moderation freeze API, and `RC:StreamMsg` AI streaming |

---

## Architecture

```
apps/web (React 19, Vite 6, Tailwind v4, HeroUI v3, Lit v3)
apps/mobile-expo (Expo / React Native Android APK v1.0.0)
   |
   +--> WSS / WebRTC -------------> Nexconn Cloud (Singapore Cluster)
   |
   +--> HTTPS /api/v1/* + SSE ----> services/deal-engine-go (Go 1.24, :4002)
                                       |-- Internal REST --> services/assay-verifier-rs (Rust 1.85, :4003)
                                       |-- Internal REST --> services/nexconn-bridge-node (Node 22 Fastify, :4001)
```

| Directory | Responsibility |
| :--- | :--- |
| `apps/web` | Production web client, landing experience, two-phone demo, split-screen sandbox, and dispatch desk |
| `apps/mobile-expo` | Android client (`v1.0.0`) with native Nexconn chat, call, and UPI escrow flows |
| `services/deal-engine-go` | Public API gateway (`/api/v1/*`), 8-state Escrow FSM, SSE bus, and `/traction` telemetry |
| `services/assay-verifier-rs` | Aho-Corasick PII scrubber, 64-bit DCT `pHash`, 4096-point `rustfft` audio assay, Ed25519 signer |
| `services/nexconn-bridge-node` | `@nexconn/server-sdk@0.1.2` host, Gemini 2.5 Flash/Pro prompts, Bhashini ASR fallback |
| `packages/nc-lit-cards` | Shared Lit v3 custom message cards (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`) |
| `packages/assay-wasm-rs` | Browser-side WASM optical sharpness and perceptual hash helpers |
| `packages/shared-types` | Shared TypeScript contracts across web, bridge, and Lit cards |
| `docs/` | Architecture Decision Records (`ADR-0001`..`ADR-0006`), API specs, SDK manual, and runbooks |

---

## Application Routes

| Route | Purpose |
| :--- | :--- |
| `/` | Product overview, APK download, Nexconn SDK architecture, and methodology |
| `/demo` | Interactive two-phone buyer/seller simulation |
| `/sandbox` | Split-screen workspace wired to the live Go FSM and Nexconn Singapore cluster |
| `/app` | Main deal desk with 4-stage story bar and live ChatUI room |
| `/arena` | 60-second AI bargaining challenge against Chanakya Shopkeeper |
| `/dispatch` | Arbitrator freeze center with 90-second countdown and evidence diff |
| `/traction` | Live cluster telemetry, latency percentiles, and recent escrow rooms |
| `/guide` | Developer SDK guide and integration reference |
| `/how-it-works` | Step-by-step protocol and escrow state machine walkthrough |

---

## Local Development

### Prerequisites

- Node.js `>= 22.12.0` and `pnpm` `>= 9.15.0`
- Go `>= 1.24.0`
- Rust `>= 1.85.0`

### Setup & Run

```bash
cp .env.example .env
pnpm install
pnpm dev
```

This starts:
- Web client on `http://localhost:5173`
- Nexconn Bridge on `http://127.0.0.1:4001`
- Go Deal Engine on `http://127.0.0.1:4002`
- Rust Assay Verifier on `http://127.0.0.1:4003`

### Verification

```bash
pnpm typecheck
pnpm test
cd services/deal-engine-go && go test -race ./...
cd services/assay-verifier-rs && cargo test
```

## License

MIT
