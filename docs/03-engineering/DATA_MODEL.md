# Data Model & Database Schema — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Data & Systems Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Architecture](./ARCHITECTURE.md) · [API Spec](./API_SPEC.md) · [Privacy (DPDP)](../06-security-compliance/PRIVACY.md) · [ADR-0005](./adr/ADR-0005-postgresql-redis-and-system-channel-immutable-ledger.md)

---

## 1. Entity-Relationship (ER) Diagram (`E-01` – `E-10`)

```mermaid
erDiagram
    USERS ||--o{ NEXCONN_SESSIONS : "authenticates (E-01 -> E-02)"
    USERS ||--o{ DEAL_ROOMS : "participates as buyer/seller/arbitrator (E-03)"
    DEAL_ROOMS ||--|| ESCROW_CONTRACTS : "governs 1:1 FSM (E-03 -> E-04)"
    DEAL_ROOMS ||--o{ BILINGUAL_MESSAGES : "contains streamed translations (E-05)"
    DEAL_ROOMS ||--o{ VIDEO_ASSAY_LOGS : "records WebRTC + Rust assays (E-06)"
    DEAL_ROOMS ||--o{ DISPUTE_CASES : "triggers freeze tribunal (E-07)"
    DEAL_ROOMS ||--o{ SYSTEM_AUDIT_VOUCHERS : "anchors hash chain (E-08)"
    USERS ||--o{ OPEN_FLASH_LOTS : "broadcasts priority lots (E-09)"
    USERS ||--o{ BARGAIN_ARENA_RUNS : "plays 60s challenge (E-10)"

    USERS {
        uuid id PK
        varchar nexconn_user_id UK "Issued via /v4/auth/access-token/issue"
        varchar display_name
        varchar role "buyer | seller | arbitrator | guest"
        varchar preferred_locale "ta-IN | hi-IN | mr-IN | pa-IN | ml-IN | en-IN"
        varchar kyc_tier "GUEST_SANDBOX | PHONE_VERIFIED | GSTIN_VERIFIED"
        timestamptz created_at
    }

    NEXCONN_SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar nexconn_user_id
        varchar token_sha256 "Hash of issued Nexconn token"
        varchar client_platform "web | mobile_expo | sandbox_split"
        boolean is_connected_mau "Verified NCEngine.connect event"
        timestamptz expires_at
        timestamptz created_at
    }

    DEAL_ROOMS {
        uuid id PK
        varchar nexconn_channel_id UK "Direct or Group channelId"
        varchar channel_type "DIRECT | GROUP"
        uuid buyer_user_id FK
        uuid seller_user_id FK
        uuid arbitrator_user_id FK "Nullable until /dispatch assign"
        smallint story_stage "1=Negotiate, 2=Escrow, 3=Assay, 4=Settlement"
        boolean is_frozen "Set true by addGroupChannelFreezeList"
        timestamptz created_at
        timestamptz updated_at
    }

    ESCROW_CONTRACTS {
        uuid id PK
        uuid deal_room_id FK UK
        varchar fsm_state "DRAFT|LOCKED|ASSAY_IN_PROGRESS|ASSAY_VERIFIED|DISPUTE_FROZEN|SETTLED_RELEASED|SETTLED_SPLIT|REFUNDED"
        bigint amount_paise "Stored in integer paise (Rs 1,45,000 = 14500000)"
        varchar currency "INR | SGD | USD"
        jsonb checklist_items "Serial plate, RPM target, warranty months"
        varchar upi_mandate_umn "UPI ASBA / PA-Escrow reference"
        integer version "Optimistic concurrency lock counter"
        timestamptz updated_at
    }

    BILINGUAL_MESSAGES {
        uuid id PK
        uuid deal_room_id FK
        varchar nexconn_msg_id UK
        varchar sender_nexconn_id
        varchar source_locale
        varchar target_locale
        text scrubbed_source_text "Post-Rust <300us DPDP PII scrub"
        text translated_text "Streamed via sendGroupChannelStreamMessage"
        jsonb extracted_terms_json "Price, model, RPM, warranty"
        integer stream_ttft_ms
        timestamptz created_at
    }

    VIDEO_ASSAY_LOGS {
        uuid id PK
        uuid deal_room_id FK
        varchar nexconn_call_id UK "From onServerCallLogReceived"
        varchar stage_tag "PRE_SHIPMENT | POST_DELIVERY"
        char_16 frame_phash_hex "64-bit Rust DCT perceptual hash"
        numeric blur_laplacian_score "Must be >= 120.0"
        varchar detected_serial_text "e.g. JUKI-MO-6814S-8821"
        numeric audio_fft_rpm_peak "e.g. 4820.0 RPM from rustfft"
        jsonb vision_verdict_json "M-03 Gemini 2.5 Flash Vision output"
        varchar ed25519_sig_hex "Signed by assay-verifier-rs"
        timestamptz created_at
    }

    DISPUTE_CASES {
        uuid id PK
        uuid deal_room_id FK
        varchar freeze_reason_code "TRANSIT_DAMAGE | SERIAL_MISMATCH | SLA_BREACH"
        integer hamming_distance_phash "Pre vs Post pHash diff"
        jsonb ai_tribunal_proposal_json "Streamed by M-04 via sendGroupChannelStreamMessage"
        integer buyer_refund_bps "e.g. 1200 (12.00%)"
        integer seller_payout_bps "e.g. 8800 (88.00%)"
        varchar status "FROZEN_OPEN | ARBITRATOR_ASSIGNED | SETTLED_BINDING"
        timestamptz frozen_at
        timestamptz resolved_at
    }

    SYSTEM_AUDIT_VOUCHERS {
        uuid id PK
        uuid deal_room_id FK
        uuid recipient_user_id FK
        varchar voucher_type "DPDP_CONSENT | ESCROW_LOCKED | CALL_ASSAY_LOG | CHANNEL_FROZEN | TRIBUNAL_SETTLED"
        char_64 prev_voucher_sha256 "Genesis = 64 zeros"
        char_64 curr_voucher_sha256
        varchar ed25519_signature "Verifiable with server public key"
        jsonb payload_json
        timestamptz created_at
    }

    OPEN_FLASH_LOTS {
        uuid id PK
        varchar nexconn_open_channel_id
        varchar community_subchannel_id "From createCommunitySubchannel"
        uuid seller_user_id FK
        varchar title
        bigint ask_amount_paise
        boolean is_priority_whitelisted "Via OpenChannelPriorityControlsApi"
        timestamptz expires_at
    }

    BARGAIN_ARENA_RUNS {
        uuid id PK
        uuid user_id FK
        varchar nexconn_direct_channel_id
        varchar item_slug "macbook-m2-52k | rtx-3080-32k"
        bigint ask_paise
        bigint floor_paise "Hidden Go reservation floor"
        bigint current_offer_paise
        smallint turns_used
        boolean is_won
        timestamptz created_at
    }
```

---

## 2. Entity Specifications, Indexes, PII Classification & Retention (`E-01` – `E-10`)

| Entity ID | Table Name | Key Constraints & Indexes | PII Classification (India DPDP Act 2023 / Singapore PDPA) | Retention Policy |
|---|---|---|---|---|
| **E-01** | `users` | `UNIQUE(nexconn_user_id)`, `INDEX(role, preferred_locale)` | **PII-Medium**: `display_name` (pseudonymous in `/sandbox` & `/arena`). Phone/email hashed with Argon2id if provided. | Active account + 180 days post-deletion request (`DELETE /api/v1/privacy/erase`). |
| **E-02** | `nexconn_sessions` | `INDEX(nexconn_user_id, is_connected_mau)`, `INDEX(created_at)` | **PII-Low**: Stores only SHA-256 hash of Nexconn access token + platform enum. | 180 days (CERT-In security log mandate). |
| **E-03** | `deal_rooms` | `UNIQUE(nexconn_channel_id)`, `INDEX(buyer_user_id)`, `INDEX(seller_user_id)`, `INDEX(is_frozen)` | **Non-PII Metadata**: Relational pointers & story stage (`1..4`). | 3 years (Commercial contract audit trail). |
| **E-04** | `escrow_contracts` | `UNIQUE(deal_room_id)`, `CHECK (amount_paise > 0)`, `version INTEGER NOT NULL DEFAULT 1` | **Financial Metadata**: Integer `amount_paise` and masked UPI Mandate UMN (`****4821@upi`). Zero card/CVV numbers stored. | 5 years (RBI / Income Tax financial record rules). |
| **E-05** | `bilingual_messages` | `UNIQUE(nexconn_msg_id)`, `INDEX(deal_room_id, created_at)` | **PII-Scrubbed**: `scrubbed_source_text` is processed by Rust `assay-verifier-rs` (`<300µs`) to redact raw Aadhaar/PAN/phone/bank numbers (`[REDACTED_PII]`) before DB write or LLM transit. | 90 days (or purged immediately upon Data Principal erasure after deal settlement). |
| **E-06** | `video_assay_logs` | `UNIQUE(nexconn_call_id)`, `INDEX(deal_room_id, stage_tag)` | **PII-Restricted**: Stores only 64-bit `frame_phash_hex`, serial OCR text, and audio FFT RPM float—never raw biometric face recordings unless explicitly consented for dispute evidence. | 90 days post-settlement. |
| **E-07** | `dispute_cases` | `INDEX(deal_room_id, status)` | **Non-PII Legal Record**: Basis-point split integers (`buyer_refund_bps + seller_payout_bps = 10000`) and tribunal rationale JSON. | 3 years (Arbitration & Conciliation Act record). |
| **E-08** | `system_audit_vouchers` | `INDEX(deal_room_id, created_at)`, `UNIQUE(curr_voucher_sha256)` | **Cryptographic Audit Hash**: Contains SHA-256 hash chain and Ed25519 signature; zero raw personal identifiers inside the hash payload. | Immutable ledger (retained for statutory audit). |
| **E-09** | `open_flash_lots` | `INDEX(community_subchannel_id, expires_at)` | **Public Catalog Data**: Commodity title, price, and subchannel tag. | 30 days after lot expiry. |
| **E-10** | `bargain_arena_runs` | `INDEX(item_slug, current_offer_paise)` | **Zero PII**: Gamified session score linked to ephemeral `nexconn_user_id`. | 60 days. |

---

## 3. PostgreSQL 17 DDL & Optimistic Locking Pattern (`services/deal-engine-go`)

To guarantee that concurrent clicks on `<nc-escrow-deal-card>` (e.g., Buyer clicking `Raise Dispute` at the exact millisecond Seller clicks `Release Funds`) can never corrupt the escrow state, `services/deal-engine-go` uses `sqlc`-generated queries with explicit `version` checks:

```sql
-- services/deal-engine-go/db/queries/escrow.sql
-- name: TransitionEscrowState :one
UPDATE escrow_contracts
SET
    fsm_state = sqlc.arg(next_state),
    version = version + 1,
    updated_at = NOW()
WHERE
    deal_room_id = sqlc.arg(deal_room_id)
    AND fsm_state = sqlc.arg(expected_current_state)
    AND version = sqlc.arg(expected_version)
RETURNING id, deal_room_id, fsm_state, amount_paise, version, updated_at;
```

---

## 4. Database Migrations Strategy

- Managed via **`golang-migrate/migrate/v4`** embedded directly in `services/deal-engine-go/internal/db/migrations/*.up.sql` and `*.down.sql`.
- On startup (`go run ./cmd/server`), the Go binary automatically applies pending up-migrations inside an advisory lock (`pg_advisory_lock(882101)`) and seeds the default demo personas (`P-01`..`P-04`), `Community` category subchannels, and `Open` flash lots so local setup (`ENVIRONMENT_SETUP.md`) and CI E2E tests work in one command.
