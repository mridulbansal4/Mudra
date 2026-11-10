BEGIN;

DROP TABLE IF EXISTS processed_webhook_events;
DROP TABLE IF EXISTS traction_telemetry_events;
DROP TABLE IF EXISTS bargain_arena_runs;
DROP TABLE IF EXISTS open_flash_lots;
DROP TRIGGER IF EXISTS trg_vouchers_append_only ON system_audit_vouchers;
DROP TABLE IF EXISTS system_audit_vouchers;
DROP FUNCTION IF EXISTS forbid_voucher_mutation();
DROP TABLE IF EXISTS dispute_cases;
DROP TABLE IF EXISTS video_assay_logs;
DROP TABLE IF EXISTS bilingual_messages;
DROP TABLE IF EXISTS escrow_contracts;
DROP TABLE IF EXISTS deal_rooms;
DROP TABLE IF EXISTS nexconn_sessions;
DROP TABLE IF EXISTS users;

COMMIT;
