# Product Requirements Document (PRD)
## Supabase PostgreSQL Persistence & Realtime Integration — SAMADHAN-OS (`SamvadDeal`)

### 1. Overview & Objective
Upgrade **SAMADHAN-OS (`SamvadDeal`)** (`services/deal-engine-go` on `:4002` and `apps/web` on `:5173`) from volatile in-memory-only runtime storage to **production-grade Supabase PostgreSQL persistence with ACID optimistic concurrency, cryptographic append-only audit vouchers, dual-mode offline fallback, idempotent boot seeding, and Frontend Supabase Realtime subscriptions**.

### 2. Core Architectural Requirements

#### 2.1 Dual-Mode Storage Engine (`PostgresStore` + `MemoryStore`)
- `services/deal-engine-go` MUST connect to Supabase PostgreSQL whenever `DATABASE_URL` is configured and reachable (loaded from process environment or workspace `.env`).
- If `DATABASE_URL` is unset, uses an unconfigured local placeholder that is offline, or fails connection/ping at boot, the server MUST log a clear structured warning (`slog.Warn`) and cleanly fall back to `MemoryStore` so standalone unit tests and offline development never break.
- `GET /health` and `GET /api/v1/health` MUST report `"store": "postgresql"` when backed by `PostgresStore` and `"store": "in-memory"` when backed by `MemoryStore`, preserving all existing `/health` payload fields.

#### 2.2 Connection Pool & Supabase Supavisor Compatibility
- Use `github.com/jackc/pgx/v5/pgxpool` with `MaxConns = 25` (`DATABASE_MAX_CONNS`), `MinConns = 5` (`DATABASE_MIN_CONNS`), and `MaxConnLifetime = 15m`.
- Support both Supabase Session Pooler (`:5432`) and Transaction Pooler (`:6543` / PgBouncer) seamlessly by configuring `DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol` when connected via pooler port `6543` (or `QueryExecModeCacheDescribe` / safe protocol handling) so prepared statements never collide across pooled connections.

#### 2.3 Schema Fidelity & Zero UUID/String ID Mismatch
- Preserve 100% compatibility with `services/deal-engine-go/internal/db/migrations/0001_init_schema.up.sql` (`E-01`..`E-10`, `traction_telemetry_events`, `processed_webhook_events`, and `trg_vouchers_append_only`).
- Map Go string IDs (`"e01_<uuid>"`, `"d_8821_juki"`, `"disp_..."`, `"arena_run_..."`, `"lot_..."`, `"vch_..."`, `"msg_..."`) deterministically to PostgreSQL `UUID` primary keys (`UserUUID` stripping `"e01_"` + `UUIDv5` SHA-1 deterministic mapping for non-UUID slugs) alongside non-breaking `external_id` / metadata JSONB columns (`ADD COLUMN IF NOT EXISTS`) so every API route (`GET /api/v1/deals/d_8821_juki`, `ListDeals`, `ListDisputes`, etc.) round-trips string IDs across process restarts with zero `invalid input syntax for type uuid` errors.
- Preserve exact canonical JSON in `system_audit_vouchers.payload_json` (decoded via `json.Decoder.UseNumber()`) so `clients.ChainHash` and Ed25519 signature verification succeed 100% after round-tripping through PostgreSQL `JSONB`.

#### 2.4 ACID Optimistic Locking & Append-Only Audit Vouchers
- Execute escrow FSM state transitions inside a PostgreSQL ACID transaction (`BEGIN ... COMMIT`):
  - Perform `UPDATE escrow_contracts SET fsm_state = $1, version = version + 1, updated_at = NOW() WHERE deal_room_id = $2 AND version = $3`.
  - If `0` rows are updated due to concurrent modification or stale `expected_version`, roll back and return `*fsm.ConflictError` (`HTTP 409 ERR_FSM_CONFLICT`).
  - Insert signed vouchers strictly via `INSERT INTO system_audit_vouchers ... ON CONFLICT (curr_voucher_sha256) DO NOTHING`. Never issue `UPDATE` or `DELETE` against `system_audit_vouchers` (enforced by `trg_vouchers_append_only`).

#### 2.5 Idempotent Boot Seeding
- On boot, seed personas (`P-01`..`P-05`), marketplace lot (`lot_juki_8821`), community subchannels (`sub/machinery`, `sub/refurb-tech`), and initial funded deal (`d_8821_juki`) idempotently (`ON CONFLICT DO NOTHING` + existence check on `d_8821_juki`).
- Restarting `deal-engine-go` MUST preserve any mutated state, messages, assay logs, disputes, and vouchers on `d_8821_juki` and newly created deals without duplicating or overwriting existing records.

#### 2.6 Frontend Supabase Realtime Integration (`apps/web`)
- Add `@supabase/supabase-js` to `apps/web/package.json`.
- Create `apps/web/src/lib/supabase.ts` exporting a safe `supabase` client singleton (graceful `null` when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent), typed `subscribeToVouchers` and `subscribeToDealRealtime` helpers, and wire realtime updates into `useLiveDeal` (`apps/web/src/lib/deal.ts`).
- Add `apps/web/src/vite-env.d.ts` environment variable typings and unit tests.

### 3. Environment Variables (`.env.example` Reference)
- `DATABASE_URL`: PostgreSQL connection string (`postgresql://...pooler.supabase.com:5432/postgres?sslmode=require`)
- `DATABASE_MAX_CONNS`: Pool max connections (default `25`)
- `DATABASE_MIN_CONNS`: Pool min connections (default `5`)
- `VITE_SUPABASE_URL`: Public Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Public Supabase anon/publishable key

### 4. Success Metrics & Quality Gates
1. `go test -v -race ./...` passes 100% in `services/deal-engine-go` (both `MemoryStore` unit tests and `PostgresStore` integration tests).
2. Live `deal-engine-go` boot against Supabase logs `connected to Supabase PostgreSQL cluster` and `GET /health` returns `"store": "postgresql"`.
3. State mutations and Ed25519 hash-chained vouchers persist across process restarts.
4. `UPDATE` / `DELETE` on `system_audit_vouchers` is rejected by `trg_vouchers_append_only` (`system_audit_vouchers is append-only`).
5. Unset/unreachable `DATABASE_URL` cleanly logs warning and falls back to `"store": "in-memory"`.
6. Monorepo `pnpm typecheck`, `pnpm test`, `pnpm build`, and Rust `cargo test` pass with zero errors.
