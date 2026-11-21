# nexconn-bridge-node (:4001)

Fastify 5 + TypeScript bridge between the Go deal engine (:4002) and **Nexconn** (IM, stream messages, channel freeze, system vouchers) plus the **Gemini** AI models M-01 (translator), M-04 (tribunal) and M-05 (shopkeeper). The binding contract is `docs/03-engineering/IMPLEMENTATION_CONTRACT.md` §2, §5, §6 and §7.

```bash
pnpm --filter @mudra/nexconn-bridge-node dev        # tsx watch, reads repo-root .env
pnpm --filter @mudra/nexconn-bridge-node start
pnpm --filter @mudra/nexconn-bridge-node typecheck
pnpm --filter @mudra/nexconn-bridge-node test
```

## Modes (degraded-mode rule, contract §2)

| Condition | `mode` / `ai_mode` | Behaviour |
|---|---|---|
| `NEXCONN_APP_KEY` / `NEXCONN_SECRET_KEY` missing, or still `nc_app_replace…` / `nc_sec_replace…` | `mode: "simulated"` | Returns `sim_…` tokens and ids, and pretends every SDK call succeeded. Nothing leaves the process. |
| Real Nexconn keys | `mode: "live"` | Calls the vendored SDK. SDK, network and business-code errors become **502** `{ error: { code, message, trace_id, retryable }, mode }`. |
| `GEMINI_API_KEY` missing, or `AIzaSy_replace…` | `ai_mode: "heuristic"` | Uses the deterministic fallbacks below. The response includes `fallback_reason`. |
| Real Gemini key | `ai_mode: "gemini"` | Gemini REST in JSON mode with an 8 s timeout. Invalid output, timeout or HTTP error drops back to the heuristic. A circuit breaker opens for 30 s after 3 consecutive failures. |
| Rust `:4003` down or slower than 300 ms | `pii_engine: "node-fallback"` | Local regex scrub for PHONE, AADHAAR, PAN, UPI, IFSC and EMAIL → `[REDACTED_DPDP_PII]`. |

Heuristic fallbacks:
- **Translator**: an EN/HI/MR/TA bargaining-phrase glossary, with output prefixed `[hi-IN · offline]`. ₹ amounts and numbers are kept verbatim, and the extracted terms are appended in the target language.
- **Tribunal**: the basis-point split comes from the pHash Hamming band, adjusted by the reason code and the motor RPM against nominal (4800 by default). For example, 7/64 at 4820 RPM gives 1200/8800.
- **Shopkeeper**: Chanakya-style templates in en, hi, Hinglish, mr and ta that react to student, UPI, scratch and bulk arguments. The reply always states the price that Go decided.

Term extraction is always regex-based and works in both modes. It handles `₹1,45,000`, `1.45 lakh` / `लाख`, `crore`, `₹45k`, `Rs.`/`INR`/`/-`, RPM, and warranty in months/days/years (EN/HI/MR/TA). It also detects prompt-injection attempts. Gemini values only fill fields that the regex could not find.

## Endpoints

All `/internal/*` routes need HMAC when `INTERNAL_SERVICE_HMAC_SECRET` is set. The caller sends `X-Internal-Timestamp: <unix s>` and `X-Internal-Signature: hex(HMAC_SHA256(secret, ts + "." + raw_body))`. Requests with skew over 300 s or a bad signature get a 401. `/health` is open. Outbound calls to Rust are signed the same way.

| Method & path | Body | Response (besides `mode`) |
|---|---|---|
| `GET /health` | – | `status, service, mode, ai_mode, internal_auth, prompts` |
| `POST /internal/nc/token` | `user_id, name, avatar_url?` | `access_token, app_key, expires_in_sec, user_id` |
| `POST /internal/nc/channel/create` | `channel_id, name, owner, user_ids[]` | `channel_id, created, member_count` |
| `POST /internal/nc/stream/group` | `channel_id, from_user_id, message_type, text, extras` | `stream_id, chunks` |
| `POST /internal/nc/stream/direct` | `from_user_id, to_user_id, message_type, text, extras` | `stream_id, chunks` |
| `POST /internal/nc/moderation/freeze` | `channel_id, action: add\|remove` | `frozen, latency_ms, nexconn_api_called` |
| `POST /internal/nc/open/create` | `channel_id` | `channel_id, created` |
| `POST /internal/nc/open/priority-broadcast` | `channel_id, participant_ids[]` | `priority_senders` |
| `POST /internal/nc/community/subchannel` | `channel_id, subchannel_id` | `created` |
| `POST /internal/nc/system/voucher` | `to_user_ids[], payload{}` | `message_id, delivered_to` |
| `POST /internal/ai/translate` | `text, source_locale, target_locale` | `translated_text, english_text?, extracted_terms{offered_amount_paise?, required_rpm?, warranty_months?, warranty_days?, currency?, injection_attempt_detected}, pii_redacted_count, pii_engine, model, ai_mode` |
| `POST /internal/ai/tribunal` | `deal_title, amount_paise, reason_code, description, hamming_distance, rpm_peak?, nominal_rpm?` | `summary, buyer_refund_bps, seller_payout_bps, rationale, model, ai_mode, requires_human_signoff` |
| `POST /internal/ai/shopkeeper` | `item_title, sticker_price_paise, counter_offer_paise, accepted, offered_amount_paise, message_text, locale` | `reply_text, model, ai_mode` |

Stream text is sent as up to 3 sequential `StreamMessageContent { content, seq, complete, extra }` chunks. The `messageId` returned by the first chunk is reused for the later chunks.

## SDK calls in live mode

`UserManagementApi.issueAccessToken`, `GroupChannelManagementApi.createGroupChannel`, `MessageManagementApi.sendGroupChannelStreamMessage` / `sendDirectChannelStreamMessage`, `GroupChannelModerationApi.addGroupChannelFreezeList` / `removeGroupChannelFreezeList`, `OpenChannelManagementApi.createOpenChannel`, `OpenChannelPriorityControlsApi.addOpenChannelPrioritySenderList`, `CommunityChannelManagementApi.createCommunitySubchannel`, `SystemMessagesApi.sendSystemChannelMessage`. Auth uses `Configuration.setNexconnCredentials` and `setPrimaryBackupDomains`.

## Environment

| Var | Default | Notes |
|---|---|---|
| `BRIDGE_PORT` | `4001` | `BRIDGE_HOST` defaults to `0.0.0.0` |
| `NEXCONN_APP_KEY`, `NEXCONN_SECRET_KEY` | – | A placeholder value means simulated mode |
| `NEXCONN_PRIMARY_API_DOMAIN` | `NEXCONN_API_BASE_URL` → `https://api.nexconn.ai` | |
| `NEXCONN_SECONDARY_API_DOMAIN` | same as primary | SDK failover domain |
| `NEXCONN_TIMEOUT_MS` | `5000` | axios timeout for SDK calls |
| `NEXCONN_SYSTEM_VOUCHER_BOT_ID` | `usr_mudra_system_voucher` | sender for system vouchers |
| `GEMINI_API_KEY`, `GEMINI_FLASH_MODEL`, `GEMINI_PRO_MODEL` | –, `gemini-2.5-flash`, `gemini-2.5-pro` | `GEMINI_TIMEOUT_MS` defaults to 8000 |
| `RUST_ASSAY_VERIFIER_URL` | `http://localhost:4003` | `RUST_SCRUB_TIMEOUT_MS` defaults to 300 |
| `INTERNAL_SERVICE_HMAC_SECRET` | empty, so auth is off | |
| `PROMPTS_DIR` | `<repo>/ai/prompts` | `m01-translator.md`, `m04-tribunal.md`, `m05-shopkeeper.md` are loaded at startup. User text is wrapped in `<untrusted_user_speech>`, with angle brackets neutralised. |
| `BRIDGE_CORS_ORIGINS` | all origins | comma-separated list |

Env is loaded from `services/nexconn-bridge-node/.env`, then the repo-root `.env`, through `process.loadEnvFile`. Values already in the real environment take precedence.

## Why the SDK is vendored

`@nexconn/server-sdk@0.1.2` is only published as a git repo, and installing it would run its build/install scripts, which this workspace does not allow. Its MIT-licensed, OpenAPI-generated source sits unchanged in `src/vendor/nexconn-server-sdk/` (see `LICENSE` and `VERSION` there). Do not edit it. Regenerate or replace it as a whole. Its imports have no file extensions, so the service uses `moduleResolution: "Bundler"` and runs under `tsx` (pinned to `4.20.6`, whose esbuild 0.25 binary matches the one installed in the workspace).

## Docker

```bash
docker build -f services/nexconn-bridge-node/Dockerfile -t mudra/nexconn-bridge-node .   # from repo root
```
