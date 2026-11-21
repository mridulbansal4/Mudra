# ADR-0003: Custom Lit `^3.3.2` `BaseMessageContent` Cards & Composed Shadow DOM Event Bridge
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Frontend & Lit Lead) · Status: Accepted · Last updated: 2026-11-10
> Related: [Project Brief](../../00-overview/PROJECT_BRIEF.md) · [Nexconn SDK Manual](../NEXCONN_SDK_MANUAL.md) · [Design System](../../02-design/DESIGN_SYSTEM.md)

---

## Status
`Accepted`

## Context & Problem Statement
To make the Nexconn chat timeline itself act as our escrow and dispute state machine, we need interactive cards inside `<nc-chat-ui-app-provider>`. However, `@nexconn/chatui@^26.2.5` is built on **Google Lit `^3.3.2` Web Components** using Shadow DOM encapsulation (`R21` Rich Harris / Justin Fagnani critique), and custom message types ignored if registered after `app.ready()` (`R-03`).

## Decision Drivers
- Register all custom message cards (`x-mudra-escrow-card`, `x-mudra-bilingual-bubble`, `x-mudra-assay-receipt`, `x-mudra-tribunal-verdict`) synchronously inside `hooks.beforeReady()` before `await app.ready()` (`R-03`).
- Bridge user interactions inside Lit Shadow DOM back to React 19 state and the Go `:4002` Escrow FSM with `< 16ms` tactile response.
- Maintain visual parity (`oklch` palette, `tabular-nums`, 4px grid) across React and Lit Shadow Roots.

## Considered Options
1. **Option A: Render escrow controls outside the chat window in a separate React sidebar**: Rejected - reduces chat to passive text and loses our core 0→1 product innovation.
2. **Option B: Attempt to mount React portals inside `<nc-chat-ui-app-provider>` Shadow Roots**: Rejected - fragile across Lit re-renders and leaks memory.
3. **Option C: Build native `lit@^3.3.2` `BaseMessageContent` subclasses in `packages/nc-lit-cards`, register them synchronously in `beforeReady()` hook, and bridge events via `CustomEvent({ bubbles: true, composed: true })`**.

## Decision Outcome
Chosen option: **Option C**.
- We define 4 lightweight (`<14KB` total) Lit components (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`, `<nc-video-assay-receipt>`, `<nc-tribunal-verdict>`), register them via `registerMessageType` inside `NCChatUIApplication.initialize({ hooks })` prior to `app.ready()`, style them using inherited CSS custom properties (`--font-sans`, `--font-mono`, `--accent`), and emit `composed: true` custom events that cross the Shadow DOM boundary into React 19.

### Positive Consequences
- Native Lit v3 rendering inside `@nexconn/chatui` with zero Virtual-DOM-inside-Shadow-DOM reconciliation bugs.
- `composed: true` events (`mudra:escrow-action`, `mudra:start-assay`) bubble cleanly to the React `<DealWorkspace>` listener.

### Negative Consequences & Mitigations
- **Global Tailwind utility classes do not penetrate Lit Shadow DOM** → Mitigated by injecting a shared constructable `CSSStyleSheet` (`adoptStyles`) consuming CSS custom properties defined on `:root` (`R-03`).

