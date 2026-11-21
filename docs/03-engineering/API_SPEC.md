# API Specification (`API-01` – `API-18`) - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Backend & API Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Architecture](./ARCHITECTURE.md) · [Data Model](./DATA_MODEL.md) · [OpenAPI 3.1 Spec](../../api/openapi.yaml) · [Nexconn SDK Manual](./NEXCONN_SDK_MANUAL.md)

---

## 1. API Conventions, Routing & Error Envelope

- **Protocol & Versioning**: HTTP/2 + JSON REST under `/api/v1/*`. External client traffic enters the **Go 1.24 Gateway & Deal Engine (`:4002`)**, which handles deterministic state transitions directly or proxies SDK/forensic calls over internal keep-alive connections to the **Node.js 22 Nexconn Bridge (`:4001`)** and **Rust 1.85 Assay Verifier (`:4003`)**.
- **Authentication**: Bearer JWT (`Authorization: Bearer <mudra_jwt>`) issued by `API-01` (`POST /api/v1/auth/session`) or `API-02` (`POST /api/v1/sandbox/provision`), paired with `X-Idempotency-Key` on all state-mutating `POST` requests.
- **Standard Error Envelope (RFC 9457 Problem Details compatible)**:
  ```json
  {
    "error": {
      "code": "ERR_FSM_CONFLICT",
      "message": "Escrow state transition rejected: expected version 2 (FUNDED), found version 3 (DISPUTED_FROZEN)",
      "trace_id": "tr_991a8f2c1b",
      "retryable": false
    }
  }
  ```

---

## 2. Complete Endpoint Reference (`API-01` – `API-18`)

### `API-01` · `POST /api/v1/auth/session` - Authenticate Persona / User & Issue Nexconn Token
- **Handler**: Go (`:4002`) → Node Bridge (`:4001`, `UserManagementApi.issueAccessToken` → `POST https://api.nexconn.ai/v4/auth/access-token/issue`)
- **Auth Scope**: Public (Rate-limited: `30 req/min/IP`)
- **Request JSON**:
  ```json
  {
    "persona_preset": "P-01_RAJESH",
    "display_name": "Rajesh Natarajan",
    "role": "buyer",
    "preferred_locale": "ta-IN",
    "client_platform": "web"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": "e01_7b91a2c0-1122-4455-8899-aabbccddeeff",
      "nexconn_user_id": "buyer_rajesh_ta_8821",
      "display_name": "Rajesh Natarajan",
      "role": "buyer",
      "preferred_locale": "ta-IN"
    },
    "nexconn": {
      "app_key": "nc_live_app_key_mudra_2026",
      "access_token": "nc_tok_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in_sec": 86400
    },
    "mudra_jwt": "eyJhbGciOiJFZERTQSI..."
  }
  ```

---

### `API-02` · `POST /api/v1/sandbox/provision` - 1-Click Split-Screen Buyer + Seller Sandbox Provisioner
- **Handler**: Go (`:4002`) + Node Bridge (`:4001`, `UserManagementApi.issueAccessToken` x2 + `GroupChannelManagementApi`)
- **Auth Scope**: Public (Zero-login Judge Mode `/sandbox`, Rate-limited: `20 req/min/IP`)
- **Response `201 Created`**:
  ```json
  {
    "deal_id": "d_8821_sandbox",
    "nexconn_channel_id": "grp_mudra_juki_8821",
    "story_stage": 1,
    "buyer_session": {
      "nexconn_user_id": "buyer_demo_991a",
      "access_token": "nc_tok_buyer_991a...",
      "locale": "ta-IN"
    },
    "seller_session": {
      "nexconn_user_id": "seller_demo_991b",
      "access_token": "nc_tok_seller_991b...",
      "locale": "hi-IN"
    },
    "escrow_contract": {
      "fsm_state": "CREATED",
      "amount_paise": 14500000,
      "currency": "INR",
      "version": 1
    }
  }
  ```

---

### `API-03` · `POST /api/v1/deals` & `API-04` · `GET /api/v1/deals/:dealId` - Create & Inspect Deal Room
- **Handler**: Go Deal Engine (`:4002`) + Node Bridge (`GroupChannelManagementApi`)
- **Auth Scope**: `BearerAuth` (`buyer` / `seller` / `arbitrator`, Rate-limited: `60 req/min/user`)
- **`API-03` Request JSON**:
  ```json
  {
    "title": "Juki MO-6814S High-Speed Overlock Machine",
    "seller_nexconn_id": "seller_vikram_hi_8821",
    "amount_paise": 14500000,
    "currency": "INR",
    "checklist_items": [
      { "id": "chk_serial", "label": "Verify Serial Plate JUKI-MO-6814S-8821 on Live Video", "verified": false },
      { "id": "chk_rpm", "label": "Verify Servo Motor >= 4,800 RPM Audio FFT", "verified": false }
    ]
  }
  ```
- **`API-03` Response `201 Created` & `API-04` Response `200 OK`**:
  ```json
  {
    "deal_id": "d_8821_sandbox",
    "nexconn_channel_id": "grp_mudra_juki_8821",
    "title": "Juki MO-6814S High-Speed Overlock Machine",
    "story_stage": 2,
    "escrow_contract": {
      "fsm_state": "FUNDED",
      "amount_paise": 14500000,
      "currency": "INR",
      "version": 2
    },
    "checklist_items": [
      { "id": "chk_serial", "label": "Verify Serial Plate JUKI-MO-6814S-8821 on Live Video", "verified": true },
      { "id": "chk_rpm", "label": "Verify Servo Motor >= 4,800 RPM Audio FFT", "verified": true }
    ],
    "assay_logs": [],
    "system_vouchers": []
  }
  ```

---

### `API-05` · `POST /api/v1/deals/:dealId/translate-stream` - Rust PII Scrub + Native Nexconn Streaming Translation
- **Handler**: Rust Scrubber (`:4003`, `<300µs`) → Node Bridge (`:4001`, `M-01` Gemini 2.5 Flash + `MessageManagementApi.sendGroupChannelStreamMessage`)
- **Auth Scope**: `BearerAuth` (`buyer` / `seller`, Rate-limited: `120 req/min/user`)
- **Request JSON**:
  ```json
  {
    "sender_nexconn_id": "buyer_rajesh_ta_8821",
    "source_locale": "ta-IN",
    "target_locale": "hi-IN",
    "raw_text": "நான் ₹1,45,000-க்கு வாங்க தயார், மோட்டார் 4800 RPM சோதனை தேவை"
  }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "stream_id": "nc_stream_7712a",
    "pii_scrub_time_us": 184,
    "pii_redacted_count": 0,
    "extracted_terms": {
      "offered_amount_paise": 14500000,
      "required_rpm": 4800,
      "warranty_months": 6
    },
    "nexconn_delivery": "POST /v4/group-channel/message/stream/send (x-mudra-bilingual-bubble)"
  }
  ```

---

### `API-06` · `POST /api/v1/deals/:dealId/escrow/transition` - Deterministic Go 1.24 FSM Transition
- **Handler**: Go Deal Engine (`:4002`) + Rust Ed25519 Signer (`:4003`) + Node Bridge (`SystemMessagesApi`)
- **Auth Scope**: `BearerAuth` + `X-Idempotency-Key` (`buyer` / `seller`, Rate-limited: `30 req/min/user`)
- **Request JSON**:
  ```json
  {
    "action": "LOCK_ESCROW",
    "expected_version": 1,
    "upi_mandate_umn": "mudra.8821@okaxis"
  }
  ```
- **Response `200 OK` (or `409 Conflict` if concurrent stale version)**:
  ```json
  {
    "deal_id": "d_8821_sandbox",
    "prev_state": "CREATED",
    "fsm_state": "FUNDED",
    "story_stage": 3,
    "version": 2,
    "go_exec_time_us": 640,
    "system_voucher": {
      "voucher_type": "ESCROW_LOCKED",
      "curr_voucher_sha256": "8f9a2c1b77e4019283746554433221100ffeeddccbbaa9988776655443322110",
      "ed25519_signature": "sig_ed25519_4a8b9c..."
    }
  }
  ```

---

### `API-07` · `POST /api/v1/deals/:dealId/assay/start` & `API-08` · `POST /api/v1/deals/:dealId/assay/verify-frame` - Live WebRTC Video + Rust Forensic Assay
- **Handler**: `API-07` in Go (`:4002`); `API-08` in Rust Assay Verifier (`:4003`) + `M-03` Vision + Node Bridge (`SystemMessagesApi`)
- **Auth Scope**: `BearerAuth` (`buyer` / `seller`, Rate-limited: `30 req/min/user`)
- **`API-07` Request JSON**:
  ```json
  {
    "stage_tag": "PRE_SHIPMENT",
    "simulated_hd_camera": true
  }
  ```
- **`API-07` Response `200 OK`**:
  ```json
  {
    "deal_id": "d_8821_sandbox",
    "challenge_nonce": "nonce_tilt20_rpm2s_8821",
    "required_serial_plate": "JUKI-MO-6814S-8821",
    "min_motor_rpm": 4800,
    "expires_in_sec": 300
  }
  ```
- **`API-08` Request JSON**:
  ```json
  {
    "nexconn_call_id": "call_nc_90123",
    "stage_tag": "PRE_SHIPMENT",
    "challenge_nonce": "nonce_tilt20_rpm2s_8821",
    "wasm_blur_laplacian": 148.4,
    "frame_jpeg_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "audio_pcm_f32_base64": "AAAA/wAAAP8..."
  }
  ```
- **`API-08` Response `200 OK`**:
  ```json
  {
    "assay_passed": true,
    "frame_phash_hex": "a4f19c83e2b0771d",
    "audio_fft_rpm_peak": 4820.5,
    "detected_serial_text": "JUKI-MO-6814S-8821",
    "rust_compute_ms": 3.7,
    "fsm_state": "ASSAY_VERIFIED",
    "ed25519_sig_hex": "99f8e7d6c5b4a3..."
  }
  ```

---

### `API-09` · `POST /api/v1/deals/:dealId/dispute/freeze`, `API-10` · `POST /api/v1/dispatch/assign` & `API-11` · `POST /api/v1/disputes/:disputeId/resolve`
- **Handler**: Go (`:4002`) → Node Bridge (`:4001`, `GroupChannelModerationApi.addGroupChannelFreezeList`, `GroupChannelManagementApi`, `MessageManagementApi.sendGroupChannelStreamMessage`, `SystemMessagesApi`)
- **Auth Scope**: `API-09` (`buyer` / `seller`); `API-10` & `API-11` (`arbitrator` role + `X-Idempotency-Key`)
- **`API-09` Request JSON**:
  ```json
  {
    "reason_code": "TRANSIT_DAMAGE",
    "description": "Minor hairline crack on external cast-iron motor bracket upon unloading; spindle RPM still 4,810.",
    "post_delivery_phash_hex": "a4f19c83e2b0771e"
  }
  ```
- **`API-09` Response `200 OK`**:
  ```json
  {
    "dispute_id": "disp_8821",
    "channel_frozen": true,
    "nexconn_api_called": "POST /v4/group-channel/moderation/freeze/add",
    "freeze_latency_ms": 112,
    "hamming_distance_phash": 2,
    "ai_tribunal_stream_status": "STREAMING_VIA_SEND_GROUP_CHANNEL_STREAM_MESSAGE",
    "recommended_split": {
      "buyer_refund_bps": 1200,
      "seller_payout_bps": 8800,
      "buyer_refund_inr": 17400,
      "seller_payout_inr": 127600
    }
  }
  ```
- **`API-10` Request & Response `200 OK`**:
  ```json
  // Request
  {
    "dispute_id": "disp_8821",
    "arbitrator_nexconn_id": "arbitrator_meera_sg_8821"
  }
  // Response 200 OK
  {
    "dispute_id": "disp_8821",
    "nexconn_channel_id": "grp_mudra_juki_8821",
    "arbitrator_nexconn_id": "arbitrator_meera_sg_8821",
    "freeze_remaining_sec": 74,
    "joined_at": "2026-11-10T14:22:16Z"
  }
  ```
- **`API-11` Request & Response `200 OK`**:
  ```json
  // Request
  {
    "buyer_refund_bps": 1200,
    "seller_payout_bps": 8800,
    "expected_version": 3,
    "resolution_note": "Approved AI Tribunal 12%/88% split based on pHash Hamming distance 2 and intact 4,810 RPM spindle."
  }
  // Response 200 OK
  {
    "dispute_id": "disp_8821",
    "deal_id": "d_8821_sandbox",
    "fsm_state": "ARBITRATED_SPLIT",
    "buyer_refund_paise": 1740000,
    "seller_payout_paise": 12760000,
    "channel_unfrozen": true,
    "system_voucher_sha256": "c2f89100aa12e34d56f7890123456789abcdef0123456789abcdef0123456789",
    "ed25519_sig_hex": "77a1b2c3d4e5f6..."
  }
  ```

---

### `API-12` · `GET /api/v1/marketplace/open-lots` & `API-13` · `POST /api/v1/marketplace/open-lots/broadcast` - `Open` Channel Priority Flash Lots (`F-06`)
- **Handler**: Go (`:4002`) + Node Bridge (`:4001`, `OpenChannelManagementApi` & `OpenChannelPriorityControlsApi`)
- **Auth Scope**: `API-12` Public (`120 req/min/IP`); `API-13` `BearerAuth` (`seller` role, `20 req/min/user`)
- **`API-12` Response `200 OK`**:
  ```json
  {
    "open_channel_id": "open_mudra_flash_mandi_01",
    "active_lots": [
      {
        "lot_id": "lot_juki_8821",
        "nexconn_open_channel_id": "open_mudra_flash_mandi_01",
        "title": "Juki MO-6814S Overlock Lot (Assay Verified 4,820 RPM)",
        "seller_nexconn_id": "seller_vikram_hi_8821",
        "reserve_price_paise": 14000000,
        "current_bid_paise": 14500000,
        "assay_verified": true,
        "ends_at": "2026-11-10T15:00:00Z"
      }
    ],
    "community_subchannels": [
      { "subchannel_id": "sub_machinery_01", "slug": "sub/machinery", "title": "Industrial Machinery & CNC", "active_members": 312 },
      { "subchannel_id": "sub_refurb_02", "slug": "sub/refurb-tech", "title": "Refurbished Laptops & GPUs", "active_members": 489 }
    ]
  }
  ```
- **`API-13` Request JSON**:
  ```json
  {
    "open_channel_id": "open_mudra_flash_mandi_01",
    "seller_nexconn_id": "seller_vikram_hi_8821",
    "title": "Juki MO-6814S Overlock Lot (Assay Verified 4,820 RPM)",
    "reserve_price_paise": 14000000,
    "duration_sec": 900
  }
  ```

---

### `API-14` · `POST /api/v1/community/subchannels` - `Community` Category Subchannel Provisioning (`F-07`)
- **Handler**: Go (`:4002`) → Node Bridge (`:4001`, `CommunityChannelManagementApi` / `createCommunitySubchannel`)
- **Auth Scope**: `BearerAuth` (`60 req/min/user`)
- **Request & Response `200 OK`**:
  ```json
  // Request
  {
    "community_channel_id": "comm_mudra_bharat_trade",
    "category_slug": "sub/machinery",
    "action": "CREATE_OR_GET"
  }
  // Response 200 OK
  {
    "community_channel_id": "comm_mudra_bharat_trade",
    "subchannel_id": "sub_machinery_01",
    "category_slug": "sub/machinery",
    "joined": true
  }
  ```

---

### `API-15` · `POST /api/v1/arena/start` & `API-16` · `POST /api/v1/arena/:runId/bid` - 60-Second Chanakya AI Bargaining Arena (`F-10`)
- **Handler**: Go (`:4002`, reservation price curve) + Node Bridge (`:4001`, `UserManagementApi.issueAccessToken` & `MessageManagementApi.sendDirectChannelStreamMessage` with `M-05`)
- **Auth Scope**: Public zero-login viral loop (Rate-limited: `30 req/min/IP`)
- **`API-15` Request & Response `201 Created`**:
  ```json
  // Request
  {
    "challenger_name": "Aarav Mehta",
    "preferred_locale": "en-IN",
    "item_sku": "THINKPAD_X1_GEN10"
  }
  // Response 201 Created
  {
    "run_id": "arena_run_5512",
    "nexconn_direct_channel_id": "dir_arena_5512",
    "nexconn_access_token": "nc_tok_arena_5512...",
    "sticker_price_paise": 5200000,
    "duration_sec": 60,
    "ends_at": "2026-11-10T14:25:00Z"
  }
  ```
- **`API-16` Request & Response `202 Accepted`**:
  ```json
  // Request
  {
    "offered_amount_paise": 4450000,
    "message_text": "Battery cycle count is 190, I'll lock UPI escrow right now at ₹44,500.",
    "locale": "en-IN"
  }
  // Response 202 Accepted
  {
    "run_id": "arena_run_5512",
    "deal_closed": true,
    "counter_offer_paise": 4500000,
    "savings_bps": 1346,
    "stream_id": "nc_dir_stream_5512b"
  }
  ```

---

### `API-17` · `POST /api/v1/webhooks/upi-ondc` - HMAC-SHA256 Verified UPI / ONDC Webhook Receiver (`F-04`)
- **Handler**: Go Deal Engine (`:4002`, constant-time `hmac.Equal` on `X-Mudra-Signature` + timestamp replay window `±300s`)
- **Auth Scope**: Webhook HMAC-SHA256 signature (`UPI_WEBHOOK_HMAC_SECRET`)
- **Request & Response `200 OK`**:
  ```json
  // Request
  {
    "event_id": "evt_upi_99281",
    "event_type": "UPI_MANDATE_LOCKED",
    "deal_id": "d_8821_sandbox",
    "amount_paise": 14500000,
    "umn_or_txn_id": "mudra.8821@okaxis",
    "timestamp_unix": 1794320500
  }
  // Response 200 OK
  {
    "acknowledged": true,
    "deal_id": "d_8821_sandbox",
    "new_fsm_state": "FUNDED",
    "idempotent_replay": false
  }
  ```

---

### `API-18` · `GET /api/v1/traction/telemetry` - Public Verifiable MAU & Latency Proof Feed (`F-13`)
- **Handler**: Go Deal Engine (`:4002`, DragonflyDB / Redis 7.4 `5s` cached read-through over PostgreSQL 17 `traction_telemetry_events` `E-10`)
- **Auth Scope**: Public (`120 req/min/IP`)
- **Response `200 OK`**:
  ```json
  {
    "app_key_masked": "nc_live_****_2026",
    "verified_connected_maus": 1142,
    "active_channels_by_type": {
      "direct": 648,
      "group": 214,
      "community": 4,
      "open": 2,
      "system": 1
    },
    "latency_p99_ms": {
      "go_escrow_fsm_ms": 0.84,
      "rust_pii_scrub_ms": 0.18,
      "rust_phash_assay_ms": 3.40
    },
    "total_escrow_vouchers_signed": 1890
  }
  ```

