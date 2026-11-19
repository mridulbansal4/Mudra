# SAMADHAN — CRED-Grade Revamp: Complete Build Specification

> **Audience: the coding model (Gemini in Antigravity).** Every design decision is already made in this document. Your job is to **implement it exactly**, task by task, in the order given in §14. Do not redesign, do not "improve" copy, colors, spacing, or layout. If something is genuinely unspecified, choose the option most consistent with the rest of this document and leave a `// SPEC-GAP:` comment so a human can review it.

---

## 0. How To Work (read first)

1. Read this whole file once before writing code. Then read `apps/web/src/main.tsx`, `apps/web/src/components/Chrome.tsx`, `apps/web/src/styles/globals.css`, `packages/shared-types/src/index.ts`, `apps/web/src/lib/personas.ts`, `apps/web/src/lib/deal.ts`.
2. Work through §14 tasks **one at a time**. After each task run, from repo root:
   - `pnpm --filter @samadhan/web typecheck`
   - `pnpm --filter @samadhan/web build`
   Both must pass before you start the next task.
3. **Never touch business logic** in `apps/web/src/lib/*` (`api.ts`, `deal.ts`, `session.ts`, `nexconn-boot.ts`, `supabase.ts`, `assay.ts`) or any `services/*` code. This revamp is **presentation only**. Existing routes keep their behavior; they only get re-skinned through tokens.
4. Never put secrets in the browser. Never remove the simulated HD camera fallback in `AssayLoupe.tsx`.
5. Keep files under ~300 lines. Split into components when bigger.
6. Imports: HeroUI v3 (`@heroui/react`) has **no provider**; use compound components (`Card.Header`, `Card.Content`, `Card.Footer`) and `onPress` (never `onClick`) on HeroUI `Button`. For the new custom NeoPOP button (§6.1) use a native `<button>` with `onClick` — that is allowed because it is not a HeroUI component.
7. All numbers (₹ amounts, timers, percentages, RPM, latencies) use the `.num` class (`font-variant-numeric: tabular-nums`).
8. Every animation must respect `prefers-reduced-motion: reduce` (§9.6).

---

## 1. Design Intent (the "why", so you make consistent micro-decisions)

CRED makes paying a credit card bill feel like entering a members-only club: pitch-black canvas, monumental serif headlines in lowercase, tiny uppercase tracked labels, cinematic 3D renders, scroll-scrubbed text that "lights up" word by word, and NeoPOP buttons that are hard-edged blocks with a solid offset shadow that physically "press in".

We apply that to **escrow between strangers**. Emotion to evoke: *"I'm safe here. Nothing can go wrong quietly."* Every visual metaphor is about **vaults, seals, light, and precision**.

Two surface families — this resolves "NeoPOP sharp" vs "round, smooth":

| Surface | Geometry | Where |
| :--- | :--- | :--- |
| **NeoPOP blocks** | `0px` radius, hard offset shadow, press-in animation | Primary CTAs on website, slide-to-pay, freeze button, marketing tags |
| **Velvet cards** | `20–28px` radius, 1px hairline border, no shadow or very soft inner glow | All app screens inside phone frames, website info cards, menus, sheets |

Rule of thumb: **actions are sharp, containers are soft.**

---

## 2. Rule Overrides (explicit owner decision)

The product owner explicitly ordered a CRED look. This **overrides** these items in `CLAUDE.md` / `docs/02-design/DESIGN_SYSTEM.md`:

- Purple is **allowed** as `--pop-purple #6a35ff` (solid fills only — still **no purple→indigo gradients**, no neon glow blur > 24px).
- Small uppercase tracked labels are **allowed** only via the `.eyebrow` class (§4.3), max 1 per section.
- The warm ledger palette is replaced by the dark palette in §3.

Still enforced: line 1 of `globals.css` is a `/* hallmark:v2.0.0 ... */` comment, no emoji in UI, no 3-equal-card feature rows, no fake ticker marquees, tabular nums, HeroUI v3 rules, all 9 old routes reachable in ≤ 2 clicks.

Task T15 updates `DESIGN_SYSTEM.md` with a short "CRED revamp overrides" section stating the above.

---

## 3. Color Tokens

Dark-only. Remove the light palette and the `prefers-color-scheme` block. Set `<html style="color-scheme: dark">` and `<meta name="theme-color" content="#0d0d0d">` in `apps/web/index.html`.

| Token | Hex | Use |
| :--- | :--- | :--- |
| `--pop-black` | `#0d0d0d` | Page canvas |
| `--pop-void` | `#000000` | Hero backdrops, hard shadows, phone bezels |
| `--card` | `#121212` | Default card |
| `--card-2` | `#1a1a1a` | Raised card / list row hover |
| `--card-3` | `#232323` | Icon tiles, inputs |
| `--border` | `#3d3d3d` | Strong borders (NeoPOP edges) |
| `--hairline` | `rgba(255,255,255,0.08)` | Card borders, dividers |
| `--fg` | `#ffffff` | Primary text |
| `--fg-2` | `#c7c7c7` | Secondary text |
| `--muted` | `#8a8a8a` | Tertiary text, labels |
| `--dim` | `#4a4a4a` | Unrevealed words in scroll reveal, disabled |
| `--neo-paccha` | `#e5fe40` | Brand energy, "verified/locked" status, success numbers |
| `--pop-purple` | `#6a35ff` | Primary action fill (website CTA, slide-to-pay) |
| `--orange-sunshine` | `#ff8744` | Warnings, freeze countdown, live indicators |
| `--danger` | `#ff4d4d` | Dispute frozen, errors |
| `--paccha-ink` | `#0d0d0d` | Text on paccha fills |

Semantic mapping (keep existing Tailwind utility names working so old routes re-skin automatically):

```
canvas  -> --pop-black      paper -> --card       well -> --card-3
ink     -> --fg             ink-2 -> --fg-2       ink-3 -> --muted
hair    -> --hairline       seal  -> --pop-purple seal-ink -> #ffffff
vault   -> --neo-paccha     vault-bg -> rgba(229,254,64,0.10)
assay   -> #7cc4ff          freeze -> --orange-sunshine   freeze-bg -> rgba(255,135,68,0.12)
```

HeroUI bridge variables (set in `:root`): `--background:#0d0d0d; --surface:#121212; --foreground:#fff; --accent:#6a35ff; --accent-foreground:#fff; --success:#e5fe40; --danger:#ff4d4d; --border:rgba(255,255,255,0.08); --default:#232323; --default-foreground:#fff; --field-background:#1a1a1a; --field-foreground:#fff; --muted:#8a8a8a;`

Gradients allowed (exact):
- **Mesh canvas** (hero/footer backgrounds): three stacked radial gradients, slowly drifting (§9.5):
  `radial-gradient(60% 50% at 20% 10%, rgba(106,53,255,0.18), transparent 60%), radial-gradient(50% 40% at 85% 30%, rgba(229,254,64,0.07), transparent 60%), radial-gradient(70% 60% at 50% 100%, rgba(255,135,68,0.08), transparent 60%), #0d0d0d`
- **Slab light** (corridor slabs): `linear-gradient(180deg, #2a2a2a 0%, #141414 55%, #0a0a0a 100%)`
- **Warm slab edge** (2 of the corridor slabs): `linear-gradient(180deg, #b07a4a 0%, #5a3a22 60%, #1a120c 100%)`
- **Cool slab edge**: `linear-gradient(180deg, #9fc3d6 0%, #3d5866 60%, #10181c 100%)`

---

## 4. Typography

### 4.1 Fonts (all free; Gilroy is commercial so we use its closest twin)

| Role | Family | Weights | Source |
| :--- | :--- | :--- | :--- |
| Sans (UI + body) — Gilroy substitute | **Outfit** | 400, 500, 600, 700, 800 | Google Fonts |
| Display serif (CRED's big headlines) | **Fraunces** (variable, `opsz` 144, `SOFT` 0, `WONK` 0) | 600, 700 | Google Fonts |
| Indic fallbacks | Noto Sans Devanagari, Noto Sans Tamil | 400, 600 | Google Fonts |
| Mono (hashes, IDs) | JetBrains Mono | 400, 500 | Google Fonts |

Load via one `<link rel="preconnect">` pair + one `<link rel="stylesheet">` in `apps/web/index.html` with `display=swap`. Replace any old Plus Jakarta / Instrument Serif links.

```
--font-sans: "Outfit", "Noto Sans Devanagari", "Noto Sans Tamil", system-ui, sans-serif;
--font-display: "Fraunces", Georgia, serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

`body { font-family: var(--font-sans); font-size: 14px; line-height: 1.6; font-weight: 500; color: var(--fg); background: var(--pop-black); -webkit-font-smoothing: antialiased; }`

### 4.2 Type scale (desktop / mobile ≤ 640px)

| Class | Family | Size | Line-height | Weight | Tracking | Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `.t-mega` | display | `clamp(56px, 8.2vw, 128px)` | 0.98 | 700 | -0.025em | lowercase copy |
| `.t-hero` | display | `clamp(44px, 6vw, 96px)` | 1.0 | 700 | -0.02em | lowercase |
| `.t-h1` | display | `clamp(36px, 4.2vw, 64px)` | 1.05 | 700 | -0.015em | lowercase |
| `.t-h2` | sans | `clamp(24px, 2.4vw, 36px)` | 1.15 | 800 | -0.01em | lowercase |
| `.t-reveal` | sans | `clamp(28px, 3.6vw, 52px)` | 1.22 | 600 | -0.01em | lowercase |
| `.t-lead` | sans | `clamp(15px, 1.25vw, 18px)` | 1.6 | 500 | 0 | sentence/lowercase |
| `.t-body` | sans | 14px | 1.6 | 500 | 0 | sentence |
| `.t-small` | sans | 12.5px | 1.5 | 500 | 0 | sentence |
| `.eyebrow` | sans | 11px desktop / 10px mobile | 1 | 700 | **0.22em** | UPPERCASE |
| `.t-num-xl` | sans | `clamp(40px, 5vw, 72px)` | 1 | 800 | -0.02em | `.num` |

### 4.3 Voice
- Marketing copy is **all lowercase** (CRED voice), short, confident, slightly witty. No exclamation marks.
- App UI copy: lowercase labels ("bills", "deals", "vault"), uppercase only for `.eyebrow` section labels ("YOUR DEALS", "IN ESCROW").
- Use the exact copy from §7 and §8. Do not invent new marketing lines.

---

## 5. Brand: Logo

Original mark — **must not resemble CRED's logo literally**. Concept: **"the seal"** — a faceted shield (pentagon-ish, flat top) with an inner glyph of two interlocking hard chevrons forming an abstract **S**, split by a thin vertical gap (= the escrow "hold" between buyer and seller). Monochrome white on black; paccha variant for favicon.

Create `apps/web/public/brand/samadhan-mark.svg` exactly:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72" fill="none">
  <path d="M6 6h52v34c0 13-11 22-26 28C17 62 6 53 6 40V6z" stroke="currentColor" stroke-width="3.5" stroke-linejoin="miter"/>
  <path d="M6 6l6 6h40l6-6" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" opacity=".55"/>
  <path d="M42 22H24l-6 8 6 8h7" stroke="currentColor" stroke-width="4" stroke-linejoin="miter" stroke-linecap="square"/>
  <path d="M22 50h18l6-8-6-8h-7" stroke="currentColor" stroke-width="4" stroke-linejoin="miter" stroke-linecap="square"/>
</svg>
```

Also create:
- `apps/web/public/brand/favicon.svg`: same paths, `stroke="#e5fe40"` on a `#0d0d0d` rect background (`<rect width="64" height="72" fill="#0d0d0d"/>` first). Set as favicon in `index.html` (replace `/seal.svg` reference; keep `/seal.svg` file in place, it may be used elsewhere).
- React component `apps/web/src/brand/Logo.tsx`:
  - `<LogoMark size={28} />` renders the SVG inline with `currentColor`.
  - `<Logo />` = mark (24px) + wordmark below it, stacked and centered like CRED's: wordmark text `SAMADHAN` in Outfit 800, 11px, tracking 0.28em, uppercase. Variant `layout="row"` places wordmark to the right, 13px.
- Logo intro animation (landing only, once per session via `sessionStorage['logo-intro']`): shield stroke draws in using `stroke-dasharray`/`stroke-dashoffset` over 900ms `cubic-bezier(0.65,0,0.35,1)`, then the two chevrons slide in from left and right (translateX ±8px → 0, 400ms), then the wordmark fades up (opacity 0→1, y 6→0, 300ms).

---

## 6. Components (design system)

Create in `apps/web/src/ui/` (new folder). Each is a small, typed React component.

### 6.1 `NeoButton.tsx` — NeoPOP block button
- Props: `variant: "purple" | "paccha" | "white" | "ghost"`, `size: "md" | "lg"`, `as?: "button" | "link"`, `to?: string`, `icon?: LucideIcon`, `children`.
- Geometry: radius **0**. Height `md 48px` / `lg 60px`. Padding x `24px` / `32px`. Font Outfit 700, `md 14px` / `lg 16px`, lowercase label, tracking `0.01em`.
- Fills: purple `#6a35ff` text white; paccha `#e5fe40` text `#0d0d0d`; white `#fff` text `#0d0d0d`; ghost transparent, 1.5px `#3d3d3d` border, text white.
- **3D edge** (the NeoPOP signature): two pseudo-element "sides" giving depth 5px — right edge and bottom edge, each a darker shade of the fill (purple edges `#3f1fa6` right / `#2e1679` bottom; paccha `#9fb21f` / `#7a8916`; white `#bdbdbd` / `#8f8f8f`; ghost uses `#3d3d3d`). Implement with `box-shadow: 5px 5px 0 0 <bottomShade>` plus a `::after` skewed parallelogram strip on the right (`transform: skewY(45deg)`, width 5px) — or simply use the shadow if the skew looks wrong; the shadow must be **hard** (0 blur).
- Interaction: hover → `translate(-1px,-1px)`, shadow 6px. `:active` (≤ 16ms response, `transition: transform 90ms`) → `translate(5px,5px)`, shadow `0 0 0`. Focus-visible: 2px `#e5fe40` outline offset 4px.
- Optional `icon` renders right of label, lucide, `size 18, strokeWidth 2`. On hover the icon nudges `translateX(3px)`.

### 6.2 `Eyebrow.tsx` — `<p className="eyebrow">` with optional leading 6px square dot in `--neo-paccha`.

### 6.3 `VelvetCard.tsx` — radius 24px, bg `--card`, border 1px `--hairline`, padding 20px; variant `raised` uses `--card-2`; variant `glass` uses `rgba(18,18,18,0.6)` + `backdrop-filter: blur(20px) saturate(140%)`.

### 6.4 `IconTile.tsx` — the CRED app circular icon tile. 64px circle, bg `--card-3` with `inset 0 1px 0 rgba(255,255,255,0.06)` and `0 0 0 1px rgba(255,255,255,0.04)`. Lucide icon 24px, strokeWidth **1.5**, color `#e6e6e6`. Label under it 12px `--fg-2`, lowercase, gap 10px. Press: scale 0.94, 120ms. Optional `badge` (e.g. "₹1,000") as a tiny pill under the circle: bg `#1f2a10`, text `--neo-paccha`, 10px 700, padding 2px 6px, radius 999.

### 6.5 `ListRow.tsx` — CRED "YOUR MONEY" row: height 56px, icon 20px left (strokeWidth 1.5), label 14px 500, value right (`.num`, 15px 700), chevron-right 16px `--muted`. Rows grouped inside a VelvetCard with 1px `--hairline` dividers, radius 20.

### 6.6 `StatusPill.tsx` — radius 999, height 24px, 11px 700, uppercase tracking 0.12em. Tones: `locked` (paccha text on `rgba(229,254,64,0.10)`), `live` (orange text on `rgba(255,135,68,0.12)` + 6px pulsing dot), `frozen` (`#ff4d4d` on `rgba(255,77,77,0.12)`), `neutral` (`--fg-2` on `--card-3`).

### 6.7 `PhoneFrame.tsx` — the device mockup (most important visual)
- Logical screen 390×844. Outer frame adds 12px bezel → 414×868. Outer radius 64px, inner screen radius 52px.
- Bezel: `#0a0a0a`, with `box-shadow: 0 0 0 1.5px #2a2a2a, 0 0 0 3px #111, 0 40px 80px -20px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.05)`.
- Titanium side rim: 1px gradient border `linear-gradient(160deg,#5a5a5a,#1a1a1a 30%,#3a3a3a 60%,#111)`.
- Dynamic island: 120×34 pill, `#000`, centered, top 11px inside screen.
- Status bar (inside screen, height 50px): left time "9:41" (Outfit 600 15px `.num`), right 3 tiny lucide icons (`Signal`, `Wifi`, `BatteryFull` 16px).
- Home indicator: 134×5 pill `rgba(255,255,255,0.55)` bottom 8px.
- Props: `scale?: number` (CSS `transform: scale()` with `transform-origin: top center`; the wrapper reserves scaled height), `tilt?: {x:number,y:number,z:number}` (degrees, for marketing clusters), `children` (the screen content, scrollable vertically with hidden scrollbar), `label?: string` shown 16px above the phone (e.g. "rajesh · buyer · தமிழ்").
- Screen content area: bg `#0d0d0d`, `overflow-y: auto`, `overscroll-behavior: contain`, `scrollbar-width: none`.

### 6.8 `RevealText.tsx` — word-by-word scroll reveal (§9.2).
### 6.9 `CountUp.tsx` — animates a number from 0 to target once in view (900ms, easeOutExpo), `.num`.
### 6.10 `SiteNav.tsx` + `MenuOverlay.tsx` (§7.0).
### 6.11 `FloatingDemoCard.tsx` — CRED's bottom-right "download CRED" card analog (§7.0).

### 6.12 Icons
Add dependency **`lucide-react`**. Global icon style: `strokeWidth={1.5}` in app screens, `2` inside buttons, sizes 16/20/24 only. Never mix icon libraries. Icon mapping:

| Concept | Lucide icon |
| :--- | :--- |
| escrow / vault | `Vault` (fallback `LockKeyhole`) |
| live inspection | `ScanEye` |
| video call | `Video` |
| chat / negotiate | `MessagesSquare` |
| translate | `Languages` |
| freeze / dispute | `Snowflake` |
| verdict / arbitration | `Scale` |
| verified | `BadgeCheck` |
| voucher / receipt | `ReceiptText` |
| shield / privacy | `ShieldCheck` |
| speed / latency | `Gauge` |
| motor RPM | `Fan` |
| frame hash | `ScanLine` |
| pay / UPI | `IndianRupee` |
| scan | `ScanQrCode` |
| home | `House` |
| deals | `Handshake` |
| profile | `UserRound` |
| settings | `Settings2` |
| arena | `Swords` |
| dispatch | `Siren` |
| guide | `BookOpen` |
| traction | `ChartNoAxesColumn` |
| sandbox | `FlaskConical` |
| menu | `Menu`, close `X` |
| arrows | `ArrowRight`, `ArrowUpRight`, `ChevronRight` |

---

## 7. Website — Site Map & Pages

### Routes (update `apps/web/src/main.tsx`)

| Path | Component | Status |
| :--- | :--- | :--- |
| `/` | `routes/Landing.tsx` | **REWRITE** (cinematic landing, §7.1) |
| `/how-it-works` | `routes/HowItWorks.tsx` | **NEW** (§7.2) |
| `/demo` | `routes/Demo.tsx` | **NEW** two-phone app experience (§8) |
| `/demo/phone/:role` | `routes/DemoPhone.tsx` | **NEW** single phone fullscreen for "two separate screens" mode (§8.6) |
| `/auth`, `/onboarding`, `/app`, `/app/deals/:dealId`, `/sandbox`, `/arena`, `/dispatch`, `/guide`, `/traction` | existing | **RESKIN ONLY** via tokens + new `Chrome.tsx` nav |

New routes are lazy-loaded like the others. Landing stays eagerly imported.

### 7.0 Global chrome

**`SiteNav`** (used by Landing, HowItWorks, Demo; and replaces `TopNav` internals in `Chrome.tsx` so old pages get it too):
- Fixed top, height 72px desktop / 60px mobile, full width, padding x 40px / 20px. Background transparent at scrollY < 40; after that `rgba(13,13,13,0.72)` + `backdrop-filter: blur(16px)` + bottom 1px hairline, transition 300ms.
- Left: `<Logo />` stacked variant (mark 24px + "SAMADHAN" 9px under it), links to `/`.
- Right cluster, gap 24px: on desktop show 2 text links `how it works` → `/how-it-works`, `demo` → `/demo` (14px 600, `--fg-2`, hover `--fg`, active route has a 2px paccha underline 6px below); then a thin bordered box like CRED's top-right card: 1px `#3d3d3d` box, height 40px, containing eyebrow text `LIVE ESCROW · 4 LANGUAGES` (9px) — hide below 1024px; then the **menu button**: 40×40 square, 1px `#3d3d3d` border, lucide `Menu` 20px.
- Session-aware: if signed in, show the user's display name (13px `--fg-2`) left of the menu button, linking to `/app`.

**`MenuOverlay`** (opens from menu button; Esc / X closes; focus-trapped; body scroll locked):
- Fullscreen `#0d0d0d` with mesh canvas at 50% opacity. Enters with a clip-path wipe from top-right: `clip-path: circle(0% at calc(100% - 60px) 36px)` → `circle(150% at ...)` over 600ms `cubic-bezier(0.77,0,0.175,1)`.
- Left column (60% width): big serif links, `.t-h1`, stacked, each line staggers in (y 40→0, opacity 0→1, 60ms stagger): `home`, `how it works`, `two-phone demo`, `live sandbox`, `bargain arena`, `dispatch desk`, `sdk guide`, `traction`. Hover: text shifts right 12px and a paccha 10px square appears left of it.
- Right column: Eyebrow `YOUR SEAT`, then if signed out a `NeoButton paccha` "sign in" → `/auth`, and a `ghost` "start onboarding" → `/onboarding`; if signed in show display name + "open my desk" → `/app` + small "sign out" text button (reuse existing `setSession(null)` logic from `Chrome.tsx`).
- Bottom row: `.t-small --muted` "built on nexconn · team chanakya · nexconn build challenge 2026".

**`FloatingDemoCard`** (landing + how-it-works only): fixed bottom 24px right 24px, 1px `#3d3d3d` border, bg `rgba(13,13,13,0.85)` blur 12px, padding 14px 18px, radius 0. Left: a 48×48 decorative 7×7 grid of squares (deterministic pseudo-random pattern from a fixed seed, white/black) as a "QR" glyph; right: text "open the" / "two-phone demo" (13px 600, two lines). Whole card links to `/demo`. Appears after hero scroll (scrollY > 60vh) with fade+slide up; hidden < 640px.

**Footer** (landing + how-it-works): see §7.1 S9.

**Old pages (`Page` in `Chrome.tsx`)**: keep the `Page`, `SectionTitle`, `Banner`, `Stat` exports and signatures. Change visuals only: `Page` → bg `--pop-black`, top padding 96px to clear fixed nav, max-width unchanged. `SectionTitle` → title uses `.t-h1` (Fraunces) lowercase-styled via CSS `text-transform: lowercase` is **not** allowed (content may contain proper nouns) — just switch font to display + size `clamp(32px,3.4vw,48px)`. `Stat` → VelvetCard style, value in `.t-num-xl` scaled to 32px. `Banner` → radius 16, tones mapped to new tokens.

### 7.1 Landing (`/`) — section by section

Global landing layout: full-bleed sections, content max-width 1200px centered, side padding 40px desktop / 20px mobile. Section vertical rhythm: 160px desktop / 96px mobile between sections unless a section is sticky.

**S1 — Hero "the corridor"** (height 100svh, min 720px)
- Background: `--pop-void` + CSS 3D corridor (component `hero/Corridor.tsx`):
  - Container `perspective: 1200px; perspective-origin: 50% 45%`.
  - Two rows of 9 vertical slabs each (left wall and right wall). Each slab: width 90px, height 70vh, the **slab light** gradient, `border-radius: 0 0 0 0`, top edge cut with `clip-path: polygon(0 8%, 100% 0, 100% 100%, 0 100%)` (alternate direction per slab for the "wavy" CRED corridor top). Left wall slabs `transform: translateX(-Npx) rotateY(62deg) translateZ(-k*120px)`, right wall mirrored (`rotateY(-62deg)`). Slabs 3 and 6 on each side use warm/cool edge gradients.
  - Floor: a 200%-wide plane `rotateX(78deg)`, gradient `linear-gradient(180deg, transparent, rgba(255,255,255,0.04) 40%, transparent)`, with 2 faint perspective lines.
  - End-of-corridor glow: a 220×320 rect at center, `radial-gradient(closest-side, rgba(255,255,255,0.22), transparent)`, plus 2 thin vertical light bars (2px wide, white 40%, blur 1px) — this is our "vault door ajar" light.
  - Scroll effect (motion `useScroll` on the hero): as the user scrolls through the first 100vh, the corridor scales 1 → 1.35 and translates Y 0 → -6vh (we "walk in"), the headline fades 1 → 0 and moves y 0 → -60px, the end glow brightens 0.22 → 0.55.
  - Idle effect: slabs very subtly breathe (`translateZ` ±6px, 8s loop, staggered) — disabled under reduced motion.
- Foreground (centered, z above corridor):
  - Logo intro animation (§5) at top-left in nav — not here.
  - Headline `.t-hero`, 2 lines, centered, white: **"trade like you"** / **"trust them."**
  - Subline `.t-lead --fg-2` max-width 440px, centered, 20px below: "samadhan is the members-only escrow room where buyers and sellers inspect live, pay safely and settle disputes in ninety seconds — in their own language."
  - CTA row 36px below, gap 20px, centered: `NeoButton purple lg` "try the two-phone demo" (icon `ArrowRight`) → `/demo`; `NeoButton ghost lg` "how it works" → `/how-it-works`.
  - Headline entrance on load: each line rises from y 30 + blur 8px → 0 with opacity, 900ms, 120ms stagger, ease `cubic-bezier(0.16,1,0.3,1)`; CTA row 300ms after.
  - Bottom center: scroll cue — 1px × 48px line with a paccha 1px × 12px segment travelling down (1.6s loop) and eyebrow `SCROLL` above it.

**S2 — Manifesto reveal (CRED "your data isn't our business")** (sticky scrub, total height 220vh)
- Sticky inner (100vh, centered). Top: `ShieldCheck` icon 36px inside a 64×72 shield outline (reuse LogoMark outer path only, stroke `#fff`), then Eyebrow (no dot, white, centered) **"YOUR DEAL ISN'T OUR BUSINESS. KEEPING IT FAIR IS."**
- Below, `RevealText` `.t-reveal`, centered, max-width 980px: **"every message is scrubbed of aadhaar, pan and upi ids before any model reads it. every escrow voucher is signed and sealed. there's no room for a quiet edit because we didn't leave any."**
- Words start `--dim` (#3a3a3a) and turn `#ffffff` progressively as the 220vh scroll progresses (exact algorithm §9.2). The last 6 words "because we didn't leave any." are additionally bolded to 700 when lit.

**S3 — "all that you're owed. and nothing less."** (normal flow)
- Centered `.t-mega` 2 lines: "all that you're owed." / "and nothing less."
- `.t-lead --fg-2` centered, max-width 520px: "if you're a samadhan member, every rupee you send waits in a sealed vault until the product proves itself on camera. nothing moves until both of you say so."
- Below, 120px gap: **phone cluster** (`hero/PhoneCluster.tsx`), width 1100px, height 720px, relative:
  - Center phone (scale 0.82, tilt `{x:0,y:0,z:0}`) shows **Buyer Home** screen (§8.3 B1).
  - Left-back phone (scale 0.72, left 6%, top 60px, tilt `{x:4,y:28,z:-6}`, `filter: brightness(0.7)`) shows **Deal Chat** (B2) and is drawn behind.
  - Right-back phone (scale 0.72, right 6%, top 120px, tilt `{x:4,y:-28,z:6}`, brightness 0.7) shows **Live Inspection** (S3 seller screen).
  - Far-left/right "back-of-phone" silhouettes (pure CSS: 300×620 rounded rect `#1c1c1e` with a 3-lens camera bump circle cluster top-left; lenses are `radial-gradient(circle, #0a0a0a 40%, #2a2a2a 42%, #111 70%)`), partially hidden behind side phones, at 0.6 scale — evokes CRED's 5-phone render.
  - Scroll effect while S3 is in view (progress 0→1): side phones rotate from their tilt toward ±12deg and spread outward 40px; center phone lifts y 40 → 0. Mouse parallax (desktop only, pointer: fine): cluster rotates ±3deg following pointer, lerped 0.08 per frame.
  - All phones' content is real React (same screens as §8), static data, not interactive here (`pointer-events: none` on screen content, `aria-hidden` on side phones).

**S4 — "four moves. zero leaps of faith." (sticky scrollytelling)** — total height 400vh
- Left column (45%) scrolling text blocks, right column (55%) a **sticky** PhoneFrame (scale 0.9, vertically centered, top: calc(50vh - phoneHeight/2)).
- Section intro (above the sticky area): Eyebrow `HOW A DEAL FLOWS`, `.t-h1` "four moves." / "zero leaps of faith."
- 4 steps, each block min-height 100vh, content vertically centered; an active step = the one whose center is nearest viewport center (IntersectionObserver with `rootMargin: "-45% 0px -45% 0px"`):
  1. Number `01` (`.t-num-xl`, `--dim`, becomes paccha when active) · title `.t-h2` "talk in your language." · body `.t-lead --fg-2` "rajesh types tamil, vikram reads hindi. every bubble shows the original and the translation, side by side." · chip row: `Languages` "4 languages", `ShieldCheck` "pii scrubbed".
  2. `02` · "lock it in escrow." · "one swipe moves ₹1,45,000 into a sealed vault. the seller sees it's real; nobody can touch it." · chips: `Vault` "upi mandate", `Gauge` "< 1.2 ms state change".
  3. `03` · "inspect it live." · "the seller shows the machine on video. we fingerprint every frame and listen to the motor — 4,820 rpm, as promised." · chips: `ScanLine` "frame hash", `Fan` "acoustic rpm".
  4. `04` · "freeze, don't fight." · "if something's off, one tap freezes the deal for ninety seconds and an arbitrator settles it, with a signed verdict." · chips: `Snowflake` "90 s freeze", `Scale` "signed verdict".
- Inactive step text opacity 0.25; active 1; transition 400ms.
- The sticky phone crossfades + slides (y 24 → 0, 450ms) between screens: step1 → B2 Deal Chat, step2 → B3 Escrow Lock (with the slide-to-pay knob auto-animating to the end while active), step3 → B4 Live Inspection, step4 → B6 Freeze.
- A thin progress rail on the far left of the section (2px, height 60vh, `--dim`) fills with paccha according to step progress.
- Mobile (< 900px): not sticky; each step renders its text then its phone (scale 0.7) inline.

**S5 — "every rupee, accounted for." (glass spheres)** (height 140vh, sticky inner 100vh)
- Background: `--pop-void`. Component `hero/GlassSpheres.tsx`: 9 spheres absolutely positioned (sizes 140–360px, fixed positions listed in a const array so layout is deterministic). Each sphere: `border-radius:50%`, background `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.10) 100%)`, `box-shadow: inset -20px -30px 60px rgba(0,0,0,0.6), inset 10px 10px 30px rgba(255,255,255,0.08), 0 30px 60px rgba(0,0,0,0.5)`, `backdrop-filter: blur(2px)`. Inside each sphere, centered, one lucide icon at 38% of sphere size, strokeWidth 1, color `rgba(229,254,64,0.55)` for 3 spheres and `rgba(255,255,255,0.35)` for the rest (icons: `Vault`, `ScanEye`, `Fan`, `Languages`, `Scale`, `ReceiptText`, `IndianRupee`, `Snowflake`, `BadgeCheck`).
- Motion: each sphere floats (y ±14px, x ±6px, 7–11s, ease-in-out, different delays). On scroll through the section spheres drift with parallax factor by size (bigger = faster, translateY up to -120px).
- Foreground centered: `.t-mega` "every rupee," / "accounted for." then `.t-lead` "unlock instant settlement, signed receipts, and a referee who shows up in ninety seconds."
- Under it (64px gap), a **stat strip** (NOT 3 equal cards — a single horizontal row with hairline separators, 4 items, left-aligned within each cell): `CountUp` values with units in smaller weight:
  - `1.2` `ms` — "p99 escrow state change"
  - `300` `µs` — "pii scrub before any ai call"
  - `90` `s` — "freeze-to-verdict window"
  - `4` — "indian languages, live"
  Value `.t-num-xl` white, unit 20px `--muted`, caption `.t-small --muted`.

**S6 — "do more with every deal" (horizontal feature rail)** — CRED's "do more with your credit cards" equivalent
- Left-aligned `.t-h1` "do more with" / "every deal".
- Below, a horizontally scrolling rail driven by vertical scroll (sticky section, height 300vh; inner track translateX from 0 to -(trackWidth - viewport) as progress 0→1). 5 tall VelvetCards (width 380px, height 520px, gap 24px, radius 28):
  1. "bargain arena" — `Swords` — "haggle against an ai seller trained on real mandi prices." → `/arena`
  2. "live sandbox" — `FlaskConical` — "a real split-screen deal, wired to the actual escrow engine." → `/sandbox`
  3. "dispatch desk" — `Siren` — "where arbitrators catch frozen deals and rule in ninety seconds." → `/dispatch`
  4. "sdk guide" — `BookOpen` — "how we used every nexconn channel type, with code." → `/guide`
  5. "traction" — `ChartNoAxesColumn` — "real numbers from real test deals." → `/traction`
  Card anatomy: top 60% a visual area with a large icon (96px, strokeWidth 1) on a card-specific dark mesh (each card gets one tinted radial: purple/paccha/orange/cool-blue/white at 10–16% alpha); bottom: title `.t-h2`, body `.t-body --fg-2`, and a `ArrowUpRight` 20px in a 40px circle bottom-right that rotates 45deg on card hover. Card hover: translateY -6px, border brightens to `rgba(255,255,255,0.16)`.
- Mobile: native horizontal scroll with `scroll-snap-type: x mandatory`, no sticky.

**S7 — "two people. two screens. one truth." (two-phone teaser)**
- Split layout: left text, right two phones (scale 0.62 each, overlapping by 40px, buyer phone tilted y +8deg, seller y -8deg), with a thin animated paccha "sync line" between them: an SVG path arc from buyer screen to seller screen with a dash travelling along it (`stroke-dasharray 6 10`, offset animation 1.2s linear infinite).
- Phones show a looping mini-sequence (every 2.4s): buyer sends message → bubble appears on seller phone translated. Reuse `demo/` screens with a tiny local timer.
- Text: Eyebrow `SEE IT FROM BOTH SIDES`, `.t-h1` "two people." / "two screens." / "one truth.", `.t-lead` "watch rajesh in tirupur and vikram in ludhiana close a ₹1.45 lakh deal — each in their own language, each on their own phone.", `NeoButton paccha lg` "open the two-phone demo" → `/demo`.

**S8 — Trust band**
- Single row, centered, `.t-small --muted` eyebrow `BUILT ON`, then wordmark-style text items separated by 6px dots: "nexconn chat", "nexconn call", "go escrow engine", "rust assay verifier", "gemini", "bhashini". Text 16px 600 `--fg-2`. Static (no marquee).

**S9 — Footer "built for the trustworthy."**
- Mesh canvas background, padding 160px top / 48px bottom.
- `.t-mega` centered "built for the" / "trustworthy."
- CTA `NeoButton white lg` "start a deal" → `/onboarding`.
- 96px below, a 4-column link grid (left aligned, columns: `PRODUCT` [how it works, two-phone demo, live sandbox], `EXPLORE` [bargain arena, dispatch desk, traction], `BUILD` [sdk guide], `ACCOUNT` [sign in, onboarding, my desk]). Column headers `.eyebrow --muted`, links 14px `--fg-2`.
- Bottom bar: LogoMark 20px + "samadhan · samvaddeal" left; right `.t-small --muted` "© 2026 team chanakya. escrow simulated in demo mode."

### 7.2 How It Works (`/how-it-works`)

Purpose: the detailed explainer the landing only teases. Same nav/footer/floating card.

1. **Intro** (80vh): Eyebrow `HOW IT WORKS`, `.t-hero` "the anatomy" / "of a safe deal.", `.t-lead` "eight states, two phones, one sealed vault. here is every step, and what protects you at each one."
2. **State rail (sticky top under nav)**: horizontal row of the 8 FSM states from `FSM_STATES` (import from `@samadhan/shared-types`), labels lowercase with underscores→spaces ("created", "funded", "inspection live", "assay verified", "released", "disputed frozen", "arbitrated split", "refunded"). Happy-path states (first 5) on one line; dispute branch (last 3) rendered as a branch below "funded…assay verified" connected with an angled 1px line. Current state (driven by scroll section) = paccha filled square + white text; past = white 40%; future = `--dim`.
3. **Chapters** (one per happy-path state + one for dispute; each ~120vh, alternating text left/phone right and phone left/text right): for each, Eyebrow with state name, `.t-h1` headline, 2–3 sentence `.t-lead`, a "what protects you" list of 3 rows (lucide icon 20px + 14px text, hairline dividers), and a PhoneFrame (scale 0.75) showing both perspectives via a small toggle above the phone: segmented control `buyer | seller` (radius 999, bg `--card-3`, active segment white bg black text, 200ms slide).
   - created — "a deal, not a dm." — screens B2 / S2
   - funded — "money that waits." — screens B3 / S2-funded
   - inspection live — "the product testifies." — B4 / S3
   - assay verified — "proof, signed." — B5 / S4
   - released — "done. both of you said so." — B5-released / S5
   - disputed → arbitrated / refunded — "freeze, don't fight." — B6 / S6, plus a third tab `arbitrator` showing A1.
   Copy for "what protects you" rows (use exactly; 3 per chapter, in order):
   - created: "pii scrubbed before translation" · "every message translated, original kept" · "deal terms pinned to the chat"
   - funded: "upi mandate, not a transfer" · "idempotent — a double tap can't double pay" · "version-locked state change"
   - inspection live: "64-bit frame fingerprint" · "motor rpm from audio" · "simulated camera if yours is off"
   - assay verified: "ed25519-signed receipt" · "receipt posted as a system message" · "nobody can edit it later"
   - released: "both parties confirm" · "funds release in one state change" · "full audit trail"
   - dispute: "one tap freezes the channel" · "90-second arbitrator window" · "signed verdict: split or refund"
4. **Architecture strip** (simple, not a diagram library): three horizontal "lanes" as VelvetCards in one row is banned (3-equal-card) — instead a **single wide card** with a left-to-right flow: `browser / phone` → `nexconn bridge (node)` → `deal engine (go)` → `assay verifier (rust)`, each a 12px-radius node with icon + 2-word label, connected by 1px lines with a moving paccha dot. Under each node a `.t-small --muted` one-liner (chat & calls / ai + nexconn sdk / escrow state machine / pii, hashes, signatures).
5. **CTA band**: `.t-h1` "seen enough?" + `NeoButton purple lg` "watch both phones" → `/demo` + ghost "run the live sandbox" → `/sandbox`.

---

## 8. The App UI (phones) and the Two-Phone Demo (`/demo`)

This is the future mobile app, rendered now on a laptop inside `PhoneFrame`s. Build screens as plain React components in `apps/web/src/demo/screens/` so they can later be ported to `apps/mobile-expo`. Screens must not call the backend — they render from a **demo store** (§8.5).

### 8.1 Cast & deal (use exactly — matches `lib/personas.ts`)
- Buyer: **Rajesh Natarajan**, Tirupur, Tamil (`ta-IN`), avatar initials "RN" on a `#2b2b2b` circle with a 2px ring gradient `conic-gradient(#e5fe40, #6a35ff, #ff8744, #e5fe40)` (like CRED's avatar in the bottom bar).
- Seller: **Vikramjeet Singh**, Ludhiana, Hindi (`hi-IN`), initials "VS".
- Arbitrator: **Meera Krishnan** (`en-IN`), initials "MK".
- Item: **Juki MO-6814S industrial overlock machine**, ₹1,45,000, claim "motor runs at 4,800 rpm", 6-month warranty.
- Deal id shown as `SD-2611-0042` (mono).

### 8.2 App shell (inside every phone)
- Screen bg `#0d0d0d`. Top app bar (below status bar, height 56px, padding x 20px): left the LogoMark 22px; center (optional) a pill like CRED's "+10 offers" pill: `rgba(255,255,255,0.06)` bg, 1px hairline, radius 999, height 34px, containing 3 overlapping 22px circles (avatars of counterparties) + text "2 live deals" 12px 600; right `Settings2` 22px with a 6px orange notification dot.
- A grab-handle line (36×4, `#3d3d3d`, radius 2) at top of the main sheet, as in CRED home.
- **Bottom bar** (height 96px incl. safe area, bg `linear-gradient(180deg, rgba(13,13,13,0), #0d0d0d 30%)`): three items — left "scan to pay" (`ScanQrCode` in a 56px circle with 1.5px `#3d3d3d` ring), center the user's avatar 68px with the conic ring + name below in uppercase eyebrow (e.g. "RAJESH"), right "deals" (`Handshake` in 56px ring circle). Labels 10px 700 tracking 0.14em uppercase `--fg-2`. The center avatar has a tiny 18px circle badge bottom-left with `ArrowUpRight` 12px (like CRED).
- Screen transitions inside a phone: push = new screen slides from x 100% → 0 with the previous moving to -25% and dimming to 0.6, 420ms `cubic-bezier(0.32,0.72,0,1)`; sheets rise from bottom with a critically-damped spring (`APPLE_SPRINGS.smooth` → use motion `transition={{type:"spring", bounce:0, duration:0.45}}`).

### 8.3 Buyer screens (Rajesh)

**B1 Home** (CRED home layout):
- Eyebrow `YOUR DEALS`; VelvetCard list of ListRows: `Vault` "in escrow" → `₹1,45,000` with `›`; `Handshake` "live deals" → `2` ; `ReceiptText` "signed receipts" → `14`. One row shows an inline green delta like CRED's "+₹820": in-escrow row has a small `+₹1,45,000` paccha 12px text left of the value when the deal is funded.
- Eyebrow `EXPLORE SAMADHAN` (margin-top 32px), then a 4-column grid of IconTiles: "deals" `Handshake`, "inspect" `ScanEye`, "vault" `Vault`, "receipts" `ReceiptText`; second row: a **wide pill tile** spanning 2 columns (like CRED's "win rewards" slot-machine tile: radius 999, height 64, bg `--card-3`, containing 3 small glyphs `IndianRupee`, `BadgeCheck`, `Scale` in 40px circles) labelled "trust score", then IconTile "refer" `Gift` with badge "₹1,000", then IconTile "more" `LayoutGrid`.
- Eyebrow `ACTIVE DEAL`: a VelvetCard "deal card": item name 15px 700, seller "vikramjeet singh · ludhiana" 12px `--muted`, amount `.num` 28px 800, StatusPill reflecting the current FSM state, and a 4-segment progress (4 thin bars, gap 4px, filled paccha up to `storyStage(state)` from shared-types). Tap → B2.

**B2 Deal Chat**:
- Header: back `ChevronLeft`, counterparty avatar 36px + name 15px 700 + subline "speaks हिन्दी · you see தமிழ்" 11px `--muted`; right icons `Video` and `Snowflake` (22px, the snowflake tinted orange).
- Pinned deal strip under header (VelvetCard radius 16, padding 12): item + `₹1,45,000` + StatusPill.
- Messages: **bilingual bubbles**. Own bubble right-aligned, bg `#6a35ff`, white text, radius `20 20 6 20`; other bubble left, bg `--card-2`, radius `20 20 20 6`. Each bubble: primary line = text in the **viewer's** language (15px 500), and under a 1px `rgba(255,255,255,0.12)` divider, the original in sender's language (12px, 70% opacity) with a tiny `Languages` 12px icon. Max width 78%.
- Escrow system card in-stream (center, full width, radius 20, 1px `rgba(229,254,64,0.25)` border, bg `rgba(229,254,64,0.04)`): `Vault` icon, "₹1,45,000 sealed in escrow", mono voucher hash `9f3a…c21e`, `BadgeCheck` "signed".
- Composer: rounded field (radius 999, bg `--card-3`, height 48) "type in தமிழ்…", left `Languages`, right a 40px circle paccha send button with `ArrowUp` black. Above composer, quick-reply chips (radius 999, 1px hairline) from `QUICK_PHRASES` in `lib/deal.ts` (import it).
- Primary CTA when state = CREATED: a docked NeoButton purple full-width "lock ₹1,45,000 in escrow" → opens B3.

**B3 Escrow Lock (bottom sheet)**:
- Sheet radius 28 top corners, bg `#121212`, grab handle. Eyebrow `CONFIRM ESCROW`, amount `.num` 44px 800 centered, below "to vikramjeet singh · released only after you approve" 12px `--muted`.
- Breakdown ListRows: "item" ₹1,45,000; "escrow fee" ₹0 (paccha "waived"); "upi mandate" `samadhan.demo@okaxis` (mono, 12px).
- **Slide-to-lock** (NeoPOP): track 100% × 64px, radius 0, bg `#1a1a1a`, 1.5px `#3d3d3d` border, label "slide to lock" centered `--muted` with a shimmer (a 30%-wide white 12% gradient sweeping L→R every 2.2s). Knob 64×64 paccha square with `ChevronsRight` black 24px and hard shadow `4px 4px 0 #000`. Drag with pointer capture; release past 85% → snaps to end (spring, no bounce), track fills paccha behind the knob, label becomes "locked" black, haptic-like flash (track brightness 1.2 for 120ms); else springs back. Under reduced motion, provide a "lock now" NeoButton fallback.
- Success state: sheet content morphs to a big `Vault` icon (64px) inside a 120px circle with a paccha ring that draws 0→360deg (stroke-dashoffset, 700ms), text "sealed." `.t-h1` 40px, subline "vikram can now start the live inspection." Auto-dismiss after 1.6s.

**B4 Live Inspection (buyer view)**:
- Fullscreen dark video area (top 62%): use the existing simulated HD stream approach — render a `<canvas>` or a CSS-animated placeholder: dark gradient with a slowly rotating machine silhouette (a simple SVG of a sewing-machine-like outline, stroke `rgba(255,255,255,0.35)`), film grain overlay (tiny SVG noise at 6% opacity), and scanlines. Top-left `StatusPill live` "LIVE · 02:14" (timer increments, `.num`). Top-right a small self-view PiP 96×128 radius 16 (draggable with pointer capture, snaps to nearest corner — reuse `projectMomentum` from `lib/apple-physics.ts`).
- Overlay HUD: a scanning bracket (4 corner L-marks, 1.5px paccha) around the machine that gently pulses; when "frame matched" event fires, brackets flash and a chip "frame match 96%" appears.
- Bottom panel (VelvetCard radius 28 top, bg `#121212`): two meters side by side (NOT cards — two columns separated by hairline):
  - **frame fingerprint**: `ScanLine` + "frame match" + `.num` 32px "96%" + tiny 8-bar sparkline.
  - **motor rpm**: `Fan` (spins at speed proportional to rpm via CSS animation duration) + "motor" + `.num` 32px "4,820" + "claimed 4,800 · ±0.4%" 11px paccha.
- Actions row: `NeoButton paccha` "looks right — verify" (full width) and a 56px square ghost button with `Snowflake` (orange icon) for dispute.

**B5 Verified / Released**:
- Center receipt card (radius 28, bg `#121212`, 1px hairline, top edge has a perforated look: a row of 10px half-circles cut via radial-gradient mask). Contents: `BadgeCheck` 40px paccha, "assay verified", item, `₹1,45,000`, rows "frame match 96%", "motor 4,820 rpm", "signed by samadhan verifier", mono signature `ed25519 · 4be1…09af`, `.t-small` timestamp.
- CTA NeoButton purple "release ₹1,45,000 to vikram". After release: receipt stamps "released" (a rotated -8deg 2px paccha bordered rectangle stamp "RELEASED" scales 1.4 → 1 with opacity, 300ms, like a seal hitting paper) and confetti is **not** used — instead 12 thin paccha lines burst radially from the stamp (scaleX 0→1→0, 500ms).

**B6 Dispute Freeze**:
- Whole screen tints: a 1px orange inner border around the screen + top banner "deal frozen" with `Snowflake`.
- Center: a **90-second countdown ring** 220px: track `#232323` 10px, progress stroke orange `#ff8744`, butt caps (sharp). Number `.num` 64px 800 in center ("87"), label "seconds to verdict" 12px `--muted`. Ring depletes linearly per second.
- Below: "meera krishnan is reviewing" with avatar, typing-dots animation; "evidence attached" list: frame snapshots row (3 small 56×56 radius 12 dark thumbs), rpm log chip.
- When verdict arrives → **B7 Verdict** sheet: `Scale` icon, "split 70 / 30" `.t-h1`, two bars (buyer refund ₹43,500 / seller ₹1,01,500 — compute 30%/70% of 1,45,000), signed hash line, NeoButton white "accept verdict".

### 8.4 Seller screens (Vikram) and Arbitrator

- **S1 Home**: same shell as B1 with seller data: Eyebrow `YOUR SALES`, rows "awaiting escrow" ₹0 → after funding "in escrow for you" ₹1,45,000, "payouts this month" ₹6,80,000, "rating" 4.9. Explore tiles: "go live" `Video`, "listings" `LayoutGrid`, "payouts" `IndianRupee`, "receipts" `ReceiptText`.
- **S2 Deal Chat**: identical structure to B2 but mirrored perspective: viewer language Hindi, his bubbles purple on the right, Rajesh's on the left showing Hindi primary + Tamil original. When the deal is FUNDED a paccha system card "₹1,45,000 is sealed for you. start the live inspection to get paid." with NeoButton paccha "go live" → S3.
- **S3 Live Inspection (seller view)**: camera view is "his own camera" (same simulated stream but brighter and mirrored text overlay "you're live to rajesh"), a checklist card on bottom: "show serial number", "run motor 10 s", "show stitching sample" — each row a 22px rounded-square checkbox that ticks with a stroke-draw animation as the scripted demo progresses; HUD shows the same live rpm.
- **S4 Awaiting Release**: big ring-clock icon, "verified. waiting for rajesh to release." + the receipt mini-card.
- **S5 Paid**: amount counts up `₹0 → ₹1,45,000` in paccha `.t-num-xl`, "paid out to your bank" subline, `BadgeCheck`.
- **S6 Frozen**: same freeze ring as B6, copy "rajesh raised a dispute. explain your side in 90 seconds." with a voice-note button (56px circle, `Mic`).
- **A1 Arbitrator (Meera)** (only shown in how-it-works dispute tab and an optional third phone in /demo): list of evidence, two big options as NeoButtons: white "split 70 / 30", ghost "refund buyer", the same countdown ring at 120px top-right.

### 8.5 Demo store & script (`apps/web/src/demo/store.ts`)

- A tiny external store (no new state library): `createDemoStore()` returning `{ getState, subscribe, dispatch }`, consumed with React's `useSyncExternalStore`.
- State: `{ fsm: FsmState; step: number; messages: DemoMessage[]; buyerScreen: ScreenId; sellerScreen: ScreenId; arbiterScreen: ScreenId; rpm: number; frameMatch: number; freezeLeft: number; liveSeconds: number; verdict?: {buyerPct:number; sellerPct:number}; branch: "happy" | "dispute"; playing: boolean }`.
- FSM moves must use `TRANSITIONS` from `@samadhan/shared-types` (reject invalid actions — same truth as the Go engine).
- `DemoMessage = { id; from: "buyer"|"seller"|"system"; ta: string; hi: string; en: string; kind: "text"|"escrow"|"receipt"|"verdict" }`.
- **Script** (array of timed steps, default 2.2s apart, each step is a pure reducer action):
  1. buyer home → buyer opens chat (buyerScreen B2); seller on S1 gets a toast "rajesh started a deal".
  2. buyer message: ta "நான் ₹1,45,000-க்கு வாங்க தயார், மோட்டார் 4800 RPM சோதனை தேவை" / hi "मैं ₹1,45,000 में खरीदने को तैयार हूँ, मोटर का 4800 RPM टेस्ट चाहिए" / en "I'm ready to buy at ₹1,45,000, need a 4800 RPM motor test". Seller phone: typing indicator 800ms, then bubble appears (Hindi primary).
  3. seller reply: hi "₹1,45,000 ठीक है, मैं लाइव वीडियो पर सीरियल नंबर दिखा दूँगा" / ta "₹1,45,000 சரி, லைவ் வீடியோவில் சீரியல் நம்பரைக் காட்டுகிறேன்" / en "₹1,45,000 works, I'll show the serial number on live video".
  4. buyer opens B3 sheet, slide-to-lock animates → `LOCK_ESCROW` (CREATED→FUNDED); escrow system message in both chats; seller home value flips to ₹1,45,000 with a paccha flash.
  5. seller taps "go live" → `START_ASSAY` (→INSPECTION_LIVE); seller S3, buyer B4 (incoming-call style transition: buyer screen shows a 1s "vikram is live — join" full-screen with pulsing `Video` before entering B4).
  6. rpm ramps 0 → 4,820 over 3s (both phones in sync); frameMatch ramps 0 → 96; checklist items tick on seller screen.
  7. **Branch point**: default `happy` → buyer taps verify → `MARK_ASSAY_VERIFIED`; B5 / S4.
  8. buyer releases → `RELEASE_FUNDS` (→RELEASED); stamp animation; seller S5 count-up.
  - `dispute` branch instead at step 7: buyer taps snowflake → `RAISE_DISPUTE` (→DISPUTED_FROZEN); both phones B6/S6 with a shared ticking `freezeLeft` 90→0 (demo runs it at 6× speed: 1 tick per ~166ms, but displays real seconds); at 72 left, arbitrator verdict → `RESOLVE_SPLIT` (→ARBITRATED_SPLIT), B7 on buyer, seller sees same verdict sheet.
- Every state change also pushes an entry to an **event log** (`{t, actor, action, from, to}`) used by the control panel.

### 8.6 `/demo` page layout (laptop)

- Uses SiteNav (no floating card). Background: mesh canvas, very dark.
- Header row (max-width 1400px, padding top 104px): left Eyebrow `TWO-PHONE DEMO` + `.t-h1` "one deal, seen from both sides."; right: segmented control `happy path | dispute` (sets branch, restarts) and a NeoButton white md "replay" (`RotateCcw`) and a ghost md "pop out phones" (`ExternalLink`).
- **Stage** (centered, gap 120px between phones, height ≈ phone height):
  - Left: PhoneFrame label "rajesh · buyer · தமிழ்" with buyer screens.
  - Center column (240px wide) between phones: the **sync spine** — a vertical list of the 8 FSM states (small, 12px), current state lit paccha; between phones an animated SVG "packet" travels horizontally from the acting phone to the other each time a message or state change occurs (a 10px paccha square with a 40px fading trail, 600ms, ease-in-out). Under the spine, the latest event log line in mono 11px `--muted` (e.g. `LOCK_ESCROW · created → funded · 0.9 ms`).
  - Right: PhoneFrame label "vikram · seller · हिन्दी".
  - Phones scale to fit viewport height: `scale = min(1, (100vh - 220px) / 868)`; below 1100px width the phones stack vertically with the spine becoming a horizontal strip.
  - When the dispute branch reaches the verdict, an optional third smaller phone for Meera slides up from the bottom center (scale 0.55) for 3s, showing A1 choosing "split", then slides away.
- **Control dock** (fixed bottom center, VelvetCard glass, radius 999, height 56, padding 6): buttons `SkipBack`, `Play`/`Pause` (toggles autoplay), `SkipForward` (next step), a step counter `.num` "4 / 8", and speed toggle `1× | 2×`. Keyboard: Space = play/pause, → = next, ← = previous (rebuild state by replaying steps 0..n-1 — store must be deterministic).
- Manual interaction: the user can also **tap the real buttons inside the phones** (send quick phrase, slide to lock, go live, verify, freeze); doing so dispatches the same actions and pauses autoplay.
- **Pop-out mode** ("two people on different screens"): "pop out phones" opens `/demo/phone/buyer` and `/demo/phone/seller` in two new windows (`window.open` with width 460, height 920). The demo store syncs across windows via `BroadcastChannel("samadhan-demo")`: every dispatched action is broadcast; receivers apply it (dedupe by action id). `DemoPhone.tsx` renders one PhoneFrame centered on black at scale-to-fit, plus a tiny top-left chip "connected · seeing rajesh's phone". This lets the user put two browser windows (or two laptops on the same browser profile — note in UI: "same browser only") side by side.

### 8.7 App motion rules
- Taps: scale 0.97, 90ms in / 160ms out.
- Lists appear with 40ms stagger, y 8 → 0, opacity.
- New chat bubble: from y 12 scale 0.96 → 1, 280ms spring no-bounce; for incoming, a 300ms typing indicator first (3 dots, 4px, opacity wave).
- Numbers that change (rpm, amounts, countdown) tween, never jump (except the countdown which ticks per second with a 120ms vertical slot-roll per digit: old digit slides up and out, new slides in from below).
- No springs with bounce except the PiP fling release (`APPLE_SPRINGS.bouncy`).

---

## 9. Motion Implementation

Add dependency **`motion`** (motion.dev; import from `"motion/react"`). Use it for scroll-linked values, entrances, and layout transitions. Use plain CSS keyframes for infinite ambient loops (cheaper).

### 9.1 Shared hooks (`apps/web/src/motion/`)
- `useReducedMotion()` — re-export from motion.
- `useSectionProgress(ref, offset = ["start start","end end"])` → `MotionValue<number>` 0..1 using `useScroll({ target: ref, offset })`.
- `ease` constants: `expoOut = [0.16,1,0.3,1]`, `inOut = [0.77,0,0.175,1]`, `ios = [0.32,0.72,0,1]`.

### 9.2 `RevealText` algorithm
- Split text by spaces into words; render each as `<span class="rw">` with a trailing space. Keep the full sentence in an `aria-label` on the container and mark spans `aria-hidden`, so screen readers read it once.
- Given section progress `p` (0..1) with a lead-in: effective `q = clamp((p - 0.1) / 0.75, 0, 1)`. Word `i` of `n` has lit amount `w = clamp(q * n - i, 0, 1)`. Color = mix(`#3a3a3a`, `#ffffff`, w) — implement via `opacity` on a white word layered over a dim copy, or via motion `useTransform` per word to `color`. Avoid per-frame React re-renders: use motion values bound to `style`.
- Reduced motion: all words white immediately.

### 9.3 Entrances
- `FadeUp` wrapper: `initial {opacity:0, y:24}` → `whileInView {opacity:1, y:0}`, `viewport {once:true, margin:"-10% 0px"}`, 700ms expoOut. Used for every non-sticky block.

### 9.4 Sticky sections
- Implement with an outer `div` of the specified height (e.g. `h-[220vh]`) and an inner `div` `sticky top-0 h-svh`. Never use JS scroll listeners for positioning; only motion `useScroll`.

### 9.5 Ambient loops (CSS)
- `@keyframes mesh-drift` — background-position shifts over 24s alternate infinite.
- `@keyframes float-a/b/c` — sphere floats.
- `@keyframes scan-cue`, `@keyframes shimmer`, `@keyframes spin-fan`, `@keyframes dot-wave`, `@keyframes pulse-dot`.

### 9.6 Reduced motion (global CSS)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
}
```
Plus in JS: when reduced, skip scroll-scrub transforms (render final state), skip logo intro, autoplay demo still works (state changes are instant).

### 9.7 Performance
- Animate only `transform`, `opacity`, `filter` (filter sparingly), `clip-path`. No animating `width/height/top/left/box-shadow` in loops.
- `will-change: transform` only on the corridor container, sphere layer, sticky phone, and horizontal rail track.
- Lazy-mount S5 spheres and S6 rail until within 1 viewport (IntersectionObserver).
- Landing must hold 60fps on a mid laptop; Lighthouse performance ≥ 85 desktop.

---

## 10. Layout, Spacing & Responsive

- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 120, 160. Use only these.
- Container: `max-w-[1200px] mx-auto px-5 md:px-10` (landing), `max-w-[1400px]` (`/demo`).
- Breakpoints: Tailwind defaults; key layout changes at `md` 768 and `lg` 1024 and the custom 900/1100 noted in sections.
- Text alignment: hero/manifesto/mega sections centered; scrollytelling and footer left-aligned. Never center long paragraphs > 3 lines except the manifesto reveal.
- Touch targets ≥ 44px. Mobile nav: only logo + menu button.

---

## 11. Accessibility & Web Interface Guidelines (apply all)

- One `<h1>` per page (landing: hero headline). Section headings `<h2>`, card titles `<h3>`.
- Visible focus on every interactive element (`:focus-visible` 2px paccha outline, offset 3px; on paccha fills use white outline).
- Links are `<a>`/`<Link>`, actions are `<button>`. No `div` click handlers.
- Phone mockups on marketing pages: wrap in `role="img"` with `aria-label` describing the screen; interactive phones on `/demo` are real controls.
- Menu overlay: `role="dialog" aria-modal="true"`, focus trap, Esc closes, return focus to menu button.
- Color contrast: text on `#0d0d0d` is never darker than `#8a8a8a` (≈ 5.9:1, passes WCAG AA). `--dim` is decorative only (unrevealed words); their final state is white.
- `lang` attributes on Tamil/Hindi text spans (`lang="ta"`, `lang="hi"`).
- Respect `prefers-reduced-motion` (§9.6). Don't autoplay the `/demo` with motion if reduced — still advance state.
- URL reflects state where useful: `/demo?branch=dispute&step=5` (read on load, update with `replace`).
- `<title>` per route: "samadhan — trade like you trust them", "how it works — samadhan", "two-phone demo — samadhan".
- Images/SVG decorative → `aria-hidden="true"`.
- No layout shift: phones reserve their scaled box; fonts use `display=swap` with fallback metrics close enough (set `size-adjust` not required).

---

## 12. File Change List

**New**
```
apps/web/public/brand/samadhan-mark.svg
apps/web/public/brand/favicon.svg
apps/web/src/brand/Logo.tsx
apps/web/src/ui/NeoButton.tsx
apps/web/src/ui/Eyebrow.tsx
apps/web/src/ui/VelvetCard.tsx
apps/web/src/ui/IconTile.tsx
apps/web/src/ui/ListRow.tsx
apps/web/src/ui/StatusPill.tsx
apps/web/src/ui/PhoneFrame.tsx
apps/web/src/ui/RevealText.tsx
apps/web/src/ui/CountUp.tsx
apps/web/src/ui/SegmentedControl.tsx
apps/web/src/site/SiteNav.tsx
apps/web/src/site/MenuOverlay.tsx
apps/web/src/site/FloatingDemoCard.tsx
apps/web/src/site/SiteFooter.tsx
apps/web/src/motion/hooks.ts
apps/web/src/motion/FadeUp.tsx
apps/web/src/hero/Corridor.tsx
apps/web/src/hero/PhoneCluster.tsx
apps/web/src/hero/PhoneBack.tsx
apps/web/src/hero/GlassSpheres.tsx
apps/web/src/landing/S1Hero.tsx … S9Footer.tsx   (one file per section)
apps/web/src/routes/HowItWorks.tsx  (+ apps/web/src/how/*.tsx chapters)
apps/web/src/routes/Demo.tsx
apps/web/src/routes/DemoPhone.tsx
apps/web/src/demo/store.ts
apps/web/src/demo/script.ts
apps/web/src/demo/broadcast.ts
apps/web/src/demo/AppShell.tsx       (status-bar-less app chrome: top bar + bottom bar)
apps/web/src/demo/screens/BuyerHome.tsx, DealChat.tsx, EscrowSheet.tsx, LiveInspection.tsx, Receipt.tsx, Freeze.tsx, Verdict.tsx, SellerHome.tsx, SellerLive.tsx, SellerPaid.tsx, ArbiterDesk.tsx
apps/web/src/demo/parts/BilingualBubble.tsx, SlideToLock.tsx, CountdownRing.tsx, RpmMeter.tsx, SimVideo.tsx, SyncSpine.tsx, ControlDock.tsx
apps/web/src/demo/store.test.ts      (vitest: transitions, script determinism, branch replay)
```

**Modified**
```
apps/web/package.json              add "motion", "lucide-react"
apps/web/index.html                fonts, favicon, theme-color, color-scheme
apps/web/src/styles/globals.css    new tokens, type classes, keyframes, reduced motion (keep line 1 hallmark comment, update its text to: theme: cred-neopop-dark)
apps/web/src/main.tsx              add /how-it-works, /demo, /demo/phone/:role routes
apps/web/src/components/Chrome.tsx TopNav → uses SiteNav; Page/SectionTitle/Banner/Stat restyled, same exports
apps/web/src/routes/Landing.tsx    rewritten to compose landing sections
docs/02-design/DESIGN_SYSTEM.md    add "CRED revamp overrides" section (§2)
```

**Do not modify**: `apps/web/src/lib/*`, `packages/*` (except importing from them), `services/*`, `apps/mobile-expo/*`.

---

## 13. Acceptance Criteria (verify each, take screenshots)

1. `/` opens with the corridor hero, logo intro plays once, headline "trade like you / trust them." centered; scrolling zooms into the corridor.
2. S2 words light up one by one as you scroll; with OS reduced-motion on, all text is white and nothing scrubs.
3. Phone cluster shows 3 real screens with tilt; spreads on scroll; mouse parallax on desktop.
4. S4 sticky phone swaps screens exactly when the step text crosses viewport center.
5. Spheres float; stats count up once; no 3-equal-card layout anywhere.
6. Horizontal rail scrolls horizontally while page scrolls vertically; each card navigates to its route.
7. Menu overlay opens with circular wipe, traps focus, Esc closes, all 9 legacy routes + 2 new pages reachable from it (≤ 2 clicks from anywhere).
8. `/how-it-works` state rail highlights the chapter in view; buyer/seller toggle swaps phone screen.
9. `/demo` autoplays the happy path in sync on both phones; dispute toggle plays freeze → verdict with the arbitrator phone; play/pause/step and keyboard controls work; URL `?step=` restores state.
10. Tapping controls inside phones (quick phrase, slide-to-lock, go live, verify, freeze) works and pauses autoplay.
11. "pop out phones" opens two windows that stay in sync via BroadcastChannel.
12. Old routes (`/sandbox`, `/arena`, `/dispatch`, `/guide`, `/traction`, `/app`, `/auth`, `/onboarding`) render dark with the new nav and still function; the simulated camera still works in `/sandbox`.
13. All numbers tabular; no emoji; no purple gradients; Tamil/Hindi render with Noto fonts.
14. `pnpm --filter @samadhan/web typecheck`, `build`, and `test` pass. No console errors on any route.
15. Desktop 1440×900 and mobile 390×844 both look intentional (screenshots of each page at both sizes).

---

## 14. Build Task Order (one task at a time; each 5–15 min)

| # | Task | Done when |
| :--- | :--- | :--- |
| T1 | Add deps `motion`, `lucide-react`; update `index.html` (fonts, favicon, theme-color). | install + build pass |
| T2 | Rewrite `globals.css` tokens, HeroUI bridge vars, Tailwind `@theme` mapping (keep old utility names), type classes (§4.2), `.num`, `.eyebrow`, keyframes, reduced-motion block. | old routes render dark, no errors |
| T3 | Logo SVGs + `brand/Logo.tsx` with intro animation. | logo visible in a scratch render |
| T4 | `ui/` primitives: NeoButton, Eyebrow, VelvetCard, IconTile, ListRow, StatusPill, SegmentedControl, CountUp. | typecheck |
| T5 | `PhoneFrame` + `PhoneBack`. | renders at scale 0.6/0.8/1 without layout shift |
| T6 | `motion/hooks.ts`, `FadeUp`, `RevealText`. | reveal works in a test section |
| T7 | `SiteNav`, `MenuOverlay`, `FloatingDemoCard`, `SiteFooter`; wire into `Chrome.tsx` (`TopNav`) and restyle `Page`/`SectionTitle`/`Banner`/`Stat`. | all old routes navigable via menu |
| T8 | `demo/store.ts`, `script.ts`, `broadcast.ts` + `store.test.ts`. | vitest passes (valid/invalid transitions, deterministic replay, both branches end in RELEASED / ARBITRATED_SPLIT) |
| T9 | `demo/AppShell.tsx` + parts: BilingualBubble, SlideToLock, CountdownRing, RpmMeter, SimVideo. | each renders in isolation |
| T10 | Buyer screens B1–B7. | screens render from store |
| T11 | Seller screens S1–S6 + ArbiterDesk A1. | screens render from store |
| T12 | `/demo` page: stage, SyncSpine with packet animation, ControlDock, keyboard, URL state, branch toggle; `/demo/phone/:role` pop-out. | AC 9–11 |
| T13 | Landing S1 Corridor hero + S2 manifesto. | AC 1–2 |
| T14 | Landing S3 phone cluster, S4 sticky scrollytelling. | AC 3–4 |
| T15 | Landing S5 spheres + stats, S6 horizontal rail, S7 two-phone teaser, S8, S9; update `DESIGN_SYSTEM.md` overrides. | AC 5–6 |
| T16 | `/how-it-works` page (intro, state rail, chapters with buyer/seller/arbiter toggle, architecture strip, CTA). | AC 8 |
| T17 | Routes in `main.tsx`, per-route titles, a11y pass (§11), reduced-motion pass, responsive pass at 390 / 768 / 1440. | AC 7, 12, 13, 15 |
| T18 | Final verification: typecheck, build, test, open every route in a browser, screenshot desktop + mobile into `docs/02-design/cred-reference/after/`. | AC 14 |

---

## 15. Things You Must NOT Do

- Do not use CRED's name, logo, or images anywhere in the product UI. "Like CRED" is an internal reference only.
- Do not add a 3D library (three.js, spline); the corridor, spheres and phones are CSS/SVG.
- Do not add a component library besides the existing HeroUI; do not install shadcn.
- Do not hit the backend from `/demo` or the landing page.
- Do not use `border-radius` on NeoButton or slide-to-lock; do not use sharp corners on app cards.
- Do not use blur shadows on NeoPOP elements; do not use more than 3 accent colors on one screen.
- Do not uppercase anything except `.eyebrow`, StatusPill, and bottom-bar labels.
- Do not leave placeholder "Lorem" text — all copy is in this document.
