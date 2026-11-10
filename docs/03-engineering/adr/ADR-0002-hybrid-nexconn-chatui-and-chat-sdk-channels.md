# ADR-0002: Hybrid `@nexconn/chatui` + `@nexconn/chat` (`NCEngine`) Multi-Channel Architecture & Call Boot Barrier
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Nexconn SDK Lead) · Status: Accepted · Last updated: 2026-11-10
> Related: [Project Brief](../../00-overview/PROJECT_BRIEF.md) · [Nexconn SDK Manual](../NEXCONN_SDK_MANUAL.md) · [Frontend](../FRONTEND.md)

---

## Status
`Accepted`

## Context & Problem Statement
As verified in `nexconn-skills/skills/chatui-web/SKILL.md` (`research/01-facts.md` §4.1):
1. `@nexconn/chatui@^26.2.5` (`<nc-chat-ui-app-provider>`) **only supports** `Direct`, `Group`, and `System` channels (`❌` does NOT support `Open` or `Community` channels or browser voice recording).
2. `@nexconn/chat@^26.2.1` (`NCEngine`) supports **all 5 channel types** (`Direct`, `Group`, `System`, `Community`, `Open`) plus voice capture.
3. `@nexconn/call@^26.2.0` (`NCCallEngine`) requires `await NCEngine.connect({ token })` to resolve **before** any call method is invoked (`R-01`).

## Decision Drivers
- Exercise **100% of the Nexconn SDK surface** (all 4 packages + all 5 channel types) for the 25% SDK Integration rubric.
- Prevent blank-screen crashes from passing `Open` or `Community` channel IDs into `<nc-chat-ui-app-provider>` (`R-02`).
- Prevent silent WebRTC signaling failures from premature `NCCallEngine` initialization (`R-01`).

## Considered Options
1. **Option A: Use only `@nexconn/chatui` (`<nc-chat-ui-app-provider>`) for all channels**: Rejected—`@nexconn/chatui@^26.2.5` does not support `Open` or `Community` channels (`R-02`), forfeiting 2 of the 5 channel types in the 25% Nexconn SDK rubric.
2. **Option B: Build a 100% custom React chat UI from scratch on `@nexconn/chat`**: Rejected—wastes 40+ engineering hours reimplementing virtualized message timelines, read receipts, and typing indicators already provided by `@nexconn/chatui`.
3. **Option C: Hybrid Architecture (`@nexconn/chatui` for `Direct`/`Group`/`System` + `@nexconn/chat` `NCEngine` for `Community`/`Open` + strict `NCEngine.connect` boot barrier for `@nexconn/call`)**.

## Decision Outcome
Chosen option: **Option C (Hybrid `@nexconn/chatui` + `@nexconn/chat` `NCEngine` + `@nexconn/call` Boot Barrier)**.
1. **Hybrid Workspace Mounting**: `<nc-chat-ui-app-provider>` renders the center stage (`Direct` 1:1 deals, `Group` multi-party deals & frozen tribunals, and read-only `System` audit vouchers). A dedicated HeroUI v3 collapsible left rail binds directly to `@nexconn/chat` (`NCEngine`) to render `Open` channel flash-lot broadcasts (`OpenChannelPriorityControlsApi`) and `Community` category subchannels (`createCommunitySubchannel`).
2. **Strict Boot Barrier (`apps/web/src/lib/nexconn-boot.ts`)**: `NCCallEngine.getInstance()` is gated behind the `await NCEngine.connect({ token })` Promise resolution.

### Positive Consequences
- Demonstrates all 4 Nexconn SDK packages (`@nexconn/chatui`, `@nexconn/chat`, `@nexconn/call`, `@nexconn/server-sdk`) and all 5 channel types (`Direct`, `Group`, `System`, `Community`, `Open`) in one cohesive workspace.
- Eliminates race conditions between WebSocket connection establishment and WebRTC signaling (`R-01`).

### Negative Consequences & Mitigations
- **Two UI rendering paths (Lit Web Components in center stage vs. React HeroUI v3 in left rail)** → Mitigated by sharing a single `NCEngine` singleton session and unified CSS `oklch` design tokens across Light and Shadow DOM (`ADR-0003`).

