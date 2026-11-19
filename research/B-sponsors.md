# B — Sponsors & Technical Stack Deep-Dive: Nexconn, AWS & Alibaba Cloud

> **Primary Sources**: `https://www.nexconn.ai/`, `https://docs.nexconn.ai/llms.txt`, `https://github.com/NexconnAI-Dev/nexconn-skills`, `https://www.lyrawork.com/`, and `https://reskilll.com/hack/nexconn/assets/index-DSX23m3q.js`.

---

## 1. Title Sponsor Technical Architecture: Nexconn (`RCLOUD GLOBAL PTE. LTD.`)

Nexconn is not a simple WebSocket wrapper—it is a global real-time messaging and RTC fabric engineered over 19 years (Fetion → RongCloud → Nexconn). Understanding its internal architecture reveals which features impress Nexconn engineers during code and telemetry review.

### 1.1 Global Network & Transport Layer
1. **Private Binary Protocol over Multiplexed TCP / QUIC**:
   - Instead of verbose JSON-over-HTTP polling or fragile plain WebSockets, Nexconn's `IMLib` (`@rongcloud/imlib-next` on Web, `im_lib` on Android/iOS) uses a compact binary framing protocol with automatic connection multiplexing, smart heartbeat negotiation (`30s–240s` adaptive keepalive), and sub-second reconnect on mobile network handoffs (Wi-Fi ↔ 4G/5G).
2. **SD-CAN (Software-Defined Communication Acceleration Network)**:
   - **300+ global edge relay nodes** across North America, Europe, Singapore/APAC, India, Middle East, and LATAM delivering **`<100ms` global end-to-end message latency** and **`99.99%` uptime SLA** (`https://www.nexconn.ai/`).
3. **3-Layer Consistent Hashing for Open Channels (Live Chatrooms)**:
   - Documented in `https://docs.nexconn.ai/chat/overview/features/open-channels/introduction.md`: Open Channels support **unlimited concurrent viewers** in a single room without fan-out collapse by separating edge connection gateways, consistent-hash room state brokers, and priority message queues (allowing high-priority messages like creator pins, gifts, or match events to bypass chat flood throttling).

---

## 2. Nexconn Product & SDK Capability Matrix (What You Can Actually Build With)

### 2.1 Mandatory Core: `Chat SDK` (`chat-sdk`) & `Chat UI` (`chat-ui`)

Every eligible submission **must** integrate at least one of these two layers (`Submit-R3OJNUmD.js`):

| Feature Category | Exact SDK Capability & Limits | Official Documentation URL | Why Judges Care (Telemetry & Code Signal) |
|---|---|---|---|
| **Direct Channels (1-on-1)** | Rich media (text, image, voice, GIF, file, location, custom), typing indicators (`typing-indicators.md`), 1-on-1 read receipts (`read-receipt.md`), quoted replies (`reply.md`), message editing & recall (`modify-and-recall.md`), directional deletion (`Directional-Deletion.md`). | `https://docs.nexconn.ai/chat/overview/features/direct-channels/introduction.md` | Baseline table stakes. Going beyond plain text (using receipts, typing indicators, and custom payloads) separates top 10% apps from tutorials. |
| **Group Channels (Up to 3,000 Members)** | Role/permission hierarchy (Owner, Admin, Member), mute lists (`mute.md`), @mentions (`mentions.md`), pinned messages (`pin.md`), group read receipts, and **Targeted Group Messages (`direct.md`)**—sending a message inside a group channel that is delivered *only* to a specified subset of `userIds`. | `https://docs.nexconn.ai/chat/overview/features/group-channels/direct.md` | **Targeted Group Messages** is a signature Nexconn differentiator: ideal for role-specific alerts, secret squad instructions, whispers, or supervisor-only notes inside a shared room. |
| **Open Channels (Live Chatrooms — Unlimited Users)** | Unlimited concurrent users, message priority levels (`High` vs `Normal` to survive traffic spikes), allowlist/blocklist (`blocklist-and-allowlist.md`), and **Chatroom Metadata (`managing-metadata.md`)**—up to **50 real-time synchronized Key-Value pairs** per room with atomic lock/Compare-And-Swap (`force` / `autoDelete`). | `https://docs.nexconn.ai/chat/overview/features/open-channels/managing-metadata.md` | **Chatroom Metadata** lets you synchronize live scoreboard state, watch-party playback timestamps, auction highest bids, or live poll tallies across 10,000+ viewers without a separate database. |
| **Communities (Discord-Style Servers)** | **Unlimited members**, hierarchical Channel Groups + Sub-Channels, granular role permissions (`permissions.md`), and per-channel notification levels (`notifications.md`). | `https://docs.nexconn.ai/chat/overview/features/communities/architecture.md` | Almost no hackathon team touches Communities APIs; using it in Track 01 (Social) or Track 03 (Workplace) immediately signals deep SDK mastery. |
| **Streaming Messages (`StreamMsg`)** | Native real-time token-by-token streaming updates into a single message ID (`https://docs.nexconn.ai/chat/overview/features/message/stream-message.md`). | `https://docs.nexconn.ai/chat/overview/features/message/stream-message.md` | **Critical for AI Agents**: Instead of hacky WebSocket side-channels or sending 50 separate messages, `StreamMsg` streams LLM tokens natively through the Nexconn IM pipeline. |
| **Message Expansion (`expansion.md`)** | Attach up to **300 dynamic Key-Value pairs** (`expansion`) to any sent message and update them in real time across all recipients (`updateMessageExpansion`). | `https://docs.nexconn.ai/chat/overview/features/message/expansion.md` | Enables **living in-chat micro-apps**: interactive approval cards, escrow milestones, triage checklists, live RSVP counters, and medical check-in statuses right inside a message bubble. |
| **Custom Messages (`registerMessageType`)** | Register strongly-typed custom message schemas with custom persistence (`ISCOUNTED`, `ISPERSISTED`) and search flags. | `https://docs.nexconn.ai/chat/overview/features/message/introduction.md` | Shows judges you architected domain-specific structured protocols over Nexconn rather than dumping everything into raw text strings. |
| **Built-in Translation** | Automatic real-time translation of incoming/outgoing text messages across 100+ languages (`builtin-translation/introduction.md`). | `https://docs.nexconn.ai/chat/overview/features/builtin-translation/introduction.md` | Directly solves Track 04 (`Marketplace & Support` example: *"Multi-language translated chat"*) and Track 05 (`Humanitarian & Social Good`). |
| **Voice-to-Text (STT)** | Native transcription of voice messages into text (`voice-to-text/introduction.md`). | `https://docs.nexconn.ai/chat/overview/features/voice-to-text/introduction.md` | Explicitly named in Track 05 (`Humanitarian & Social Good` example: *"Large-font & voice-to-text chat"*) and invaluable for noisy frontline workers in Track 03. |
| **Content Moderation (`<100ms`)** | Automated real-time text, image, audio, and video moderation across 8 risk categories with block/replace/audit actions (`moderation/auto-moderation.md`). | `https://docs.nexconn.ai/chat/overview/features/moderation/auto-moderation.md` | Essential for youth/senior safety (Track 05), anti-scam marketplace protection (Track 04), and toxicity filtering in gaming (Track 02). |
| **End-to-End Encryption (E2EE)** | Signal-grade **X3DH (Extended Triple Diffie-Hellman)** key agreement + **Double Ratchet** encryption (`e2ee/introduction.md`). | `https://docs.nexconn.ai/chat/overview/features/e2ee/introduction.md` | High-value differentiator for healthcare/crisis peer support (Track 05), enterprise legal/medical handovers (Track 03), and high-value trade negotiation (Track 04). |
| **Online Status Subscription (Presence)** | Subscribe to real-time online/offline/platform status changes of specific `userIds` (`online-status-subscription.md`). | `https://docs.nexconn.ai/chat/overview/features/user-And-friend/online-status-subscription.md` | Crucial for live agent dispatch (Track 04), squad readiness (Track 02), and senior/peer check-in monitoring (Track 05). |

### 2.2 Optional Multiplier: `Call SDK` (`call-sdk`)
- **Packages**: Web (`@rongcloud/engine` + `@rongcloud/calllib-v3`), Android (`cn.rongcloud.sdk:call_lib` / `call_kit`), iOS (`RongCloudRTC/RongCallLib`), Flutter (`@rongcloud/calllib-flutter`), React Native (`@react-native-Community/calllib`).
- **Capabilities**: 1-on-1 and group low-latency audio/video calls, screen sharing, beauty filters (`call/sdk/android/beauty.md`), virtual backgrounds (`call/sdk/android/virtual-background.md`), and real-time voice changers (`call/sdk/android/voice-changer.md`).
- **Rule Reminder**: `Call SDK` is optional and **cannot be used alone**—it must be paired with `Chat SDK` or `Chat UI` (`Submit-R3OJNUmD.js`). Adding seamless 1-click escalation from a Nexconn Chat channel into a Nexconn Audio/Video Call is a major UX completeness booster.

### 2.3 Backend Multiplier: Server SDKs, REST API & Webhooks (`https://docs.nexconn.ai/chat/server/`)
- **Server SDKs**: Official libraries for **Node.js, Go, Java, Python, PHP, and .NET**.
- **Required Token Endpoint**: `POST /user/getToken.json` signed with `App-Key`, `Nonce`, `Timestamp`, and `SHA1(App-Secret + Nonce + Timestamp)`.
- **Server-Side Webhooks**:
  1. **Pre-Send Synchronous Webhook**: Intercepts every message *before* delivery—allowing a backend AI guardrail, DLP scanner, or scam detector to redact, enrich, or block a message in real time.
  2. **Post-Send Message Synchronization Webhook**: Streams every chat message in real time to your backend so AI agents can trigger workflows, update databases, or reply via Server API / `StreamMsg`.
  3. **User Online Status Webhook**: Notifies your server whenever a user connects or disconnects.

---

## 3. Nexconn's AI Strategy: AICP, AI Mode, Lyra & `nexconn-skills`

### 3.1 AICP (Agent Inter-Communication Protocol) & Dual Identity (`UserID` + `AgentID`)
Nexconn's strategic thesis—championed by CTO **Yang Pan** and AI PM **Kai**—is that the next billion active endpoints on real-time messaging networks will not just be humans (`UserID`), but **autonomous AI agents (`AgentID`)** collaborating with humans and other agents inside the same channels:
- **Lyra (`https://www.lyrawork.com/`)**: Nexconn's own flagship product showcase where humans and specialized AI agents collaborate inside Direct Chats, Multi-Agent Group Channels, Shared Drives, and Scheduled Automations (`https://docs.nexconn.ai/ai-mode/overview/introduction.md`).
- **`nexconn-skills` & `@nexconn/console-mcp` (`https://github.com/NexconnAI-Dev/nexconn-skills`)**:
  - Provides structured Markdown skills (`nexconn-dev`, `nexconn-console`, `nexconn-docs`) and the `@nexconn/console-mcp` MCP server so developers can manage apps, keys, and user tokens directly from AI IDEs.

---

## 4. Cloud Perks Partners: AWS & Alibaba Cloud (`Jx` in `index-DSX23m3q.js`)

All 5 winning teams receive a 1-year cloud discount (`Jx` in `index-DSX23m3q.js`):
- **Option A — 15% OFF Amazon Web Services (AWS) for 1 Year** (for newly registered cloud email accounts).
- **Option B — 30% OFF Alibaba Cloud for 1 Year** (for newly registered cloud email accounts).
- **Why Both Are Offered**: RongCloud/Nexconn operates its global SD-CAN edge nodes and media clusters across both **AWS** (for North America, Europe, India, and LATAM) and **Alibaba Cloud** (for Singapore, Southeast Asia, and Middle East). Mentioning low-latency deployment on AWS or Alibaba Cloud in the project write-up aligns cleanly with Nexconn's infrastructure footprint.

---

## 5. Marquee Customer Archetypes & Track-by-Track Sponsor Leverage Blueprint

RongCloud/Nexconn powers **300,000+ apps** across social entertainment (Soul, Momo/Tantan ecosystem apps, global voice-chat rooms in MENA/SEA), gaming (mobile squad games, Unity titles), enterprise collaboration, and e-commerce marketplaces. To score 95%+ on **Completeness (50%)** and **Innovation (30%)**, each track should combine at least **3 signature Nexconn primitives**:

| Track | Signature Nexconn Primitives to Combine | Why This Combination Wins Telemetry Verification |
|---|---|---|
| **01 Social & Community** | **Open Channels** (`managing-metadata.md` up to 50 KV pairs for live synchronized watch-party/poll state) + **Communities** (`communities/architecture.md`) + **Message Expansion** (`expansion.md` up to 300 KV pairs) | Generates high-frequency metadata & message expansion telemetry on `console.nexconn.ai` that basic chat clones never touch. |
| **02 Gaming & Live Streams** | **Open Channels** (high-priority message queue for match events) + **Group Channels with Targeted Group Messages** (`group-channels/direct.md` for secret squad calls/whispers) + **Call SDK Voice Changer** (`voice-changer.md`) | Directly demonstrates both squad coordination and spectator scale using Nexconn-exclusive APIs. |
| **03 Workplace & Collaboration** | **Group Channels** + **Targeted Group Messages** (`direct.md` for role-scoped handover alerts) + **Message Expansion** (`expansion.md` for live stateful task/shift sign-off cards) + **Streaming Messages** (`stream-message.md` for AI copilot summaries) | Turns passive workplace chat into an auditable, AI-native operational state machine (echoing Nexconn's **Lyra** vision). |
| **04 Marketplace & Support** | **Direct Channels** (`read-receipt.md` + `typing-indicators.md`) + **Built-in Translation** (`builtin-translation/introduction.md`) + **Message Expansion** (`expansion.md` for live in-chat escrow/quote negotiation cards) + **Online Status Subscription** (`online-status-subscription.md` for agent dispatch) | Hits all three official Track 04 examples (`Buyer-seller 1-on-1`, `Human agent dispatch`, `Multi-language translated chat`) in one cohesive product. |
| **05 Humanitarian & Social Good** | **Voice-to-Text** (`voice-to-text/introduction.md`) + **Built-in Translation** + **E2EE** (`e2ee/introduction.md` X3DH/Double Ratchet for crisis/peer privacy) + **Auto-Moderation** (`moderation/auto-moderation.md`) | Directly fulfills Track 05's accessibility and safety mandate using 4 first-party Nexconn features. |
| **06 Open Innovation** | **Streaming Messages** (`stream-message.md`) + **Custom Messages** + **Message Expansion** (`expansion.md`) + **Call SDK** (`@rongcloud/calllib-v3` or mobile CallKit) + **Pre/Post-Send Server Webhooks** | Proves Nexconn is the ultimate real-time transport for multi-agent + human collaborative applications. |
