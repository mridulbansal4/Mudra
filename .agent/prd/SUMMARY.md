# Executive Summary - MUDRA-OS Supabase Persistence & Realtime

MUDRA-OS (`SamvadDeal`) adds full Supabase PostgreSQL persistence (`services/deal-engine-go`, `:4002`) and Supabase Realtime subscriptions (`apps/web`, `:5173`) while preserving zero-config offline fallback:

1. **`StoreInterface` Abstraction**: Clean interface in `internal/store/interface.go` implemented by both `MemoryStore` (`store.go`) and `PostgresStore` (`postgres_store.go`).
2. **Supabase `pgx/v5` `PostgresStore`**: Pooler-aware (`MaxConns=25`, `MinConns=5`, `MaxConnLifetime=15m`), deterministic UUIDv5 + `external_id` mapping for all string IDs (`d_8821_juki`, `e01_...`, `disp_...`, `arena_run_...`), ACID optimistic concurrency (`version` CAS on `escrow_contracts`), append-only `system_audit_vouchers` preserving canonical JSON for `ChainHash`, and idempotent `ON CONFLICT DO NOTHING` boot seeding.
3. **Dual-Mode Boot & Health**: Automatic `.env` discovery, live PostgreSQL connection with structured fallback to `MemoryStore` when offline, and `/health` reporting `"store": "postgresql"` vs `"store": "in-memory"`.
4. **Frontend Realtime**: `@supabase/supabase-js` singleton + `subscribeToVouchers` / `subscribeToDealRealtime` helpers in `apps/web/src/lib/supabase.ts` integrated with `useLiveDeal` without breaking offline/test environments.
