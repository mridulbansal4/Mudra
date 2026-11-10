# Implementation Contract (code-level source of truth)

> The docs in this repo were written before code existed and disagree with each other in places
> (e.g. FSM state names `DRAFT/LOCKED` in BACKEND.md vs `CREATED/FUNDED` in API_SPEC.md, and Nexconn SDK
> call shapes that differ from the real `@nexconn/server-sdk@0.1.2`). **Where they conflict, this file wins.**

## 1. Ports

| Service | Port | Language |
|---|---|---|
| `services/nexconn-bridge-node` | 4001 | Node 22+ / Fastify 5 / TypeScript |
| `services/deal-engine-go` | 4002 | Go (public gateway `/api/v1/*`) |
| `services/assay-verifier-rs` | 4003 | Rust / axum |
| `apps/web` | 5173 | React 19 + Vite (proxies `/api` → 4002) |

## 2. Degraded-mode rule (most important)

The demo **must run with only Go + Node + web**, with no Nexconn keys, no Gemini key, no Postgres, no Redis, no Rust.

- Go: if Rust `:4003` is unreachable → use native Go fallbacks (regex PII scrub, Go `crypto/ed25519` voucher signing, Go pHash Hamming). If Node `:4001` is unreachable → use simulated tokens and deterministic AI fallbacks. Every response that used a fallback reports it (e.g. `"engine": "go-fallback"`).
- Node: if `NEXCONN_APP_KEY`/`NEXCONN_SECRET_KEY` are missing or still placeholders (`nc_app_replace...`, `nc_sec_replace...`) → **simulated mode** (`mode: "simulated"`), returns `sim_` tokens and pretends SDK calls succeeded. If `GEMINI_API_KEY` missing/placeholder → deterministic heuristic AI.
- Store: Go uses an in-memory store (seeded). `infra/docker` + `services/deal-engine-go/internal/db/migrations` hold the Postgres schema for production.

## 3. Escrow FSM (canonical)

States: `CREATED, FUNDED, INSPECTION_LIVE, ASSAY_VERIFIED, RELEASED, DISPUTED_FROZEN, ARBITRATED_SPLIT, REFUNDED`

| From | Action | To |
|---|---|---|
| CREATED | LOCK_ESCROW | FUNDED |
| FUNDED | START_ASSAY | INSPECTION_LIVE |
| INSPECTION_LIVE | MARK_ASSAY_VERIFIED | ASSAY_VERIFIED |
| ASSAY_VERIFIED | RELEASE_FUNDS | RELEASED |
| FUNDED, INSPECTION_LIVE, ASSAY_VERIFIED | RAISE_DISPUTE | DISPUTED_FROZEN |
| DISPUTED_FROZEN | RESOLVE_SPLIT | ARBITRATED_SPLIT |
| DISPUTED_FROZEN | REFUND_BUYER | REFUNDED |

`story_stage`: CREATED=1, FUNDED=2, INSPECTION_LIVE=3, ASSAY_VERIFIED=3, everything else=4.
Every mutation takes `expected_version`; mismatch → `409 ERR_FSM_CONFLICT`. Invalid transition → `422 ERR_INVALID_FSM_TRANSITION`.
Every successful transition produces a hash-chained, Ed25519-signed **system voucher** (`curr_hash = SHA256(prev_hash_hex || deal_id || voucher_type || canonical_json(payload))`).

Voucher types: `ESCROW_LOCKED, ASSAY_STARTED, ASSAY_VERIFIED, FUNDS_RELEASED, DISPUTE_FROZEN, ARBITRATED_SPLIT, BUYER_REFUNDED`.

## 4. Error envelope

```json
{ "error": { "code": "ERR_FSM_CONFLICT", "message": "...", "trace_id": "tr_...", "retryable": false } }
```

## 5. Internal auth (service ↔ service)

When `INTERNAL_SERVICE_HMAC_SECRET` is set, callers send
`X-Internal-Timestamp: <unix seconds>` and `X-Internal-Signature: hex(HMAC_SHA256(secret, timestamp + "." + raw_body))`.
Receivers reject skew > 300 s or bad signature with 401 (constant-time compare). `/health` is unauthenticated.

## 6. Rust `:4003` internal API

- `GET /health` → `{ "status":"ok", "service":"assay-verifier-rs", "public_key_hex":"..." }`
- `POST /internal/scrub-pii` `{ "text": "..." }` → `{ "scrubbed_text", "redacted_count", "categories": ["PHONE","AADHAAR","PAN","UPI","IFSC","EMAIL"], "scrub_time_us" }` (replacement token `[REDACTED_DPDP_PII]`)
- `POST /internal/verify-assay` `{ "frame_jpeg_base64"?, "reference_phash_hex"?, "audio_pcm_f32_base64"?, "sample_rate"? (default 48000), "min_motor_rpm"? }` → `{ "frame_phash_hex"?, "hamming_distance"?, "audio_fft_rpm_peak"?, "bearing_noise_ratio"?, "rpm_ok"?, "compute_ms" }`
- `POST /internal/phash-diff` `{ "a_hex", "b_hex" }` → `{ "hamming_distance" }`
- `POST /internal/sign-voucher` `{ "deal_id", "voucher_type", "payload": {..}, "prev_hash_hex" }` → `{ "curr_hash_hex", "signature_hex", "public_key_hex" }`

## 7. Node bridge `:4001` internal API

All responses include `"mode": "live" | "simulated"`.

- `GET /health` → `{ status, service, mode, ai_mode }`
- `POST /internal/nc/token` `{ user_id, name, avatar_url? }` → `{ access_token, app_key, expires_in_sec, mode }`
- `POST /internal/nc/channel/create` `{ channel_id, name, owner, user_ids[] }`
- `POST /internal/nc/stream/group` `{ channel_id, from_user_id, message_type, text, extras }` → `{ stream_id, mode }`
- `POST /internal/nc/stream/direct` `{ from_user_id, to_user_id, message_type, text, extras }` → `{ stream_id, mode }`
- `POST /internal/nc/moderation/freeze` `{ channel_id, action: "add" | "remove" }` → `{ frozen, latency_ms, nexconn_api_called, mode }`
- `POST /internal/nc/open/create` `{ channel_id }`; `POST /internal/nc/open/priority-broadcast` `{ channel_id, participant_ids[] }`
- `POST /internal/nc/community/subchannel` `{ channel_id, subchannel_id }`
- `POST /internal/nc/system/voucher` `{ to_user_ids[], payload{} }`
- `POST /internal/ai/translate` `{ text, source_locale, target_locale }` → `{ translated_text, extracted_terms{ offered_amount_paise?, required_rpm?, warranty_months? }, pii_redacted_count, model, mode }` (scrubs PII via Rust first; local regex fallback)
- `POST /internal/ai/tribunal` `{ deal_title, amount_paise, reason_code, description, hamming_distance, rpm_peak? }` → `{ summary, buyer_refund_bps, seller_payout_bps, rationale, model }`
- `POST /internal/ai/shopkeeper` `{ item_title, sticker_price_paise, counter_offer_paise, accepted, offered_amount_paise, message_text, locale }` → `{ reply_text, model }` (Go decides price; AI only phrases it)

Real Nexconn calls use `@nexconn/server-sdk` (installed from `git+https://github.com/NexconnAI-Dev/nexconn-server-sdk-node.git#main`, package version 0.1.2):
`configuration.setNexconnCredentials(appKey, secret)`, `configuration.setPrimaryBackupDomains(primary, backup)`,
`new UserManagementApi(cfg).issueAccessToken({ userId, name, avatarUrl })`,
`GroupChannelManagementApi.createGroupChannel({ channelId, name, owner, userIds })`,
`MessageManagementApi.sendGroupChannelStreamMessage({ fromUserId, toChannelId, messageType, content: { content, seq, complete, extra } })`,
`MessageManagementApi.sendDirectChannelStreamMessage({ fromUserId, toUserId, messageType, content })`,
`GroupChannelModerationApi.addGroupChannelFreezeList({ channelIds })` / `removeGroupChannelFreezeList`,
`CommunityChannelManagementApi.createCommunitySubchannel({ channelId, subchannelId })`,
`OpenChannelManagementApi.createOpenChannel({ channelId })`,
`OpenChannelPriorityControlsApi.addOpenChannelPrioritySenderList({ channelId, participantIds })`,
`SystemMessagesApi.sendSystemChannelMessage({ fromUserId, toUserIds, messageType, content })`.

## 8. Go public API `:4002`

Implements API-01..API-18 from `API_SPEC.md` (request/response shapes there), with FSM names from §3, plus:

- `GET /health`
- `GET /api/v1/deals` → `{ deals: [DealView] }`
- `POST /api/v1/deals/:dealId/messages` `{ sender_role: "buyer"|"seller", text, source_locale, target_locale }` → stored chat message (translated via bridge) and broadcast on SSE
- `GET /api/v1/deals/:dealId/events` → `text/event-stream` (`event: deal` with full DealView, `event: message` with ChatMessage)
- `GET /api/v1/dispatch/queue` → `{ disputes: [DisputeView] }`
- `GET /api/v1/arena/:runId` → current run state

Auth: HS256 JWT (`SAMADHAN_JWT_SECRET`, dev default) in `Authorization: Bearer`. Sandbox provision returns `samadhan_jwt` inside both `buyer_session` and `seller_session`. Arena, telemetry, open-lots, sandbox and auth are public. Idempotency: `X-Idempotency-Key` on POST mutations, 24 h in-memory TTL cache keyed by (key, route), replays return the cached status+body with header `Idempotent-Replay: true`.
