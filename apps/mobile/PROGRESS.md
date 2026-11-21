# MUDRA Android App — Build Progress

## Phase Status

- [x] **P0**: Scaffold, deps, Uniwind/HeroUI/fonts, icons, release signing, `m_ping` screen, release APK on `Pixel_10` emulator
- [x] **P1**: Backend migrations `001`–`003`, `migrate.mjs`, `seed.mjs`, `smoke.mjs` (15/15 checks passed)
- [ ] **P2**: Design system primitives + TopBar/BottomBar shell + `/dev/ui` gallery
- [ ] **P3**: Auth (welcome, signup 5 steps, login, session persistence, guest mode, demo login)
- [ ] **P4**: Home buy/sell + mode switch + explore + listing detail + saved + seller profile
- [ ] **P5**: Create/edit listing + photo upload + my listings + checkpoint APK 1
- [ ] **P6**: Deals list + deal room chat + realtime + quick replies + translation + offers/counter + demo tick
- [ ] **P7**: Escrow sheet, live check, receipt/release/stamp, freeze/verdict, review, wallet
- [ ] **P8**: Profile/settings, language, currency, change PIN, delete account, guide, safety, i18n + checkpoint APK 2
- [ ] **P9**: Polish pass, icons/splash, empty/error states, performance, a11y
- [ ] **P10**: Final universal + arm64 release builds, `MORNING_REPORT.md`, docs update, final commit

---

## Decisions I made

- **P0 — Expo SDK 58 + RN 0.88.1**: Used `blank-typescript@sdk-58` template from `create-expo-app@latest`, with `heroui-native@^1.1.1` and `uniwind@^1.14.0` installed with `--legacy-peer-deps`.
- **P0 — TypeScript 6.0 `paths` config**: Removed deprecated `"baseUrl": "."` from `tsconfig.json` in favor of `"paths": { "@/*": ["./src/*"] }` and added `uniwind-types.d.ts` (`/// <reference types="uniwind/types" />` + `declare module '*.css' {}`) so `npx tsc --noEmit` passes with 0 errors.
- **P0 — Windows `subst M:` root directory & `realpath` patch**: `expo-modules-autolinking` and `@expo/cli` walk up parent directories with `for (let dir = root; path.dirname(dir) !== dir; dir = path.dirname(dir))`, which stops before checking `M:\package.json` when the project root is mapped directly to drive root `M:\`. Furthermore, `fs.promises.realpath` on Windows resolves `subst` drive `M:\` back to `D:\Hackathons\Nexconn\apps\mobile`, causing `generateCodegenSchemaFromJavaScript` to fail with `this and base files have different roots: M:\... and D:\...`. Added `scripts/patch-subst.mjs` so `M:\` drive roots are checked and `subst` drive letters are preserved during autolinking.
- **P0 — Upload Keystore**: Generated `mudra-upload.keystore` at `%USERPROFILE%\.android\mudra-upload.keystore` and stored `MUDRA_UPLOAD_*` credentials in `%USERPROFILE%\.gradle\gradle.properties` (outside the repository), wired via `plugins/withReleaseSigning.js`.
- **P1 — Non-transactional PIN lockout slots**: Because PostgreSQL rolls back table `UPDATE`s when `RAISE EXCEPTION 'MUDRA:BAD_PIN:...'` is raised inside an RPC, `001_mudra_schema.sql` pre-creates a pool of 256 sequences (`mudra.pin_slot_0..255`) used via `setval()` in `m_login` so failed PIN attempt counts and 5-minute lockouts persist across rolled-back `RAISE EXCEPTION` calls.
- **P1 — Visually verified Unsplash seed photos**: Downloaded all 60 Unsplash photos to `apps/mobile/assets/seed/<id>.jpg`, visually inspected every photo, dropped `1558618666-fcd25c85cd64` (commercial coffee roaster), uploaded all 60 to Supabase Storage bucket `mudra-photos` (`seed/<id>.jpg`), and matched the 59 product photos to 44 realistic campus listings across all 10 categories, kinds (`sell`, `swap`, `free`), and currencies (`INR`, `USD`, `SGD`, `GBP`).
- **P1 — Gemini translation model fallback**: `m_translate_message` uses `mudra.secrets` (`gemini_model`) and automatically falls back to `gemini-2.5-flash` if the configured model returns non-200.

---

## Problems & Fallbacks Used

- Transient `ECONNRESET` during initial `npm install` on Windows resolved by retrying with `--fetch-retries=5`.
- `expo-modules-autolinking` failed on `M:\android` due to `path.dirname("M:\\") === "M:\\"`; fixed via `scripts/patch-subst.mjs`.
- Fixed SQL `CASE` expression in `mudra.deal_json` (`001_mudra_schema.sql`) where `when 'ARBITRATED_SPLIT', 'REFUNDED'` needed separate `WHEN` clauses. All 15/15 `smoke.mjs` assertions (including 91s freeze resolution 30/70 split, version conflict, pre-FUNDED phone masking, 5x PIN lockout, demo logins, and `mudra` schema hidden check) passed.
