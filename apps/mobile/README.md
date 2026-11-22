# MUDRA Android App (`apps/mobile`)

Campus-first peer-to-peer escrow marketplace Android application (`com.chanakya.mudra`) built with **Expo SDK / React Native (New Architecture)**, **CRED NeoPOP Dark** design system, and a hosted **Supabase** backend (`mudra` schema + `public.m_*` RPCs + `public.m_events` Realtime + `mudra-photos` Storage).

> **Full Specification**: See [`docs/03-engineering/mobile/ANDROID_APP_IMPLEMENTATION_PLAN.md`](../../docs/03-engineering/mobile/ANDROID_APP_IMPLEMENTATION_PLAN.md) and [`MORNING_REPORT.md`](./MORNING_REPORT.md).

---

## Quick Start

### 1. Environment Setup (Windows PowerShell 5.1)

Create `apps/mobile/.env` from `.env.example` with **only** the publishable Supabase URL and anon key:

```ini
EXPO_PUBLIC_SUPABASE_URL=https://ttpgogzqispnexpktrsv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable_anon_key>
```

At the start of every PowerShell session, configure the Android Studio JBR, Android SDK, and `M:` drive mapping (to avoid Windows 260-char CMake/NDK path limits):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
$env:CI = "1"
if (-not (Test-Path M:\)) { subst M: D:\Hackathons\Nexconn\apps\mobile }
```

### 2. Install Dependencies

`apps/mobile` is a standalone npm project (outside the root pnpm workspace):

```powershell
cd D:\Hackathons\Nexconn\apps\mobile
npm install
```

### 3. Database Migrations, Seed & Smoke Verification

```powershell
# Apply 001_mudra_schema.sql, 002_mudra_rpc.sql, 003_mudra_realtime_storage.sql
node scripts/migrate.mjs

# Upload 60 verified seed photos & seed 8 bots, 2 judge demo accounts, and 44 campus listings
node supabase/seed/seed.mjs

# Run the 15-step end-to-end backend smoke suite (includes 90s freeze resolution split check)
node scripts/smoke.mjs
```

### 4. Type Check

```powershell
npx tsc --noEmit
```

### 5. Build Release APKs Locally (`M:\android`)

```powershell
npx expo prebuild -p android
node scripts/patch-subst.mjs
cd M:\android

# Universal Release APK (armeabi-v7a, arm64-v8a, x86_64)
.\gradlew.bat assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64 --no-daemon
Copy-Item M:\android\app\build\outputs\apk\release\app-release.apk D:\Hackathons\Nexconn\apps\mobile\dist\mudra-v1.0.0.apk

# Small arm64-only APK for real phones
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
Copy-Item M:\android\app\build\outputs\apk\release\app-release.apk D:\Hackathons\Nexconn\apps\mobile\dist\mudra-v1.0.0-arm64.apk
```

---

## Judge Demo Accounts (PIN `1234`)

| Persona | Phone | PIN | Default Role | Seeded State |
| :--- | :--- | :--- | :--- | :--- |
| **Rajesh Natarajan** | `+91 90000 00001` | `1234` | Buyer (`buy`) | `CREATED` deal for *casio fx-991ex calculator* (`₹950`) with bot seller Priya Nair — ready to **lock money** |
| **Vikramjeet Singh** | `+91 90000 00002` | `1234` | Seller (`sell`) | Active listing *hercules roadeo cycle* (`₹6,500`) with `OFFERED` deal (`₹5,500`) from bot buyer Aarav Mehta |
