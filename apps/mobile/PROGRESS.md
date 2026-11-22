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
