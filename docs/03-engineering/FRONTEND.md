# Frontend Engineering Specification (`apps/web`) — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Frontend Lead — Dev 3) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Design System](../02-design/DESIGN_SYSTEM.md) · [UI Spec](../02-design/UI_SPEC.md) · [Nexconn SDK Manual](./NEXCONN_SDK_MANUAL.md) · [Mobile Spec](./MOBILE.md) · [ADR-0004](./adr/ADR-0004-frontend-design-system-heroui-v3-hallmark-unslop-apple.md)

---

## 1. Frontend Stack & Core Engineering Mandates

`apps/web` is built with **React 19.1**, **TypeScript 5.8**, **Vite 6.2**, **Tailwind CSS v4.1**, and **HeroUI v3 (`@heroui/react@^3.0.1` + `@heroui/styles@^3.0.1`)**, embedding **Lit `^3.3.2` custom message cards (`packages/nc-lit-cards`)** inside `<nc-chat-ui-app-provider>` (`@nexconn/chatui@^26.2.5`) and running a **60fps Rust WebAssembly worker (`packages/assay-wasm-rs`)** during `@nexconn/call@^26.2.0` video inspections.

### Five Non-Negotiable Frontend Rules:
1. **HeroUI v3 Only (Zero v2 Legacy)**:
   - Do **NOT** wrap the app in `<HeroUIProvider>` (deprecated in v3).
   - Import `@import "tailwindcss";` first and `@import "@heroui/styles";` second in `src/styles/globals.css`.
   - Use compound components (`<Card><Card.Header><Card.Title>...`) and React Aria `onPress` handlers everywhere.
2. **Beginner-First Story Routing Flow**:
   - Every visitor lands on a clear narrative progression (`/` → `/auth` → `/onboarding` → `/app` or `/sandbox` → `/arena` → `/dispatch` → `/guide` → `/traction`) with a persistent top **4-Stage Deal Story Bar** and contextual **"Next Step"** coachmark pill.
3. **`/hallmark` v2.0.0 Floor & `/unslop` Craft**:
   - Line 1 of `src/styles/globals.css` carries the Hallmark stamp + critique line.
   - `html, body { overflow-x: clip; }`; zero `transition: all`; zero emojis; sentence case everywhere; `tabular-nums` on all ₹ amounts, timers, and hashes; passes `sloplint --render` with `0 FAIL`.
4. **`/apple-design` Fluid Physical Motion**:
   - Instant pointer-down feedback (`scale(0.97)` in `100ms`); critically damped springs (`damping: 1.0, response: 0.35s`) by default; 1:1 `setPointerCapture` + Apple momentum projection (`projectMomentum(v, 0.998)`) on the draggable WebRTC Video Assay PiP Loupe.
5. **Shadow DOM Custom-Event Bridge for Lit Cards**:
   - Because `<nc-escrow-deal-card>` renders inside `<nc-chat-ui-app-provider>`'s Shadow DOM, all user actions inside Lit cards dispatch `new CustomEvent("samadhan-deal-action", { bubbles: true, composed: true, detail })` so the parent React 19 Deal Desk container captures them cleanly.

---

## 2. Folder Structure (`apps/web` & Shared Packages)

```text
apps/web/
├── index.html                          # Preloads Plus Jakarta Sans, Noto Indic subsets & JetBrains Mono
├── vite.config.ts                      # Vite 6 +wasm plugin + proxy /api/v1 -> localhost:4002
├── postcss.config.mjs                  # @tailwindcss/postcss (Tailwind CSS v4)
└── src/
    ├── main.tsx                        # React 19 root (No HeroUIProvider!) + RouterProvider
    ├── styles/
    │   ├── tokens.css                  # Hallmark :root oklch tokens + dark mode
    │   └── globals.css                 # Line 1 Hallmark stamp + @import "tailwindcss" + @import "@heroui/styles"
    ├── routes/                         # Story-Driven Route Tree (React Router v7 / TanStack Router)
    │   ├── LandingStoryPage.tsx        # /          — 1280x800 Hero + 3 Visual Story Chapters
    │   ├── AuthPersonaPage.tsx         # /auth      — Login/Signup Tabs + 4 One-Tap Demo Persona Cards
    │   ├── OnboardingWizardPage.tsx    # /onboarding— 45s 3-Step Setup + Simulated HD Camera Toggle
    │   ├── DealWorkbenchPage.tsx       # /app       — 4-Stage Story Bar + Hybrid Sidebar + ChatUI + PiP Loupe
    │   ├── SplitSandboxPage.tsx        # /sandbox   — 1-Click Dual Buyer+Seller Panes + 5-Step Coachmarks
    │   ├── BargainArenaPage.tsx        # /arena     — 60s Viral Chanakya AI Shopkeeper Challenge
    │   ├── ArbitratorDispatchPage.tsx  # /dispatch  — Frozen Group Channel Triage & 1-Tap Split Execution
    │   ├── SdkGuideInspectorPage.tsx   # /guide     — Interactive Beginner Manual & Live SDK Hook Inspector
    │   └── TractionProofPage.tsx       # /traction  — Public Verified MAU & Latency Dashboard (API-18)
    ├── components/
    │   ├── story-bar/
    │   │   ├── DealStoryStepper.tsx    # Top 4-Stage Progress Bar + "Next Recommended Step" Coachmark
    │   │   └── SandboxDirectorBar.tsx  # 5-Step Guided Tour for 2 AM Judges
    │   ├── nexconn/
    │   │   ├── ChatUIWorkspace.tsx     # Wraps <nc-chat-ui-app-provider> + composed CustomEvent listeners
    │   │   ├── OpenLotTickerRail.tsx   # Bound to @nexconn/chat (NCEngine) OpenChannelPriorityControlsApi
    │   │   ├── CommunitySubNav.tsx     # Bound to @nexconn/chat createCommunitySubchannel
    │   │   └── VideoAssayPiPLoupe.tsx  # @nexconn/call + Apple setPointerCapture + Rust WASM overlay
    │   └── receipt/
    │       └── SystemVoucherDrawer.tsx # Verifies Ed25519 signature & SHA-256 chain from System channel
    ├── lib/
    │   ├── nexconn-boot.ts             # Enforces ChatUI registerMessageType -> NCEngine.connect -> NCCallEngine
    │   ├── simulated-camera.ts         # 60fps HTML5 Canvas HD Juki Overlock / MacBook stream generator
    │   ├── apple-physics.ts            # projectMomentum(), rubberband(), and spring configs
    │   └── api-client.ts               # Typed client for API-01..API-18 with X-Idempotency-Key
    └── workers/
        └── assay-wasm.worker.ts        # Web Worker running packages/assay-wasm-rs at 60fps
```

---

## 3. State Management & Data Fetching Architecture

- **Server & Deal FSM State (`@tanstack/react-query v5`)**: Fetches `API-04` (`GET /api/v1/deals/:dealId`) and `API-18` (`GET /api/v1/traction/telemetry`) with optimistic updates on `API-06` (`escrow/transition`) and automatic invalidation whenever a `System` channel voucher arrives over `NCEngine`.
- **Real-Time Channel & Call State (`Zustand v5` store `useSamadhanSessionStore`)**:
  - Holds `nexconnAppKey`, `nexconnToken`, `ncConnectionState` (`DISCONNECTED | CONNECTING | CONNECTED`), active `storyStage` (`1 | 2 | 3 | 4`), `cameraMode` (`webcam | simulated_hd`), and `activeCallState` (`IDLE | AUDIO_RINGING | VIDEO_ASSAY_ACTIVE | LOG_VERIFIED`).

---

## 4. Simulated HD Inspection Camera Fallback (`src/lib/simulated-camera.ts`)

To guarantee that a solo judge at 2 AM without a physical Juki sewing machine or webcam (`R-04`) can test the full `@nexconn/call` + Rust WASM video inspection flow:
- When `cameraMode === "simulated_hd"` (or `navigator.mediaDevices.getUserMedia` throws `NotAllowedError` / `NotFoundError`), `createSimulatedInspectionMediaStream()` renders a high-resolution 60fps `<canvas>` featuring:
  1. Realistic industrial Juki MO-6814S overlock machine footage + serial plate `JUKI-MO-6814S-8821` with simulated camera pan/tilt responding to the `API-07` challenge nonce.
  2. Synthesized `WebAudioAPI` `4,820 RPM` (`80.33 Hz` fundamental + harmonics) servo motor audio track.
  3. Calls `canvas.captureStream(60)` + `audioDestination.stream` and passes the combined `MediaStream` directly to `NCCallEngine` and `packages/assay-wasm-rs`!

---

## 5. Performance Budget & Bundle Discipline

| Metric | Budget Target | Enforcement Mechanism |
|---|---|---|
| **Initial JS Bundle (`/` Story Landing)** | `< 95 KB` gzipped | Route-based lazy code splitting (`React.lazy`); `@nexconn/chatui`, `@nexconn/call`, and `assay-wasm-rs` load dynamically when entering `/app`, `/sandbox`, or `/arena`. |
| **Largest Contentful Paint (LCP on `/`)** | `< 900 ms` on 4G | Zero external hero stock images; interactive preview is pure HTML/CSS + preloaded WOFF2 fonts. |
| **Main-Thread Frame Time During Video Assay** | `< 8.0 ms` (`60fps` locked) | Rust WASM `packages/assay-wasm-rs` runs inside `assay-wasm.worker.ts` using `OffscreenCanvas`. |
| **Cumulative Layout Shift (CLS)** | `< 0.01` | Fixed `36px` sidebar rows, explicit dimensions on `<nc-escrow-deal-card>` (`min-height: 184px`), and pre-sized PiP Loupe (`320x220px`). |
