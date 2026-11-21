# Mobile Companion App Specification (`apps/mobile-expo`) - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Mobile & Field UX Lead - Dev 3) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Design System](../02-design/DESIGN_SYSTEM.md) · [Frontend](./FRONTEND.md) · [Nexconn SDK Manual](./NEXCONN_SDK_MANUAL.md)

---

## 1. Purpose of the Mobile Companion App (`F-14`)

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
