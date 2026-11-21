# Design System - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Design & Frontend Craft Lead - Jony Ive & Don Norman Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [UI Spec](./UI_SPEC.md) · [Accessibility](./ACCESSIBILITY.md) · [Localization](./LOCALIZATION.md) · [Frontend Engineering](../03-engineering/FRONTEND.md) · [ADR-0004](../03-engineering/adr/ADR-0004-frontend-design-system-heroui-v3-hallmark-unslop-apple.md)

---

## 1. Unified Design Governance (`/hallmark` + `/unslop` + `/apple-design` + `/heroui-react` v3 + `/heroui-native` v2)

MUDRA-OS is governed by five non-negotiable design systems so that no screen ever looks like "AI-generated vibecoded slop":

### 1.1 The `/unslop` Five-Line Direction
- **Product**: Real-time cross-lingual video-escrow deal desk and 90-second channel-freeze dispute tribunal for Indian and cross-border B2B/P2P merchants (`P-01`..`P-05`).
- **Character**: `tactile, forensic, assured` (Words like *clean, modern, sleek, minimal, premium* are banned).
- **World**: **Warm customs assay house & precision instrument ledger** - unbleached cotton bond paper, warm graphite scales, vermilion wax seals, emerald vault locks, and high-contrast optical inspection loupes.
- **Moments**:
  1. **The Interactive Lit Escrow Milestone Card (`<nc-escrow-deal-card>`)**: Rich tactile vault card inside the quiet chat timeline with physical step indicators and cryptographic receipts.
  2. **The Draggable WebRTC Video Assay Loupe (`@nexconn/call` + Rust WASM)**: Floating optical viewfinder with real-time 60fps serial-plate bounding lock (`JUKI-MO-6814S-8821`) and live motor RPM audio spectrum.
- **Signature**: **The Monospaced Cryptographic `System` Receipt Strip (`[SYS-VOUCHER · ED25519:8f9a…2c1b]`)** anchored at the foot of every state transition card and in the read-only `System` channel.

---

### 1.2 The `/hallmark` v2.0.0 Picks Block & Non-Waivable Floor

```markdown
**Hallmark · v2.0.0**

- **Shape** · Workbench + Story Ledger, custom direction (`tactile, forensic, assured`) · genre: modern-minimal / editorial hybrid · job: launch live split-screen sandbox or sign in to lock a deal
- **Theme** · Custom Assay Ledger (`oklch` warm stone & carbon graphite, Assay Vermilion + Vault Emerald semantic signals)
- **Chrome** · nav: edge-aligned, flat wordmark + story route links + 1 primary action (`Launch 1-Click Demo`, `Sign in` as quiet text link) · footer: structured mast with SDK & compliance proof links
- **Hero** · Split Stage at `1280x800`: headline (≤7 words: "Trade across languages. Verify on live video."), 1 sentence (12 words), 2 actions on cols 1–5; live interactive `<nc-escrow-deal-card>` + Video Assay preview on cols 6–12
- **Signature** · Monospaced cryptographic System-channel receipt strip (`[SYS-VOUCHER · ED25519:8f9a…2c1b]`) inside the live escrow card
- **Sections** · Hero (Live Deal Card Stage) · Story Chapter 1 (The ₹38,000 Cr Trust Gap) · Story Chapter 2 (The 4-Stage MUDRA Covenant) · Story Chapter 3 (5 Persona Entry Doors) · Live Telemetry Strip (`/traction` preview) · Footer
- **Material** · real: Nexconn v26.2.5/v26.2.1/v26.2.0/v0.1.2 SDK suite, Go 1.24 FSM, Rust 1.85 WASM verifier, ₹38,000 Cr ONDC/RBI fraud benchmark · pictures: real rendered `<nc-chat-ui-app-provider>` + `<nc-escrow-deal-card>` + simulated HD Juki overlock assay canvas · absent: zero invented customer testimonials or fake company logo walls
- **Sweep** · `node scripts/sloplint.mjs --render` enforced in CI (`Floor 0 FAIL`)
```

#### The 16 Non-Waivable Hallmark Floor Rules Enforced Across `apps/web`:
1. Every color and font goes through a CSS token declared in `:root` (`tokens.css`). Zero literal hex/rgb or `font-family` declarations outside `:root`.
2. **Never `transition: all`**. Never animate `width`, `height`, `top`, or `left` (compositor-only `transform` and `opacity`, plus `transition-colors`).
3. Never place a single italic word inside a roman heading.
4. `overflow-x: clip` on both `html` and `body`. Never `overflow-x: hidden`, never `100vw`.
5. Image/video-bearing grid tracks use `minmax(0, 1fr)`; display headings carry `overflow-wrap: break-word; min-width: 0`.
6. Every interactive element has an instant `:focus-visible` ring (`2px solid var(--accent)`).
7. Every animation has a `@media (prefers-reduced-motion: reduce)` fallback, and content is visible with JS disabled.
8. Zero invented customer counts, fake quotes, or unverified logo walls.
9. **Zero uppercase tracked eyebrows/labels**: all labels, captions, table headers, tags, and nav links use sentence case, untracked.
10. Zero middle-dot-joined meta strings (`•`), zero arrows glued to link text (`→`), zero decorative pulsing status dots (status dots only appear on live `NCEngine` / `NCCallEngine` socket states).
11. Zero purple-to-blue gradients, zero cards-inside-cards, zero emojis used as UI icons, zero hand-drawn fake OS window chrome.
12. Hero headline, 1 sentence, and primary CTA are 100% visible at `1280x800` without scrolling.
13. ~80 words per screen on the landing page; hero text is strictly the headline, 1 sentence, and its actions.
14. Container capped and centered (`max-width: 1440px` for landing, `1600px` for workbench); at `1920px` only gutters grow.
15. Line 1 of `apps/web/src/styles/globals.css` carries the Hallmark stamp + critique line.
16. Automated `sloplint.mjs --render` check passes with `0 FAIL` before merge.

---

## 2. Color Tokens (`oklch` for HeroUI v3 Web · `HSL` for HeroUI Native Mobile)

Per `/unslop` Pass 2 and `/heroui-react` v3 theming rules, surfaces stay quiet along a single warm-graphite neutral ramp so the content (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`, and the live WebRTC Video Assay Loupe) carries 100% of the visual richness. All accent pairs meet `>= 4.5:1` WCAG AA contrast.

```css
/* hallmark-stamp: v2.0.0 | shape: workbench | theme: custom-assay-ledger | genre: modern-minimal | signature: sys-voucher-strip */
/* critique: warm customs ledger paper and carbon graphite surfaces keep chrome quiet so Lit escrow cards and live WebRTC video assay carry the focus */

/* 1. Tailwind CSS v4 - MUST BE FIRST (HeroUI v3 Mandate) */
@import "tailwindcss";

/* 2. HeroUI v3 Styles - MUST BE SECOND */
@import "@heroui/styles";

:root {
  /* Neutral Ramp - Light Mode (Unbleached Ledger Paper & Carbon Ink) */
  --background: oklch(0.978 0.005 85);          /* Warm cotton paper #F9F7F2 */
  --surface-1: oklch(0.992 0.003 85);           /* Raised card surface */
  --surface-2: oklch(0.952 0.007 85);           /* Subtle recessed well / sidebar */
  --surface-glass: oklch(0.985 0.004 85 / 0.72);/* Apple translucent toolbar */
  --foreground: oklch(0.185 0.012 265);         /* Primary carbon ink (15.2:1) */
  --foreground-secondary: oklch(0.385 0.012 265);/* Secondary text role (7.1:1) */
  --foreground-muted: oklch(0.525 0.010 265);   /* Muted meta & captions (4.6:1) */
  --border-hairline: oklch(0.185 0.012 265 / 0.08); /* 8% quiet hairline */

  /* Primary Brand Accent - Assay Amber-Vermilion (Customs Seal) */
  --accent: oklch(0.565 0.185 38);              /* #C84B20 - 4.85:1 with snow */
  --accent-foreground: oklch(0.990 0.002 85);

  /* Semantic Moments (Escrow Vault, Video Assay, Freeze Lock) */
  --vault-locked: oklch(0.520 0.145 155);       /* Vault Emerald - Escrow Funded & Assay Verified */
  --vault-locked-bg: oklch(0.945 0.035 155);
  --assay-active: oklch(0.550 0.160 245);       /* Optical Cobalt - Live WebRTC Video Assay */
  --freeze-danger: oklch(0.530 0.205 25);       /* Tribunal Vermilion - Channel Frozen (addGroupChannelFreezeList) */
  --freeze-danger-bg: oklch(0.945 0.040 25);

  /* Typography Families */
  --font-sans: "Plus Jakarta Sans", "Noto Sans", "Noto Sans Tamil", "Noto Sans Devanagari", system-ui, sans-serif;
  --font-display: "Instrument Serif", "Plus Jakarta Sans", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

.dark, [data-theme="dark"] {
  /* Neutral Ramp - Dark Mode (Precision Instrument Graphite) */
  --background: oklch(0.155 0.008 265);         /* Deep instrument graphite #0D0E12 */
  --surface-1: oklch(0.195 0.010 265);          /* Raised panel step 1 */
  --surface-2: oklch(0.235 0.012 265);          /* Active row / step 2 */
  --surface-glass: oklch(0.195 0.010 265 / 0.68);
  --foreground: oklch(0.955 0.005 85);          /* Primary off-white ink */
  --foreground-secondary: oklch(0.745 0.008 265);
  --foreground-muted: oklch(0.585 0.008 265);
  --border-hairline: oklch(0.955 0.005 85 / 0.08);

  /* Primary Brand Accent in Dark Mode */
  --accent: oklch(0.665 0.185 40);
  --accent-foreground: oklch(0.145 0.010 265);
  --vault-locked: oklch(0.680 0.155 155);
  --vault-locked-bg: oklch(0.240 0.045 155);
  --assay-active: oklch(0.680 0.155 245);
  --freeze-danger: oklch(0.650 0.200 25);
  --freeze-danger-bg: oklch(0.250 0.055 25);
}
```

### 2.1 HeroUI Native (`apps/mobile-expo/global.css`) HSL Equivalent
Because `heroui-native@^2.0.1` on Uniwind requires **HSL** tokens instead of `oklch`:
```css
@import "tailwindcss";
@import "uniwind";
@import "heroui-native/styles";

@source "./node_modules/heroui-native/lib";

@theme {
  --color-background: hsl(40, 33%, 97%);
  --color-foreground: hsl(230, 18%, 12%);
  --color-accent: hsl(15, 73%, 45%);
  --color-accent-foreground: hsl(40, 33%, 99%);
  --color-success: hsl(152, 58%, 36%);
  --color-danger: hsl(6, 76%, 46%);
}
```

---

## 3. Typography & Optical Sizing (`/apple-design` §15 + `/unslop` §5 + Indic Scripts)

- **Three Type Roles**:
  1. **Interface & Body (`--font-sans`)**: `Plus Jakarta Sans` paired with `Noto Sans Tamil`, `Noto Sans Devanagari`, `Noto Sans Gurmukhi`, and `Noto Sans Malayalam` so bilingual bubbles (`<nc-bilingual-bubble>`) render with identical x-height and zero baseline jump.
  2. **Editorial Landing Display (`--font-display`)**: Used sparingly on the `/` Story Landing Page hero and chapter headings.
  3. **Forensic & Numeric Ledger (`--font-mono`)**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` for all ₹/SGD/USD prices, 60-second `/arena` countdowns, `pHash` strings, `4,820 RPM` FFT readouts, and `[SYS-VOUCHER]` receipts.
- **Weight & Case Discipline**:
  - Only weights `400` (regular), `500` (medium), and `600` (semi-bold for rare emphasis). **Zero `700–900` ultra-bold shouting**.
  - **Sentence case everywhere** (`Escrow milestones`, `Live video assay`, `System audit ledger` - never `ESCROW MILESTONES` with wide letter-spacing).
- **Size-Specific Tracking & Inverse Leading (`/apple-design` WWDC Typography Rules)**:

| Token | Size (`rem` / `px`) | Line Height (Leading) | Letter Spacing (Tracking) | Usage |
|---|---|---|---|---|
| `--text-display` | `clamp(2.25rem, 4vw, 3.5rem)` (`36–56px`) | `1.06` (tight) | `-0.022em` (negative for large optical balance) | `/` Story Hero headline (≤7 words) |
| `--text-h1` | `1.75rem` (`28px`) | `1.18` | `-0.015em` | Story chapter titles & route headers |
| `--text-h2` | `1.25rem` (`20px`) | `1.28` | `-0.008em` | Panel titles & `<nc-escrow-deal-card>` title |
| `--text-body` | `1.0rem` (`16px`) | `1.50` (`1.65` for Indic scripts) | `0em` | Chat messages, bilingual streams, descriptions |
| `--text-sm` | `0.875rem` (`14px`) | `1.42` | `+0.005em` (never negative on small text) | Sidebar navigation rows, button labels, coachmarks |
| `--text-xs-mono` | `0.75rem` (`12px`) | `1.35` | `+0.012em` (`tabular-nums`) | `[SYS-VOUCHER]` hashes, timestamps, `pHash` badges |

---

## 4. Spacing, 4px Grid & Nested Border Radii (`/unslop` §1 & §7)

- **Strict 4px Grid**: Every margin, padding, gap, and row height is a multiple of `4px` (`4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64px`).
- **Density Standards**:
  - Left navigation & channel rows: `36px` fixed height, `4px` vertical gap, `16px` panel padding, `16px` Lucide icon in a fixed `20px` column with `8px` gap to label.
  - Deal cards & panels: `20px` or `24px` internal padding.
  - Page container edges: `24px` (`mobile/tablet`) to `32px` (`desktop`), max-width `1440px` (`/` landing) and `1600px` (`/app` & `/sandbox` full-viewport workbench).
- **Nested Border Radii Formula (`R_inner = max(4px, R_outer - padding)`)**:
  - Outer panel / modal sheet: `R_outer = 20px` with `12px` padding → Inner `<nc-escrow-deal-card>`: `R = 12px` → Inner action button / milestone well: `R = 8px`.
  - Nothing is a `9999px` pill except compact status tags (`22px` height → `11px` radius so CSS morphs smoothly).

---

## 5. Fluid Physical Motion & Direct Manipulation (`/apple-design` §1–§14 + `/unslop` §9)

1. **Zero Latency Pointer-Down Feedback (`/apple-design` §1)**:
   - Every HeroUI v3 `<Button onPress={...}>` and Lit card action responds on `pointerdown` (`:active`), scaling to `0.97` in `100ms ease-out`:
     ```css
     .nc-interactive:active {
       transform: scale(0.97);
       transition: transform 100ms ease-out;
     }
     ```
2. **Critically Damped Springs vs. Momentum Springs (`/apple-design` §4)**:
   - **Default UI Transitions (Route steps, Drawer open, Coachmark advance, Accordion)**: Critically damped spring (`damping: 1.0`, `response: 0.35s` → `bounce: 0` in Motion) so panels settle gracefully with zero distracting bounce.
   - **Gesture-Driven Physical Objects (Draggable WebRTC Video Assay PiP Loupe & Mobile Bottom Sheet)**: Under-damped spring (`damping: 0.8`, `response: 0.35s` → `bounce: 0.2`) **only when preceded by a user drag/flick gesture** carrying velocity.
3. **1:1 Direct Manipulation & Momentum Corner Projection on the Video Assay PiP Loupe (`/apple-design` §2, §5, §6)**:
   - During a live `@nexconn/call` video inspection, the user can grab the PiP Loupe anywhere (preserving `grabOffset = e.clientX - rect.left`), drag it 1:1 via `el.setPointerCapture(e.pointerId)`, and flick it toward any of the 4 corner anchors of the Deal Room.
   - At `pointerup`, we compute release velocity `v` (px/s) from the last 4 `pointermove` samples and project the resting point using Apple's exact WWDC formula:
     ```ts
     export function projectMomentum(initialVelocityPxPerSec: number, decelerationRate = 0.998): number {
       return ((initialVelocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
     }
     ```
   - The PiP Loupe snaps to the nearest corner of `[projectedX, projectedY]`, handing off `releaseVelocity` directly to the X and Y springs so there is zero velocity discontinuity ("brick wall").
4. **Rubber-Banding at Boundaries (`/apple-design` §9)**:
   - Dragging the Split-Screen divider on `/sandbox` or pulling a sheet past its limit applies progressive resistance:
     ```ts
     export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
       return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
     }
     ```
5. **Translucent Chrome & Accessibility Media Queries (`/apple-design` §12 & §14)**:
   - Floating top Story Progress Bar uses `backdrop-filter: blur(20px) saturate(180%)` over `var(--surface-glass)`.
   - Full support for `@media (prefers-reduced-motion: reduce)` (replaces spring travel with `180ms` opacity cross-fade), `@media (prefers-reduced-transparency: reduce)` (solid `var(--surface-1)`), and `@media (prefers-contrast: more)`.

---

## 6. Component Architecture: HeroUI v3 Compound Components + Custom Lit Web Components

### 6.1 HeroUI v3 (`@heroui/react@^3.0.1`) Strict Rules
- **No `<HeroUIProvider>`**: HeroUI v3 is zero-provider on Tailwind CSS v4.
- **Compound Subcomponents Only**: Never use v2 flat props (`<Card title="...">`). Always compose:
  ```tsx
  import { Card, Button, Tabs } from "@heroui/react";

  <Card className="border border-[var(--border-hairline)] bg-[var(--surface-1)] rounded-[12px] p-5">
    <Card.Header className="flex items-center justify-between pb-3">
      <Card.Title className="text-[20px] font-medium text-[var(--foreground)]">
        Escrow milestone vault
      </Card.Title>
      <Card.Description className="font-mono text-[12px] tabular-nums text-[var(--foreground-muted)]">
        ₹1,45,000 · Locked
      </Card.Description>
    </Card.Header>
    <Card.Content className="py-2">
      {/* Deal checklist */}
    </Card.Content>
    <Card.Footer className="pt-4 flex gap-3">
      <Button variant="primary" onPress={handleVerifyVideo}>
        Verify on live video
      </Button>
      <Button variant="danger" onPress={handleRaiseDispute}>
        Raise dispute
      </Button>
    </Card.Footer>
  </Card>
  ```
- **Semantic Variants Only**: `primary` (1 per screen section), `secondary`, `tertiary`, `danger` (for `Raise dispute` / channel freeze), `ghost`, `outline`.
- **Event Handlers**: Always `onPress` (React Aria) instead of `onClick`.

### 6.2 Custom Lit `^3.3.2` Message Cards Inside `<nc-chat-ui-app-provider>` (`packages/nc-lit-cards`)
Registered via `registerMessageType` inside `NCChatUIApplication.initialize({ hooks })` **before** `app.ready()`:
1. **`<nc-bilingual-bubble>` (`type: "x-mudra-bilingual-bubble"`)**: Displays source speech/text, live streaming translated text (`sendGroupChannelStreamMessage`), language pair tag (`Tamil → Hindi`), and extracted JSON deal terms (`Price: ₹1,45,000`, `RPM: 4,800`).
2. **`<nc-escrow-deal-card>` (`type: "x-mudra-escrow-card"`)**: Displays deal title, `tabular-nums` amount in `₹`, 4-state visual stepper, interactive buttons (`Lock Escrow`, `Verify on Live Video`, `Release Funds`, `Raise Dispute`), and the signature `[SYS-VOUCHER · ED25519:...]` footer strip.
3. **`<nc-video-assay-receipt>` (`type: "x-mudra-assay-receipt"`)**: Renders the captured WebRTC inspection frame thumbnail, `onServerCallLogReceived` call duration/ID, Rust 64-bit `pHash`, `rustfft` acoustic check (`4,820 RPM - Pass`), and Gemini Vision serial plate badge.
4. **`<nc-tribunal-verdict-card>` (`type: "x-mudra-tribunal-verdict"`)**: Appears inside frozen channels (`addGroupChannelFreezeList`), streaming the AI Tribunal (`M-04`) evidence comparison and 1-click binding split approval (`88% Seller / 12% Buyer Rebate`).

---

## 7. Iconography, Voice & Tone (`/unslop` §3 & §4)

- **Icons**: Strictly `lucide-react` (and matching SVG paths in Lit cards) at `16px` or `18px` with `1.5px` stroke width, inheriting current text color (`--foreground-secondary` or `--foreground-muted`). **Zero emojis (`🚀`, `✨`, `👋`, `🔒`) anywhere in the interface.**
- **Copy & Tone**:
  - Direct, specific, calm, and factual.
  - Zero exclamation marks (`!`), zero trailing periods on headlines/labels/buttons, zero AI hype buzzwords (*supercharge, seamless, unlock, magic, revolutionize, AI-powered*).
  - Comparisons always name the baseline (`+142 verified MAUs vs yesterday`, `90s median settlement vs 14-day ticket baseline`).

---

## 8. CRED Revamp Overrides

Per [`CRED_REVAMP_BUILD_SPEC.md`](./CRED_REVAMP_BUILD_SPEC.md) §2, the following overrides apply to `apps/web`:

- **Purples**: `--pop-purple: #6a35ff` is **allowed** as a solid brand accent (CRED NeoPOP's signature purple) on CTAs, active tabs, and buyer chat bubbles. **Not allowed**: purple→indigo gradients, neon glow blur > 24px.
- **Uppercase**: Small uppercase tracked labels are **allowed** only via the `.eyebrow` class (`11px`, `0.22em`, `--muted`), max 1 per section, plus `StatusPill` and bottom-bar tab labels. Headlines and body copy use **lowercase-first** styling (`"trade like you trust them."`).
- **Periods in headlines**: **Allowed** on display headlines (`"and nothing less."`).
- **Palette**: The warm ledger palette (`#F9F7F2` / `#C84B20`) is **replaced** by the CRED NeoPOP dark palette in [`CRED_REVAMP_BUILD_SPEC.md`](./CRED_REVAMP_BUILD_SPEC.md) §3 (`--pop-black: #0d0d0d`, `--pop-void: #000000`, `--neo-paccha: #e5fe40`, `--pop-purple: #6a35ff`, `--orange-sunshine: #ff8744`).
- **Typography**: **Outfit** (`500`–`800`, geometric sans) + **Fraunces** (`600`–`700`, optical size `144`, `SOFT 0`, `WONK 0`) + **JetBrains Mono** (`tabular-nums`) + **Noto Sans Devanagari / Tamil**.
- **NeoPOP 3D buttons**: `border-radius: 0`, `1.5px` solid border, `5px 5px 0 0` solid offset shadow (no blur); hover translates `(-1px, -1px)` with `6px 6px 0 0` shadow; active press translates `(5px, 5px)` and collapses shadow to `0 0 0 0`. App cards stay rounded (`20–28px`, velvet inner hairline).
- **Still enforced**:
  1. Line 1 of `apps/web/src/styles/globals.css` keeps the `/* hallmark:v2.0.0 ... */` comment (with `theme: cred-neopop-dark`).
  2. No emoji in UI.
  3. No 3-equal-card feature rows.
  4. No fake ticker marquees.
  5. Tabular numbers (`.num`) on all figures.
  6. HeroUI v3 rules (no provider, compound components, `onPress`).
  7. All 9 existing routes reachable in ≤ 2 clicks.

