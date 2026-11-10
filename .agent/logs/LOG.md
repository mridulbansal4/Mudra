# Ralph Loop Execution Log — SAMADHAN-OS Supabase Persistence & Realtime

All task iterations and verification gates are logged below (newest entries at the top).

## [2026-11-11] TASK-6: End-to-End Live Supabase Persistence, Restart, Trigger & Monorepo Regression — PASSED
- Live `deal-engine-go` boot log: `connected to Supabase PostgreSQL cluster` (`aws-1-ap-south-1.pooler.supabase.com:5432/postgres`). `GET /health` returned `store=postgresql`.
- Seeded `d_8821_juki` hydrated as `FUNDED` version 2 with one `ESCROW_LOCKED` voucher (64-char hash).
- Posted a unique buyer message, restarted the process, and read the same deal back: `FUNDED`, version 2, voucher count 1, message still present.
- `TestPostgresStoreLiveSupabaseSuite` passed (3.00s), including idempotent seed, optimistic-lock conflict, and `trg_vouchers_append_only` UPDATE/DELETE rejection.
- Unreachable `DATABASE_URL` on port 4012 logged `failed to connect to PostgreSQL; falling back to in-memory store` and `GET /health` returned `store=in-memory`.
- `go test -count=1 ./...` passed. `-race` could not run: this machine has no gcc, so cgo is unavailable.
- `cargo test` in `services/assay-verifier-rs`: 34 passed.

## [2026-11-11] TASK-5: Frontend Supabase Realtime Integration — PASSED
- Added `@supabase/supabase-js` to `apps/web`.
- `apps/web/src/lib/supabase.ts` exports a null-safe client, `subscribeToVouchers`, and `subscribeToDealRealtime`. UUID deal ids filter `deal_room_id`; external ids such as `d_8821_juki` filter `deal_rooms.external_id`.
- `useLiveDeal` refreshes on those events and still uses SSE with 3s polling fallback.
- `pnpm --filter @samadhan/web typecheck`, `test` (5 passed), and `build` completed with zero errors.

## [2026-11-11] TASK-4: Config, .env Loading, Dual-Mode Server Boot & /health Store Reporting — PASSED
- `handlers.New` opens `PostgresStore` when `DATABASE_URL` is set and reachable, and falls back to `MemoryStore` when the URL is empty, a localhost `samadhan_os` placeholder, or unreachable.
- Boot logs `connected to Supabase PostgreSQL cluster` with a password-stripped DSN.
- `GET /health` and `GET /api/v1/health` report `store` as `postgresql` or `in-memory`.
- Process shutdown calls `Server.Close()`, which closes the pgx pool. Handler unit tests still boot with an empty URL and expect `in-memory`.

## [2026-11-11] TASK-3: Implement PostgresStore with pgx/v5, ACID Optimistic Locking & Idempotent Seeding — PASSED
- **Changes**:
  - Implemented `services/deal-engine-go/internal/store/postgres_helpers.go`, `postgres_schema.go`, `postgres_store.go`, and `postgres_queries.go` backed by `github.com/jackc/pgx/v5/pgxpool` (`MaxConns=25`, `MinConns=5`, `MaxConnLifetime=15m`, `QueryExecModeExec` on Supavisor poolers, plus `aws-0` → `aws-1` pooler shard auto-failover).
  - Updated `.env` pooler shard host from `aws-0-ap-south-1.pooler.supabase.com` to `aws-1-ap-south-1.pooler.supabase.com` after verifying project `ttpgogzqispnexpktrsv` resides on `aws-1-ap-south-1`.
  - Implemented deterministic UUIDv5 + `external_id` mapping, ACID transaction + `WHERE deal_room_id = $2::uuid AND version = $3` optimistic locking (`*fsm.ConflictError`), strictly append-only `system_audit_vouchers` with `json.Decoder.UseNumber()` preserving integer precision for `ChainHash` verification, and idempotent `ON CONFLICT DO NOTHING` seeding.
  - Added `services/deal-engine-go/internal/store/postgres_store_test.go` covering deterministic UUID helpers, double `SeedStatic` idempotency, ACID version conflict, 8-goroutine optimistic lock race, `trg_vouchers_append_only` trigger rejection (`UPDATE` + `DELETE`), webhook idempotency, and restart re-hydration + Ed25519 verification in an isolated temporary PostgreSQL schema.
- **Verification**: `go test -v -count=1 ./internal/store/...` passed (`TestPostgresStoreLiveSupabaseSuite` 2.51s against live Supabase PostgreSQL).

## [2026-11-11] TASK-2: Extract StoreInterface & Refactor MemoryStore and Handlers — PASSED
- **Changes**:
  - Created `services/deal-engine-go/internal/store/interface.go` defining `StoreInterface`, `VoucherMintFunc`, and `BackendInMemory` / `BackendPostgreSQL` constants.
  - Added `NewMachineWithVersion` and `Sync` to `internal/fsm/escrow_fsm.go`, and optional persistence `TelemetrySink` hook to `internal/store/telemetry.go`.
  - Updated `MemoryStore` (`internal/store/store.go`) with `BackendName()`, `Telemetry()`, `Close()`, `RecordSession(...)`, `ApplyTransition(...)`, and `SaveArena(...)`.
  - Refactored `Server` and all HTTP handlers (`server.go`, `engine.go`, `deals.go`, `assay.go`, `arena.go`, `auth_sandbox.go`, `webhooks.go`, `traction.go`) to depend exclusively on `store.StoreInterface`, including idempotent `s.seed()` existence guard on `SeedDealID`.
- **Verification**: `go test -v ./...` passed 100% across all packages (`internal/clients`, `internal/config`, `internal/fsm`, `internal/handlers`, `internal/hrtime`, `internal/middleware`, `internal/store`).

## [2026-11-11] TASK-1: Recon, Prerequisite & Live Supabase Schema Verification — PASSED
- **Toolchains Verified**: Go `1.26.5` (`go.mod` pinned to `go 1.24` matching `Dockerfile`), Node `v24.15.0`, pnpm `11.9.0`, Cargo `1.99.1`.
- **Environment & Connectivity**: Verified `.env` configures `DATABASE_URL` (`aws-0-ap-south-1.pooler.supabase.com:5432`, `sslmode=require`), `DATABASE_MAX_CONNS=25`, `DATABASE_MIN_CONNS=5`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. Live TCP handshake to `aws-0-ap-south-1.pooler.supabase.com:5432` succeeded.
- **Schema Audit**: Inspected `0001_init_schema.up.sql` across all 12 tables (`users`, `nexconn_sessions`, `deal_rooms`, `escrow_contracts`, `bilingual_messages`, `video_assay_logs`, `dispute_cases`, `system_audit_vouchers` + `trg_vouchers_append_only`, `open_flash_lots`, `bargain_arena_runs`, `traction_telemetry_events`, `processed_webhook_events`) and mapped every Go string ID (`d_8821_juki`, `e01_...`, `disp_...`, `arena_run_...`, `lot_...`) and `CHAR(N)` / `JSONB` edge case.
- **Baseline Tests**: `services/deal-engine-go` `go test ./...` passed (7 packages); `pnpm typecheck` passed across all workspace packages; `services/nexconn-bridge-node` passed all 33 Vitest tests.
