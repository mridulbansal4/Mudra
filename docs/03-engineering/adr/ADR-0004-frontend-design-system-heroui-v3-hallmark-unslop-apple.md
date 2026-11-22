# ADR-0004: Story-Driven Frontend Design System (`/hallmark` v2 + `/unslop` + `/apple-design` + HeroUI v3 & Native)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Design & Frontend Lead - Dev 3) · Status: Accepted · Last updated: 2026-11-10
> Related: [Design System](../../02-design/DESIGN_SYSTEM.md) · [UI Spec](../../02-design/UI_SPEC.md) · [Frontend](../FRONTEND.md) · [Mobile](../MOBILE.md)

---

## Status
`Accepted`

## Context & Problem Statement
Hackathon frontends fail in two predictable ways:
1. **AI Vibecoded Slop**: Purple-to-blue gradients, glowing neon borders, emoji icons in every heading, inconsistent spacing, and deprecated component patterns (`<HeroUIProvider>` v2).
2. **Beginner & Judge Disorientation**: Dropping a first-time user or a 2 AM judge directly into a complex multi-pane dashboard without a clear narrative entry, easy login/signup, camera fallback, or next-step guidance.

## Decision Drivers
- Eliminate AI-generated UI tells (`/hallmark` v2.0.0 Floor + `/unslop` 9-step pipeline) and pass `npx sloplint --render` with `0` errors (`R-11`).
- Ensure a first-time beginner or exhausted 2 AM judge (`P-05`) can navigate from `/` to a live dual-party deal in `≤ 2` clicks without a webcam or external login wall.
- Enforce modern HeroUI v3 React (`@heroui/react@^3.0.1` on Tailwind CSS v4) and HeroUI Native (`heroui-native@^2.0.1` on Uniwind) compound component patterns, plus Apple-grade physical motion (`/apple-design`).

## Considered Options
1. **Option A: Default dark-mode AI dashboard with Tailwind v3 / HeroUI v2 (`<HeroUIProvider>`) and a single `/chat` route**: Rejected - violates HeroUI v3 migration rules, triggers `sloplint` failures, and leaves first-time visitors lost.
2. **Option B: Unstyled raw HTML around `<nc-chat-ui-app-provider>`**: Rejected - fails the 30% Completeness & Execution rubric and lacks accessible dialogs, tabs, and mobile parity.
3. **Option C: Story-Driven 9-Route Architecture using `/hallmark` v2.0.0 + `/unslop` + `/apple-design` + `@heroui/react@^3.0.1` (Tailwind v4) + `heroui-native@^2.0.1` (Uniwind)**.

## Decision Outcome
Chosen option: **Option C**. We enforce a unified five-part frontend architecture across `apps/web` and `apps/mobile`:
1. **Story-First Routing**: `/` (Story Landing with `1280x800` Hallmark hero & 3 visual chapters) → `/auth` (Login/Signup Tabs + 4 One-Tap Persona Quick-Fill cards) → `/onboarding` (45s 3-step setup with **Simulated HD Inspection Video Stream** toggle) → `/app` & `/sandbox` (persistent top **4-Stage Deal Story Bar** with "Next Step" coachmarks) → `/arena`, `/dispatch`, `/guide`, `/traction`.
2. **HeroUI v3 (`@heroui/react@^3.0.1`) on Web**: Zero `<HeroUIProvider>`, Tailwind CSS v4 (`@import "tailwindcss"; @import "@heroui/styles";`), compound components (`<Card><Card.Header>...`), `oklch` tokens, and `onPress` handlers.
3. **HeroUI Native (`heroui-native@^2.0.1`) on Mobile (`apps/mobile`)**: Expo SDK 53 + Uniwind + `<GestureHandlerRootView>` + `<HeroUINativeProvider>` + compound `<Card><Card.Body>` + HSL tokens.
4. **`/hallmark` v2.0.0 Floor & `/unslop` Craft**: Warm customs-ledger neutral ramp, 4px grid, sentence case everywhere, `tabular-nums`, zero emojis, verified in CI via `sloplint --render` (`0 FAIL`).
5. **`/apple-design` Fluid Physics**: Instant `:active` `scale(0.97)` feedback, critically damped `damping: 1.0` UI springs, and `setPointerCapture` + momentum projection (`projectMomentum(v, 0.998)`) on the draggable WebRTC Video Assay PiP Loupe.

### Positive Consequences
- Immediate visual credibility (`Swiss Customs Ledger` aesthetic) that stands out from generic purple-gradient hackathon submissions.
- Zero dead-ends for judges or beginners thanks to 1-Tap Persona Auth, `/sandbox` Split-Screen Mode, and `FF_SIMULATED_HD_CAMERA`.

### Negative Consequences & Mitigations
- **Compound component syntax differences between Web (`<Card.Content>`) and React Native (`<Card.Body>`)** → Mitigated by explicit lint rules in `CLAUDE.md` and `CODING_STANDARDS.md`.

