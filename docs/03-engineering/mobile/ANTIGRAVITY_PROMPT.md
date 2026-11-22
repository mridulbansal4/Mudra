# Prompt to paste into Antigravity

```
You are building the MUDRA Android app overnight, fully autonomously. I am asleep and will NOT answer
any questions. Do not stop to ask for confirmation, approval, or clarification at any point.

YOUR SPEC: Read D:\Hackathons\Nexconn\docs\mobile\ANDROID_APP_IMPLEMENTATION_PLAN.md completely
before doing anything. It is the single source of truth. Every product, design, backend, build and
fallback decision is already made there. Also read CLAUDE.md and AGENTS.md at the repo root, but for
the mobile app's visual design the plan (CRED NeoPOP dark, from the landing page phone screens)
overrides CLAUDE.md's warm palette.

GOAL BY MORNING:
1. A working release APK at D:\Hackathons\Nexconn\apps\mobile\dist\mudra-v1.0.0.apk (universal) and
   dist\mudra-v1.0.0-arm64.apk, installable on a real Android phone, connected to the hosted Supabase
   backend.
2. Sign-up with ONLY name, role, phone number and a 4-digit PIN. No passwords, OTP, email, Google
   sign-in, or any verification.
3. Full flow working: browse, one-tap buy/sell mode switch, list item with photos, offer/counter,
   chat with translation and quick replies, escrow lock, live check, release, freeze + 90s verdict,
   reviews, wallet (demo credits), profile/settings, 5 languages.
4. apps/mobile/MORNING_REPORT.md exactly as described in plan section 20.

HOW TO WORK:
- Execute phases P0 to P10 in order (plan section 16). Respect the time budgets. If a phase overruns
  by 50%, use the fallback from section 17, log it, and move on.
- Before each phase, re-read the relevant plan sections. After each phase: run `npx tsc --noEmit`,
  update apps/mobile/PROGRESS.md (done / decisions / problems / fallbacks / time), and commit on
  branch feat/android-app with message "mobile: P<n> <summary>".
- Build checkpoint release APKs after P5 and P8 into apps/mobile/dist so an installable app always
  exists even if later work fails.
- Whenever you face a choice the plan doesn't cover, pick the simplest option consistent with the
  plan, write it under "Decisions I made" in PROGRESS.md, and continue. Never wait for me.
- If a command fails, read the error, fix it, retry. Don't repeat the same failing command more than
  twice without changing something. If truly blocked, take the documented fallback and continue
  with the next phase.
- Verify your own work: run the backend smoke test (plan 8.9) until it passes, install builds on the
  Pixel_10 emulator, drive the app with adb, take screenshots, LOOK at them, and fix what looks
  wrong. Run the QA scenarios in plan section 15 before the final build.
- Windows PowerShell 5.1: no `&&`, use `;` and check $LASTEXITCODE. At the start of every terminal
  session run the env block from plan section 2 (JAVA_HOME = Android Studio JBR, ANDROID_HOME, CI=1,
  subst M: drive). Build Android from M:\android to avoid long-path errors. Use --no-daemon for
  Gradle.
- Long-running commands (gradle builds, npm installs, emulator boot): run them, wait for them to
  finish, and check the result before moving on. Don't start a second Gradle build while one runs.

HARD SAFETY RULES:
- Never print, log, commit, or put into the app bundle any secret from the root .env
  (DATABASE_URL, DIRECT_DATABASE_URL, SUPABASE_SECRET_KEY, GEMINI_API_KEY, NEXCONN_SECRET_KEY, etc.).
  Only EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY may go into apps/mobile/.env.
  Mask secrets in any output you write.
- Never commit .env files, keystores, apps/mobile/dist, apps/mobile/android, node_modules.
- Do not modify apps/web, services/*, packages/*, pnpm-workspace.yaml, or existing Supabase public
  tables. New backend objects only in schema `mudra`, `public.m_*` functions, `public.m_events`,
  and the `mudra-photos` storage bucket.
- No force pushes. No destructive git commands. Do not push to remote unless the branch has a
  remote configured already; committing locally is enough.

QUALITY BAR: It should feel like a product from a top consumer company: dark NeoPOP look matching
the landing page phone mockups, sharp 3D action buttons, soft rounded cards, lowercase copy, tabular
numbers, smooth critically-damped motion, haptics, skeleton loaders, helpful empty states, no emoji,
and an obvious next step on every screen. Simple enough for a first-time college student with no
explanation.

When everything is done (or the time budget is spent), make sure the final APKs exist, write
MORNING_REPORT.md, make the final commit "mobile: P10 release v1.0.0", and stop.

Start now with P0.
```
