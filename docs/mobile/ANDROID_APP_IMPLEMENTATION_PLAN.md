# MUDRA Android App — Full Implementation Plan (for autonomous overnight build)

> Audience: an autonomous coding agent (Antigravity) building unattended overnight.
> Every decision is already made here. **Do not ask the human anything.** If something is
> ambiguous, pick the option this document leans toward, write the decision in `PROGRESS.md`
> under "Decisions I made", and keep going. If something is blocked, use the fallback listed in
> §17 (Risk register) and keep going.
>
> Goal by morning: a **release APK** at `apps/mobile/dist/mudra-v1.0.0.apk` that installs on a
> real Android phone, talks to the hosted Supabase backend, and lets two people sign up with only
> Name + Role + Phone + PIN, list items, buy/sell/swap with escrow, chat in real time, run the live
> check, dispute/freeze/verdict, and leave reviews. Plus `MORNING_REPORT.md`.

---

## 0. Hard rules (read twice)

1. **Never ask questions.** Decide, log in `PROGRESS.md`, continue.
2. **Never print, log, commit or bundle secrets.** The root `.env` contains `DATABASE_URL` (with a
   password), `GEMINI_API_KEY`, `NEXCONN_SECRET_KEY`, Supabase secret key. Only these two values may
   enter the mobile app: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the
   publishable `sb_publishable_...` key). CI runs gitleaks; a leaked secret fails the submission.
   When echoing env in logs, mask values (`DATABASE_URL=***`).
3. **Do not modify** `apps/web`, `services/*`, `packages/*`, existing Supabase `public.*` tables
   created by the Go service, or root `pnpm-workspace.yaml`. All new backend objects live in schema
   `mudra` plus `public.m_*` functions and `public.m_events`.
4. Work on git branch `feat/android-app`. Commit at the end of every phase:
   `git add -A; git commit -m "mobile: P<n> <summary>"`. Never force-push. Never commit
   `apps/mobile/dist/`, `apps/mobile/android/` build outputs, keystores, or `.env*` files.
5. Windows + **PowerShell 5.1**: no `&&` (use `;` and check `$LASTEXITCODE`), no `Start-ThreadJob`.
   Set `$env:CI="1"` so Expo CLI never prompts.
6. Keep `PROGRESS.md` at `apps/mobile/PROGRESS.md` updated after every phase: done / in progress /
   decisions / problems + fallback used / time spent.
7. Time-box. Each phase has a budget (§16). If a phase overruns by 50%, take the fallback, log it,
   move on. A working simpler app beats a broken ambitious one.
8. Produce a **checkpoint release APK** after P5 and after P8 (copy to `apps/mobile/dist/`), so
   there is always an installable artifact even if later phases fail.

---

## 1. Product in one paragraph

**MUDRA** is a campus-first peer-to-peer marketplace where college students (and anyone,
internationally) buy, sell, swap or give away things with **escrow protection**: the buyer's money
is locked before the meetup, the seller proves the item with a **live check** (camera photos per
checklist step streamed to the buyer), the buyer releases funds, and if something goes wrong either
side hits **freeze** — a 90-second resolution desk produces a fair split verdict. Chat translates
between languages automatically. Money is **demo credits** (no real payments) — state this plainly
in the wallet UI.

Brand: **MUDRA** (lowercase in copy: "mudra"). Keep brand name in one constant
`src/config/brand.ts` → `export const BRAND = { name: 'mudra', display: 'Mudra' }`.
Android package `com.chanakya.mudra`, app name `Mudra`, URL scheme `mudra`.

### Target user
College students 18–25, phone-first, low patience. Must be usable with zero explanation:
- Sign-up in under 30 seconds. Only Name, Role, Phone, PIN. **No password, no OTP, no Google, no
  email, no ID verification of any kind.**
- One thumb. Primary actions bottom-anchored.
- International: phone country code from device region, currency per user, 5 languages
  (English, Hindi, Tamil, Marathi, Spanish).

---

## 2. Verified environment (already checked on this machine — trust these)

| Item | Value |
| :--- | :--- |
| OS | Windows 11 (10.0.26200), PowerShell 5.1 |
| Node | 24.15 (use `npm` for the mobile app, not pnpm) |
| pnpm | 11.9 (root monorepo only) |
| System Java | JDK 26 — **incompatible with Gradle**. Always set `JAVA_HOME` to Android Studio JBR |
| JBR | `C:\Program Files\Android\Android Studio\jbr` (JDK 21.0.10) |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` (ANDROID_HOME is unset → set it). platforms 33/34, build-tools 34–37, NDK 27.0.12077973, licenses accepted, no cmdline-tools. Gradle auto-downloads missing platforms (e.g. 36). |
| AVD | `Pixel_10` (android-37, x86_64) |
| RAM | 31 GB → `org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=1g` |
| Long paths | `LongPathsEnabled=0` → **build through `subst M: D:\Hackathons\Nexconn\apps\mobile`** to avoid 260-char path failures in CMake/NDK |
| Supabase | Hosted project ref `ttpgogzqispnexpktrsv`. URL + publishable key + DATABASE_URL in root `.env`. Postgres role can: create schemas/functions, `create extension http`, insert `storage.buckets`, create policies on `storage.objects`, `alter publication supabase_realtime`. pgcrypto installed. |
| Supabase secret REST key | returned 401 — **do not rely on it**. Use `DATABASE_URL` (pg) for migrations and the publishable key in-app. |

Session env setup (run at the start of every PowerShell session):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
$env:CI = "1"
if (-not (Test-Path M:\)) { subst M: D:\Hackathons\Nexconn\apps\mobile }
```

Migration scripts use `DIRECT_DATABASE_URL` from root `.env` (fallback `DATABASE_URL`) — the
pooled URL can reject DDL / prepared statements.

pg connection gotcha (already hit): `sslmode=require` in the URL overrides the ssl option and fails
with `SELF_SIGNED_CERT_IN_CHAIN`. In scripts: strip `sslmode` from the string and pass
`ssl: { rejectUnauthorized: false }`.

```js
const cs = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL).replace(/[?&]sslmode=[^&]*/,'');
const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
```

---

## 3. Architecture decisions (ADRs — final)

### ADR-M1: Standalone Expo app at `apps/mobile`, outside pnpm workspace
- Path `D:\Hackathons\Nexconn\apps\mobile`. Not added to `pnpm-workspace.yaml` (avoids hoisting
  conflicts with web's React 19.0/Vite). Use `npm install`.
- `metro.config.js`: `config.resolver.disableHierarchicalLookup = true;`
  `config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]`;
  `config.watchFolders = [__dirname]`.
- `package.json`: `"expo": { "autolinking": { "searchPaths": ["./node_modules"] } }`.
- The old `apps/mobile-expo` folder (if present) is left untouched; docs mention it is superseded.

### ADR-M2: Expo SDK 58 + React Native 0.88 + New Architecture
- Create with `npx create-expo-app@latest mobile --template blank-typescript` inside `apps/`, then
  `npx expo install` everything so versions match SDK. Expected: RN 0.88.x, React 19.3, reanimated
  4.x, react-native-worklets, gesture-handler 3.x, screens 4.x, expo-router 58.
- If `create-expo-app@latest` yields a different SDK, use whatever it yields as long as
  heroui-native's peer deps are satisfied; log it.
- Release builds via `expo prebuild -p android` + Gradle `assembleRelease` locally. **No EAS** (needs
  login).

### ADR-M3: UI = custom NeoPOP primitives + HeroUI Native for form/overlay plumbing
- The look must match the landing-page phone screens (CRED-style NeoPOP dark), **not** the warm
  oklch palette in `CLAUDE.md`. `docs/02-design/CRED_REVAMP_BUILD_SPEC.md` overrides `CLAUDE.md` for
  visuals.
- `heroui-native` (latest 1.x) + `uniwind` for: TextField/Input, SearchField, Toast, Dialog, Switch,
  Chip, Skeleton, Spinner, Accordion, simple BottomSheet. Get docs with:
  `node C:\Users\Harshad\.cursor\skills-cursor\heroui-native\scripts\get_component_docs.mjs <Name>`
  and read `C:\Users\Harshad\.cursor\skills-cursor\heroui-native\SKILL.md` once.
- All NeoPOP signature pieces (NeoButton, ListGroup, AvatarRing, SlideToLock, CountdownRing,
  Receipt stamp, etc.) are hand-built with `StyleSheet` + TS tokens + Reanimated. They do not depend
  on Uniwind, so they survive if Uniwind fails.
- **Phase-0 gate**: build a release APK with one HeroUI TextField + one Uniwind class + Outfit font.
  If it fails to render or build after 45 min of fixes → remove heroui-native + uniwind entirely,
  build those few components by hand (TextInput styled with tokens, own Toast via Reanimated). Log it.

### ADR-M4: Backend = hosted Supabase only (Postgres RPC + Realtime + Storage)
- The Go (:4002), Node (:4001), Rust (:4003) services run on localhost; an APK on a phone cannot
  reach them. Supabase is the only reachable backend → everything goes there.
- Tables live in private schema `mudra` (not exposed by PostgREST). The app only calls
  `public.m_*` functions, all `SECURITY DEFINER`, `set search_path = mudra, public, extensions`,
  `grant execute ... to anon, authenticated`; `revoke all on schema mudra from anon, authenticated`.
- Auth = our own session tokens (no Supabase Auth, because Supabase Auth requires email/OTP/phone
  SMS). PIN hashed with bcrypt (`extensions.crypt(pin, extensions.gen_salt('bf', 8))`).
- Errors: `raise exception 'MUDRA:<CODE>:<detail>'`. Client parses `/MUDRA:([A-Z_]+):?(.*)/`.
  Codes: AUTH, NOT_FOUND, BAD_PIN, LOCKED, PHONE_TAKEN, VALIDATION, FORBIDDEN, BAD_STATE,
  VERSION_CONFLICT, INSUFFICIENT_FUNDS, LISTING_UNAVAILABLE, OWN_LISTING, RATE_LIMIT.
- After every migration run: `notify pgrst, 'reload schema';`

### ADR-M5: Chat on Supabase (not Nexconn) on mobile
- There is no Nexconn React Native SDK and token issuance needs the server secret. Mobile chat uses
  Postgres messages + Supabase Realtime. This is a documented tradeoff for the morning report:
  "web uses Nexconn; Android uses the same deal model over Supabase Realtime".

### ADR-M6: Realtime via an event table, polling fallback
- `public.m_events(id bigserial pk, recipient_id uuid not null, deal_id uuid, kind text not null,
  created_at timestamptz default now())`. RLS enabled, policy `for select to anon using (true)`,
  `grant select to anon`, `alter publication supabase_realtime add table public.m_events`.
  Contains no sensitive data (ids + kind only).
- Every mutating RPC inserts events for affected users. Client subscribes with
  `filter: recipient_id=eq.<myId>` and invalidates React Query keys
  (`['deal', id]`, `['messages', id]`, `['deals']`, `['me']`, `['wallet']`).
- Fallback polling always on: deal screen 4 s, deals list / home 15 s (only when screen focused &
  app active). Realtime is a bonus, not a dependency.
- Delete events older than 1 day inside `m_resolve_if_due` (cheap housekeeping).

### ADR-M7: Photos in Supabase Storage bucket `mudra-photos`
- Public bucket, `file_size_limit` 6 MB, mime `image/jpeg,image/png,image/webp`.
- Policy on `storage.objects`: anon `insert` where `bucket_id='mudra-photos'` and first folder in
  (`listings`,`evidence`,`avatars`,`seed`). Public read via public URL. No update/delete for anon.
- Client: pick/capture → `expo-image-manipulator` resize to max 1280 px, JPEG 0.75 → upload bytes
  with `new File(uri).bytes()` (expo-file-system new API) → `supabase.storage.from('mudra-photos')
  .upload('listings/<uuid>.jpg', bytes, { contentType: 'image/jpeg' })`. **Do not** upload a
  `fetch(uri).blob()` (known 0-byte bug on RN).

### ADR-M8: Translation lazily in the database
- Enable `create extension if not exists http with schema extensions`.
- `mudra.secrets(key text pk, value text)`; migrate script upserts `gemini_api_key` and
  `gemini_model` from root `.env` (`GEMINI_API_KEY`, `GEMINI_FLASH_MODEL`, fallback model
  `gemini-2.5-flash`). Never returned by any RPC.
- `m_translate_message(token, message_id, target_locale)` — receiver-driven: if
  `translations->>target` exists return it; else PII-scrub (regex: phone digits ≥10, emails, UPI
  `\S+@\S+`, 12-digit Aadhaar, PAN `[A-Z]{5}[0-9]{4}[A-Z]`) → call Gemini
  `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<key>` with
  prompt "Translate to <lang>. Output only the translation." → store in `translations` jsonb →
  return. On any HTTP error/timeout (`http_set_curlopt('CURLOPT_TIMEOUT','6')`) return null; client
  shows original only. If the `http` extension is unavailable → function returns null always; log it.
- Quick-reply phrases (§9.4) are pre-translated in the app — zero network.

### ADR-M9: Demo bots driven by the client
- No cron available. Bot behaviour runs inside `m_demo_tick(token, deal_id)`, which the app calls
  every ~3 s while a deal screen with a bot counterpart is open. Deterministic rules in §8.6.

### ADR-M10: State management
- Server state: `@tanstack/react-query` (staleTime 10 s, retry 1, refetchOnReconnect).
- Local state: `zustand` (session token, me, mode buy/sell, locale) persisted — token in
  `expo-secure-store`, the rest in AsyncStorage.
- Navigation: `expo-router` with `Stack.Protected guard={!!token}`; guest mode allowed for browse.

---

## 4. Competitor study → what we copy and why

| App | Pattern we take | Pattern we reject |
| :--- | :--- | :--- |
| Airbnb | **Mode switch in-place** ("Switch to hosting") — same account, different home & tabs, instant | Separate full-screen transition with long animation |
| Fiverr | Buyer/seller toggle in profile, persisted, seller dashboard with "orders waiting" | Hidden deep in menu |
| Vinted | Buyer protection fee card on listing; simple "Buy now / Make offer" | Clutter, ads |
| Depop | Big photo grid, 2 columns, price overlay | Social feed noise |
| Carousell | Campus/meetup-spot field, chat-first offers with offer cards inside chat | — |
| OLX | Category tiles on home | Phone-number-first dealing (unsafe) |
| FB Marketplace | "Is this still available?" one-tap opener → our quick replies | — |
| Mercari | Clear order status steps (4-segment progress) | — |
| Bunz / Olio | Swap and free items as first-class kinds | — |
| Uber (driver/rider) | — | **Two separate apps** for two roles — rejected; the user explicitly wants no account switching |

**Role switching decision:** one account, one tap. A `buy | sell` segmented pill sits in the top bar
center on Home and Deals. Switching changes: home content, bottom-left button (explore → "+ list"),
accent color (buy = purple `#6a35ff`, sell = paccha `#e5fe40`), deals filter. It is a view mode, not
an identity: the user can buy and sell simultaneously; deals list shows both with a role tag.
Persisted in AsyncStorage. Signup "role" just sets the initial mode (`both` → starts in buy).
Haptic `selectionAsync` on switch + 220 ms crossfade of the home content. First run shows a one-time
coachmark: "tap here to switch between buying and selling".

---

## 5. Information architecture & navigation

```
app/
  _layout.tsx                 fonts, providers, splash, Stack.Protected
  index.tsx                   redirect → /(tabs)/home or /welcome
  welcome.tsx                 3 slides + "get started" + "i have an account" + "try demo"
  (auth)/signup/name.tsx
  (auth)/signup/role.tsx
  (auth)/signup/phone.tsx
  (auth)/signup/pin.tsx       create + confirm on same screen (two steps)
  (auth)/signup/done.tsx      "you're in."
  (auth)/login.tsx            phone → pin (two steps on one screen)
  (tabs)/_layout.tsx          custom bottom bar (AppShell)
  (tabs)/home.tsx             BuyHome | SellHome by mode
  (tabs)/explore.tsx          search + filters (buy mode left button)
  (tabs)/deals.tsx
  listing/[id].tsx
  listing/new.tsx             also edit via ?edit=<id>
  deal/[id].tsx               deal room (chat + next step bar)
  deal/[id]/escrow.tsx        modal-ish route (transparentModal) — escrow sheet
  deal/[id]/inspect.tsx       live check (seller camera / buyer viewer)
  deal/[id]/receipt.tsx
  deal/[id]/freeze.tsx        freeze countdown + statements, auto-routes to verdict
  deal/[id]/review.tsx
  seller/[id].tsx             public profile
  wallet.tsx
  saved.tsx
  my-listings.tsx
  profile.tsx                 own profile + settings
  settings/language.tsx
  settings/currency.tsx
  settings/pin.tsx
  guide.tsx                   how it works (4 steps)
  safety.tsx                  meetup safety tips
```

Bottom bar (port of landing `AppShell`): three round buttons on a black bar.
- **Left 56 px ring**: buy mode → "explore" (search icon) → `/explore`; sell mode → paccha filled
  "+ list" → `/listing/new`. Morph with crossfade.
- **Center 68 px AvatarRing**: user initials in a ring (gradient approximating the landing conic
  ring using `expo-linear-gradient` in a circle mask), label = first name; tap → home; long-press →
  profile.
- **Right 56 px ring**: "deals" with red badge = unread + needs-you count → `/deals`.
- Labels under buttons uppercase 10 px, letter-spacing 0.08em (allowed exception: bottom-bar
  labels, eyebrows, StatusPill).

Top bar (Home & Deals): left LogoMark 28 px; center `buy | sell` SegmentedControl; right avatar dot →
profile. Other screens: back chevron + title (Fraunces lowercase 22) + optional action.

Every screen has an obvious next step. Max 2 taps from home to: create listing, any active deal,
wallet, profile.

Deep links (for self-QA): `mudra://listing/<id>`, `mudra://deal/<id>`, `mudra://home`.

---

## 6. Design system (port of the landing phone screens)

Read before coding: `apps/web/src/styles/globals.css`, `apps/web/src/demo/AppShell.tsx`,
`apps/web/src/demo/screens/*.tsx`, `apps/web/src/demo/parts/*.tsx`, `apps/web/src/ui/*`,
`apps/web/src/brand/Logo.tsx`, `docs/02-design/CRED_REVAMP_BUILD_SPEC.md`, and the images in
`docs/02-design/cred-reference/after/*.png` (look at them). The app must look like those phone
mockups came alive.

### 6.1 Tokens — `src/theme/tokens.ts`

```ts
export const C = {
  void: '#000000', bg: '#0d0d0d', card: '#121212', card2: '#1a1a1a', card3: '#232323',
  border: '#3d3d3d', hairline: 'rgba(255,255,255,0.08)',
  fg: '#ffffff', fg2: '#c7c7c7', muted: '#8a8a8a', dim: '#4a4a4a',
  paccha: '#e5fe40', pacchaEdge: '#9fb21f', pacchaShadow: '#7a8916',
  purple: '#6a35ff', purpleEdge: '#3f1fa6', purpleShadow: '#2e1679',
  sunshine: '#ff8744', danger: '#ff4d4d', success: '#3ddc84',
} as const;
export const R = { action: 0, chip: 999, row: 20, card: 24, sheet: 28 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const; // 4/8 grid
export const F = {
  ui: 'Outfit_400Regular', uiMed: 'Outfit_500Medium', uiSemi: 'Outfit_600SemiBold', uiBold: 'Outfit_700Bold',
  display: 'Fraunces_600SemiBold', displayItalic: 'Fraunces_400Regular_Italic',
  mono: 'JetBrainsMono_500Medium',
} as const;
```

Accent by mode: `const accent = mode === 'sell' ? C.paccha : C.purple; const onAccent = mode === 'sell' ? '#000' : '#fff'`.

### 6.2 Typography rules
- Android ignores `fontWeight` with custom fonts → `src/ui/Text.tsx` maps `weight` prop
  (400/500/600/700) → font family. Never use raw `<Text>` from RN in screens.
- Display headings: Fraunces, **lowercase**, 28–40 px, tight line-height (1.1).
- UI: Outfit 15–17 body, 13 secondary.
- Money, countdowns, counts, codes: `fontVariant: ['tabular-nums']`.
- Hashes / short codes / voucher IDs: JetBrains Mono 12.
- Copy is lowercase sentence style ("lock money in escrow"), except eyebrows/pills/bottom labels
  which are uppercase 11 px, letter-spacing 0.08em.
- **No emoji anywhere in UI.** No purple→indigo gradients. No neon glows. Icons from
  `lucide-react-native`, stroke 1.75, size 20/24.

### 6.3 Primitives to build (`src/ui/`) — each with props and behaviour

1. **NeoButton** `{ variant: 'purple'|'paccha'|'white'|'ghost'|'danger', size: 'md'|'lg', label, onPress, disabled, loading, icon }`
   - Sharp corners (radius 0). Height 48 (md) / 60 (lg). Label Outfit 600 16, lowercase.
   - Hard offset shadow: render a sibling View behind, offset +5,+5, color `*Shadow` (white →
     `#8a8a8a`, ghost → none). Right & bottom 2 px edge strips in `*Edge` color for the 3D bevel.
   - Press: Reanimated translate face to (5,5) in 60 ms (`withTiming`, linear), release back 120 ms.
     `Haptics.impactAsync(Light)`. Disabled: opacity 0.4, no shadow. Loading: Spinner replaces label.
2. **VelvetCard** `{ children, padding=16, radius=24, tone: 'card'|'card2' }` — soft container,
   1 px hairline border.
3. **ListGroup / ListRow** — group radius 20, bg card, rows 56 h, hairline dividers inset 56 px.
   Row: left IconTile 36 (or avatar), title 16, subtitle 13 muted, right value/chevron. Pressable
   with bg card2 on press.
4. **IconTile** `{ icon, label, size=64 }` circle bg card3, icon 24 fg, label 12 under.
5. **StatusPill** `{ tone: 'locked'|'live'|'frozen'|'neutral'|'done'|'danger', label }` — pill,
   11 px uppercase; locked = paccha text on paccha 12% bg; live = sunshine + pulsing dot; frozen =
   `#9ad8ff` on its 12%; done = success; danger = danger.
6. **Eyebrow** `{ label, dot? }` — 6 px dot (accent) + uppercase 11 muted label.
7. **SegmentedControl** `{ options, value, onChange }` — pill track card2, active pill **white bg
   black text**, animated slide with critically damped spring (damping such that no overshoot:
   `withSpring(x, { damping: 26, stiffness: 300, overshootClamping: true })`).
8. **SlideToLock** `{ label, onComplete, accent }` — 64 px tall track card2 radius 0, paccha square
   knob 56 px with chevron; gesture-handler Pan; complete at 85% width → haptic success +
   `onComplete`; below threshold spring back. Track text fades as knob moves.
9. **CountdownRing** `{ endsAt, total=90 }` — 220 px SVG ring (`react-native-svg`), stroke sunshine,
   remaining arc animated; center digits Fraunces 56 tabular "1:24"; uses `server_now` offset (§8).
10. **BilingualBubble** `{ mine, text, translated, showOriginal }` — mine: purple bg, radius
    20/20/6/20, white text; other: card2, radius 20/20/20/6. Translated line on top, original 12 px
    muted below with "original" toggle.
11. **OfferCard** (in chat) — card2, eyebrow "OFFER", amount Fraunces 32 tabular, swap item text if
    swap, actions accept/counter/decline (only for the allowed user).
12. **SystemLine** — centered 12 px muted text with hairlines either side ("money locked in escrow").
13. **AvatarRing** `{ name, hue, size }` — initials on card3 inside a 2.5 px gradient ring.
14. **PinPad** — 3×4 grid of 72 px circular keys (card2), digits Outfit 28, backspace icon; 4 dots
    above (filled white). Haptic per tap. Shake animation (translateX sequence ±8 px, 300 ms) on
    error.
15. **ProgressSegments** `{ stage: 1..4 }` — 4 segments 4 px tall, gap 4, filled accent.
16. **Sheet** — custom Reanimated bottom sheet (in-tree, not native TrueSheet) used for escrow,
    filters, counter-offer; backdrop rgba(0,0,0,0.6); drag down to close; radius 28 top.
17. **EmptyState** `{ title (Fraunces lowercase), body, action }`.
18. **Price** `{ minor, currency, size }` — formatting §10.3, tabular.
19. **ListingCard** (grid) — square photo radius 20 (expo-image, `contentFit="cover"`,
    `transition=150`), price bottom-left on a black 70% chip, kind chip top-left for swap/free,
    title 14 1 line, meetup/campus 12 muted.
20. **LogoMark** — SVG paths: shield `M6 6h52v34c0 13-11 22-26 28C17 62 6 53 6 40V6z` (stroke fg
    2.5), facet `M6 6l6 6h40l6-6`, M strokes `M19 50V22l13 16` and `M45 50V22L32 38` (paccha 3.5).
    viewBox `0 0 64 70`.
21. **Toast** — HeroUI Toast if available, else custom top toast (card3, 14 px, 2.4 s).

### 6.4 Motion
- Default springs critically damped (no bounce): `{ damping: 26, stiffness: 300, overshootClamping: true }`.
- Every pressable: scale 0.97 on press-in (≤16 ms, `withTiming(0.97,{duration:60})`).
- Screen transitions: native stack default (slide) ; modals `presentation: 'transparentModal'`
  + own sheet animation.
- Lists use `@shopify/flash-list`. Skeletons (card2 shimmer) while loading — never blank screens.
- Respect `AccessibilityInfo.isReduceMotionEnabled` → skip non-essential animations.

### 6.5 Accessibility
- Touch targets ≥ 48 px. `accessibilityLabel` on all icon-only buttons. Contrast: text on paccha is
  black, on purple is white. Font scaling allowed up to 1.3 (`maxFontSizeMultiplier={1.3}`).

---

## 7. Screen specs & copy deck

Copy is final; use it verbatim (English). Other languages via i18n (§10).

### 7.1 Welcome (`/welcome`)
- Full black. LogoMark 56 top-left area. Horizontal pager of 3 slides (FlatList pagingEnabled),
  dots indicator.
  1. Fraunces 40: "buy and sell on campus, without the fear." Body: "your money waits in escrow
     until you've seen the item."
  2. "see it live before you pay." Body: "the seller shows each detail on camera. you release
     money only when you're happy."
  3. "something wrong? freeze it." Body: "a 90-second resolution desk splits it fairly. no
     endless arguments."
- Bottom: NeoButton lg purple "get started" → signup/name. Ghost "i already have an account" →
  login. Text link "try the demo" → login prefilled with demo account (§8.7) and PIN auto-entered.
- Top-right language chip (current language short name) → language picker sheet (persists locale
  before signup).
- "browse without an account" small link → home in guest mode.

### 7.2 Signup — one question per screen, big type, keyboard up immediately
Header: back chevron + ProgressSegments (4 steps).
1. **Name**: "what should we call you?" — TextField autoFocus, autoCapitalize words, 2–40 chars,
   trimmed. Helper: "this is shown to people you deal with." CTA "continue" (disabled until valid).
2. **Role**: "what brings you here?" — three big selectable VelvetCards (radius 24, 2 px accent
   border when selected):
   - "buying" — "find good stuff from people nearby"
   - "selling" — "turn things you don't use into money"
   - "both" — "buy and sell" (default selected)
   Footer note: "you can switch anytime with one tap." CTA "continue".
3. **Phone**: "your phone number" — country picker button (flag-free: show "+91 IN") left, number
   field right (`keyboardType="phone-pad"`). Default country from `expo-localization`
   `getLocales()[0].regionCode` → fallback IN. Validate with `libphonenumber-js` `isValidPhoneNumber`;
   store E.164. Helper: "used to log in. we never send codes or spam." CTA "continue". If the RPC
   later returns PHONE_TAKEN: inline error "this number already has an account" + link "log in
   instead".
   Country picker = Sheet with SearchField + list of ~40 common countries (IN, US, GB, CA, AU, SG,
   AE, DE, FR, ES, IT, NL, IE, NZ, MY, ID, PH, TH, VN, JP, KR, CN, HK, BR, MX, AR, ZA, NG, KE, EG,
   SA, QA, PK, BD, LK, NP, SE, NO, CH, PL) with dialing codes.
4. **PIN**: step a "create a 4-digit pin" → PinPad; step b "type it again" → if mismatch shake +
   "pins don't match. try again." back to step a. Reject trivially weak pins (`0000`, `1111`…`9999`,
   `1234`, `4321`) with "pick something less guessable." (demo accounts are seeded server-side so
   their 1234 is fine). On confirm → call `m_signup`. Loading state on PinPad.
5. **Done**: Fraunces 40 "you're in, <first name>." Body: "you start with <wallet credits> demo
   credits to try a protected deal." CTA "start exploring" → home (mode = role, both → buy).
   Currency auto-chosen from region: IN→INR, US→USD, GB→GBP, EU countries→EUR, SG→SGD, AE→AED,
   CA→CAD, AU→AUD, else USD.

### 7.3 Login (`/login`)
- Step 1 phone (same component as signup). Step 2 PinPad "enter your pin".
- Errors: NOT_FOUND → "no account with this number" + "create one"; BAD_PIN → shake +
  "wrong pin. <n> tries left."; LOCKED → "too many tries. try again in <m> min."
- "forgot pin?" → Dialog: "for this demo, ask a teammate to reset it, or create a new account with
  another number." (No recovery flow by design — no verification allowed.)
- "try the demo" chips: "Rajesh (buyer)" / "Vikramjeet (seller)" → logs in directly.

### 7.4 Home — buy mode
Scroll view, top bar as §5.
1. Greeting Fraunces 32: "hey <first name>." Muted: campus or "find something good today".
2. Search pill (card2, radius 999, 52 h) "search books, phones, cycles…" → `/explore` focused.
3. If active deals exist: Eyebrow "YOUR DEALS" → up to 2 **ActiveDealCards** (VelvetCard: thumb 56,
   title, counterpart, StatusPill, ProgressSegments, NextStep text e.g. "lock money to continue",
   tap → deal room). Else a "how buying works" card (3 rows: lock money → see it live → release) →
   `/guide`.
4. Eyebrow "CATEGORIES" → horizontal row of IconTiles: books, electronics, phones, home, rides,
   fashion, sports, hobbies, tickets, other + a wide pill tile "free & swap" (paccha outline).
5. Eyebrow "FRESH NEAR YOU" → 2-column grid of ListingCards (m_feed, 20 items, infinite scroll
   offset paging). Prefer same campus first (server orders by campus match then created_at desc).
6. Bottom card: "got something to sell?" + small paccha NeoButton "switch to selling" (sets mode).
Pull-to-refresh.

### 7.5 Home — sell mode
1. Greeting "your shop, <first name>." Stats row (3 small numbers, tabular): active listings,
   offers waiting, earned (sum released to me).
2. If no listings: hero VelvetCard Fraunces 28 "got stuff you don't use?" body "list it in under a
   minute. buyers pay into escrow before you meet." paccha NeoButton lg "list an item".
3. Eyebrow "OFFERS WAITING" → rows of deals in OFFERED where I'm seller and I must respond (counter
   amount, buyer name, accept quick action).
4. Eyebrow "YOUR SALES" → active deals as seller with next step.
5. Eyebrow "YOUR LISTINGS" → horizontal cards with status pill (active/reserved/sold), tap → listing
   (owner view with edit / mark sold / remove).
6. Eyebrow "SELLER TOOLS" → IconTiles: "list item", "wallet", "safety tips", "how it works".

### 7.6 Explore (`/explore`)
SearchField autofocus (debounced 300 ms) + horizontal chips: all, categories…, "free", "swap",
"under 500" (in user's currency: under 10× smallest sensible unit; INR 500, USD 10, others 10).
Filter icon → Sheet: category, kind (sell/swap/free), condition, price min/max, "my campus only",
sort (newest / price low / price high). Results grid. Empty: "nothing yet for “<q>”. try another
word, or check back later."

### 7.7 Listing detail (`/listing/[id]`)
- Photo carousel full width 1:1 with page dots; tap → fullscreen viewer (pinch not required).
- Title Fraunces 26 lowercase-as-typed (do not force lowercase user content). Price big tabular or
  "free" / "swap".
- Chips: condition, category, meetup spot.
- Description.
- Seller row (ListRow): AvatarRing, name, campus, "★ 4.8 · 12 deals" (use a star icon from lucide,
  not the glyph), → `/seller/[id]`.
- **Protection card** (VelvetCard with shield icon): "protected by mudra escrow. your money is
  locked until you've seen the item live or in person. freeze anytime for a fair split."
- Save heart (top right), share (copy deep link via expo-clipboard + toast "link copied"), report
  (Dialog with reasons: scam, prohibited, wrong info, offensive → `m_report`).
- Sticky bottom bar (respect safe area):
  - kind sell: NeoButton purple "buy for <price>" + ghost "make offer" (counter sheet).
  - kind swap: purple "offer a swap" → sheet with text field "what will you swap?" (+ optional cash
    top-up amount).
  - kind free: purple "request it" (+ optional note).
  - Own listing: "edit" + "mark sold" / "remove".
  - Listing reserved/sold: disabled "reserved" / "sold".
  - Guest: any action → Dialog "create a free account to deal. takes 30 seconds." → signup.
  - Existing open deal with this listing → "open your deal" → deal room.

### 7.8 Create / edit listing (`/listing/new`)
Single scroll page, sticky "post listing" paccha NeoButton lg.
- Photos row: 1–6, first tile "add photos" (camera or gallery via ActionSheet/Sheet). Reorder by
  long-press not required; first photo is cover; tap × to remove. Upload progress overlay per photo.
- Title (3–60), category (chips grid), condition (segmented: new / like new / good / fair),
  kind (segmented: sell / swap / free), price (only for sell; numeric keypad; currency prefix from
  profile), "open to swaps" not needed (kind covers it), description (0–500, optional),
  meetup spot (text, placeholder "library gate, hostel 4 lobby…"), campus prefilled from profile.
- Validation inline. On post → `m_create_listing` → toast "listed. we'll tell you when someone
  bites." → listing detail.
- Draft autosave in AsyncStorage (key `draft-listing`), restored on open.

### 7.9 Deals list (`/deals`)
Top bar segmented `buy | sell` (same global mode) **plus** an "all" option? No — keep global mode;
add a small text toggle "show all deals". Sections: "NEEDS YOU" (allowed_actions non-empty and it's
my move), "IN PROGRESS", "DONE". Row: listing thumb, title, counterpart, StatusPill (state label),
unread dot, relative time (own formatter, no Intl.RelativeTimeFormat — Hermes). Empty state:
buy → "no deals yet. find something you like." + "explore"; sell → "no deals yet. list something
and offers will land here." + "list item".

### 7.10 Deal room (`/deal/[id]`) — the heart
Layout top→bottom:
1. Header: back, listing thumb 36 + title + counterpart name, short code mono (MD-2611-0042),
   overflow menu (view listing, safety tips, report, freeze if allowed).
2. **Deal strip** (VelvetCard compact): amount Price, StatusPill, ProgressSegments(storyStage).
3. **NextStepBar** (sticky below strip, accent-tinted card): one sentence + one primary button,
   from table §8.4. This is how a first-timer always knows what to do.
4. Message list (FlashList inverted): BilingualBubble, OfferCard, SystemLine, EvidenceCard (photo
   + checklist label), ReceiptCard, VerdictCard.
5. Quick replies row (horizontal chips, §9.4) above composer.
6. Composer: text field + send (purple square). Max 500 chars. Sending optimistic (temp id, then
   replace). Phone numbers typed before FUNDED are masked by server (`•••`) with system hint "share
   numbers after money is locked — it keeps you safe." (server-side regex in m_send_message).
Behaviour: on focus mark read; poll 4 s; if counterpart is a demo bot call `m_demo_tick` every 3 s;
keyboard via `react-native-keyboard-controller` `KeyboardAvoidingView`/`KeyboardStickyView`
(edge-to-edge breaks adjustResize).

### 7.11 Escrow sheet (`/deal/[id]/escrow`)
Sheet: eyebrow "ESCROW", Fraunces 32 "lock <price>", rows: "item" title, "pay from" mudra wallet
(balance), "seller gets it when" "you release after checking", "fee" "0 (demo)". If balance <
amount: danger text "not enough demo credits" + "top up demo credits" button (m_topup_demo).
SlideToLock "slide to lock money" → `LOCK_ESCROW` → success state: seal animation (a ring that
draws in 600 ms + "sealed." Fraunces 40 + mono voucher hash prefix) → auto close 1.4 s.

### 7.12 Live check (`/deal/[id]/inspect`)
- **Seller view** (state INSPECTION_LIVE): `expo-camera` CameraView full screen with HUD corner
  brackets (4 L-shapes, paccha), top: "LIVE" StatusPill + timer mm:ss + "checks 1/3". Bottom:
  current checklist step card ("show the screen turned on"), big shutter button → capture →
  resize → upload `evidence/<deal>/<n>.jpg` → `CHECK_ITEM {index, photo_url}` → next step. After last:
  "all checks sent. waiting for the buyer." Camera permission denied or no camera → **simulated
  fallback**: pick from gallery button + "use listing photo" (demo), clearly labelled "simulated".
- **Buyer view**: grid/list of checklist items; each shows spinner "waiting for seller…" then the
  photo with time; when all done (or anytime) NeoButton "looks good — mark verified"
  (`MARK_ASSAY_VERIFIED`) and ghost danger "something's off — freeze" (`RAISE_DISPUTE`).
- Checklists by category (3 items each), stored in deal.checklist at START_ASSAY:
  - phones/electronics: "show it powered on", "show the screen / display working", "show ports,
    edges and any scratches"
  - books: "show the cover", "show a random inside page", "show spine and corners"
  - rides: "show the frame and serial area", "show brakes and tyres", "show it moving or the
    chain"
  - fashion: "show the front", "show the label / size tag", "show any wear or marks"
  - default: "show the whole item", "show it working or its key detail", "show any damage"
- In-person alternative: buyer can choose "i'll check in person" from NextStepBar (FUNDED) →
  `CONFIRM_IN_PERSON` after meetup → ASSAY_VERIFIED.

### 7.13 Receipt & release (`/deal/[id]/receipt`)
Perforated receipt card (zigzag edges via SVG), lines: item, amount, seller, buyer, short code,
voucher hash (mono, 16 chars + copy), timestamps. Buyer in ASSAY_VERIFIED: SlideToLock (accent
paccha) "slide to release money" → `RELEASE_FUNDS` → stamp animation "RELEASED" rotated −8°,
scale 1.6→1 with 12 burst lines, haptic success → CTA "rate <seller>" → review. Seller sees "money
arrives when the buyer releases." and after release "₹950 added to your wallet."

### 7.14 Freeze (`/deal/[id]/freeze`) & verdict
- Header eyebrow "RESOLUTION DESK". CountdownRing 90 s from `freeze_ends_at` using server clock
  offset. Below: "both sides can add one short statement." Statement field (≤280) + "add statement"
  (`ADD_STATEMENT`). Shows both statements when present.
- Every 3 s call `m_resolve_if_due(token, deal_id)`; when the deal leaves DISPUTED_FROZEN show
  **VerdictCard**: Fraunces 32 "verdict: 70 / 30" (or "full refund"), split bars (seller accent
  paccha, buyer purple) with amounts, reason text from server (§8.5), "this is final for the
  demo." CTA "back to deal".

### 7.15 Review (`/deal/[id]/review`)
5 large star toggles (lucide Star, filled paccha), optional text ≤200, tags chips ("on time",
"as described", "friendly", "fair price"). Submit → `LEAVE_REVIEW` → toast → deal room.

### 7.16 Wallet (`/wallet`)
Big balance Price Fraunces 48 + currency code. Banner (card2): "demo credits. no real money moves
in this version." Buttons: "top up demo credits" (+ fixed amount per currency, max 3 per day).
List of wallet_tx (signup bonus, locked for MD-…, released from MD-…, refund, split).

### 7.17 Profile & settings (`/profile`)
AvatarRing 88, name (tap to edit), phone (masked except last 4), campus, rating/deals.
ListGroups:
- "mode": row "selling mode" Switch (synced with global mode).
- "account": edit name, campus, bio; language; currency (only changeable while wallet has no
  pending escrow; converting balance not needed — credits are per-currency wallet, create new wallet
  with signup bonus equivalent? **No**: currency change just changes display/default for new
  listings; wallets are per currency — create wallet row on first use with 0 balance; keep it
  simple and show "listing prices use your currency").
- "activity": my listings, saved, wallet, reviews about me.
- "help": how it works, safety tips, "reset demo data" (only for demo accounts), app version.
- "security": change PIN (old → new → confirm), log out, delete account (Dialog confirm; RPC
  anonymises profile, removes listings, keeps deals for counterpart history with name "deleted
  user").

### 7.18 Guide & safety
Guide: 4 numbered steps with icons — "offer or buy", "money locks in escrow", "see it live or in
person", "release, or freeze for a fair split". Safety: meet in public campus spots in daylight,
never pay outside the app, check the item before releasing, use freeze if pressured, don't share
OTPs/UPI pins with anyone.

### 7.19 Seller public profile (`/seller/[id]`)
AvatarRing, name, campus, member since, rating, deals done, bio, active listings grid, latest 5
reviews.

---

## 8. Backend specification (Supabase)

Files:
- `apps/mobile/supabase/migrations/001_mudra_schema.sql`
- `apps/mobile/supabase/migrations/002_mudra_rpc.sql`
- `apps/mobile/supabase/migrations/003_mudra_realtime_storage.sql`
- `apps/mobile/supabase/seed/seed.mjs`
- `apps/mobile/scripts/migrate.mjs` — reads root `../../.env` (use `dotenv` with explicit path),
  applies migrations in order inside a transaction each, upserts secrets, runs
  `notify pgrst, 'reload schema'`. Idempotent (`create ... if not exists`, `create or replace`).
- `apps/mobile/scripts/smoke.mjs` — calls RPCs **through supabase-js with the publishable key**
  (exactly like the app) and asserts a full deal lifecycle (§8.9).

### 8.1 Schema DDL (write it fully; this is the contract)

```sql
create schema if not exists mudra;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists mudra.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  pin_hash text not null,
  primary_role text not null default 'both' check (primary_role in ('buy','sell','both')),
  locale text not null default 'en' check (locale in ('en','hi','ta','mr','es')),
  currency text not null default 'INR' check (currency in ('INR','USD','EUR','GBP','SGD','AED','CAD','AUD')),
  campus text check (char_length(campus) <= 60),
  bio text check (char_length(bio) <= 200),
  avatar_hue int not null default (floor(random()*360))::int,
  rating_sum int not null default 0, rating_count int not null default 0,
  deals_done int not null default 0,
  is_demo_bot boolean not null default false,
  is_demo_account boolean not null default false,
  failed_pin_attempts int not null default 0,
  locked_until timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists mudra.sessions (
  token_hash text primary key,              -- encode(digest(token,'sha256'),'hex')
  profile_id uuid not null references mudra.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);

create table if not exists mudra.wallets (
  profile_id uuid not null references mudra.profiles(id) on delete cascade,
  currency text not null,
  balance_minor bigint not null default 0 check (balance_minor >= 0),
  topups_today int not null default 0, topup_day date,
  primary key (profile_id, currency)
);
create table if not exists mudra.wallet_tx (
  id bigserial primary key,
  profile_id uuid not null references mudra.profiles(id) on delete cascade,
  currency text not null, amount_minor bigint not null,  -- +credit / -debit
  kind text not null check (kind in ('signup_bonus','topup','escrow_lock','escrow_release','refund','split','reset')),
  deal_id uuid, note text, created_at timestamptz not null default now()
);

create table if not exists mudra.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references mudra.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  category text not null check (category in ('books','electronics','phones','home','rides','fashion','sports','hobbies','tickets','other')),
  condition text not null check (condition in ('new','like_new','good','fair')),
  kind text not null check (kind in ('sell','swap','free')),
  price_minor bigint not null default 0,
  currency text not null,
  photos text[] not null check (array_length(photos,1) between 1 and 6),
  meetup_spot text check (char_length(meetup_spot) <= 80),
  campus text,
  status text not null default 'active' check (status in ('active','reserved','sold','removed')),
  search tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((kind = 'sell' and price_minor > 0) or (kind <> 'sell' and price_minor = 0))
);
create index if not exists listings_feed_idx on mudra.listings (status, created_at desc);
create index if not exists listings_search_idx on mudra.listings using gin (search);
create index if not exists listings_title_trgm on mudra.listings using gin (title extensions.gin_trgm_ops);

create table if not exists mudra.saves (
  profile_id uuid references mudra.profiles(id) on delete cascade,
  listing_id uuid references mudra.listings(id) on delete cascade,
  created_at timestamptz default now(), primary key (profile_id, listing_id)
);

create sequence if not exists mudra.deal_seq;
create table if not exists mudra.deals (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,  -- 'MD-' || to_char(now(),'YYMM') || '-' || lpad(nextval('mudra.deal_seq')::text,4,'0')
  listing_id uuid not null references mudra.listings(id),
  buyer_id uuid not null references mudra.profiles(id),
  seller_id uuid not null references mudra.profiles(id),
  kind text not null,                       -- copy of listing.kind
  amount_minor bigint not null default 0,
  currency text not null,
  swap_offer text,
  state text not null default 'OFFERED' check (state in ('OFFERED','CREATED','FUNDED','INSPECTION_LIVE','ASSAY_VERIFIED','RELEASED','DISPUTED_FROZEN','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')),
  version int not null default 1,
  offer_by uuid not null,                   -- who made the latest offer
  inspection_mode text check (inspection_mode in ('live','in_person')),
  checklist jsonb not null default '[]',    -- [{label, photo_url, at}]
  escrow_locked_minor bigint not null default 0,
  verified_before_freeze boolean not null default false,
  frozen_from_state text, frozen_at timestamptz, freeze_ends_at timestamptz, frozen_by uuid,
  buyer_statement text, seller_statement text,
  verdict jsonb,                            -- {seller_pct, buyer_pct, seller_minor, buyer_minor, reason}
  buyer_unread int not null default 0, seller_unread int not null default 0,
  buyer_reviewed boolean not null default false, seller_reviewed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists deals_one_open_per_buyer on mudra.deals (listing_id, buyer_id)
  where state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED');
create index if not exists deals_buyer_idx on mudra.deals (buyer_id, updated_at desc);
create index if not exists deals_seller_idx on mudra.deals (seller_id, updated_at desc);

create table if not exists mudra.messages (
  id bigserial primary key,
  deal_id uuid not null references mudra.deals(id) on delete cascade,
  sender_id uuid,                           -- null for system
  kind text not null check (kind in ('text','quick','offer','system','escrow','receipt','verdict','evidence')),
  body text not null default '',
  quick_key text,
  payload jsonb not null default '{}',
  lang text not null default 'en',
  translations jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists messages_deal_idx on mudra.messages (deal_id, id);

create table if not exists mudra.vouchers (
  id bigserial primary key,
  deal_id uuid not null references mudra.deals(id),
  event text not null,
  payload jsonb not null,
  prev_hash text not null,
  hash text not null,                       -- sha256(prev_hash || event || payload::text)
  created_at timestamptz not null default now()
);
-- append-only
create or replace function mudra.vouchers_no_update() returns trigger language plpgsql as
$$ begin raise exception 'MUDRA:FORBIDDEN:vouchers are append-only'; end $$;
drop trigger if exists vouchers_append_only on mudra.vouchers;
create trigger vouchers_append_only before update or delete on mudra.vouchers
  for each row execute function mudra.vouchers_no_update();

create table if not exists mudra.reviews (
  id bigserial primary key,
  deal_id uuid not null references mudra.deals(id),
  author_id uuid not null references mudra.profiles(id),
  subject_id uuid not null references mudra.profiles(id),
  stars int not null check (stars between 1 and 5),
  body text check (char_length(body) <= 200),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (deal_id, author_id)
);
create table if not exists mudra.reports (
  id bigserial primary key, reporter_id uuid, listing_id uuid, deal_id uuid, profile_id uuid,
  reason text not null, note text, created_at timestamptz default now()
);
create table if not exists mudra.idempotency (
  key text primary key, profile_id uuid not null, response jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists mudra.secrets (key text primary key, value text not null);
revoke all on all tables in schema mudra from anon, authenticated;
revoke usage on schema mudra from anon, authenticated;
```

Signup credits (minor units): INR 2,500,000 (₹25,000); USD 30,000 ($300); EUR 30,000; GBP 25,000;
SGD 40,000; AED 110,000; CAD 40,000; AUD 45,000. Top-up: same amount ÷ 5, max 3/day.

### 8.2 Helper functions (internal, schema mudra, not granted)
- `mudra.auth(p_token text) returns mudra.profiles` — hash token, find session not expired, profile
  not deleted; update `last_seen_at` (at most once per minute); else raise `MUDRA:AUTH`.
- `mudra.auth_opt(p_token)` — returns null instead of raising when token null/invalid (guest).
- `mudra.new_token() returns text` — `encode(extensions.gen_random_bytes(32),'hex')`.
- `mudra.emit(p_recipient uuid, p_deal uuid, p_kind text)` — insert into `public.m_events`.
- `mudra.voucher(p_deal uuid, p_event text, p_payload jsonb) returns text` — chain hash using last
  voucher hash of the deal (or `'genesis'`), returns hash.
- `mudra.wallet_move(p_profile, p_currency, p_amount, p_kind, p_deal, p_note)` — upsert wallet,
  update balance (raise `MUDRA:INSUFFICIENT_FUNDS` if would go negative), insert wallet_tx.
- `mudra.sys_msg(p_deal, p_kind, p_body, p_payload)` — insert system-ish message, bump both unread.
- `mudra.deal_json(p_deal mudra.deals, p_me uuid) returns jsonb` — full deal for client:
  `id, short_code, state, version, kind, amount_minor, currency, swap_offer, my_role ('buyer'|
  'seller'), listing {id,title,photo,category,status}, counterpart {id,name,avatar_hue,rating,
  deals_done,is_demo_bot, phone (only when state not in OFFERED/CREATED/DECLINED/CANCELLED)},
  offer_by_me bool, inspection_mode, checklist, escrow_locked_minor, frozen_from_state,
  freeze_ends_at, buyer_statement, seller_statement, verdict, unread (mine), reviewed_by_me,
  story_stage (1..4), allowed_actions text[], next_step {text_key, action}, server_now, created_at,
  updated_at`.
- `mudra.allowed_actions(d mudra.deals, me uuid) returns text[]` — implements §8.3 exactly.
- `mudra.scrub_pii(t text) returns text` — regex replace with `•••` (phones `\+?\d[\d\s-]{8,}\d`,
  emails, `\S+@[a-z]+` UPI, `\b\d{4}\s?\d{4}\s?\d{4}\b`, `[A-Z]{5}[0-9]{4}[A-Z]`).
- `mudra.checklist_for(category text) returns jsonb` — §7.12.

### 8.3 Deal FSM — single source of truth (`m_deal_action`)

Payload: `p_token, p_deal_id uuid, p_action text, p_expected_version int, p_payload jsonb default
'{}', p_idem text default null`.
Process: auth → if `p_idem` exists in idempotency for this profile return stored response →
`select ... for update` the deal → caller must be buyer or seller (else FORBIDDEN) → if
`version <> p_expected_version` raise `MUDRA:VERSION_CONFLICT` → check action ∈ allowed_actions
(else `MUDRA:BAD_STATE:<state>`) → apply → `version = version + 1, updated_at = now()` → voucher for
money/state events → system message → emit events to both → store idempotency → return deal_json.

| From state | Action | Who | Effect / To |
| :--- | :--- | :--- | :--- |
| OFFERED | ACCEPT | not `offer_by` | amount>0 → **CREATED**; amount=0 (swap/free) → **FUNDED** (no money) ; sys msg "offer accepted" |
| OFFERED | COUNTER `{amount_minor, swap_offer?}` | not `offer_by` | stays OFFERED, `offer_by = me`, amount updated, offer message card |
| OFFERED | DECLINE | not `offer_by` | **DECLINED** |
| OFFERED | CANCEL | `offer_by` | **CANCELLED** |
| CREATED | LOCK_ESCROW | buyer | wallet debit amount (`escrow_lock`), `escrow_locked_minor = amount`, listing → reserved, **FUNDED**, voucher `ESCROW_LOCKED`, msg kind escrow |
| CREATED | CANCEL | either | **CANCELLED** |
| FUNDED | START_ASSAY | seller | `inspection_mode='live'`, checklist = checklist_for(category), **INSPECTION_LIVE** |
| FUNDED | CHOOSE_IN_PERSON | buyer | `inspection_mode='in_person'` (stays FUNDED; next step shows confirm) |
| FUNDED | CONFIRM_IN_PERSON | buyer | **ASSAY_VERIFIED** |
| FUNDED | RAISE_DISPUTE `{reason}` | either | → freeze (below) |
| FUNDED | CANCEL | seller | refund buyer full (`refund`), listing → active, **REFUNDED** |
| INSPECTION_LIVE | CHECK_ITEM `{index, photo_url}` | seller | set checklist[index].photo_url/at, evidence message |
| INSPECTION_LIVE | MARK_ASSAY_VERIFIED | buyer | **ASSAY_VERIFIED**, voucher `ASSAY_VERIFIED` |
| INSPECTION_LIVE | RAISE_DISPUTE | either | → freeze |
| ASSAY_VERIFIED | RELEASE_FUNDS | buyer | seller credit `escrow_locked_minor` (`escrow_release`), listing → sold, other open deals on listing → DECLINED (+ refunds if funded), both `deals_done+1`, **RELEASED**, voucher `RELEASED`, msg kind receipt |
| ASSAY_VERIFIED | RAISE_DISPUTE | buyer | `verified_before_freeze = true`, → freeze |
| DISPUTED_FROZEN | ADD_STATEMENT `{text ≤280}` | either, once each | store statement, msg |
| RELEASED / ARBITRATED_SPLIT / REFUNDED (+ swap/free FUNDED→RELEASED path) | LEAVE_REVIEW `{stars, body, tags}` | either, once | insert review, update subject rating_sum/count |

Swap/free deals: no money. After FUNDED (accepted) they follow the same inspection path; RELEASE_FUNDS
(label "complete swap" / "got it") just marks listing sold and RELEASED. Freeze on a zero-money deal
→ verdict "deal cancelled, no money involved" → CANCELLED.

**Freeze**: `frozen_from_state = state, frozen_at = now(), freeze_ends_at = now() + 90s,
frozen_by = me`, state **DISPUTED_FROZEN**, voucher `FROZEN`, system message, payload.reason.

### 8.4 Next step table (client `src/features/deals/nextStep.ts`, keyed by state + my_role)

| State | Buyer sees | Seller sees |
| :--- | :--- | :--- |
| OFFERED (I offered) | "waiting for <name> to respond." (button: "cancel offer") | same text, button "cancel offer" |
| OFFERED (they offered) | "<name> countered <price>." → "accept" (+ counter/decline in card) | "<name> offered <price>." → "accept" |
| CREATED | "lock <price> in escrow so <name> knows you're serious." → **"lock money"** (escrow sheet) | "waiting for <name> to lock the money." |
| FUNDED (no mode) | "money's locked. ask for a live check, or meet in person." → "i'll check in person" | "money's locked. show the item live." → **"start live check"** |
| FUNDED (in_person) | "after you've met and checked it:" → **"confirm it's good"** | "meet <name> at <spot>. they'll confirm in the app." |
| INSPECTION_LIVE | "<n>/3 checks in. happy?" → **"mark verified"** | "show check <n+1>: <label>" → **"open camera"** |
| ASSAY_VERIFIED | "all good? release the money to <name>." → **"release money"** (receipt) | "verified. waiting for <name> to release." |
| DISPUTED_FROZEN | "frozen. resolution in <mm:ss>." → "open resolution desk" | same |
| RELEASED | "done. how was <name>?" → "leave a review" (or "view receipt" if reviewed) | "<price> added to your wallet." → "leave a review" |
| ARBITRATED_SPLIT / REFUNDED | "resolved: <verdict short>." → "view verdict" | same |
| DECLINED / CANCELLED | "this deal is closed." → "browse similar" | "this deal is closed." |

### 8.5 Resolution (`m_resolve_if_due(token, deal_id)`)
Callable by either party; if state = DISPUTED_FROZEN and `now() >= freeze_ends_at`:
- `checks_done` = count of checklist items with photo_url.
- If `verified_before_freeze` or `frozen_from_state = 'ASSAY_VERIFIED'` or (inspection_mode =
  'in_person' and frozen_from_state='ASSAY_VERIFIED') or checks_done = total(>0) → **70% seller / 30%
  buyer**, reason "the item was verified before the freeze, so most of the money goes to the
  seller."
- Else if checks_done ≥ 1 → **30% seller / 70% buyer**, reason "the live check was only partly
  done, so most of the money goes back to the buyer."
- Else (no evidence) → **REFUNDED** 100% buyer, reason "no proof of the item was shown, so the buyer
  gets a full refund."
- Money: split `escrow_locked_minor` (seller share = floor(amount*pct/100), buyer = rest), wallet
  moves `split`/`refund`, listing → active if refunded else sold, state ARBITRATED_SPLIT or REFUNDED,
  verdict jsonb, voucher `VERDICT`, verdict message, emit.
- Also: `delete from public.m_events where created_at < now() - interval '1 day'`.
Return deal_json (or current deal if not due).

### 8.6 Demo bots (`m_demo_tick(token, deal_id)`)
Only acts if the counterpart `is_demo_bot` and at least 2 s since `updated_at` (natural pacing):
- **Bot seller**: OFFERED & buyer offered → if amount ≥ 85% of listing price → ACCEPT else COUNTER
  at round(midpoint(amount, price)) with message "can do <price>. it's in great shape." ·
  FUNDED → send "locked, thanks. going live now." then START_ASSAY · INSPECTION_LIVE → one
  CHECK_ITEM per tick using listing photos (cycle) · RELEASED → LEAVE_REVIEW 5 stars "smooth deal"
  · on buyer text message → reply with a canned friendly line every ~2 ticks (pick from 5 lines,
  not repeating the last).
- **Bot buyer**: OFFERED & seller countered → ACCEPT · CREATED → LOCK_ESCROW (bots have large
  wallets) · INSPECTION_LIVE and all checks done → MARK_ASSAY_VERIFIED · ASSAY_VERIFIED →
  RELEASE_FUNDS · FUNDED & mode null → wait for seller (if seller idle 60 s send "can you show it
  live?") · RELEASED → review 5 stars.
- **Auto-offer**: inside `m_create_listing`, if the seller has never received an offer, a random
  bot buyer creates an OFFERED deal at 85% of price (or a swap/free request) with a quick message
  "hi! is this still available?" — so a new seller instantly sees the flow. Mark message as from
  the bot. (Only for the first listing of each user.)
Bots never act on deals between two humans.

### 8.7 Seed data (`seed.mjs`)
- 8 bot profiles (is_demo_bot): Priya Nair (IIT Bombay), Aarav Mehta (BITS Pilani), Sara Kim
  (NUS Singapore), Diego Ramírez (UC Berkeley), Ananya Iyer (Anna University), Rohan Kulkarni
  (COEP Pune), Emma Clarke (UCL London), Kabir Shah (Delhi University). PIN random (bots never log
  in). Locales mixed (hi, ta, mr, es, en).
- 2 judge demo accounts (is_demo_account, PIN **1234**):
  - **Rajesh Natarajan** `+919000000001`, buyer, INR, campus "IIT Bombay". Seeded deal: CREATED with
    bot seller Priya Nair for "casio fx-991ex calculator" ₹950 (state CREATED → his next step is
    "lock money").
  - **Vikramjeet Singh** `+919000000002`, seller, INR, campus "IIT Bombay". Has listing "hercules
    roadeo cycle" ₹6,500 with an OFFERED deal from bot buyer Aarav Mehta at ₹5,500.
- ~40 listings across categories, kinds (≈30 sell, 5 swap, 5 free), currencies mostly INR with a
  few USD/SGD/GBP for international feel. Titles/descriptions realistic student items (books:
  "hc verma concepts of physics vol 1", electronics: "boat rockerz 450 headphones", phones: "iphone
  12 64gb, battery 86%", rides: "hero sprint cycle, new tyres", home: "study lamp, warm light",
  fashion: "denim jacket, size m", sports: "cosco badminton racquet pair", hobbies: "yamaha f310
  acoustic guitar", tickets: "mood indigo day pass" …).
- Photos: use the 60 verified Unsplash IDs below. **Look at each image** (download to
  `apps/mobile/assets/seed/` and view) and assign it to a matching title; drop or retitle mismatches.
  Upload each to storage `seed/<id>.jpg` and use the public URL (do not hotlink Unsplash in the DB).
  URL to download: `https://images.unsplash.com/photo-<id>?w=800&q=80`.

```
1517336714731-489689fd1ca8 1496181133206-80ce9b88a853 1505740420928-5e560c06d30e 1523275335684-37898b6baf30
1542291026-7eec264c27ff    1491553895911-0055eca6402d 1526170375885-4d8ecf77b99f 1516035069371-29a1b244cc32
1485965120184-e220f721d03e 1532298229144-0ec0c57515c7 1544947950-fa07a98d237f    1512820790803-83ca734da794
1495446815901-a7297e633e8d 1555041469-a586c61ea9bc    1586023492125-27b2c045efd7 1503602642458-232111445657
1510915361894-db8b60106cb1 1593642632559-0c6d3fc62b89 1592899677977-9c10ca588bbd 1511707171634-5f897ff02aa9
1546868871-7041f2a55e12    1434056886845-dac89ffe9b56 1576435728678-68d0fbf94e91 1606813907291-d86efa9b94db
1588872657578-7efd1f1555ed 1556905055-8f358a7a47b2    1551028719-00167b16eac5    1434389677669-e08b4cac3105
1517836357463-d25dfeac3438 1507473885765-e6ed057f782c 1524758631624-e2822e304c36 1518455027359-f3f8164ba6bd
1583394838336-acd977736f90 1484704849700-f032a568e944 1546435770-a3e426bf472b    1608043152269-423dbba4e7e1
1600185365483-26d7a4cc7519 1560343090-f0409e92791a    1553062407-98eeb64c6a62    1547949003-9792a18a2601
1520045892732-304bc3ac5d8e 1558618666-fcd25c85cd64    1593359677879-a4bb92f829d1 1550009158-9ebf69173e03
1599058917212-d750089bc07e 1585771724684-38269d6639fd 1567016376408-0226e4d0c1ea 1609081219090-a6d81d3085bf
1622560480605-d83c853bc5c3 1581235720704-06d3acfcb36f 1544244015-0df4b3ffc6b0    1585386959984-a4155224a1ad
1611186871348-b1ce696e52c9 1572569511254-d8f925fe2cbb 1574944985070-8f3ebc6b79d2 1589003077984-894e133dabab
1556228453-efd6c1ff04f6    1622260614153-03223fb72052 1520975954732-35dd22299614 1511379938547-c1f69419868d
```

- `m_reset_demo(token)` (demo accounts only): deletes the caller's deals/messages/listings created
  after seed, restores wallet to signup credit, re-creates the seeded deal/listing. Seed script and
  reset share one SQL function `mudra.seed_demo_for(profile_id)`.
- Seed is idempotent (upsert by phone / fixed UUIDs for seed listings).

### 8.8 Public RPC list (all `public.m_*`, security definer, granted to anon)
Every function takes `p_token text` first (nullable where guest allowed) and returns `jsonb`.

| RPC | Args (after token) | Returns / notes |
| :--- | :--- | :--- |
| m_ping | — (no token) | `{ok:true, server_now}` |
| m_signup | p_name, p_phone, p_pin, p_role, p_locale, p_currency, p_campus? | `{token, me}`; validates pin `^\d{4}$`; PHONE_TAKEN; creates wallet + signup bonus tx; rate limit: max 5 signups/min globally per phone prefix not needed — skip |
| m_login | p_phone, p_pin | `{token, me}`; BAD_PIN with `detail = remaining tries`; 5 fails → locked_until now()+5min → LOCKED:<minutes> |
| m_logout | — | deletes session |
| m_me | — | profile (no pin_hash), wallet balances, counts (active listings, needs_you, unread) |
| m_update_profile | p_patch jsonb (name, campus, bio, locale, currency, primary_role) | me |
| m_change_pin | p_old, p_new | ok |
| m_delete_account | p_pin | anonymise (name 'deleted user', phone '+0' || id-digits? → use `'+999' || floor(random()*1e11)`), listings removed, sessions deleted |
| m_feed | p_filters jsonb `{q, category, kind, condition, min, max, campus_only, sort, exclude_mine}`, p_limit (≤40), p_offset | `[listing_card]` active only; q → `search @@ plainto_tsquery('simple', q) or title % q` (trgm) |
| m_listing | p_listing_id | listing full + seller card + saved_by_me + my_open_deal_id |
| m_create_listing | p_data jsonb | listing; currency = my currency; triggers bot auto-offer (§8.6) |
| m_update_listing | p_listing_id, p_patch | owner only, not when reserved/sold |
| m_set_listing_status | p_listing_id, p_status ('active','removed','sold') | owner only |
| m_my_listings | — | listings with offer counts |
| m_toggle_save / m_saved | p_listing_id / — | bool / listing cards |
| m_seller_profile | p_profile_id | public profile + active listings + last 5 reviews |
| m_start_deal | p_listing_id, p_amount_minor?, p_swap_offer?, p_note?, p_idem? | deal_json; OWN_LISTING, LISTING_UNAVAILABLE; if open deal exists return it; kind sell with amount = price → "buy now": create OFFERED then auto ACCEPT? **No** — buy-now at full price creates the deal directly in **CREATED** (seller already agreed via listing price) ; lower amount → OFFERED |
| m_deal_action | see §8.3 | deal_json |
| m_deals | p_role ('buyer','seller','all') | `[deal summary]` ordered needs_you first then updated_at desc |
| m_deal | p_deal_id | deal_json; marks unread 0 for me |
| m_messages | p_deal_id, p_after_id bigint default 0 | `[message]` ascending, max 200 |
| m_send_message | p_deal_id, p_body, p_quick_key?, p_client_id? | message; masks phones before FUNDED; bump counterpart unread; emit |
| m_translate_message | p_message_id, p_target | `{text}` or null |
| m_resolve_if_due | p_deal_id | deal_json |
| m_demo_tick | p_deal_id | deal_json |
| m_wallet | — | balances + last 50 tx |
| m_topup_demo | — | wallet |
| m_report | p_target jsonb `{listing_id?, deal_id?, profile_id?}`, p_reason, p_note | ok |
| m_reset_demo | — | ok (demo accounts only) |

Listing card JSON: `{id,title,price_minor,currency,kind,condition,category,photo,campus,meetup_spot,
status,created_at,seller:{id,name,avatar_hue,rating}}`. Rating = round(sum/count,1) or null.

### 8.9 Smoke test (`node scripts/smoke.mjs`) — must pass before UI work on deals
Using supabase-js + publishable key only:
1. m_ping. 2. signup two fresh users (random +1555… numbers) A seller, B buyer. 3. A creates sell
listing (price 1000.00) with a seed photo URL. 4. B m_feed finds it by q. 5. B m_start_deal at 80%
→ OFFERED. 6. A COUNTER 90% → B ACCEPT → CREATED. 7. B LOCK_ESCROW → wallet decreased. 8. A
START_ASSAY → 3× CHECK_ITEM → B MARK_ASSAY_VERIFIED → B RELEASE_FUNDS → A wallet increased by
amount; listing sold. 9. Both LEAVE_REVIEW. 10. VERSION_CONFLICT test (stale version). 11. Second
pair: lock then RAISE_DISPUTE with 1 check → wait 91 s → m_resolve_if_due → ARBITRATED_SPLIT 30/70,
balances correct. 12. m_send_message with a phone number before FUNDED → masked. 13. Login with
wrong PIN 5× → LOCKED. 14. Demo accounts login with 1234 work. Print PASS/FAIL per step; exit 1 on
failure. Also verify `select` on `mudra.profiles` via REST with anon key fails (schema hidden).

---

## 9. Client data layer

### 9.1 Files
```
src/config/env.ts         reads process.env.EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY (from apps/mobile/.env, gitignored; commit .env.example)
src/lib/supabase.ts       createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false }, realtime: { params: { eventsPerSecond: 5 } } }); import 'react-native-url-polyfill/auto'
src/lib/rpc.ts            rpc<T>(name, args) → data or throws MudraError {code, detail, message(i18n)}
src/lib/errors.ts         code → friendly i18n message; NETWORK when fetch fails ("you're offline. we'll retry.")
src/lib/idem.ts           Crypto.randomUUID()
src/lib/money.ts          formatMoney(minor, currency, locale), parseMoneyInput
src/lib/time.ts           relativeTime(date, now) own impl; serverOffset store
src/lib/phone.ts          libphonenumber-js helpers + countries list
src/lib/upload.ts         pick/capture → manipulate → upload → public URL
src/lib/realtime.ts       subscribeEvents(myId, queryClient) — channel `events:<id>`, postgres_changes INSERT on public.m_events filter recipient_id=eq.<id>; reconnect on AppState active
src/state/session.ts      zustand: token, me, mode, locale, hydrate(), login(), logout()
src/features/**           hooks per domain: useFeed, useListing, useDeal(id) (+ polling + demo tick), useMessages(id), useDealAction(id) (mutation with expected_version from cache; on VERSION_CONFLICT refetch + toast "updated — try again"), useWallet …
```

`.env` (create from root `.env` values for URL + publishable key ONLY; never other keys):
```
EXPO_PUBLIC_SUPABASE_URL=https://ttpgogzqispnexpktrsv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<copy the value of EXPO_PUBLIC_SUPABASE_ANON_KEY from root .env>
```
Root `.env` already defines `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — copy
exactly those two lines into `apps/mobile/.env` and nothing else.
Release builds inline `EXPO_PUBLIC_*` at bundle time — confirm by checking the app connects in the
release APK (P0 gate pings `m_ping`).

### 9.2 Mutations
All money/state actions pass `p_idem = randomUUID()` generated once per user intent (store in a ref
so a retry reuses it). Disable buttons while pending. Optimistic only for messages.

### 9.3 Offline
`@react-native-community/netinfo` → top banner "offline" (card3), React Query `onlineManager`
wired to NetInfo. Composer queues nothing (send disabled offline).

### 9.4 Quick replies (pre-translated; key → text per locale)
Keys: `still_available`, `lowest_price`, `where_meet`, `show_live`, `deal`, `locked`, `going_live`,
`thanks`, `on_my_way`. Server stores `quick_key`; receiver renders in own locale (no API call).

| key | en | hi | ta | mr | es |
| :--- | :--- | :--- | :--- | :--- | :--- |
| still_available | is this still available? | क्या यह अभी भी उपलब्ध है? | இது இன்னும் கிடைக்குமா? | हे अजून उपलब्ध आहे का? | ¿sigue disponible? |
| lowest_price | what's your lowest price? | आपकी सबसे कम कीमत क्या है? | உங்கள் குறைந்த விலை என்ன? | तुमची सर्वात कमी किंमत किती? | ¿cuál es tu precio más bajo? |
| where_meet | where can we meet? | हम कहाँ मिल सकते हैं? | நாம் எங்கே சந்திக்கலாம்? | आपण कुठे भेटू शकतो? | ¿dónde nos vemos? |
| show_live | can you show it live? | क्या आप इसे लाइव दिखा सकते हैं? | இதை நேரலையில் காட்ட முடியுமா? | तुम्ही हे लाइव्ह दाखवू शकता का? | ¿puedes mostrarlo en vivo? |
| deal | deal. | डील पक्की। | ஒப்பந்தம் சரி. | डील पक्की. | trato hecho. |
| locked | money's locked in escrow. | पैसे एस्क्रो में लॉक हैं। | பணம் எஸ்க்ரோவில் பூட்டப்பட்டது. | पैसे एस्क्रोमध्ये लॉक आहेत. | el dinero está en garantía. |
| going_live | going live now. | अभी लाइव आ रहा हूँ। | இப்போது நேரலைக்கு வருகிறேன். | आता लाइव्ह येतो. | entro en vivo ahora. |
| thanks | thanks! | धन्यवाद! | நன்றி! | धन्यवाद! | ¡gracias! |
| on_my_way | on my way. | रास्ते में हूँ। | வந்துகொண்டிருக்கிறேன். | निघालो आहे. | voy en camino. |

Show chips contextually: OFFERED → still_available, lowest_price, where_meet; CREATED/FUNDED →
show_live, locked (buyer), going_live (seller), where_meet, on_my_way; later → thanks.

---

## 10. Internationalisation

### 10.1 Setup
`i18next` + `react-i18next` (no ICU plugin needed). Files `src/i18n/{en,hi,ta,mr,es}.json`. Default
from device (`expo-localization`), override in settings, stored in profile.locale and locally.
English must be complete; for hi/ta/mr/es translate **all** UI strings yourself (you're capable;
keep them short, lowercase-style where the script has case). Missing key falls back to en.

### 10.2 Fonts for scripts
Outfit/Fraunces lack Devanagari/Tamil glyphs → Android falls back to system Noto automatically —
acceptable. For hi/ta/mr, render display headings with `F.uiSemi` instead of Fraunces (Fraunces
fallback looks broken in mixed text). Implement in `Text` via `useLocale()`.

### 10.3 Money
`formatMoney(minor, currency, locale)`: decimals 2 (all supported currencies), use
`Intl.NumberFormat(localeTag, { style:'currency', currency, maximumFractionDigits: minor % 100 === 0 ? 0 : 2 })`.
Hermes supports `Intl.NumberFormat` in RN 0.88 — but wrap in try/catch with a manual fallback
(symbol map ₹ $ € £ S$ AED C$ A$ + `toLocaleString`-free grouping; INR uses lakh grouping
12,34,567). Never use `Intl.RelativeTimeFormat` or `Intl.PluralRules`.

---

## 11. Project setup commands (Phase 0)

```powershell
cd D:\Hackathons\Nexconn
git checkout -b feat/android-app
cd apps
npx create-expo-app@latest mobile --template blank-typescript --no-install
cd mobile
npm install
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated react-native-worklets react-native-svg expo-image expo-haptics expo-font @expo-google-fonts/outfit @expo-google-fonts/fraunces @expo-google-fonts/jetbrains-mono expo-linear-gradient expo-secure-store @react-native-async-storage/async-storage expo-localization expo-camera expo-image-picker expo-image-manipulator expo-file-system expo-crypto expo-clipboard expo-splash-screen expo-system-ui expo-navigation-bar expo-build-properties @react-native-community/netinfo @shopify/flash-list react-native-keyboard-controller expo-blur
npm install @supabase/supabase-js react-native-url-polyfill zustand @tanstack/react-query lucide-react-native libphonenumber-js i18next react-i18next heroui-native uniwind tailwindcss tailwind-variants tailwind-merge
npm install -D pg dotenv sharp typescript @types/react jest-expo
```
(If heroui-native requires `@lodev09/react-native-true-sheet` for BottomSheet, install it with
`npx expo install`; we don't use HeroUI BottomSheet, so skip unless import fails.)

`app.json` (key parts):
```json
{
  "expo": {
    "name": "Mudra", "slug": "mudra", "scheme": "mudra", "version": "1.0.0",
    "orientation": "portrait", "userInterfaceStyle": "dark", "backgroundColor": "#0d0d0d",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#0d0d0d" },
    "android": {
      "package": "com.chanakya.mudra", "versionCode": 1,
      "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "monochromeImage": "./assets/adaptive-mono.png", "backgroundColor": "#0d0d0d" },
      "edgeToEdgeEnabled": true,
      "blockedPermissions": ["android.permission.RECORD_AUDIO"],
      "permissions": ["android.permission.CAMERA"]
    },
    "plugins": [
      "expo-router", "expo-font", "expo-secure-store", "expo-localization",
      ["expo-camera", { "cameraPermission": "Mudra uses the camera so sellers can show items live.", "recordAudioAndroid": false }],
      ["expo-image-picker", { "photosPermission": "Mudra needs your photos to add pictures to listings." }],
      ["expo-splash-screen", { "image": "./assets/splash.png", "backgroundColor": "#0d0d0d", "imageWidth": 160 }],
      ["expo-build-properties", { "android": { "minSdkVersion": 24, "enableProguardInReleaseBuilds": false, "enableShrinkResourcesInReleaseBuilds": false } }],
      "./plugins/withReleaseSigning"
    ],
    "experiments": { "typedRoutes": true }
  }
}
```
`package.json` main: `"main": "expo-router/entry"`.

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [__dirname];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
module.exports = withUniwindConfig(config, { cssEntryFile: './global.css' }); // must be outermost
```
`global.css`:
```css
@import 'tailwindcss';
@import 'uniwind';
@import 'heroui-native/styles';
@layer theme {
  :root {
    @variant dark {
      --background: #0d0d0d; --foreground: #ffffff; --muted: #8a8a8a;
      --surface: #121212; --surface-secondary: #1a1a1a; --surface-tertiary: #232323;
      --overlay: #1a1a1a; --default: #232323; --accent: #6a35ff; --accent-foreground: #ffffff;
      --field-background: #1a1a1a; --field-foreground: #ffffff; --field-placeholder: #8a8a8a; --field-border: #3d3d3d;
      --segment: #ffffff; --success: #3ddc84; --warning: #ff8744; --danger: #ff4d4d;
      --border: rgba(255,255,255,0.08); --link: #e5fe40;
    }
    @variant light { /* same values: app is dark-only */ }
  }
}
```
(Check the exact variable names in heroui-native's theming docs via the docs script; adjust names to
match; keep values.) Force dark: `Uniwind.setTheme('dark')` at startup, and wrap the root with
`HeroUINativeProvider` inside `GestureHandlerRootView` (+ `KeyboardProvider`, `SafeAreaProvider`,
`QueryClientProvider`).

Root `.gitignore` additions (apps/mobile/.gitignore): `node_modules/ .expo/ dist/ android/ ios/ .env
*.keystore *.jks`. (Android folder is generated by prebuild; don't commit it — prebuild is
reproducible. Exception: if you had to hand-edit native files, move edits into config plugins.)

### 11.1 Phase 0 gate checklist
1. `npx expo prebuild -p android --clean`.
2. Build from subst drive:
   ```powershell
   cd M:\android
   .\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon
   ```
   (`--no-daemon` avoids stuck daemons overnight; first build 15–30 min.)
3. Install on emulator: start `emulator -avd Pixel_10 -no-snapshot-load -no-audio` (background),
   `adb wait-for-device`, `adb install -r M:\android\app\build\outputs\apk\release\app-release.apk`.
4. Launch `adb shell monkey -p com.chanakya.mudra 1`, wait 8 s, `adb exec-out screencap -p >
   p0.png` (in PowerShell use `adb exec-out screencap -p | Set-Content -Encoding Byte p0.png` is
   unreliable → use `adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png p0.png`). Look at
   the screenshot: fonts render, HeroUI field renders, "ping ok" text from `m_ping`.
5. `adb logcat -d *:E | Select-String mudra -Context 0,5` for crashes.
Gate passes → commit "mobile: P0 scaffold + release build verified".

---

## 12. App icon, splash, signing

- `scripts/icons.mjs` (sharp): render LogoMark SVG (paccha M on black shield outline) →
  `assets/icon.png` 1024 (bg #0d0d0d, logo 70%), `adaptive-icon.png` 1024 transparent with logo in
  66% safe zone, `adaptive-mono.png` white silhouette, `splash.png` 512 logo only. Look at outputs.
- Release signing: `plugins/withReleaseSigning.js` config plugin modifies `android/app/build.gradle`
  to add `signingConfigs.release` reading `MUDRA_UPLOAD_STORE_FILE`, `MUDRA_UPLOAD_STORE_PASSWORD`,
  `MUDRA_UPLOAD_KEY_ALIAS`, `MUDRA_UPLOAD_KEY_PASSWORD` from Gradle properties; if absent fall back
  to debug signing (still installable). Generate keystore once:
  ```powershell
  & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore "$env:USERPROFILE\.android\mudra-upload.keystore" -alias mudra -keyalg RSA -keysize 2048 -validity 10000 -storepass <random> -keypass <same> -dname "CN=Mudra, O=Team Chanakya, C=IN"
  ```
  Put the four properties in `$env:USERPROFILE\.gradle\gradle.properties` (user-level, outside
  repo). Generate the random password with `node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`;
  write it only to that file and mention its location (not the value) in MORNING_REPORT.md.
- `android/gradle.properties` additions via config plugin or `expo-build-properties`:
  `org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=1g`, `org.gradle.parallel=true`,
  `org.gradle.caching=true`.

### 12.1 Final build
```powershell
cd M:\android
.\gradlew.bat clean assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64 --no-daemon
New-Item -ItemType Directory -Force D:\Hackathons\Nexconn\apps\mobile\dist | Out-Null
Copy-Item M:\android\app\build\outputs\apk\release\app-release.apk D:\Hackathons\Nexconn\apps\mobile\dist\mudra-v1.0.0.apk
```
Also produce an arm64-only small APK for sharing: build with `-PreactNativeArchitectures=arm64-v8a`
→ `dist/mudra-v1.0.0-arm64.apk`. Report both sizes. (Universal APK expected ~60–90 MB.)

---

## 13. Folder structure

```
apps/mobile/
  app/ (routes, §5)
  src/
    config/ brand.ts env.ts
    theme/ tokens.ts motion.ts
    ui/ Text NeoButton VelvetCard ListGroup ListRow IconTile StatusPill Eyebrow SegmentedControl
        SlideToLock CountdownRing BilingualBubble OfferCard SystemLine AvatarRing PinPad
        ProgressSegments Sheet EmptyState Price ListingCard LogoMark Toast Skeleton TopBar BottomBar HudBrackets Receipt Stamp
    features/ auth/ feed/ listing/ deals/ chat/ escrow/ inspect/ freeze/ wallet/ profile/
    lib/ (§9.1)
    state/ session.ts mode.ts
    i18n/ index.ts en.json hi.json ta.json mr.json es.json quick.ts
  supabase/ migrations/ seed/
  scripts/ migrate.mjs smoke.mjs icons.mjs qa.ps1
  plugins/ withReleaseSigning.js
  assets/ fonts? (google-fonts packages supply) icon.png adaptive-icon.png adaptive-mono.png splash.png seed/
  global.css metro.config.js babel.config.js app.json tsconfig.json .env.example PROGRESS.md
```
TypeScript strict. Path alias `@/*` → `src/*` (tsconfig paths; babel-preset-expo handles via
`expo-router`/tsconfig paths support).

---

## 14. Code conventions
- Functional components, hooks, no class components. Files ≤ 300 lines; split otherwise.
- No `console.log` in release paths (use `__DEV__` guard).
- Every screen handles: loading (skeleton), error (inline card with "try again"), empty state.
- All user-facing strings through `t()`.
- No `any` unless interfacing untyped libs; define `Deal`, `Listing`, `Me`, `Message` types in
  `src/types.ts` mirroring §8 JSON.
- Accessibility labels on icon buttons.
- `npx tsc --noEmit` must pass at every phase end.

---

## 15. QA & self-verification (do this, you can't ask a human)

`scripts/qa.ps1` helpers: `Shot <name>` (screencap → `apps/mobile/qa/<name>.png`, qa/ gitignored),
`Deep <url>` (`adb shell am start -W -a android.intent.action.VIEW -d "<url>" com.chanakya.mudra`),
`Tap x y`, `Type text` (`adb shell input text`), `Back`.

After each UI phase: install the latest debug/release build, drive the main path with adb, take
screenshots, **look at them** and compare against `docs/02-design/cred-reference/after/*.png`.
Fix visual issues: text clipped, wrong fonts, white flashes, misaligned bottom bar, safe-area overlap
with status/nav bar (edge-to-edge!), keyboard covering composer.

Two-user test: emulator + smoke script acting as the other party (or the demo bots). Required
end-to-end runs before final build:
1. Fresh signup (new number) → home buy mode → open listing from bot seller → buy now → lock →
   bot starts live check → see 3 photos → mark verified → release → stamp → review.
2. Switch to sell mode → list an item with emulator camera/gallery photo → bot auto-offer arrives
   within seconds → counter → bot accepts → bot locks → start live check → camera capture (emulator
   virtual scene is fine) → bot verifies & releases → wallet increased.
3. Demo account Rajesh → seeded deal → lock → freeze → statement → wait 90 s → verdict shown.
4. Login wrong PIN ×5 → locked message. Logout/login. Kill app → reopen stays logged in.
5. Change language to hindi → UI switches; chat message from bot in another locale shows
   translation (or original if translation unavailable).
6. Airplane mode (`adb shell cmd connectivity airplane-mode enable`) → offline banner, no crash.
Write results (pass/fail + screenshot names) into PROGRESS.md.

Performance sanity: home scroll smooth on emulator; images sized (w=800) and cached by expo-image.

---

## 16. Phases, budgets, acceptance

| # | Phase | Budget | Acceptance |
| :--- | :--- | :--- | :--- |
| P0 | Scaffold, deps, Uniwind/HeroUI/fonts, `m_ping` screen, **release APK on emulator** | 1.5 h | §11.1 gate passes (or fallback logged) |
| P1 | Backend: migrations 001–003, migrate script, seed (photos viewed+uploaded), smoke test | 1.5 h | `node scripts/smoke.mjs` all PASS; anon cannot read mudra tables |
| P2 | Design system primitives + TopBar/BottomBar shell + a `/dev/ui` gallery screen (dev only) | 1 h | Screenshot of gallery matches reference look |
| P3 | Auth: welcome, signup 5 steps, login, session persistence, guest mode, demo login | 45 m | QA run 4 passes |
| P4 | Home buy/sell + mode switch + explore + listing detail + saved + seller profile | 1.5 h | browse & switch works; screenshots |
| P5 | Create/edit listing + photo upload + my listings → **checkpoint release APK** | 45 m | listing with real photo visible in feed; `dist/mudra-checkpoint-1.apk` |
| P6 | Deals list + deal room chat + realtime + quick replies + translation + offers/counter + demo tick | 1.25 h | chat both ways with bot; offer/counter works |
| P7 | Escrow sheet, live check (camera + fallback), receipt/release/stamp, freeze/verdict, review, wallet | 1.5 h | QA runs 1–3 pass |
| P8 | Profile/settings, language, currency, change PIN, delete account, guide, safety, i18n complete → **checkpoint APK 2** | 45 m | QA run 5; `dist/mudra-checkpoint-2.apk` |
| P9 | Polish pass (unslop checklist §18), icons/splash, empty/error states, performance, a11y | 1 h | screenshots reviewed; tsc clean |
| P10 | Final universal + arm64 release builds, MORNING_REPORT.md, docs update, final commit | 45 m | APKs in dist, report written |

Total ≈ 12 h worst case; expected 9–11 h. If behind schedule after P7, skip P9 polish items in this
order: coachmark, seller tools tiles, fullscreen photo viewer, report dialog, delete account, draft
autosave. Never skip: auth, listing, deal flow, escrow, release, freeze, final APK.

---

## 17. Risk register & fallbacks (use without asking)

| Risk | Fallback |
| :--- | :--- |
| create-expo-app gives an SDK where heroui-native peers fail | Use `--legacy-peer-deps`; if runtime breaks, drop HeroUI/Uniwind (ADR-M3 fallback) |
| Uniwind classes don't apply in release | Drop Uniwind+HeroUI; everything StyleSheet |
| Gradle: "Unsupported class file major version" | JAVA_HOME not JBR — fix env (§2) |
| CMake/ninja path too long | Build from `M:\` subst drive; if still failing, `subst N: D:\Hackathons\Nexconn\apps\mobile\android` and build there; or enable `org.gradle.project.buildDir` shorter not needed |
| SDK platform missing (e.g. 36) | Gradle downloads automatically (licenses accepted). If not: download cmdline-tools zip from dl.google.com, `sdkmanager "platforms;android-36" "build-tools;36.0.0"` |
| NDK version mismatch | Read `ndkVersion` from `node_modules/react-native/gradle/libs.versions.toml`; let Gradle download, or set `expo-build-properties android.ndkVersion` to installed `27.0.12077973` if compatible |
| Emulator won't boot / too slow | Use `-gpu swiftshader_indirect -no-boot-anim`; if still failing, create none — rely on smoke tests + build success, note in report |
| `http` extension unavailable | Translation returns null; UI shows original + quick replies still translated |
| Realtime doesn't deliver | Polling already covers it |
| Storage upload fails from RN | Try `fetch(uri)` → `arrayBuffer()`; then base64 via `expo-file-system` + `decode` from `base64-arraybuffer` |
| Camera crashes on emulator | Simulated fallback path (gallery / listing photo), labelled "simulated" |
| Keyboard covers composer | react-native-keyboard-controller `KeyboardStickyView`; else `android.softwareKeyboardLayoutMode: "resize"` + disable edge-to-edge for that screen |
| Reanimated/worklets build error | Match versions with `npx expo install --fix`; clear `M:\android\app\.cxx` and rebuild |
| Release APK crashes but debug works | `adb logcat` → usually missing `EXPO_PUBLIC_*` or proguard (disabled already) or font names |
| Supabase paused/unreachable | Retry 3× over 10 min; continue UI work against mocked `rpc` (feature flag `EXPO_PUBLIC_MOCK=1`) and note prominently |
| Time overrun | §16 skip order |

---

## 18. Polish checklist (from the unslop skill — apply, don't wait for approval)
Read `C:\Users\Harshad\.cursor\skills\unslop\SKILL.md` once for vocabulary only. This plan wins on
conflicts (eyebrow dot + live pulse are intended). Check: consistent 4/8 spacing; one accent per
mode; no centered paragraphs except welcome/done; copy specific not generic ("lock ₹950" not
"proceed"); icons consistent stroke; numbers tabular; no emoji; no gradients except AvatarRing;
empty states helpful with action; loading skeletons match layout; buttons press feedback; nothing
touches screen edges (16 px gutters); status bar light content on black; nav bar black.

---

## 19. Out of scope (do not build)
Real payments/UPI, push notifications (FCM needs google-services), OTP/email/Google sign-in (banned),
iOS build, Play Store upload, Nexconn SDK on mobile, video streaming (burst photos instead), maps,
admin panel, web changes.

---

## 20. Morning handoff — `apps/mobile/MORNING_REPORT.md`
Write it last. Contents:
1. TL;DR: APK paths + sizes, what works, what doesn't.
2. Install: `adb install -r apps\mobile\dist\mudra-v1.0.0.apk` or copy to phone and open (allow
   unknown sources). Android Studio: File → Open `apps/mobile/android` (or `M:\android`), Build
   Variant `release`, run on Pixel_10 — note JAVA_HOME = JBR and the subst drive.
3. Demo accounts: Rajesh +91 90000 00001 / 1234 (buyer), Vikramjeet +91 90000 00002 / 1234
   (seller). "try the demo" on welcome.
4. 2-minute judge script: welcome → try demo (Rajesh) → deal → lock → watch live check → verify →
   release stamp → switch to sell → list item → bot offer.
5. QA results table (§15) with screenshot filenames.
6. Decisions made overnight + fallbacks used.
7. Known issues & next steps.
8. Tradeoffs: Android uses Supabase Realtime instead of Nexconn SDK (no RN SDK); demo credits
   instead of real money; translations via Gemini from the DB.
9. Keystore location (not password value) and how to rebuild:
   `cd M:\android; .\gradlew.bat assembleRelease`.
10. Supabase keep-alive: free projects pause after 7 days idle — added
   `.github/workflows/supabase-keepalive.yml` (daily cron calling `m_ping` with
   `secrets.SUPABASE_URL` / `secrets.SUPABASE_ANON_KEY`; user must add these repo secrets).

Also update `docs/03-engineering/MOBILE.md` with a short pointer to this plan and the real stack, and
add an `apps/mobile/README.md` (run/build instructions). Final commit
"mobile: P10 release v1.0.0".
