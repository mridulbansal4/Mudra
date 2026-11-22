# MUDRA Android App (`v1.0.0`) — Morning Report

## 1. TL;DR

- **Status**: Complete (Phases **P0 → P10** executed, verified on hosted Supabase `ttpgogzqispnexpktrsv` and Android 16 `Pixel_10` emulator).
- **Release APKs (`apps/mobile/dist/`)**:
  - `apps/mobile/dist/mudra-v1.0.0.apk` — **`110,276,116` bytes (`105.17 MB`)** — Universal release APK (`armeabi-v7a`, `arm64-v8a`, `x86_64`) signed with upload keystore.
  - `apps/mobile/dist/mudra-v1.0.0-arm64.apk` — **`56,184,777` bytes (`53.58 MB`)** — `arm64-v8a`-only release APK for physical Android phones.
  - `apps/mobile/dist/mudra-checkpoint-1.apk` & `apps/mobile/dist/mudra-checkpoint-2.apk` — **`58,808,900` bytes (`56.08 MB`)** each — P5 & P8 checkpoint release APKs.
- **What Works**:
  - **Zero-Friction Auth**: Sign-up in < 30s with only Name + Role (`buying` / `selling` / `both`) + E.164 Phone (`libphonenumber-js` + 40-country flag-free picker) + 4-digit PIN (bcrypt-hashed in PostgreSQL via `pgcrypto`, 5-attempt 5-minute lockout via non-transactional sequence slots). Guest mode (`browse without an account`) and 1-tap judge demo login (`Rajesh` buyer / `Vikramjeet` seller).
  - **One-Tap Buy/Sell Mode Switch**: In-place `buy | sell` segmented pill in the top bar with 220ms Reanimated crossfade, selection haptics, dynamic accent switching (Buy = `#6a35ff` purple, Sell = `#e5fe40` paccha), and morphing bottom-left action (`explore` ↔ `+ list`).
  - **Browse, Search & Listings**: Campus-prioritized feed (`m_feed` with `tsvector` + `pg_trgm` search), category/kind/condition/price/campus filters, 1–6 photo upload to Supabase Storage bucket `mudra-photos` (resized to 1280px JPEG 0.75 via `expo-image-manipulator` + `new File(uri).bytes()`), simulated sample campus photo fallback for emulators, draft autosave, saved items, and public seller profiles.
  - **Escrow Deal Room & Live Check**: Full 11-state Deal FSM (`m_deal_action`) with optimistic concurrency (`expected_version` / `VERSION_CONFLICT` recovery), idempotency keys, SHA-256 hash-chained `mudra.vouchers`, pre-`FUNDED` phone number masking (`•••`), `SlideToLock` escrow sheet, category-specific 3-step live camera check (`expo-camera` HUD brackets + gallery/listing photo simulated fallback), perforated SVG receipt with `RELEASED` stamp burst animation, 90-second Freeze Resolution Desk (`CountdownRing` + deterministic 70/30, 30/70, or 100% refund split verdict), and 5-star reviews.
  - **Bilingual Chat & 5 Locales**: Full UI localization in **English (`en`), Hindi (`hi`), Tamil (`ta`), Marathi (`mr`), and Spanish (`es`)**, 9 pre-translated contextual quick replies, and receiver-driven lazy Gemini translation (`m_translate_message`) with DPDP PII scrubbing and safe fallback.
  - **Client-Driven Demo Bots**: 8 campus bot profiles that automatically make first-listing offers and progress through offer/counter, escrow lock, live check photos, verification, release, and 5-star reviews via `m_demo_tick`.
  - **UPI Deep Link + Escrow Wallet + UPI Cashout (`UPI_PAYMENT_PLAN.md`)**: Real `upi://pay` intent deep-linking (`buildUpiPayUrl` + `openUpiApp`) with 12-digit UTR recording (`m_record_upi_deposit`, `status = 'unverified'`, `wallet_tx_utr_unique` replay protection), atomic deal escrow locking (`method = 'upi'` + `utr` sealed in `ESCROW_LOCKED` voucher), wallet UPI deposits (`AddMoneySheet`), UPI withdrawal requests (`m_withdraw_upi`, `WithdrawSheet`, `status = 'requested'`, max 5/day), profile UPI ID management (`m_set_upi_id`, `UpiIdSheet`), and 1-tap demo credits fallback.
- **Known Limits (§6 of `UPI_PAYMENT_PLAN.md`)**:
  1. **UTRs are self-reported and unverified**: Without a payment gateway (Razorpay/Cashfree/PayU) or bank callback, deposits are marked `unverified`, UTRs are unique, and the `"auto-fill test utr"` pill is provided for emulators/judges.
  2. **Payee VPA**: `mudra.escrow@upi` is a placeholder; set `EXPO_PUBLIC_MUDRA_ESCROW_VPA` to a real merchant VPA you control (many UPI apps block intent payments to personal non-merchant VPAs).
  3. **Never let judges send real money**: Demo with `"auto-fill test utr"`, or pay ₹1 to your own VPA.
  4. **Withdrawals are requests**: Marked `requested` in the ledger; production requires a payout API (RazorpayX / Cashfree Payouts).
  5. **Shared INR balance**: Demo credits and UPI deposits share the same INR wallet balance in this version.
  6. **Legal**: Holding escrow funds in India requires RBI authorization (PA/escrow via a licensed partner bank); pitch as "built for a licensed escrow partner".

---

## 2. Installation & Running Instructions

### Install on a Physical Android Phone or Emulator
```powershell
adb install -r D:\Hackathons\Nexconn\apps\mobile\dist\mudra-v1.0.0.apk
# Or for arm64 physical devices:
adb install -r D:\Hackathons\Nexconn\apps\mobile\dist\mudra-v1.0.0-arm64.apk
```
*(Or copy `mudra-v1.0.0-arm64.apk` to your phone and open it, allowing installation from unknown sources.)*

### Open & Run in Android Studio
1. Ensure environment variables point to Android Studio's JBR (JDK 21) and the `M:` subst drive (avoids Windows 260-char CMake path limits):
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   if (-not (Test-Path M:\)) { subst M: D:\Hackathons\Nexconn\apps\mobile }
   ```
2. In Android Studio: **File → Open** `M:\android` (or `D:\Hackathons\Nexconn\apps\mobile\android`), select Build Variant **`release`**, and run on `Pixel_10`.

---

## 3. Judge Demo Accounts

| Account | Phone (E.164) | PIN | Default Mode | Campus | Seeded State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rajesh Natarajan** (Buyer) | `+919000000001` | `1234` | `buy` | IIT Bombay | Active deal (`CREATED`) with bot seller **Priya Nair** for *casio fx-991ex calculator* (`₹950`) — ready to lock escrow |
| **Vikramjeet Singh** (Seller) | `+919000000002` | `1234` | `sell` | IIT Bombay | Active listing *hercules roadeo cycle* (`₹6,500`) with incoming `OFFERED` deal (`₹5,500`) from bot buyer **Aarav Mehta** |

*Tip: Tap **"try the demo"** on `/welcome` or `/login` to sign in as Rajesh or Vikramjeet with a single tap.*

---

## 4. 2-Minute Judge Walkthrough Script

1. **Welcome & 1-Tap Demo Login (15s)**: Open **Mudra** → swipe the 3 NeoPOP intro slides → tap **"try the demo"** → select **"rajesh (buyer)"**.
2. **Lock Escrow (20s)**: On Home (`buy` mode), tap the active deal card (**casio fx-991ex calculator · ₹950**) → tap **"lock money"** in the sticky NextStepBar → drag the paccha **"slide to lock money"** slider → watch the **sealed** escrow voucher animation.
3. **Live Camera Check & Release Stamp (35s)**: Within ~3 seconds, bot seller **Priya Nair** starts the live check and streams 3 verification photos (`show the whole item`, `show it working`, `show any damage`) → tap **"mark verified"** → on the perforated Receipt screen, slide **"slide to release money"** → see the rotated **`RELEASED`** stamp burst and leave a 5-star review.
4. **Freeze & 90s Resolution Desk (20s)**: Start any deal or reset demo data in Profile → lock escrow → tap **"something's off — freeze"** → submit a short statement and watch the 90-second `CountdownRing` resolve into a deterministic **30 / 70** or **70 / 30** split verdict.
5. **Switch to Selling & Auto-Offer (30s)**: Tap **`sell`** in the top bar (`buy | sell` pill) → tap **"list an item"** (`+ list`) → tap **"add sample campus photo (simulated)"**, enter title & price, and tap **"post listing"** → watch a campus demo bot automatically send an offer within seconds.

---

## 5. QA Verification & Screenshots (`apps/mobile/qa/`)

All 15/15 backend smoke checks (`node scripts/smoke.mjs`) and all emulator visual/interactive QA scenarios passed with **zero** `AndroidRuntime:E` or `ReactNativeJS:E` crashes:

| Scenario / Screen | Result | Screenshot Artifact (`apps/mobile/qa/`) | Verified Details |
| :--- | :--- | :--- | :--- |
| **P0 Release Gate (`m_ping`)** | **PASS** | `p0.png` | Fraunces/Outfit/JetBrains Mono fonts, HeroUI Native `TextField` + Uniwind, live `ping ok` |
| **P1 Backend Smoke (`smoke.mjs`)** | **PASS (15/15)** | *(CLI output)* | `mudra` schema hidden from anon REST, signup, feed, offer/counter/accept, escrow lock, 3x assay checks, release, reviews, `VERSION_CONFLICT`, 91s freeze 30/70 split, phone masking, 5x PIN lockout, demo logins |
| **Welcome & Pager (`/welcome`)** | **PASS** | `welcome.png` | LogoMark, `EN` language chip, 3-slide pager, 3D purple `get started`, `try the demo` |
| **NeoPOP UI Gallery (`/dev/ui`)** | **PASS** | `dev-ui.png` | All 28 custom NeoPOP primitives, buttons, pills, segmented control, bottom bar |
| **Signup Flow (`/(auth)/signup/*`)** | **PASS** | `signup.png` | 4-segment progress bar, auto-focused input, keyboard handling |
| **Login & Demo Chips (`/(auth)/login`)** | **PASS** | `login.png` | Flag-free country picker, 1-tap `rajesh (buyer)` & `vikramjeet (seller)` demo chips |
| **Home — Buy Mode (`/(tabs)/home`)** | **PASS** | `home-buy.png` | Mode coachmark, active deal card (`CREATED`), category tiles, 2-col feed grid |
| **Home — Sell Mode (`/(tabs)/home`)** | **PASS** | `home-sell.png` | Seller stats (`active listings`, `offers waiting`, `earned`), `list an item` CTA, `+ LIST` bottom button |
| **Explore & Filters (`/(tabs)/explore`)** | **PASS** | `explore.png` | Debounced search, category/free/swap/under-₹500 chips, 2-col results grid |
| **Listing Detail (`/listing/[id]`)** | **PASS** | `listing-detail.png` | 1:1 photo carousel, price tabular, chips, seller card, escrow protection card, `make offer` / `buy for ₹6,500` |
| **Create Listing (`/listing/new`)** | **PASS** | `listing-new.png` | Photo tile, `sell | swap | free` segmented control, category chips, `condition` control |
| **Deals List (`/(tabs)/deals`)** | **PASS** | `deals.png` | `NEEDS YOU` section, unread badge, `AWAITING ESCROW` status pill |
| **Deal Room Chat (`/deal/[id]`)** | **PASS** | `deal-room.png` | Deal strip, sticky `NextStepBar` (`lock money`), bilingual bubble, quick replies, composer |
| **Escrow Sheet (`/deal/[id]/escrow`)** | **PASS** | `escrow.png` | Transparent modal sheet, wallet balance (`₹25,000`), `SlideToLock` paccha slider |
| **Live Check (`/deal/[id]/inspect`)** | **PASS** | `inspect.png` | `CHECKS 0/3` live pill, 3 checklist cards, `looks good — mark verified` & `something's off — freeze` |
| **Receipt & Stamp (`/deal/[id]/receipt`)** | **PASS** | `receipt.png` | Perforated zigzag SVG voucher card, Ed25519/SHA-256 voucher hash, copy button |
| **Freeze Desk (`/deal/[id]/freeze`)** | **PASS** | `freeze.png` | 220px SVG `CountdownRing` (`1:31 REMAINING`), statement composer |
| **Review (`/deal/[id]/review`)** | **PASS** | `review.png` | 5 interactive paccha stars, highlight tag chips (`on time`, `as described`), comment box |
| **Wallet (`/wallet`)** | **PASS** | `wallet.png` | `₹25,000` balance, demo credits disclosure banner, `top up demo credits`, ledger history |
| **Profile & Settings (`/profile`)** | **PASS** | `profile.png` | Masked phone (`+91 •••• 0001`), selling mode switch, language/currency/PIN settings |
| **Hindi Locale (`/settings/language`)** | **PASS** | `hindi.png` | Full Devanagari UI (`खरीदें | बेचें`, `नमस्ते rajesh।`, `श्रेणियाँ`), `F.uiSemi` heading fallback |
| **Offline Mode (`Airplane Mode`)** | **PASS** | `offline.png` | Top `card3` offline banner (`you're offline. we'll retry.`), zero crashes |

---

## 6. Decisions Made Overnight & Fallbacks Used

1. **Windows `subst M:` Root Lookup & `realpath` Patch (`scripts/patch-subst.mjs`)**: `expo-modules-autolinking` and `@expo/cli` walk parent directories using `for (let dir = root; path.dirname(dir) !== dir; dir = path.dirname(dir))`, which exits before checking `M:\package.json` on a drive root, and `fs.promises.realpath` resolves `M:\` back to `D:\Hackathons\Nexconn\apps\mobile` (breaking React Native codegen relative path resolution across drives). `scripts/patch-subst.mjs` patches both so `M:\android` builds cleanly.
2. **Windows CMake 260-Char Object Path Limit (`plugins/withReleaseSigning.js`)**: Configured `buildStagingDirectory file("M:/.c")` and `-DCMAKE_OBJECT_PATH_MAX=220` so CMake hashes deep out-of-tree C++ object directories into 32-character MD5 folders well below Windows `MAX_PATH`.
3. **`tailwind-variants@4.0.2` + `heroui-native@1.1.1` Resolution (`metro.config.js`)**: Aliased `tailwind-variants` to `tailwind-variants/config` so `heroui-native`'s `twMergeConfig` calls use the full compiler entry at runtime.
4. **Non-Transactional PIN Lockout Sequences (`001_mudra_schema.sql`)**: Used a pool of 256 PostgreSQL sequences (`mudra.pin_slot_0..255`) inside `m_login` so failed PIN attempt counters persist even when `RAISE EXCEPTION 'MUDRA:BAD_PIN:...'` rolls back the transaction.
5. **Idempotent Realtime Channels (`src/lib/realtime.ts`)**: Used unique per-subscription channel topics (`events:<myId>:<seq>`) and centralized `useRealtimeEvents` in `app/_layout.tsx` to prevent duplicate `.on('postgres_changes')` calls on already-subscribed channels.

---

## 7. Known Issues & Next Steps

- **First Cold Load of External Images on Slow Networks**: Seeded photos are hosted in Supabase Storage (`mudra-photos/seed/*.jpg`) and cached on disk by `expo-image`.
- **Next Steps Post-Hackathon**: Add FCM push notifications when app is backgrounded, optional campus `.ac.in` / `.edu` badge verification, and optional UPI intent deep-linking alongside demo credits.

---

## 8. Architectural Tradeoffs

1. **Nexconn Android Chat SDK for Real-Time Chat, Supabase for Persistence**: Nexconn does not ship a React Native SDK, so the Android app wraps the official Nexconn Android Chat SDK (`ai.nexconn.chat:chat:26.4.2`) in a local Expo native module (`modules/nexconn-chat`). At login it fetches a server-issued Nexconn token (`POST /api/v1/auth/session`; the secret key stays on the server), calls `NCEngine.initialize` + `NCEngine.connect`, and sends each deal chat message to the counterpart over a Nexconn Direct channel (`DirectChannel.sendMessage`); incoming `onMessageReceived` events refresh the chat at once. Supabase remains the store of record: the same 11-state Deal FSM over PostgreSQL `SECURITY DEFINER` RPCs (`public.m_*`) + Supabase Realtime (`public.m_events`) + 4s/15s focus-aware polling fallback, so the app keeps working if Nexconn is unreachable. Calls, video and group channels are not used on Android.
2. **Demo Escrow Credits**: All wallet balances and escrow locks operate on clearly disclosed **demo credits** (`mudra.wallets` / `mudra.wallet_tx`) with instant signup bonuses and daily demo top-ups so judges can test the full escrow lifecycle without real banking friction.
3. **Database-Side Lazy Gemini Translation**: Translations run lazily inside `public.m_translate_message` via `pgsql-http` after regex PII scrubbing, caching results in `mudra.messages.translations` JSONB so each message is translated at most once per target locale.

---

## 9. Release Keystore & Rebuild Commands

- **Keystore Path**: `%USERPROFILE%\.android\mudra-upload.keystore` (alias `mudra`, PKCS12).
- **Credentials Location**: Stored in `%USERPROFILE%\.gradle\gradle.properties` (`MUDRA_UPLOAD_STORE_FILE`, `MUDRA_UPLOAD_STORE_PASSWORD`, `MUDRA_UPLOAD_KEY_ALIAS`, `MUDRA_UPLOAD_KEY_PASSWORD`) — never committed to git.
- **How to Rebuild Release APKs**:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
  $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
  $env:CI = "1"
  if (-not (Test-Path M:\)) { subst M: D:\Hackathons\Nexconn\apps\mobile }
  cd M:\android
  .\gradlew.bat :app:assembleRelease "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64" --no-daemon
  ```

---

## 10. Supabase Keep-Alive Workflow

Free-tier Supabase projects pause after 7 days of inactivity. We added **[`.github/workflows/supabase-keepalive.yml`](../../.github/workflows/supabase-keepalive.yml)**, which runs daily at `04:15 UTC` (and supports manual `workflow_dispatch`) to call `POST ${SUPABASE_URL}/rest/v1/rpc/m_ping`.
- **Action Required on GitHub**: Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions** in the GitHub repository.
