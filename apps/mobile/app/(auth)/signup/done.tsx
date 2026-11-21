import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BadgeCheck } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { formatMoney } from '@/lib/money';
import { useSessionStore } from '@/state/session';
import type { CurrencyCode } from '@/types';
import { LogoMark, NeoButton, Text, VelvetCard } from '@/ui';

const SIGNUP_BONUS_BY_CURRENCY: Record<CurrencyCode, number> = {
  INR: 2500000,
  USD: 30000,
  EUR: 30000,
  GBP: 25000,
  SGD: 40000,
  AED: 110000,
  CAD: 40000,
  AUD: 45000,
};

export default function SignupDoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const me = useSessionStore((s) => s.me);
  const resetSignupDraft = useSessionStore((s) => s.resetSignupDraft);

  const firstName = (me?.name || 'friend').trim().split(/\s+/)[0].toLowerCase();
  const currency: CurrencyCode = me?.currency || 'INR';
  const walletMinor =
    me?.wallet_balance_minor ??
    me?.balance_minor ??
    me?.wallets?.[0]?.balance_minor ??
    SIGNUP_BONUS_BY_CURRENCY[currency] ??
    2500000;

  const formattedCredits = formatMoney(walletMinor, currency);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top + 32, 48),
          paddingBottom: Math.max(insets.bottom + 20, 28),
        },
      ]}
    >
      <View style={styles.center}>
        <View style={styles.badgeCircle}>
          <LogoMark size={48} />
        </View>

        <Text
          variant="display"
          size={40}
          lineHeight={44}
          align="center"
          color={C.fg}
          style={styles.title}
        >
          {t('auth.done_title', { name: firstName })}
        </Text>

        <Text
          size={16}
          lineHeight={24}
          align="center"
          color={C.muted}
          style={styles.bodyText}
        >
          {t('auth.done_body', { credits: formattedCredits })}
        </Text>

        <VelvetCard tone="card2" style={styles.creditCard}>
          <View style={styles.creditRow}>
            <BadgeCheck size={20} strokeWidth={1.75} color={C.paccha} />
            <Text weight={700} size={22} color={C.paccha} tabular>
              {formattedCredits}
            </Text>
          </View>
          <Text variant="secondary" size={12} color={C.muted} align="center">
            demo escrow wallet ready
          </Text>
        </VelvetCard>
      </View>

      <NeoButton
        variant="paccha"
        size="lg"
        label={t('auth.start_exploring')}
        onPress={() => {
          resetSignupDraft();
          router.replace('/(tabs)/home' as never);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.void,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  badgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.card2,
    borderWidth: 1.5,
    borderColor: C.paccha,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textTransform: 'lowercase',
  },
  bodyText: {
    maxWidth: 320,
  },
  creditCard: {
    marginTop: 8,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
