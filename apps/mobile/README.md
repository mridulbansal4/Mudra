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

## Nexconn Android Chat SDK and Call SDK

Nexconn ships no React Native SDK, so the app wraps the official **Nexconn Android Chat SDK** (`ai.nexconn.chat:chat:26.4.2`) and **Call SDK** (`ai.nexconn.chat:call:26.4.1`) in a local Expo native module. There is no call 26.4.2; call 26.4.1's own POM depends on chat 26.4.2, so the two are the vendor-paired versions.

| File | What it does |
| :--- | :--- |
| [`modules/nexconn-chat/android/.../NexconnChatModule.kt`](modules/nexconn-chat/android/src/main/java/expo/modules/nexconnchat/NexconnChatModule.kt) | `NCEngine.initialize` (area `SG`), `NCEngine.connect`, `DirectChannel.sendMessage(TextMessage)`, `NCEngine.disconnect`; forwards `onMessageReceived` and connection-status changes to JS as `onMessage` / `onConnectionStatus` events |
| [`modules/nexconn-chat/android/.../NexconnCallView.kt`](modules/nexconn-chat/android/src/main/java/expo/modules/nexconnchat/NexconnCallView.kt) | Native view that hosts the local camera or the remote stream of the current call (SDK TextureView renderers) |
| [`modules/nexconn-chat/index.ts`](modules/nexconn-chat/index.ts) | Typed JS wrapper (`NexconnChat.*`, `NexconnCall.startVideoCall/acceptCall/endCall`, `<NexconnCallView>`) |
| [`src/features/call/CallOverlay.tsx`](src/features/call/CallOverlay.tsx) | Global incoming-call sheet (Accept / Decline) and full-screen call view (remote big, local small, hang up) |
| [`src/lib/nexconn.ts`](src/lib/nexconn.ts) | Gets a Nexconn access token from `POST https://mudra.duckdns.org/api/v1/auth/session` (issued server-side by the Nexconn Server SDK; the secret never ships in the app), then initialize, then connect; zustand status store |
| [`plugins/withNexconnMaven.js`](plugins/withNexconnMaven.js) | Adds `https://maven.nexconn.ai/repository/maven-releases/` to the generated Gradle repositories |

- **User IDs**: Nexconn user ID = `m_` + Supabase user ID, so both phones derive each other's IDs without a lookup table.
- **Deal chat**: a sent message is saved to Supabase (history and deal state stay there), then also sent to the counterpart over a Nexconn Direct channel. An incoming Nexconn message refreshes the chat and deal queries at once; the 4-second poll remains as a fallback.
- **Failure handling**: if the token request or connect fails, the status becomes offline/error and the app keeps working on Supabase alone.
- **Where to see it**: the deal chat header shows a `Nexconn live` / `Nexconn offline` pill; the Guide screen shows the Nexconn user ID, the runtime SDK version and the last Nexconn message ID.
- **Inspection call**: on a deal's Inspect screen the buyer taps **Video call over Nexconn** (shown only while Nexconn is live and the counterpart is a real user). Init order follows the official docs: `NCCallEngine.install()` before `NCEngine.initialize`, and `NCCallEngine.initialize` after `connect` succeeds. Camera and microphone permissions are asked right before a call starts or is accepted. A call failure only shows a short note; chat keeps working.
- Group channels and the 90-second freeze channel are web-only.

### Verify the Nexconn connection

Install the APK on an emulator or phone, log in (for example Rajesh, below), then:

```powershell
adb logcat -s NexconnChat
```

Expected lines: `initialized sdk=26.4.2 area=SG`, `connection status CONNECTED`, `connect success userId=m_<supabase id>`; sending a deal message logs `direct message sent id=...`.

### Test the inspection call

Use two devices (two phones, or two emulators with the emulated camera): Rajesh on A, Vikram on B, both showing `Nexconn live`.

1. Chat: in a Rajesh and Vikram deal, a message from A appears on B within about a second.
2. A: lock money, open the deal's live check (Inspect), tap **Video call over Nexconn**, allow camera and mic.
3. B: the sheet shows "Incoming inspection call from Rajesh Natarajan". Accept and allow camera and mic.
4. Both see each other's video. Hang up on either side: both show "call ended" and return to the deal.
5. Call again and decline on B: A shows "call declined".
6. Airplane mode on A during a call: both sides end the call after the SDK's reconnect window (about a minute); chat works again after reconnecting.

```powershell
adb logcat -s NexconnCall
```

Expected lines: `call engine initialized sdk=26.4.1`, `start call ok id=...` (caller), `call received id=... extra=<deal id>` (callee), `call connected`, `remote video view attached`, `call ended ... reason=ENDED`.

---

## Judge Demo Accounts (PIN `1234`)

| Persona | Phone | PIN | Default Role | Seeded State |
| :--- | :--- | :--- | :--- | :--- |
| **Rajesh Natarajan** | `+91 90000 00001` | `1234` | Buyer (`buy`) | `CREATED` deal for *casio fx-991ex calculator* (`₹950`) with bot seller Priya Nair — ready to **lock money** |
| **Vikramjeet Singh** | `+91 90000 00002` | `1234` | Seller (`sell`) | Active listing *hercules roadeo cycle* (`₹6,500`) with `OFFERED` deal (`₹5,500`) from bot buyer Aarav Mehta |
