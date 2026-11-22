# MUDRA Android App — Build Progress

## Phase Status

- [x] **P0**: Scaffold, deps, Uniwind/HeroUI/fonts, icons, release signing, `m_ping` screen, release APK on `Pixel_10` emulator
- [x] **P1**: Backend migrations `001`–`003`, `migrate.mjs`, `seed.mjs`, `smoke.mjs` (15/15 checks passed)
- [x] **P2**: Design system primitives + TopBar/BottomBar shell + `/dev/ui` gallery
- [x] **P3**: Auth (welcome, signup 5 steps, login, session persistence, guest mode, demo login)
- [x] **P4**: Home buy/sell + mode switch + explore + listing detail + saved + seller profile
- [x] **P5**: Create/edit listing + photo upload + my listings + checkpoint APK 1
- [x] **P6**: Deals list + deal room chat + realtime + quick replies + translation + offers/counter + demo tick
- [x] **P7**: Escrow sheet, live check, receipt/release/stamp, freeze/verdict, review, wallet
- [x] **P8**: Profile/settings, language, currency, change PIN, delete account, guide, safety, i18n + checkpoint APK 2
- [x] **P9**: Polish pass, icons/splash, empty/error states, performance, a11y, 20 emulator QA screenshots verified
- [x] **P10**: Final universal + arm64 release builds (`dist/mudra-v1.0.0.apk` = `110,276,116` bytes, `dist/mudra-v1.0.0-arm64.apk` = `56,184,777` bytes), `MORNING_REPORT.md`, docs update, final commit
- [x] **UPI Payments (`UPI_PAYMENT_PLAN.md`)**: UPI Deep Link (`upi://pay`), Escrow Wallet UPI Pay-In + UTR Confirmation, and UPI Cashout Requests (`004_mudra_upi.sql`, `src/lib/upi.ts`, `UpiPayPanel`, `AddMoneySheet`, `WithdrawSheet`, `UpiIdSheet`, 24/24 `smoke.mjs` checks + Jest unit tests + Emulator QA screenshots)

---

## Decisions I made

- **P0 — Expo SDK 58 + RN 0.88.1**: Used `blank-typescript@sdk-58` template from `create-expo-app@latest`, with `heroui-native@^1.1.1` and `uniwind@^1.14.0` installed with `--legacy-peer-deps`.
- **P0 — TypeScript 6.0 `paths` config**: Removed deprecated `"baseUrl": "."` from `tsconfig.json` in favor of `"paths": { "@/*": ["./src/*"] }` and added `uniwind-types.d.ts` (`/// <reference types="uniwind/types" />` + `declare module '*.css' {}`) so `npx tsc --noEmit` passes with 0 errors.
- **P0 — Windows `subst M:` root directory & `realpath` patch**: `expo-modules-autolinking` and `@expo/cli` walk up parent directories with `for (let dir = root; path.dirname(dir) !== dir; dir = path.dirname(dir))`, which stops before checking `M:\package.json` when the project root is mapped directly to drive root `M:\`. Furthermore, `fs.promises.realpath` on Windows resolves `subst` drive `M:\` back to `D:\Hackathons\Nexconn\apps\mobile`, causing `generateCodegenSchemaFromJavaScript` to fail with `this and base files have different roots: M:\... and D:\...`. Added `scripts/patch-subst.mjs` so `M:\` drive roots are checked and `subst` drive letters are preserved during autolinking.
- **P0 — `tailwind-variants@4.0.2` + `heroui-native@1.1.1` compatibility**: `tailwind-variants@4.x` moved `twMergeConfig` support to `tailwind-variants/config` while `heroui-native@1.1.1` imports from `tailwind-variants`. Added `resolveRequest` alias in `metro.config.js` (`tailwind-variants` → `tailwind-variants/config`) and patched `tailwind-variants/package.json` in `scripts/patch-subst.mjs`.
- **P0 — CMake 260-char path limit fix on Windows**: Configured `buildStagingDirectory file("M:/.c")` and `-DCMAKE_OBJECT_PATH_MAX=220` in `plugins/withReleaseSigning.js` and `react-native-gesture-handler/android/CMakeLists.txt` so CMake hashes out-of-tree object directories into 32-char MD5 segments well under `MAX_PATH`.
- **P0 — Upload Keystore & `Pixel_10` Release APK Verification**: Generated `mudra-upload.keystore` at `%USERPROFILE%\.android\mudra-upload.keystore` and stored `MUDRA_UPLOAD_*` credentials in `%USERPROFILE%\.gradle\gradle.properties` (outside the repository), wired via `plugins/withReleaseSigning.js`. Built `M:\android\app\build\outputs\apk\release\app-release.apk` (58.3 MB), installed on `emulator-5554` (`Pixel_10`), verified Fraunces/Outfit/JetBrains Mono fonts, HeroUI Native `TextField` + Uniwind styling, and live `m_ping` (`ping ok`) in `apps/mobile/qa/p0.png` with zero `logcat` errors.
- **P1 — Non-transactional PIN lockout slots**: Because PostgreSQL rolls back table `UPDATE`s when `RAISE EXCEPTION 'MUDRA:BAD_PIN:...'` is raised inside an RPC, `001_mudra_schema.sql` pre-creates a pool of 256 sequences (`mudra.pin_slot_0..255`) used via `setval()` in `m_login` so failed PIN attempt counts and 5-minute lockouts persist across rolled-back `RAISE EXCEPTION` calls.
- **P1 — Visually verified Unsplash seed photos**: Downloaded all 60 Unsplash photos to `apps/mobile/assets/seed/<id>.jpg`, visually inspected every photo, dropped `1558618666-fcd25c85cd64` (commercial coffee roaster), uploaded all 60 to Supabase Storage bucket `mudra-photos` (`seed/<id>.jpg`), and matched the 59 product photos to 44 realistic campus listings across all 10 categories, kinds (`sell`, `swap`, `free`), and currencies (`INR`, `USD`, `SGD`, `GBP`).
- **P1 — Gemini translation model fallback**: `m_translate_message` uses `mudra.secrets` (`gemini_model`) and automatically falls back to `gemini-2.5-flash` if the configured model returns non-200.
- **P2 — NeoPOP Design System Primitives**: Built all 28 NeoPOP components in `src/ui/` (`Text`, `NeoButton`, `VelvetCard`, `ListGroup`, `ListRow`, `IconTile`, `StatusPill`, `Eyebrow`, `SegmentedControl`, `SlideToLock`, `CountdownRing`, `BilingualBubble`, `OfferCard`, `SystemLine`, `AvatarRing`, `PinPad`, `ProgressSegments`, `Sheet`, `EmptyState`, `Price`, `ListingCard`, `LogoMark`, `Toast`, `Skeleton`, `TopBar`, `BottomBar`, `HudBrackets`, `Stamp`, `Receipt`) using StyleSheet + Reanimated + TS tokens (`src/theme/tokens.ts` & `src/theme/motion.ts`) and `/dev/ui` showcase gallery.
- **P3–P8 — Data, i18n (5 Locales), and Full Route Tree**: Implemented `src/lib/**`, `src/state/**` (`useSessionStore` persisted across `expo-secure-store` & `AsyncStorage`), `src/i18n/{en,hi,ta,mr,es}.json` + `quick.ts`, `src/features/**` (React Query hooks + 4s deal polling + 3s `m_demo_tick` + `useRealtimeEvents` on `public.m_events`), and all 31 routes across auth, tabs (`home`, `explore`, `deals`), listings (`[id]`, `new`, `saved`, `my-listings`, `seller/[id]`), deal room (`[id]`, `escrow`, `inspect`, `receipt`, `freeze`, `review`), `wallet`, `profile`, `settings/{language,currency,pin}`, `guide`, and `safety`.

---

## Problems & Fallbacks Used

- Transient `ECONNRESET` during initial `npm install` on Windows resolved by retrying with `--fetch-retries=5`.
- `expo-modules-autolinking` failed on `M:\android` due to `path.dirname("M:\\") === "M:\\"`; fixed via `scripts/patch-subst.mjs`.
- Fixed SQL `CASE` expression in `mudra.deal_json` (`001_mudra_schema.sql`) where `when 'ARBITRATED_SPLIT', 'REFUNDED'` needed separate `WHEN` clauses. All 15/15 `smoke.mjs` assertions (including 91s freeze resolution 30/70 split, version conflict, pre-FUNDED phone masking, 5x PIN lockout, demo logins, and `mudra` schema hidden check) passed.

---

## UPI Payments Implementation (`docs/03-engineering/mobile/UPI_PAYMENT_PLAN.md`)

### What Changed
1. **Database (`supabase/migrations/004_mudra_upi.sql` & `002_mudra_rpc.sql`)**:
   - Added `mudra.profiles.upi_id` with format check constraint (`profiles_upi_id_check`).
   - Extended `mudra.wallet_tx` with `kind in (..., 'upi_deposit', 'upi_withdraw')`, `utr`, `upi_id`, `status in ('completed', 'unverified', 'requested')`, and partial unique index `wallet_tx_utr_unique` on `(utr) where kind = 'upi_deposit'`.
   - Added `public.m_record_upi_deposit(p_token, p_amount_minor, p_utr, p_deal_id, p_expected_version, p_idem)` (12-digit UTR validation, INR-only, ₹1–₹1,00,000 range, idempotent UTR replay check vs `MUDRA:UTR_USED`, atomic wallet credit + `LOCK_ESCROW` via transaction-local `mudra.upi_utr` config).
   - Added `public.m_withdraw_upi(p_token, p_amount_minor, p_upi_id)` (INR-only, saves default `upi_id`, debits unlocked wallet balance with `status = 'requested'`, max 5 withdrawals/day `MUDRA:RATE_LIMIT`).
   - Added `public.m_set_upi_id(p_token, p_upi_id)` for profile management.
   - Updated `mudra.me_json` to return `upi_id` and `m_deal_action` (`LOCK_ESCROW`) to seal `method` (`'wallet'` | `'upi'`) and `utr` into the `ESCROW_LOCKED` voucher and `escrow` system message from `current_setting('mudra.upi_utr', true)` (blocking client payload spoofing).
   - Updated `scripts/migrate.mjs` (added `004_mudra_upi.sql` + IPv4 Supavisor pooler fallback) and `scripts/smoke.mjs` + `scripts/smoke-upi.mjs` (24/24 checks passing).
2. **UPI Deep-Link Helper & Unit Tests (`src/lib/upi.ts`, `src/lib/__tests__/upi.test.ts`, `src/config/{env,brand}.ts`)**:
   - Implemented `buildUpiPayUrl` (hand-built `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...` with raw `@` in `pa`, `%20`-encoded `pn`/`tn`, 2-decimal `am`, alphanumeric `tr` ≤ 35 chars), `openUpiApp` via `Linking.openURL`, and `makeTestUtr` (12 random digits starting with `9` via `expo-crypto`).
   - Verified with `jest-expo` unit tests (`src/lib/__tests__/upi.test.ts` — 3/3 passed).
3. **API, Types, Errors & 5-Locale i18n (`src/features/api.ts`, `src/types/upi.ts`, `src/lib/errors.ts`, `src/i18n/*.json`)**:
   - Added `recordUpiDeposit`, `recordUpiDepositForDeal`, `withdrawUpi`, and `setUpiId` to `mudraApi`.
   - Added `UTR_USED` error handling and localized strings across `en`, `hi`, `ta`, `mr`, and `es`.
4. **Escrow Sheet Split & UPI Pay Panel (`app/deal/[id]/escrow.tsx`, `src/features/escrow/{SealedView,PayMethodPicker,UtrConfirm,UpiPayPanel}.tsx`)**:
   - Split `escrow.tsx` (< 300 lines) with INR method picker (`mudra wallet` vs `upi app`), 2-step `UpiPayPanel` (`pay` via `upi://pay` intent with foreground `AppState` listener + `"i've paid"` link + emulator fallback toast → `confirm` with 12-digit UTR input, `"auto-fill test utr"` pill, and `"slide to seal escrow"`).
5. **Wallet Sheets & Profile Row (`app/wallet.tsx`, `src/features/wallet/{AddMoneySheet,WithdrawSheet}.tsx`, `app/profile.tsx`, `src/features/profile/UpiIdSheet.tsx`)**:
   - Added `AddMoneySheet` (₹500 / ₹1,000 / ₹2,000 quick chips + UPI intent + shared `UtrConfirm`), `WithdrawSheet` (max chip + live UPI ID validation + receipt view), `unverified` (`sunshine`) / `requested` (`neutral`) status pills and mono UTR/UPI subtitles in transaction rows, and `UpiIdSheet` on Profile.

### Known Limits (§6 of `UPI_PAYMENT_PLAN.md`)
1. **UTRs are self-reported and unverified.** Without a payment gateway (Razorpay/Cashfree/PayU) or bank callback, the app cannot prove a payment happened. That is why deposits are marked `unverified`, UTRs are unique (`wallet_tx_utr_unique`), and the `"auto-fill test utr"` pill exists. Production path: replace the UTR step with a gateway order + webhook that calls `m_record_upi_deposit` server-side.
2. **Payee VPA.** `mudra.escrow@upi` does not exist. Set `EXPO_PUBLIC_MUDRA_ESCROW_VPA` to a VPA you control, or payments will fail inside the UPI app. Many UPI apps also block or limit intent payments to **personal** (non-merchant) VPAs ("payment declined for security reasons"). That is a bank-side rule, not an app bug. A merchant VPA fixes it.
3. **Never let judges send real money.** Demo with `"auto-fill test utr"`, or pay ₹1 to your own VPA.
4. **Withdrawals are requests.** Nothing is paid out automatically (`status = 'requested'`). Production path: a payout API (RazorpayX / Cashfree Payouts).
5. **Shared INR balance.** Demo credits and UPI money share the same INR balance in this version, so demo credits can be "withdrawn" as a request. That is acceptable for the hackathon and noted here.
6. **Legal.** Holding other people's money as escrow in India needs RBI authorisation (PA/escrow via a partner bank). Pitch it as "built for a licensed escrow partner", not "we hold funds".
