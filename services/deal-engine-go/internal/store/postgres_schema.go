package store

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// baseSchemaSQL holds 0001_init_schema.up.sql for empty non-provisioned databases.
const baseSchemaSQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nexconn_user_id  VARCHAR(128) NOT NULL UNIQUE,
    display_name     VARCHAR(120) NOT NULL,
    role             VARCHAR(16)  NOT NULL CHECK (role IN ('buyer','seller','arbitrator','guest')),
    preferred_locale VARCHAR(8)   NOT NULL DEFAULT 'en-IN'
                     CHECK (preferred_locale IN ('ta-IN','hi-IN','mr-IN','pa-IN','ml-IN','en-IN','en-SG')),
    kyc_tier         VARCHAR(20)  NOT NULL DEFAULT 'GUEST_SANDBOX'
                     CHECK (kyc_tier IN ('GUEST_SANDBOX','PHONE_VERIFIED','GSTIN_VERIFIED')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role_locale ON users (role, preferred_locale);

CREATE TABLE IF NOT EXISTS nexconn_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nexconn_user_id  VARCHAR(128) NOT NULL,
    token_sha256     CHAR(64)     NOT NULL,
    client_platform  VARCHAR(16)  NOT NULL CHECK (client_platform IN ('web','mobile_expo','sandbox_split')),
    is_connected_mau BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at       TIMESTAMPTZ  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_rooms (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nexconn_channel_id VARCHAR(128) NOT NULL UNIQUE,
    channel_type       VARCHAR(8)   NOT NULL DEFAULT 'GROUP' CHECK (channel_type IN ('DIRECT','GROUP')),
    title              VARCHAR(200) NOT NULL,
    buyer_user_id      UUID NOT NULL REFERENCES users(id),
    seller_user_id     UUID NOT NULL REFERENCES users(id),
    arbitrator_user_id UUID REFERENCES users(id),
    story_stage        SMALLINT     NOT NULL DEFAULT 1 CHECK (story_stage BETWEEN 1 AND 4),
    is_frozen          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (buyer_user_id <> seller_user_id)
);

CREATE TABLE IF NOT EXISTS escrow_contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_room_id    UUID NOT NULL UNIQUE REFERENCES deal_rooms(id) ON DELETE CASCADE,
    fsm_state       VARCHAR(20) NOT NULL DEFAULT 'CREATED'
                    CHECK (fsm_state IN ('CREATED','FUNDED','INSPECTION_LIVE','ASSAY_VERIFIED',
                                         'RELEASED','DISPUTED_FROZEN','ARBITRATED_SPLIT','REFUNDED')),
    amount_paise    BIGINT      NOT NULL CHECK (amount_paise > 0),
    currency        VARCHAR(3)  NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR','SGD','USD')),
    checklist_items JSONB       NOT NULL DEFAULT '[]'::jsonb,
    upi_mandate_umn VARCHAR(128),
    version         INTEGER     NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bilingual_messages (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_room_id         UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
    nexconn_msg_id       VARCHAR(128) NOT NULL UNIQUE,
    sender_nexconn_id    VARCHAR(128) NOT NULL,
    message_type         VARCHAR(48)  NOT NULL DEFAULT 'x-mudra-bilingual-bubble',
    source_locale        VARCHAR(8)   NOT NULL,
    target_locale        VARCHAR(8)   NOT NULL,
    scrubbed_source_text TEXT         NOT NULL,
    translated_text      TEXT         NOT NULL,
    extracted_terms_json JSONB        NOT NULL DEFAULT '{}'::jsonb,
    stream_ttft_ms       INTEGER,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_assay_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_room_id         UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
    nexconn_call_id      VARCHAR(128) NOT NULL UNIQUE,
    stage_tag            VARCHAR(16)  NOT NULL CHECK (stage_tag IN ('PRE_SHIPMENT','POST_DELIVERY')),
    assay_passed         BOOLEAN      NOT NULL DEFAULT FALSE,
    frame_phash_hex      CHAR(16),
    blur_laplacian_score NUMERIC(10,2),
    detected_serial_text VARCHAR(64),
    audio_fft_rpm_peak   NUMERIC(10,1),
    vision_verdict_json  JSONB,
    ed25519_sig_hex      VARCHAR(128),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_cases (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_room_id              UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
    freeze_reason_code        VARCHAR(20) NOT NULL CHECK (freeze_reason_code IN ('TRANSIT_DAMAGE','SERIAL_MISMATCH','SLA_BREACH')),
    description               TEXT,
    hamming_distance_phash    INTEGER CHECK (hamming_distance_phash BETWEEN 0 AND 64),
    ai_tribunal_proposal_json JSONB,
    buyer_refund_bps          INTEGER CHECK (buyer_refund_bps BETWEEN 0 AND 10000),
    seller_payout_bps         INTEGER CHECK (seller_payout_bps BETWEEN 0 AND 10000),
    status                    VARCHAR(24) NOT NULL DEFAULT 'FROZEN_OPEN'
                              CHECK (status IN ('FROZEN_OPEN','ARBITRATOR_ASSIGNED','SETTLED_BINDING')),
    frozen_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    freeze_expires_at         TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 seconds',
    resolved_at               TIMESTAMPTZ,
    CHECK (buyer_refund_bps IS NULL OR seller_payout_bps IS NULL OR buyer_refund_bps + seller_payout_bps = 10000)
);

CREATE TABLE IF NOT EXISTS system_audit_vouchers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_room_id        UUID NOT NULL REFERENCES deal_rooms(id),
    recipient_user_id   UUID REFERENCES users(id),
    voucher_type        VARCHAR(24) NOT NULL
                        CHECK (voucher_type IN ('ESCROW_LOCKED','ASSAY_STARTED','ASSAY_VERIFIED','FUNDS_RELEASED',
                                                'DISPUTE_FROZEN','ARBITRATED_SPLIT','BUYER_REFUNDED','DPDP_CONSENT')),
    prev_voucher_sha256 CHAR(64)     NOT NULL,
    curr_voucher_sha256 CHAR(64)     NOT NULL UNIQUE,
    ed25519_signature   VARCHAR(128) NOT NULL,
    public_key_hex      CHAR(64)     NOT NULL,
    payload_json        JSONB        NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION forbid_voucher_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'system_audit_vouchers is append-only';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_vouchers_append_only'
          AND tgrelid = (current_schema() || '.system_audit_vouchers')::regclass
    ) THEN
        CREATE TRIGGER trg_vouchers_append_only
            BEFORE UPDATE OR DELETE ON system_audit_vouchers
            FOR EACH ROW EXECUTE FUNCTION forbid_voucher_mutation();
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS open_flash_lots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nexconn_open_channel_id VARCHAR(128) NOT NULL,
    community_subchannel_id VARCHAR(128),
    seller_user_id          UUID NOT NULL REFERENCES users(id),
    title                   VARCHAR(200) NOT NULL,
    ask_amount_paise        BIGINT NOT NULL CHECK (ask_amount_paise > 0),
    current_bid_paise       BIGINT,
    assay_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    is_priority_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at              TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bargain_arena_runs (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID NOT NULL REFERENCES users(id),
    nexconn_direct_channel_id VARCHAR(128) NOT NULL,
    item_slug                 VARCHAR(64)  NOT NULL,
    ask_paise                 BIGINT NOT NULL CHECK (ask_paise > 0),
    floor_paise               BIGINT NOT NULL,
    current_offer_paise       BIGINT,
    turns_used                SMALLINT NOT NULL DEFAULT 0,
    is_won                    BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traction_telemetry_events (
    id          BIGSERIAL PRIMARY KEY,
    event_type  VARCHAR(48) NOT NULL,
    metric_ms   NUMERIC(12,4),
    attributes  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_webhook_events (
    event_id      VARCHAR(128) PRIMARY KEY,
    response_json JSONB NOT NULL,
    received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`

var runtimeExtensionStatements = []string{
	`ALTER TABLE deal_rooms ADD COLUMN IF NOT EXISTS external_id VARCHAR(128) UNIQUE`,
	`ALTER TABLE deal_rooms ADD COLUMN IF NOT EXISTS deal_meta JSONB NOT NULL DEFAULT '{}'::jsonb`,
	`ALTER TABLE bilingual_messages ADD COLUMN IF NOT EXISTS seq BIGSERIAL`,
	`ALTER TABLE bilingual_messages ADD COLUMN IF NOT EXISTS msg_meta JSONB NOT NULL DEFAULT '{}'::jsonb`,
	`ALTER TABLE video_assay_logs ADD COLUMN IF NOT EXISTS seq BIGSERIAL`,
	`ALTER TABLE system_audit_vouchers ADD COLUMN IF NOT EXISTS seq BIGSERIAL`,
	`ALTER TABLE system_audit_vouchers ADD COLUMN IF NOT EXISTS external_id VARCHAR(128)`,
	`ALTER TABLE system_audit_vouchers ADD COLUMN IF NOT EXISTS signing_engine VARCHAR(64)`,
	`ALTER TABLE dispute_cases ADD COLUMN IF NOT EXISTS external_id VARCHAR(128) UNIQUE`,
	`ALTER TABLE open_flash_lots ADD COLUMN IF NOT EXISTS external_id VARCHAR(128) UNIQUE`,
	`ALTER TABLE bargain_arena_runs ADD COLUMN IF NOT EXISTS external_id VARCHAR(128) UNIQUE`,
	`ALTER TABLE bargain_arena_runs ADD COLUMN IF NOT EXISTS run_meta JSONB NOT NULL DEFAULT '{}'::jsonb`,
	`CREATE TABLE IF NOT EXISTS community_subchannels (
		subchannel_id        VARCHAR(128) PRIMARY KEY,
		slug                 VARCHAR(64)  NOT NULL UNIQUE,
		title                VARCHAR(200) NOT NULL,
		active_members       INTEGER      NOT NULL DEFAULT 0,
		community_channel_id VARCHAR(128) NOT NULL,
		created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
	)`,
	`DO $$
	BEGIN
		IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
			IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'system_audit_vouchers') THEN
				ALTER PUBLICATION supabase_realtime ADD TABLE public.system_audit_vouchers;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'escrow_contracts') THEN
				ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_contracts;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deal_rooms') THEN
				ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_rooms;
			END IF;
		END IF;
	EXCEPTION WHEN OTHERS THEN
		NULL;
	END $$`,
}

func isValidIdent(s string) bool {
	if s == "" || len(s) > 63 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_') {
			return false
		}
	}
	return true
}

func ensureSchema(ctx context.Context, pool *pgxpool.Pool, customSchema string) error {
	if customSchema != "" && isValidIdent(customSchema) {
		if _, err := pool.Exec(ctx, "CREATE SCHEMA IF NOT EXISTS "+customSchema, pgx.QueryExecModeSimpleProtocol); err != nil {
			return err
		}
	}
	var reg *string
	if err := pool.QueryRow(ctx, `SELECT to_regclass(current_schema() || '.users')::text`).Scan(&reg); err != nil {
		return err
	}
	if reg == nil || *reg == "" {
		if _, err := pool.Exec(ctx, baseSchemaSQL, pgx.QueryExecModeSimpleProtocol); err != nil {
			return err
		}
	}
	for _, stmt := range runtimeExtensionStatements {
		if _, err := pool.Exec(ctx, stmt, pgx.QueryExecModeSimpleProtocol); err != nil {
			return err
		}
	}
	return nil
}
