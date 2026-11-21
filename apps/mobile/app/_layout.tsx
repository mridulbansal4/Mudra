import '../global.css';
import '@/i18n';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeroUINativeProvider } from 'heroui-native';
import { Uniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { C, R, S } from '@/theme/tokens';
import { useSessionStore } from '@/state/session';
import {
  ensureOnlineManagerWired,
  useNetworkStatus,
  useRealtimeEvents,
} from '@/lib/realtime';
import { useMe, usePing } from '@/features/hooks';
import { Text, ToastProvider } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(C.bg).catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});

function AppShellInner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const token = useSessionStore((s) => s.token);
  const me = useSessionStore((s) => s.me);
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    ensureOnlineManagerWired();
  }, []);

  // Sync server clock offset & keep profile / badge counts fresh
  usePing();
  useMe({ enabled: Boolean(token) });
  useRealtimeEvents(me?.id);

  return (
    <View style={styles.root}>
      {isOffline ? (
        <View style={[styles.offlineBanner, { paddingTop: Math.max(insets.top, S.sm) }]}>
          <View style={styles.offlineDot} />
          <Text size={13} weight={500} color={C.fg}>
            {t('errors.NETWORK')}
          </Text>
        </View>
      ) : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="deal/[id]/escrow"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const hydrate = useSessionStore((s) => s.hydrate);

  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    hydrate().catch(() => {});
    try {
      Uniwind.setTheme('dark');
    } catch {
      // ignore if Uniwind theme is already dark
    }
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(C.void).catch(() => {});
    }
  }, [hydrate]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && hydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, hydrated]);

  if ((!fontsLoaded && !fontError) || !hydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <HeroUINativeProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <AppShellInner />
              </ToastProvider>
            </HeroUINativeProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  offlineBanner: {
    backgroundColor: C.card3,
    paddingBottom: S.sm,
    paddingHorizontal: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: R.chip,
    backgroundColor: C.sunshine,
  },
});
