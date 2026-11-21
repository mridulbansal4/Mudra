# Nexconn Documentation, SDKs, GitHub Repositories & AI Skills Archive

- **Captured From**:
  - Corporate Site: `https://www.nexconn.ai/`
  - Developer Documentation & LLM Index: `https://docs.nexconn.ai/` and `https://docs.nexconn.ai/llms.txt`
  - Developer Console: `https://console.nexconn.ai/`
  - Official GitHub Organization: `https://github.com/NexconnAI-Dev`
  - Official AI Coding Agent Skills Repo: `https://github.com/NexconnAI-Dev/nexconn-skills`
  - Lyra Flagship AI Workspace: `https://www.lyrawork.com/`

---

## 1. Nexconn Corporate & Platform Positioning (`https://www.nexconn.ai/`)

### 1.1 Identity & Legal Entity
- **Brand Name**: **Nexconn** (Global Communications-Platform-as-a-Service & AI Collaboration Infrastructure).
- **Legal Operating Entity**: **`RCLOUD GLOBAL PTE. LTD.`** (Singapore-headquartered international entity of **RongCloud / 融云**, Beijing Cloudzhong Rongxin Network Technology Co., Ltd.).
- **Core Taglines on `nexconn.ai`**:
  - *"Powering Intelligent Real-Time Connections"*
  - *"Enterprise-Grade Chat, Voice & Video, and AI Collaboration Platform"*
  - *"99.99% SLA · <100ms Global Latency · 300+ Global Relay Nodes · 70M+ Daily Active Users"*

### 1.2 Product Pillars (`https://www.nexconn.ai/`)
1. **In-App Chat (`Chat SDK` & `Chat UI` / UIKit)**:
   - **Direct Channels (1-on-1)**: Rich media, typing indicators, read receipts, message reactions, message threading/replies, pin messages, user online status presence.
   - **Group Channels**: Up to **3,000 members** per group, role/permission management, mute/ban, **Targeted Group Messages** (send a message inside a group visible only to specified member IDs), @mentions.
   - **Communities**: Discord-style multi-channel servers with **unlimited members**, topic categories, role-based channel visibility, and unread notification levels.
   - **Open Channels (Live Chatrooms)**: **Unlimited concurrent viewers/participants** for live streams and mass watch parties, powered by a 3-layer consistent hashing dispatch cluster, priority message whitelisting, and chatroom metadata synchronization (`up to 50 KV pairs` with atomic lock/CAS semantics).
2. **Real-Time Audio & Video (`Call SDK`)**:
   - 1-on-1 and multiparty VoIP audio/video calling across Android (`cn.rongcloud.sdk:call_lib`), iOS (`RongCloudRTC/RongCallLib`), Flutter (`@rongcloud/calllib-flutter`), React Native (`@react-native-Community/calllib`), and Web (`@rongcloud/engine`, `@rongcloud/calllib-v3`).
   - Built-in video beauty filters, virtual backgrounds (blur, color, custom image), and audio voice changers (`Lolita`, `Uncle`, `Monster`, `Robot`, `Echo`, `KTV`).
3. **AI-Native Capabilities (`AI Mode`, `AICP`, `Lyra`)**:
   - **Streaming Messages (`StreamMsg`)**: Server-initiated token-by-token streaming updates into a single message bubble for LLM/agent responses (`https://docs.nexconn.ai/chat/overview/features/message/stream-message.md`).
   - **Built-in Real-Time Translation**: Automatic text translation across 100+ languages (`https://docs.nexconn.ai/chat/overview/features/builtin-translation/introduction.md`).
   - **Voice-to-Text (STT)**: Built-in speech-to-text transcription on voice messages (`https://docs.nexconn.ai/chat/overview/features/voice-to-text/introduction.md`).
   - **Content Moderation**: `<100ms` real-time text, image, audio, and video inspection across 8 risk categories (`https://docs.nexconn.ai/chat/overview/features/moderation/auto-moderation.md`).
   - **End-to-End Encryption (E2EE)**: X3DH key agreement + Double Ratchet protocol (`https://docs.nexconn.ai/chat/overview/features/e2ee/introduction.md`).
   - **AI Mode (`https://docs.nexconn.ai/ai-mode/`)**: Agentic workspace orchestration with Skills, Automations (scheduled cron/event triggers), Shared Drives, and Multi-Agent Group Channels.
   - **Lyra (`https://www.lyrawork.com/`)**: Nexconn's flagship "Human-Agent Collaboration Platform" built atop Nexconn's IM + AICP stack.

---

## 2. Complete Technical Documentation Map (`https://docs.nexconn.ai/llms.txt`)

Below is the structured technical index extracted from `https://docs.nexconn.ai/llms.txt`:

### 2.1 AI Mode (`https://docs.nexconn.ai/ai-mode/`)
- **Overview & Quickstart**:
  - `https://docs.nexconn.ai/ai-mode/overview/introduction.md` - Introduction to AI Mode
  - `https://docs.nexconn.ai/ai-mode/overview/quickstart.md` - Quickstart guide
  - `https://docs.nexconn.ai/ai-mode/overview/billing.md` - Billing & credits
- **User Guide**:
  - `https://docs.nexconn.ai/ai-mode/user-guide/agent.md` - AI Agent configuration & personas
  - `https://docs.nexconn.ai/ai-mode/user-guide/direct-chat.md` - 1-on-1 Human-to-Agent Direct Chat
  - `https://docs.nexconn.ai/ai-mode/user-guide/group-channel.md` - Multi-Agent & Human-Agent Group Channels
  - `https://docs.nexconn.ai/ai-mode/user-guide/skills.md` - Custom Agent Skills
  - `https://docs.nexconn.ai/ai-mode/user-guide/automations.md` - Scheduled & event-driven Automations
  - `https://docs.nexconn.ai/ai-mode/user-guide/drive.md` - Shared Workspace Drive
  - `https://docs.nexconn.ai/ai-mode/user-guide/workspace-management.md` - Workspace & member governance

### 2.2 Chat Overview & Feature Matrix (`https://docs.nexconn.ai/chat/overview/`)
- **Channel Types**:
  - **Direct Channels**: `https://docs.nexconn.ai/chat/overview/features/direct-channels/introduction.md`
  - **Group Channels (up to 3,000 members)**:
    - `https://docs.nexconn.ai/chat/overview/features/group-channels/introduction.md`
    - `https://docs.nexconn.ai/chat/overview/features/group-channels/basic.md`
    - `https://docs.nexconn.ai/chat/overview/features/group-channels/members.md`
    - `https://docs.nexconn.ai/chat/overview/features/group-channels/permissions.md`
    - `https://docs.nexconn.ai/chat/overview/features/group-channels/mute.md`
    - `https://docs.nexconn.ai/chat/overview/features/group-channels/direct.md` - **Targeted Group Messages** (send to specific subset of users inside a group)
    - `https://docs.nexconn.ai/chat/overview/features/group-channels/mentions.md`
  - **Open Channels (Live Chatrooms - unlimited concurrent users)**:
    - `https://docs.nexconn.ai/chat/overview/features/open-channels/introduction.md`
    - `https://docs.nexconn.ai/chat/overview/features/open-channels/basic.md`
    - `https://docs.nexconn.ai/chat/overview/features/open-channels/managing-members.md`
    - `https://docs.nexconn.ai/chat/overview/features/open-channels/managing-messages.md`
    - `https://docs.nexconn.ai/chat/overview/features/open-channels/managing-metadata.md` - **Real-time key-value state synchronization** (up to 50 KV pairs per room, atomic update/lock)
    - `https://docs.nexconn.ai/chat/overview/features/open-channels/muting-members.md`
    - `https://docs.nexconn.ai/chat/overview/features/open-channels/blocklist-and-allowlist.md`
  - **Communities (Unlimited members & sub-channels)**:
    - `https://docs.nexconn.ai/chat/overview/features/communities/introduction.md`
    - `https://docs.nexconn.ai/chat/overview/features/communities/architecture.md`
    - `https://docs.nexconn.ai/chat/overview/features/communities/basic.md`
    - `https://docs.nexconn.ai/chat/overview/features/communities/members.md`
    - `https://docs.nexconn.ai/chat/overview/features/communities/permissions.md`
    - `https://docs.nexconn.ai/chat/overview/features/communities/notifications.md`
    - `https://docs.nexconn.ai/chat/overview/features/communities/messaging.md`
- **Advanced Messaging Primitives**:
  - `https://docs.nexconn.ai/chat/overview/features/message/introduction.md` - Built-in & Custom Message types
  - `https://docs.nexconn.ai/chat/overview/features/message/stream-message.md` - **Streaming Messages** (real-time AI/LLM output streaming)
  - `https://docs.nexconn.ai/chat/overview/features/message/expansion.md` - **Message Expansion** (up to 300 dynamic key-value pairs per message for interactive cards, polls, reactions, and live status updates)
  - `https://docs.nexconn.ai/chat/overview/features/message/reply.md` - Quoted replies & threads
  - `https://docs.nexconn.ai/chat/overview/features/message/read-receipt.md` - 1-on-1 & Group read receipts
  - `https://docs.nexconn.ai/chat/overview/features/message/modify-and-recall.md` - Message editing & recall
  - `https://docs.nexconn.ai/chat/overview/features/message/pin.md` - Pinned messages
  - `https://docs.nexconn.ai/chat/overview/features/message/typing-indicators.md` - Real-time typing status
  - `https://docs.nexconn.ai/chat/overview/features/message/Directional-Deletion.md` - Directional message deletion
- **AI, Trust, Safety & Accessibility Add-Ons**:
  - `https://docs.nexconn.ai/chat/overview/features/builtin-translation/introduction.md` - **Built-in Translation**
  - `https://docs.nexconn.ai/chat/overview/features/voice-to-text/introduction.md` - **Voice-to-Text**
  - `https://docs.nexconn.ai/chat/overview/features/moderation/auto-moderation.md` - **Content Moderation**
  - `https://docs.nexconn.ai/chat/overview/features/e2ee/introduction.md` - **End-to-End Encryption (X3DH + Double Ratchet)**
  - `https://docs.nexconn.ai/chat/overview/features/user-And-friend/online-status-subscription.md` - **Online Status Subscription (Presence)**
  - `https://docs.nexconn.ai/chat/overview/features/notifications/push-introduction.md` - **Multi-vendor Push Notifications (FCM, APNs, Huawei, Xiaomi, OPPO, vivo)**

### 2.3 Platform SDK Matrix (`https://docs.nexconn.ai/llms.txt`)
| Layer | Supported Platforms & Packages | Documentation Root |
|---|---|---|
| **Chat UI (`UIKit`)** | Android (`cn.rongcloud.sdk:im_kit`), iOS (`RongCloudIM/IMKit`), Web (UIKit Components) | `https://docs.nexconn.ai/chat/uikit/` |
| **Chat SDK (`IMLib`)** | Web (`@rongcloud/imlib-next` v5), Android (`cn.rongcloud.sdk:im_lib`), iOS (`RongCloudIM/IMLibCore`), Flutter (`rongcloud_im_wrapper_plugin`), React Native (`@rongcloud/react-native-imlib`), Unity (`RongCloud IM Unity`) | `https://docs.nexconn.ai/chat/sdk/` |
| **Server SDK & REST API** | Server REST API (`HMAC-SHA1` / `App-Key` + `Nonce` + `Timestamp` + `Signature`), Server SDKs for **Java**, **Go**, **Node.js**, **PHP**, **Python**, **.NET**, plus real-time **Webhooks** (Pre-send synchronous callback, Post-send route callback, Online status webhook, Chatroom status webhook) | `https://docs.nexconn.ai/chat/server/` |
| **Call SDK (`CallLib` / `CallKit`)** | Web (`@rongcloud/engine` + `@rongcloud/calllib-v3`), Android (`cn.rongcloud.sdk:call_lib` / `call_kit`), iOS (`RongCloudRTC/RongCallLib` / `RongCallKit`), Flutter (`@rongcloud/calllib-flutter`), React Native (`@react-native-Community/calllib`) | `https://docs.nexconn.ai/call/` |

---

## 3. Official GitHub Organization (`https://github.com/NexconnAI-Dev`)

All 9 public repositories under `https://github.com/NexconnAI-Dev` were inspected:

| # | Repository | URL | Stack / Purpose |
|---|---|---|---|
| 1 | `nexconn-skills` | `https://github.com/NexconnAI-Dev/nexconn-skills` | Official AI Agent Skills & `@nexconn/console-mcp` server configuration for integrating Nexconn Chat UI, Chat SDK, and Call SDK across Android, iOS, Web, Flutter, React Native, Unity, and Server backends. |
| 2 | `imsdk-web-Quickdemo` | `https://github.com/NexconnAI-Dev/imsdk-web-Quickdemo` | Official Web Chat SDK (`@rongcloud/imlib-next`) quickstart sample demonstrating token auth, connection lifecycle, and message sending/receiving. |
| 3 | `uikit-android-Quickdemo` | `https://github.com/NexconnAI-Dev/uikit-android-Quickdemo` | Official Android Chat UI (`IMKit`) sample project. |
| 4 | `uikit-ios-Quickdemo` | `https://github.com/NexconnAI-Dev/uikit-ios-Quickdemo` | Official iOS Chat UI (`IMKit`) sample project. |
| 5 | `imsdk-flutter-Quickdemo` | `https://github.com/NexconnAI-Dev/imsdk-flutter-Quickdemo` | Official Flutter Chat SDK (`rongcloud_im_wrapper_plugin`) sample project. |
| 6 | `imsdk-rn-Quickdemo` | `https://github.com/NexconnAI-Dev/imsdk-rn-Quickdemo` | Official React Native Chat SDK sample project. |
| 7 | `imsdk-unity-Quickdemo` | `https://github.com/NexconnAI-Dev/imsdk-unity-Quickdemo` | Official Unity Chat SDK sample project for game developers. |
| 8 | `callkit-android-Quickdemo` | `https://github.com/NexconnAI-Dev/callkit-android-Quickdemo` | Official Android Audio/Video CallKit sample project. |
| 9 | `callkit-ios-Quickdemo` | `https://github.com/NexconnAI-Dev/callkit-ios-Quickdemo` | Official iOS Audio/Video CallKit sample project. |

---

## 4. `nexconn-skills` & `@nexconn/console-mcp` Deep-Dive (`https://github.com/NexconnAI-Dev/nexconn-skills`)

Nexconn published `https://github.com/NexconnAI-Dev/nexconn-skills` specifically to let developers (and AI coding agents like Claude Code, Cursor, Windsurf, and OpenClaw) provision Nexconn apps and integrate SDKs in minutes.

### 4.1 Included Agent Skills (`skills/` directory in `NexconnAI-Dev/nexconn-skills`)
1. **`nexconn-dev`** (`skills/nexconn-dev/`):
   - End-to-end integration guide covering **Chat UI (UIKit)**, **Chat SDK (IMLib)**, **Call SDK (CallKit/CallLib)**, and **Server SDKs** (Node.js, Go, Java, Python, PHP, .NET).
   - Enforces the architectural rule that **User Token generation (`POST /user/getToken.json`) requires the `App Secret` and must live on the backend server** (or be generated via `@nexconn/console-mcp` during development), never exposing `App Secret` in production client bundles.
2. **`nexconn-console`** (`skills/nexconn-console/`):
   - Pairs with the official Model Context Protocol server **`@nexconn/console-mcp`** (`npx -y @nexconn/console-mcp`).
   - Authenticates against `https://console.nexconn.ai` using `NEXCONN_EMAIL` and `NEXCONN_PASSWORD` (or `NEXCONN_API_KEY`).
   - Allows an agent or developer to programmatically:
     - Create and list Nexconn Applications (`appKey` / `appSecret`).
     - Retrieve `App Key` and `App Secret` for environment configuration.
     - Register test users and generate valid JWT/IM connection tokens (`userId` → `token`).
     - Inspect application settings and webhook configurations.
3. **`nexconn-docs`** (`skills/nexconn-docs/`):
   - Direct retrieval index mapping developer intents to exact Markdown URLs in `https://docs.nexconn.ai/llms.txt`.
