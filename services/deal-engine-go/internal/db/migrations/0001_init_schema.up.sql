-- MUDRA-OS deal-engine-go - initial schema (entities E-01..E-10, DATA_MODEL.md).
-- FSM state and voucher-type names follow IMPLEMENTATION_CONTRACT.md §3 (which
-- overrides the older DRAFT/LOCKED names in DATA_MODEL.md).
-- NOTE: not applied at runtime yet; the service uses its in-memory store.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- E-01 users
CREATE TABLE users (
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
CREATE INDEX idx_users_role_locale ON users (role, preferred_locale);

-- E-02 nexconn_sessions
CREATE TABLE nexconn_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nexconn_user_id  VARCHAR(128) NOT NULL,
    token_sha256     CHAR(64)     NOT NULL,
    client_platform  VARCHAR(16)  NOT NULL CHECK (client_platform IN ('web','mobile_expo','sandbox_split')),
    is_connected_mau BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at       TIMESTAMPTZ  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_nx_mau ON nexconn_sessions (nexconn_user_id, is_connected_mau);
CREATE INDEX idx_sessions_created ON nexconn_sessions (created_at);

-- E-03 deal_rooms
CREATE TABLE deal_rooms (
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
CREATE INDEX idx_deal_rooms_buyer  ON deal_rooms (buyer_user_id);
CREATE INDEX idx_deal_rooms_seller ON deal_rooms (seller_user_id);
CREATE INDEX idx_deal_rooms_frozen ON deal_rooms (is_frozen);

-- E-04 escrow_contracts (optimistic concurrency via version)
CREATE TABLE escrow_contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_room_id    UUID NOT NULL UNIQUE REFERENCES deal_rooms(id) ON DELETE CASCADE,
    fsm_state       VARCHAR(20) NOT NULL DEFAULT 'CREATED'
                    CHECK (fsm_state IN ('CREATED','FUNDED','INSPECTION_LIVE','ASSAY_VERIFIED',
                                         'RELEASED','DISPUTED_FROZEN','ARBITRATED_SPLIT','REFUNDED')),
    amount_paise    BIGINT      NOT NULL CHECK (amount_paise > 0),
    currency        VARCHAR(3)  NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR','SGD','USD')),
    checklist_items JSONB       NOT NULL DEFAULT '[]'::jsonb,
    upi_mandate_umn VARCHAR(128),            -- stored masked (****4821@upi)
    version         INTEGER     NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E-05 bilingual_messages (scrubbed text only)
CREATE TABLE bilingual_messages (
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
CREATE INDEX idx_messages_deal_created ON bilingual_messages (deal_room_id, created_at);

-- E-06 video_assay_logs
CREATE TABLE video_assay_logs (
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
CREATE INDEX idx_assay_deal_stage ON video_assay_logs (deal_room_id, stage_tag);

-- E-07 dispute_cases
CREATE TABLE dispute_cases (
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
CREATE INDEX idx_disputes_deal_status ON dispute_cases (deal_room_id, status);

-- E-08 system_audit_vouchers (append-only hash chain)
CREATE TABLE system_audit_vouchers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_room_id        UUID NOT NULL REFERENCES deal_rooms(id),
    recipient_user_id   UUID REFERENCES users(id),
    voucher_type        VARCHAR(24) NOT NULL
                        CHECK (voucher_type IN ('ESCROW_LOCKED','ASSAY_STARTED','ASSAY_VERIFIED','FUNDS_RELEASED',
                                                'DISPUTE_FROZEN','ARBITRATED_SPLIT','BUYER_REFUNDED','DPDP_CONSENT')),
    prev_voucher_sha256 CHAR(64)     NOT NULL,   -- genesis = 64 zeros
    curr_voucher_sha256 CHAR(64)     NOT NULL UNIQUE,
    ed25519_signature   VARCHAR(128) NOT NULL,
    public_key_hex      CHAR(64)     NOT NULL,
    payload_json        JSONB        NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vouchers_deal_created ON system_audit_vouchers (deal_room_id, created_at);

CREATE OR REPLACE FUNCTION forbid_voucher_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'system_audit_vouchers is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vouchers_append_only
    BEFORE UPDATE OR DELETE ON system_audit_vouchers
    FOR EACH ROW EXECUTE FUNCTION forbid_voucher_mutation();

-- E-09 open_flash_lots
CREATE TABLE open_flash_lots (
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
CREATE INDEX idx_lots_subchannel_expiry ON open_flash_lots (community_subchannel_id, expires_at);

-- E-10 bargain_arena_runs
CREATE TABLE bargain_arena_runs (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID NOT NULL REFERENCES users(id),
    nexconn_direct_channel_id VARCHAR(128) NOT NULL,
    item_slug                 VARCHAR(64)  NOT NULL,
    ask_paise                 BIGINT NOT NULL CHECK (ask_paise > 0),
    floor_paise               BIGINT NOT NULL,          -- hidden reservation floor at close
    current_offer_paise       BIGINT,
    turns_used                SMALLINT NOT NULL DEFAULT 0,
    is_won                    BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_arena_item_offer ON bargain_arena_runs (item_slug, current_offer_paise);

-- Telemetry events feeding API-18
CREATE TABLE traction_telemetry_events (
    id          BIGSERIAL PRIMARY KEY,
    event_type  VARCHAR(48) NOT NULL,
    metric_ms   NUMERIC(12,4),
    attributes  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_telemetry_type_created ON traction_telemetry_events (event_type, created_at);

-- Webhook idempotency (API-17)
CREATE TABLE processed_webhook_events (
    event_id      VARCHAR(128) PRIMARY KEY,
    response_json JSONB NOT NULL,
    received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
