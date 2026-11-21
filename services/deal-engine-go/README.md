# deal-engine-go (:4002)

Go public API gateway and deterministic escrow FSM for MUDRA-OS. It implements API-01..API-18 plus the extras in
`docs/03-engineering/IMPLEMENTATION_CONTRACT.md` §8. It uses only the standard library: no third-party modules and no `go.sum`.

## Run

```bash
cd services/deal-engine-go
go run ./cmd/server          # loads ../../.env if present (it never overrides variables already set)
go test ./...                # add -race if gcc/cgo is available
```

| Env | Default |
|---|---|
| `GO_DEAL_ENGINE_PORT` | `4002` |
| `NEXCONN_BRIDGE_URL` | `http://localhost:4001` |
| `RUST_ASSAY_VERIFIER_URL` | `http://localhost:4003` |
| `INTERNAL_SERVICE_HMAC_SECRET` | unset, so internal calls go unsigned |
| `UPI_WEBHOOK_HMAC_SECRET` | dev value from `.env.example` |
| `MUDRA_JWT_SECRET` | dev default (a warning is logged) |
| `ASSAY_ED25519_PRIVATE_KEY_HEX` | dev seed from `.env.example` |
| `CORS_ALLOWED_ORIGINS` | adds origins to `http://localhost:5173` and `http://127.0.0.1:5173` |

## Storage

**At runtime the service uses a mutex-protected in-memory store.** All data is lost on restart.
`internal/db/migrations/0001_init_schema.{up,down}.sql` holds the PostgreSQL DDL for E-01..E-10, which will be used in
production. It is **not wired in yet**: nothing at runtime connects to Postgres or Redis. The DDL uses the contract's FSM names
(`CREATED … REFUNDED`).

The service seeds this data on boot:
- personas P-01..P-05: Rajesh (buyer, ta-IN), Vikram (seller, hi-IN), Aarav, Meera (arbitrator) and a guest judge
- demo deal `d_8821_juki`: "Juki MO-6814S High-Speed Overlock Machine", ₹1,45,000, in state `FUNDED` with a real signed `ESCROW_LOCKED` voucher
- one open flash lot
- two community subchannels

Get a JWT for a persona with `POST /api/v1/auth/session {"persona_preset":"P-01_RAJESH"}`.

## Degraded mode

When the bridge or Rust service is unreachable, the client opens a circuit breaker for 8 s and background `/health` probes run
every 5 s. Every response that used a fallback says so in an `engine` field:

| Dependency | Fallback |
|---|---|
| Rust | Go regex PII scrubber. Go `crypto/ed25519` voucher signing with the same chain formula. Go DCT pHash and Hamming distance. Go Goertzel RPM estimate from PCM, or a client-supplied `audio_fft_rpm_peak`. |
| Bridge | `sim_…` tokens and stream IDs. Deterministic tribunal split: base by reason code plus a per-bit pHash penalty, so TRANSIT_DAMAGE with distance 2 gives 12/88. Template shopkeeper replies. "Translation" passes the PII-scrubbed text through with a locale tag. |

Voucher hash: `SHA256(prev_hash_hex || deal_id || voucher_type || canonical_json(payload))`. Canonical JSON has sorted keys,
no whitespace and no HTML escaping. The genesis prev hash is 64 zeros. The Ed25519 signature covers the **raw 32-byte digest**.

## Auth and idempotency

- **JWT:** HS256, hand-rolled. Pass it as `Authorization: Bearer <jwt>`. The SSE endpoint also accepts `?access_token=`.
- **RBAC:**
  - Only the buyer can run LOCK_ESCROW or RELEASE_FUNDS.
  - The buyer or seller can run START/MARK assay and RAISE_DISPUTE.
  - API-10 and API-11 need the `arbitrator` role.
  - API-13 needs the `seller` role.
- **Idempotency:** `X-Idempotency-Key` on any POST, cached in memory for 24 h and keyed by (key, method+path). A replay returns
  the cached status and body with `Idempotent-Replay: true`. A duplicate that arrives while the first request is in flight gets
  `409 ERR_IDEMPOTENCY_IN_PROGRESS`. 5xx responses are not cached.
- **Webhook API-17:** verifies `X-Mudra-Signature` (hex HMAC-SHA256 of the raw body, constant-time compare) and allows ±300 s
  on `timestamp_unix`. It is idempotent on `event_id`.

## Docker

```bash
docker build -t mudra/deal-engine-go services/deal-engine-go
```
