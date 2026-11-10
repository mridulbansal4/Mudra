# Backend Engineering Specification (Go 1.24 + Rust 1.85 + Node.js 22) — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Systems Backend Lead — Dev 2 & Dev 1) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Architecture](./ARCHITECTURE.md) · [Data Model](./DATA_MODEL.md) · [API Spec](./API_SPEC.md) · [Nexconn SDK Manual](./NEXCONN_SDK_MANUAL.md) · [ADR-0001](./adr/ADR-0001-polyglot-go-rust-node-nexconn-architecture.md)

---

## 1. Polyglot Service Topology & Responsibility Matrix

Instead of a slow, GIL-bound Python backend, SAMADHAN-OS splits backend responsibilities across three compiled/typed systems runtimes communicating over persistent HTTP/2 loopback and DragonflyDB/Redis streams:

| Service Directory | Language & Framework | Port | Core Responsibilities & Latency Budget |
|---|---|---|---|
| **`services/deal-engine-go`** | **Go 1.24** (`chi/v5`, `pgx/v5`, `sqlc`, `golang-migrate`) | `:4002` | Public API Gateway (`API-01`..`API-18`), deterministic Escrow Finite-State Machine (`E-04`, `<1.2ms` p99), optimistic locking, `/sandbox` dual-persona provisioner, `/arena` reservation pricing curve, HMAC-SHA256 UPI/ONDC webhooks (`API-17`), and `/traction` telemetry (`API-18`). |
| **`services/assay-verifier-rs`** | **Rust 1.85 (2024 Ed.)** (`axum 0.8`, `tokio 1.43`, `aho-corasick`, `image`, `rustfft`, `ed25519-dalek`) | `:4003` | `<300µs` Aho-Corasick DPDP PII scrubber (`API-05`), `<5ms` 64-bit DCT perceptual frame hashing (`pHash` + Hamming distance diff), 4096-point `rustfft` audio motor/fan RPM verifier (`API-08`), and Ed25519 cryptographic signing of `system_audit_vouchers` (`E-08`). |
| **`services/nexconn-bridge-node`** | **Node.js 22 LTS + TypeScript 5.8** (`fastify 5.2`, `@nexconn/server-sdk@0.1.2`) | `:4001` | Dedicated host for the official TypeScript `@nexconn/server-sdk@0.1.2`: executes `UserManagementApi.issueAccessToken`, `MessageManagementApi.sendDirectChannelStreamMessage` & `sendGroupChannelStreamMessage`, `GroupChannelModerationApi.addGroupChannelFreezeList`, `OpenChannelPriorityControlsApi`, `CommunityChannelManagementApi`, and `SystemMessagesApi`. |

---

## 2. Service 1: `services/deal-engine-go` (Go 1.24 Core Deal & Escrow Engine)

### 2.1 Directory Layout
```text
services/deal-engine-go/
├── go.mod                              # module github.com/chanakya-team/samadhan-os/services/deal-engine-go (go 1.24)
├── cmd/server/main.go                  # Graceful HTTP/2 server, OTel tracer, advisory-locked DB migrations
└── internal/
    ├── fsm/
    │   ├── escrow_fsm.go               # Deterministic state transition table & invariants
    │   └── escrow_fsm_test.go          # Property-based & concurrent race-condition tests (go test -race)
    ├── db/
    │   ├── migrations/                 # 0001_init_schema.up.sql (Entities E-01..E-10)
    │   └── sqlc/                       # Type-safe compiled SQL queries (pgx/v5)
    ├── handlers/
    │   ├── auth_sandbox.go             # API-01 & API-02 (calls Node Bridge :4001 for Nexconn tokens)
    │   ├── deals_escrow.go             # API-03, API-04, API-06, API-07, API-09, API-11
    │   ├── arena.go                    # API-15 & API-16 (60s Bargaining reservation curve)
    │   ├── webhooks.go                 # API-17 (HMAC-SHA256 UPI ASBA & ONDC callbacks)
    │   └── traction.go                 # API-18 (Verified MAU & latency histogram endpoint)
    └── middleware/
        ├── idempotency.go              # Redis-backed X-Idempotency-Key deduplication (TTL 24h)
        └── rbac_auth.go                # JWT + Role verification (buyer | seller | arbitrator | guest)
```

### 2.2 Deterministic Escrow FSM Implementation (`internal/fsm/escrow_fsm.go`)
```go
package fsm

import "errors"

type State string
type Action string

const (
	StateDraft           State = "DRAFT"
	StateLocked          State = "LOCKED"
	StateAssayInProgress State = "ASSAY_IN_PROGRESS"
	StateAssayVerified   State = "ASSAY_VERIFIED"
	StateDisputeFrozen   State = "DISPUTE_FROZEN"
	StateSettledReleased State = "SETTLED_RELEASED"
	StateSettledSplit    State = "SETTLED_SPLIT"
	StateRefunded        State = "REFUNDED"
)

const (
	ActionLockEscrow        Action = "LOCK_ESCROW"
	ActionStartAssay        Action = "START_ASSAY"
	ActionMarkAssayVerified Action = "MARK_ASSAY_VERIFIED"
	ActionRaiseDispute      Action = "RAISE_DISPUTE"
	ActionReleaseFunds      Action = "RELEASE_FUNDS"
	ActionResolveSplit      Action = "RESOLVE_SPLIT"
	ActionRefundBuyer       Action = "REFUND_BUYER"
)

var ErrInvalidTransition = errors.New("ERR_INVALID_FSM_TRANSITION")

var transitionTable = map[State]map[Action]State{
	StateDraft: {
		ActionLockEscrow: StateLocked,
	},
	StateLocked: {
		ActionStartAssay:   StateAssayInProgress,
		ActionRaiseDispute: StateDisputeFrozen,
	},
	StateAssayInProgress: {
		ActionMarkAssayVerified: StateAssayVerified,
		ActionRaiseDispute:      StateDisputeFrozen,
	},
	StateAssayVerified: {
		ActionReleaseFunds: StateSettledReleased,
		ActionRaiseDispute: StateDisputeFrozen,
	},
	StateDisputeFrozen: {
		ActionResolveSplit: StateSettledSplit,
		ActionRefundBuyer:  StateRefunded,
	},
}

func NextState(curr State, act Action) (State, error) {
	if nextMap, ok := transitionTable[curr]; ok {
		if next, valid := nextMap[act]; valid {
			return next, nil
		}
	}
	return curr, ErrInvalidTransition
}
```

---

## 3. Service 2: `services/assay-verifier-rs` (Rust 1.85 Forensic & Crypto Engine)

### 3.1 Directory Layout
```text
services/assay-verifier-rs/
├── Cargo.toml                          # edition = "2024", axum = "0.8", tokio = "1.43", rustfft = "6.2", ed25519-dalek = "2.1", aho-corasick = "1.1"
└── src/
    ├── main.rs                         # Axum router (:4003) -> /internal/scrub-pii, /internal/verify-assay, /internal/sign-voucher
    ├── scrubber.rs                     # <300us Aho-Corasick + Regex DPDP PII Redactor (Aadhaar, PAN, Phone, UPI, Bank)
    ├── phash.rs                        # 32x32 luma resize -> 2D DCT -> 64-bit perceptual hash + Hamming distance
    ├── audio_fft.rs                    # 4096-sample Hann-windowed FFT -> detects spindle/motor RPM peak & bearing noise
    └── voucher_crypto.rs               # SHA-256 hash chaining (prev_hash || payload) + Ed25519 signature generation
```

### 3.2 Key Rust Implementation Highlights (`scrubber.rs`, `phash.rs`, `voucher_crypto.rs`)
1. **Sub-300µs DPDP PII Scrubber (`src/scrubber.rs`)**:
   - Uses a pre-compiled `AhoCorasick` automaton + zero-backtracking `regex::RegexSet` (`once_cell::sync::Lazy`) to mask Indian 10-digit mobile numbers, 12-digit Aadhaar numbers (with Verhoeff checksum check), 10-char PAN numbers, and raw UPI handles (`@okaxis`, `@ybl`, `@icici`) into `[REDACTED_DPDP_PII]` before any chat text is sent to Gemini 2.5 Flash or Bhashini (`R-09`).
2. **64-Bit Perceptual Frame Hashing (`src/phash.rs`)**:
   - Decodes the captured `@nexconn/call` WebRTC inspection frame, converts to grayscale `32x32`, applies a 2D Discrete Cosine Transform (DCT), extracts the top-left `8x8` low-frequency AC coefficients, and emits a 16-character hex `pHash` (`a4f19c83e2b0771d`).
   - During a dispute (`API-09`), computing `(pre_phash ^ post_phash).count_ones()` gives the exact Hamming distance in `10 nanoseconds`!
3. **4096-Point Audio FFT Motor/Fan Assay (`src/audio_fft.rs`)**:
   - Applies a Hann window to 2 seconds of `48kHz` PCM audio captured during `@nexconn/call`, runs `rustfft`, and extracts the fundamental rotational frequency (`80.33 Hz * 60 = 4,820 RPM`) plus high-frequency (`4–8 kHz`) bearing-rattle energy ratio.
4. **Ed25519 Hash-Chained Vouchers (`src/voucher_crypto.rs`)**:
   - Computes `curr_hash = SHA256(prev_hash || deal_id || voucher_type || canonical_json)` and signs `curr_hash` with `ed25519_dalek::SigningKey`, returning a signature verifiable in browser via `SubtleCrypto` on `/guide`.

---

## 4. Service 3: `services/nexconn-bridge-node` (Node.js 22 + `@nexconn/server-sdk@0.1.2`)

- Exposes internal endpoints on `:4001` called by `services/deal-engine-go`:
  - `POST /internal/nc/token` → `UserManagementApi.issueAccessToken`
  - `POST /internal/nc/channel/create` → `GroupChannelManagementApi.createGroupChannel`
  - `POST /internal/nc/stream/group` → Pipes Gemini 2.5 Flash / Bhashini SSE chunks into `MessageManagementApi.sendGroupChannelStreamMessage`
  - `POST /internal/nc/stream/direct` → Pipes `/arena` AI Shopkeeper chunks into `MessageManagementApi.sendDirectChannelStreamMessage`
  - `POST /internal/nc/moderation/freeze` → `GroupChannelModerationApi.addGroupChannelFreezeList`
  - `POST /internal/nc/open/priority-broadcast` → `OpenChannelPriorityControlsApi`
  - `POST /internal/nc/community/subchannel` → `CommunityChannelManagementApi`
  - `POST /internal/nc/system/voucher` → `SystemMessagesApi`

---

## 5. Authorization (RBAC / ABAC) & Idempotency Rules

- **Role-Based & Attribute-Based Access Control (ABAC)**:
  - `LOCK_ESCROW` (`API-06`) & `RELEASE_FUNDS`: Permitted **only** when `jwt.user_id == deal_room.buyer_user_id`.
  - `RAISE_DISPUTE` (`API-09`): Permitted when `jwt.user_id IN (deal_room.buyer_user_id, deal_room.seller_user_id)`.
  - `ASSIGN_ARBITRATOR` (`API-10`) & `RESOLVE_SPLIT` (`API-11`): Permitted when `jwt.role == "arbitrator"` OR when both Buyer and Seller co-sign the AI Tribunal proposal.
- **Idempotency**:
  - Every `POST` mutation checks `X-Idempotency-Key` in DragonflyDB/Redis (`SET idemp:<key> IN_PROGRESS NX EX 86400`). Retried requests return the cached response status and payload without double-locking escrow or double-sending `System` vouchers.
