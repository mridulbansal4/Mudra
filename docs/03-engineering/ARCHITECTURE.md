# System Architecture (C4 Model & Polyglot Flows) - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Chief Systems Architect) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Tech Stack](./TECH_STACK.md) · [Data Model](./DATA_MODEL.md) · [API Spec](./API_SPEC.md) · [Nexconn SDK Manual](./NEXCONN_SDK_MANUAL.md) · [ADR-0001](./adr/ADR-0001-polyglot-go-rust-node-nexconn-architecture.md)

---

## 1. Architectural Philosophy: Non-Dual Protocol Unity + Systems Speed

MUDRA-OS is architected around two non-negotiable engineering axioms:
1. **The Nexconn Channel IS the State Machine**: Instead of treating chat as a side widget next to external web forms, `<nc-chat-ui-app-provider>` (`@nexconn/chatui@^26.2.5`), `NCEngine` (`@nexconn/chat@^26.2.1`), `NCCallEngine` (`@nexconn/call@^26.2.0`), and `@nexconn/server-sdk@0.1.2` form the unified real-time bus for negotiation, custom Lit escrow milestone cards, live WebRTC video inspection, and channel-freeze arbitration.
2. **Zero-Python Polyglot Systems Performance (`ADR-0001`)**:
   - **Go 1.24 (`services/deal-engine-go`, `:4002`)**: Executes lock-free/serializable escrow finite-state machine transitions (`<1.2ms` p99), optimistic concurrency checks, high-throughput `Open` channel auction bids, and HMAC-verified UPI/ONDC webhooks.
   - **Rust 1.85 (`services/assay-verifier-rs`, `:4003` + `packages/assay-wasm-rs`)**: Executes `<300µs` Aho-Corasick DPDP PII scrubbing before LLM transit, 60fps browser WebAssembly blur/serial bounding-box lock, `<5ms` server-side 64-bit perceptual image hashing (`pHash`), 4096-point `rustfft` audio motor/fan RPM analysis, and Ed25519 cryptographic voucher signing.
   - **Node.js 22 LTS (`services/nexconn-bridge-node`, `:4001`)**: Hosts the official TypeScript `@nexconn/server-sdk@0.1.2` (`UserManagementApi`, `MessageManagementApi`, `GroupChannelManagementApi`, `GroupChannelModerationApi`, `OpenChannelPriorityControlsApi`, `CommunityChannelManagementApi`, `SystemMessagesApi`, `ModerationApi`).

---

## 2. C4 Level 1 - System Context Diagram

```mermaid
flowchart TB
    subgraph Users["Personas & Actors"]
        P1["P-01: Rajesh (Tamil MSME Buyer)"]
        P2["P-02: Vikram (Hindi Machinery Seller)"]
        P3["P-03: Aarav (Campus Thrift / Arena Player)"]
        P4["P-04: Meera (Human Dispute Arbitrator)"]
        P5["P-05: Hackathon Judge (2 AM Split-Screen Mode)"]
    end

    MUDRA["MUDRA-OS (SamvadDeal)\nReal-Time Cross-Lingual Video-Escrow &\n90s Channel-Freeze Arbitration OS"]

    subgraph External["External Cloud & DPI Systems"]
        NC["Nexconn Cloud Platform\n(api.nexconn.ai / console.nexconn.ai)\nIM + ChatUI + WebRTC Call + v4 Server Stream"]
        LLM["Google Gemini 2.5 Flash/Pro &\nBhashini ULCA Indic NMT/ASR"]
        RAILS["UPI ASBA Mandate / RBI PA-Escrow &\nONDC Beckn Webhook Sandbox"]
    end

    P1 & P2 & P3 & P4 & P5 <-->|"HTTPS / WSS / WebRTC"| MUDRA
    MUDRA <-->|"IM Socket + WebRTC + v4 REST/Stream"| NC
    MUDRA <-->|"HTTP/2 SSE Streaming"| LLM
    MUDRA <-->|"HMAC-SHA256 Webhooks"| RAILS
```

---

## 3. C4 Level 2 - Container Diagram

```mermaid
flowchart TB
    subgraph Clients["Client Tier (Browser & Mobile)"]
        WEB["apps/web (React 19 + Vite 6 + Tailwind v4 + HeroUI v3)\nRoutes: / -> /auth -> /onboarding -> /app -> /sandbox -> /arena -> /dispatch -> /guide -> /traction\nEmbeds: @nexconn/chatui + @nexconn/chat + @nexconn/call"]
        LIT["packages/nc-lit-cards (Lit 3.3.2)\n<nc-escrow-deal-card> | <nc-bilingual-bubble>\n<nc-video-assay-receipt> | <nc-tribunal-verdict-card>"]
        WASM["packages/assay-wasm-rs (Rust -> WASM)\n60fps Laplacian Blur + Serial Bounding Lock + Watermark"]
        MOB["apps/mobile (Expo 53 + React Native 0.78)\nheroui-native 2.0.1 + Uniwind Field Assay App"]
        WEB --- LIT
        WEB --- WASM
    end

    subgraph Backend["Polyglot Backend Tier (Docker / Railway / AWS Mumbai & Singapore)"]
        GO["services/deal-engine-go (Go 1.24 · Port 4002)\nDeterministic Escrow FSM, Optimistic Locking,\nSandbox Provisioner, UPI/ONDC Webhooks, /traction API"]
        RUST["services/assay-verifier-rs (Rust 1.85 Axum · Port 4003)\n<300us DPDP PII Scrubber, 64-bit pHash/dHash,\n4096-pt rustfft Audio RPM Check, Ed25519 Signer"]
        NODE["services/nexconn-bridge-node (Node.js 22 Fastify · Port 4001)\nOfficial @nexconn/server-sdk@0.1.2 Host:\nissueAccessToken, sendGroupChannelStreamMessage,\naddGroupChannelFreezeList, SystemMessagesApi"]
    end

    subgraph Data["Data & State Tier"]
        PG[("PostgreSQL 17\nEntities E-01..E-10\nACID Serializable Escrow & Hash Ledger")]
        REDIS[("DragonflyDB / Redis 7.4\nSub-ms Cross-Service Pub/Sub, Rate Limits & Locks")]
    end

    NC_CLOUD["Nexconn Cloud (https://api.nexconn.ai)\nWSS IM + WebRTC TURN/STUN + v4 Server API"]

    WEB & MOB <-->|"REST / SSE (API-01..API-18)"| GO
    WEB & MOB <-->|"WSS IM & WebRTC Media"| NC_CLOUD
    GO <-->|"Internal HTTP/2 / Redis Streams"| NODE
    GO <-->|"Internal HTTP/2 (<5ms)"| RUST
    RUST -->|"Scrubbed Prompt Relay"| NODE
    NODE <-->|"appKey + secretKey (v4 REST/Stream)"| NC_CLOUD
    GO & NODE & RUST <--> PG
    GO & NODE & RUST <--> REDIS
```

---

## 4. C4 Level 3 - Component Architecture of the Three Backend Services & Client Bridge

```mermaid
flowchart LR
    subgraph ClientBridge["apps/web/src/lib/nexconn-boot.ts"]
        C1["1. NCChatUIApplication.initialize\n(registerMessageType x4 BEFORE app.ready)"]
        C2["2. NCEngine.initialize({ appKey })\n-> await NCEngine.connect({ token })"]
        C3["3. NCCallEngine.getInstance()\n(Strictly after NCEngine.connect resolves)"]
        C4["4. Hybrid Channel Router:\nDirect/Group/System -> <nc-chat-ui-app-provider>\nOpen/Community -> HeroUI v3 + NCEngine Sidebar"]
        C1 --> C2 --> C3 --> C4
    end

    subgraph GoEngine["services/deal-engine-go (:4002)"]
        G1["fsm/escrow_machine.go\nStrict Transition Table + PG Version Lock"]
        G2["handlers/sandbox.go\nAtomic Dual-Persona Provisioner (API-02)"]
        G3["handlers/webhooks.go\nHMAC-SHA256 UPI ASBA & ONDC Receiver"]
        G4["telemetry/mau_ledger.go\nReal-Time Active User & Latency Aggregator"]
    end

    subgraph RustVerifier["services/assay-verifier-rs (:4003)"]
        R1["scrubber/aho_pii.rs\n<300us Aadhaar/Phone/PAN/Bank Redactor"]
        R2["vision/phash.rs\nDCT 64-bit Perceptual Frame Hasher"]
        R3["audio/rpm_fft.rs\n4096-pt Hann Window FFT Spindle/Motor Analyzer"]
        R4["crypto/voucher_ed25519.rs\nSHA-256 Chain + Ed25519 Receipt Signer"]
    end

    subgraph NodeBridge["services/nexconn-bridge-node (:4001)"]
        N1["sdk/auth.ts -> UserManagementApi.issueAccessToken"]
        N2["sdk/stream.ts -> MessageManagementApi.send*StreamMessage"]
        N3["sdk/moderation.ts -> GroupChannelModerationApi.addGroupChannelFreezeList"]
        N4["sdk/channels.ts -> OpenChannelPriorityControlsApi + SystemMessagesApi"]
    end

    ClientBridge <--> GoEngine
    GoEngine <--> RustVerifier
    GoEngine <--> NodeBridge
    RustVerifier <--> NodeBridge
```

---

## 5. Key Sequence Diagrams

### 5.1 Deterministic Escrow FSM State Machine (`services/deal-engine-go`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: API-03 Create Deal Room
    DRAFT --> LOCKED: API-06 Buyer Locks Escrow (UPI ASBA Mandate)
    LOCKED --> ASSAY_IN_PROGRESS: API-07 Start @nexconn/call Video Assay
    ASSAY_IN_PROGRESS --> ASSAY_VERIFIED: API-08 Rust pHash + FFT + Vision Pass + onServerCallLogReceived
    ASSAY_IN_PROGRESS --> DISPUTE_FROZEN: API-09 Defect Detected During Live Call
    ASSAY_VERIFIED --> SETTLED_RELEASED: API-06 Buyer Confirms Delivery & Releases 100%
    ASSAY_VERIFIED --> DISPUTE_FROZEN: API-09 Buyer Flags Transit Damage (addGroupChannelFreezeList)
    LOCKED --> DISPUTE_FROZEN: API-09 Seller No-Show / SLA Breach
    DISPUTE_FROZEN --> SETTLED_SPLIT: API-11 Arbitrator / Parties Accept <nc-tribunal-verdict-card> Split
    DISPUTE_FROZEN --> REFUNDED: API-11 100% Buyer Refund Ordered by Tribunal
    SETTLED_RELEASED --> [*]
    SETTLED_SPLIT --> [*]
    REFUNDED --> [*]
```

### 5.2 Live WebRTC Video Assay + Rust Forensics + `System` Voucher Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Buyer as Buyer Browser (apps/web)
    participant Seller as Seller Browser / Mobile
    participant WASM as packages/assay-wasm-rs (60fps Worker)
    participant NC as Nexconn Call & IM Cloud
    participant Rust as services/assay-verifier-rs (:4003)
    participant Go as services/deal-engine-go (:4002)
    participant Node as services/nexconn-bridge-node (:4001)

    Buyer->>Go: POST /api/v1/deals/:id/assay/start (API-07)
    Go-->>Buyer: Returns Challenge Nonce ("Tilt 20 deg + Run Motor 2s")
    Buyer->>NC: NCCallEngine.startCall(sellerId, AUDIO)
    NC-->>Seller: Incoming Call Ring -> Seller Accepts
    Buyer->>NC: NCCallEngine.requestChangeMediaType(NCCallMediaType.VIDEO)
    NC-->>Seller: Media Escalated to 720p/1080p60 WebRTC Video
    loop Every 16.6ms (60fps in Seller/Buyer PiP Loupe)
        Seller->>WASM: Feed Video Frame + Audio Buffer
        WASM-->>Seller: Laplacian Blur Score (148.2 >= 120) + Serial Bounding Box Lock
    end
    Buyer->>Rust: POST /api/v1/deals/:id/assay/verify-frame (API-08: Frame + 2s PCM + Nonce)
    Rust->>Rust: Compute 64-bit DCT pHash + 4096-pt FFT (4820 RPM Nominal) in 3.8ms
    Rust->>Rust: Call M-03 (Gemini 2.5 Flash Vision) -> Confirm "JUKI-MO-6814S-8821"
    Rust->>Rust: Sign Hash-Chained Voucher with Ed25519 Private Key
    Rust->>Go: Commit video_assay_logs (E-06) + Transition E-04 to ASSAY_VERIFIED
    Go->>Node: Emit <nc-video-assay-receipt> + SystemMessagesApi Audit Voucher
    NC-->>Buyer: onServerCallLogReceived + System Channel Receipt #403
```

---

## 6. Scalability, Offline/Low-Bandwidth Resilience & Failure Modes

| Failure Mode / Bottleneck | Architectural Mitigation | Linked ADR / Risk |
|---|---|---|
| **WebRTC Call Signaling Before IM Socket Ready** | `nexconn-boot.ts` state machine strictly awaits `NCEngine.connect({ token })` before instantiating `NCCallEngine`. | `R-01`, `ADR-0002` |
| **Corporate Firewall / Symmetric NAT Blocks UDP WebRTC** | Automatic fallback after `2,500ms` ICE timeout to **High-Cadence Signed Keyframe Relay** (`packages/assay-wasm-rs` → `NCEngine` → `API-08`). | `R-10` |
| **Judge Evaluates at 2 AM Without a Webcam** | Built-in **Simulated HD Inspection Video Stream** canvas injector feeds real 60fps Juki overlock / MacBook footage into `NCCallEngine` and Rust WASM. | `R-04` |
| **Concurrent Conflicting Escrow Clicks (Race Condition)** | Go 1.24 FSM uses PostgreSQL `SELECT ... FOR UPDATE` + monotonic `version` column (`409 Conflict` on stale state). | `ADR-0001`, `ADR-0005` |
| **LLM Streaming Interruption Mid-Sentence** | `services/nexconn-bridge-node` wraps `sendGroupChannelStreamMessage` in a `1,800ms` watchdog that seamlessly switches from Gemini 2.5 Flash (`M-01`) to Bhashini / Together AI. | `ADR-0006` |
| **High-Traffic Flash Auction Flood in `Open` Channel** | `OpenChannelPriorityControlsApi` whitelists verified sellers; Go 1.24 + DragonflyDB handles `10,000+` concurrent bid reads per second. | `ADR-0002` |
