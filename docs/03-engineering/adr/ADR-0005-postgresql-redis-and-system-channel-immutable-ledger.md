# ADR-0005: PostgreSQL 17 Serializable Escrow State + Ed25519 Hash-Chained `System` Channel Ledger
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Data & Cryptography Lead) · Status: Accepted · Last updated: 2026-11-10
> Related: [Data Model](../DATA_MODEL.md) · [Backend](../BACKEND.md) · [Security Architecture](../../06-security-compliance/SECURITY_ARCHITECTURE.md)

---

## Status
`Accepted`

## Context & Problem Statement
When a ₹1,45,000 commercial deal is negotiated inside a chat room, we need ACID guarantees against double-spending or race conditions (`R4` Jim Chanos / `R12` Taleb critique), and we need an unforgeable user-visible audit log without introducing slow/gimmicky public blockchain gas fees (`R102`).

## Decision Drivers
- Prevent double-spend or lost-update race conditions when buyer, seller, and webhook events hit an escrow contract simultaneously (`R-05`).
- Provide cryptographic non-repudiation (`IT Act 2000 Sec 65B` compliance) visible directly inside the Nexconn chat UI without slow public blockchain gas fees or wallet popups.
- Guarantee `< 1.2ms` p99 state mutation latency and `24h` idempotency on retryable network requests.

## Considered Options
1. **Option A: Public EVM Smart Contract Escrow**: Rejected - introduces 2–12s block latency, crypto wallet friction for Indian MSME traders, and regulatory ambiguity.
2. **Option B: Unversioned CRUD updates in PostgreSQL from Node.js**: Rejected - vulnerable to TOCTOU race conditions when a buyer triggers dispute freeze at the same millisecond a seller claims payout.
3. **Option C: PostgreSQL 17 Optimistic Version Locking (`version`) + DragonflyDB / Redis 7.4 `24h` Idempotency in Go 1.24 + Ed25519 Hash-Chained Vouchers in the Nexconn `System` Channel**.

## Decision Outcome
Chosen option: **Option C**.
1. **PostgreSQL 17 + Optimistic Locking (`version`) + DragonflyDB / Redis 7.4 in Go 1.24 (`services/deal-engine-go`)**:
   - All monetary amounts are stored as `BIGINT` integer paise (`amount_paise`).
   - State transitions (`API-06`, `API-11`) verify `X-Idempotency-Key` in DragonflyDB / Redis 7.4 (`24h` TTL) and execute `UPDATE escrow_contracts SET version = version + 1 ... WHERE id = $1 AND version = $2`, returning `409 Conflict` (`ERR_FSM_CONFLICT`) on concurrent stale writes.
2. **Ed25519 Hash-Chained Vouchers in the Nexconn `System` Channel (`E-08`)**:
   - Every state transition (`DPDP_CONSENT`, `ESCROW_LOCKED`, `CALL_ASSAY_LOG`, `CHANNEL_FROZEN`, `TRIBUNAL_SETTLED`) is hashed (`curr_hash = SHA256(prev_hash || canonical_payload)`) and signed with `ed25519-dalek` in Rust (`services/assay-verifier-rs`, `<0.4ms`), then delivered directly into the user's read-only `System` channel via `@nexconn/server-sdk`'s `SystemMessagesApi`.

### Positive Consequences
- Mathematically eliminates double-settlement race conditions (`go test -race` verified under 50 concurrent goroutines).
- Exercises the Nexconn `System` channel type (`F-09`) as a genuine tamper-evident cryptographic audit ledger.

### Negative Consequences & Mitigations
- **Clients must pass `expected_version` and handle `409 Conflict` responses** → Mitigated by automatic state refresh in `<nc-escrow-deal-card>` whenever a `409` Problem Details payload is returned.

