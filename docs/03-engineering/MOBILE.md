# Mobile App Specification (`apps/mobile` & Legacy `apps/mobile-expo`) - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Mobile & Field UX Lead - Dev 3) · Status: Production v1.0 · Last updated: 2026-11-22
> Related: [Android App Implementation Plan](../mobile/ANDROID_APP_IMPLEMENTATION_PLAN.md) · [Project Brief](../00-overview/PROJECT_BRIEF.md) · [CRED Revamp Build Spec](../02-design/CRED_REVAMP_BUILD_SPEC.md) · [Frontend](./FRONTEND.md)

---

## 0. Production Android App (`apps/mobile` — Supersedes `apps/mobile-expo`)

> **Canonical Specification**: See **[`docs/mobile/ANDROID_APP_IMPLEMENTATION_PLAN.md`](../mobile/ANDROID_APP_IMPLEMENTATION_PLAN.md)** and **[`apps/mobile/README.md`](../../apps/mobile/README.md)** for the full architecture, schema, RPC contract, and release APK build guide.

The standalone production Android application (`com.chanakya.mudra`, URL scheme `mudra://`) lives in **`apps/mobile`** (outside `pnpm-workspace.yaml` to avoid dependency hoisting conflicts with `apps/web`) and ships as signed release APKs (`apps/mobile/dist/mudra-v1.0.0.apk` universal and `apps/mobile/dist/mudra-v1.0.0-arm64.apk`):

- **Runtime & UI Stack**: Expo SDK 58 + React Native 0.88 (New Architecture), `expo-router`, Reanimated 4, Gesture Handler, `heroui-native` + `uniwind`, and custom **CRED NeoPOP Dark** primitives (`NeoButton`, `VelvetCard`, `SlideToLock`, `CountdownRing`, `BilingualBubble`, `OfferCard`, `PinPad`, `AvatarRing`, `Receipt`, `Stamp`).
- **Typography**: `Outfit` (UI body/weights), `Fraunces` (lowercase display headings), and `JetBrains Mono` (short codes & SHA-256 voucher hashes), with automatic script fallback for Devanagari/Tamil (`hi`, `ta`, `mr`).
- **Hosted Supabase Backend (`mudra` schema)**:
  - Private schema `mudra` (`profiles`, `sessions`, `wallets`, `wallet_tx`, `listings`, `saves`, `deals`, `messages`, `vouchers` with append-only trigger, `reviews`, `reports`, `idempotency`, `secrets`) completely hidden from direct anon REST access.
  - **28+ `public.m_*` `SECURITY DEFINER` RPCs**: passwordless/OTP-free 4-digit PIN auth (`m_signup`, `m_login`, `m_logout`, `m_me`, `m_change_pin`, `m_delete_account`), campus feed & listings (`m_feed`, `m_listing`, `m_create_listing`, `m_update_listing`, `m_set_listing_status`, `m_my_listings`, `m_toggle_save`, `m_saved`, `m_seller_profile`), deterministic Escrow Deal FSM (`m_start_deal`, `m_deal_action`, `m_deals`, `m_deal`), bilingual chat & lazy Gemini translation (`m_messages`, `m_send_message`, `m_translate_message`), 90-second freeze resolution desk (`m_resolve_if_due`), interactive demo bots (`m_demo_tick`, `m_reset_demo`), and demo credits wallet (`m_wallet`, `m_topup_demo`).
  - **Realtime & Storage**: `public.m_events` Realtime table with automatic React Query invalidation + polling fallback, and `mudra-photos` public storage bucket (`listings/`, `evidence/`, `avatars/`, `seed/`).

---

## 1. Legacy Companion Prototype (`apps/mobile-expo` — `F-14`)

While buyers, arbitrators, and hackathon judges frequently use desktop web (`apps/web`), machinery dealers (`P-02` Vikram in Ludhiana) and agri-mandi sellers walk around physical warehouses holding a smartphone to aim their back camera at a serial number plate or grain sack during a live `@nexconn/call` video assay.

`apps/mobile-expo` provides a native iOS/Android field companion built strictly with **Expo SDK 53**, **React Native 0.78**, **HeroUI Native (`heroui-native@^2.0.1`)**, and **Uniwind (Tailwind v4 for React Native)** per `/heroui-native` guidelines.

---

## 2. Critical `heroui-native` v2.0.1 Architecture Rules

Per `/heroui-native` skill rules, mobile patterns differ from `@heroui/react` web patterns in four strict ways:

| Aspect | `apps/web` (`@heroui/react` v3) | `apps/mobile-expo` (`heroui-native` v2.0.1) |
|---|---|---|
| **Root Providers** | **None** (`No Provider needed`) | **Mandatory**: `<GestureHandlerRootView style={{ flex: 1 }}>` wrapping `<HeroUINativeProvider>` |
| **Styling Engine** | `@tailwindcss/postcss` + `@heroui/styles` | `uniwind` (`@import "tailwindcss"; @import "uniwind"; @import "heroui-native/styles";`) |
| **Color Token Space** | `oklch(...)` CSS variables | `hsl(...)` CSS variables inside `@theme { ... }` + `useThemeColor("accent")` |
| **Card Subcomponents** | `<Card.Header>`, `<Card.Content>`, `<Card.Footer>` | `<Card.Header>`, **`<Card.Body>`** (`Card.Title` & `Card.Description` inside `Card.Body`), `<Card.Footer>` |

---

## 3. Root Provider & Theme Setup (`apps/mobile-expo`)

### 3.1 `apps/mobile-expo/global.css`
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

### 3.2 `apps/mobile-expo/src/AppLayout.tsx`
```tsx
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeroUINativeProvider } from "heroui-native";
import "../global.css";
import { FieldAssayNavigator } from "./navigation/FieldAssayNavigator";

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <FieldAssayNavigator />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
```

---

## 4. Core Mobile Screens & Compound Component Implementation

### 4.1 Screen M-1: 1-Tap QR Deal Join & Persona Login
Allows a seller on the workshop floor (or a judge scanning the QR code from `/sandbox` on their laptop screen) to instantly bind their phone's back camera to Deal `#8821`.

### 4.2 Screen M-2: Back-Camera Live Video Assay & Escrow Card (`FieldAssayScreen.tsx`)
```tsx
import React from "react";
import { View, Text, Platform } from "react-native";
import { Button, Card, useThemeColor } from "heroui-native";
import { Uniwind, useUniwind } from "uniwind";

export function FieldAssayScreen({ dealId = "d_8821_sandbox" }: { dealId?: string }) {
  const accentColor = useThemeColor("accent");
  const { theme } = useUniwind();

  const toggleTheme = () => {
    Uniwind.setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <View className="flex-1 bg-background p-4 justify-between">
      {/* Live Back-Camera WebRTC Viewfinder */}
      <View className="h-72 rounded-2xl bg-black/90 border border-emerald-600 p-4 justify-between">
        <Text className="text-xs font-mono text-emerald-400">
          [ASSAY LOUPE · SERIAL: JUKI-MO-6814S-8821 · 4820 RPM PASS]
        </Text>
        <Text className="text-xs font-mono text-white/80">
          Platform: {Platform.OS.toUpperCase()} · Nexconn Call SDK Active
        </Text>
      </View>

      {/* HeroUI Native Compound Card (Uses Card.Body, NOT Card.Content!) */}
      <Card className="mt-4">
        <Card.Header>
          <Text className="text-xs font-mono text-emerald-700">
            Locked in vault · ₹1,45,000
          </Text>
        </Card.Header>
        <Card.Body>
          <Card.Title>Juki MO-6814S High-Speed Overlock</Card.Title>
          <Card.Description>
            Buyer Rajesh (ta-IN) requested live 2-second motor RPM & serial plate verification.
          </Card.Description>
        </Card.Body>
        <Card.Footer className="flex-row gap-3 pt-2">
          <Button
            variant="primary"
            onPress={() => console.log("Captures frame & sends to API-08:", dealId, accentColor)}
          >
            Transmit signed assay proof
          </Button>
          <Button variant="danger-soft" onPress={toggleTheme}>
            Toggle light/dark
          </Button>
        </Card.Footer>
      </Card>
    </View>
  );
}
```
