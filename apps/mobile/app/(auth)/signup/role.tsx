import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, ShoppingBag, Tag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { C } from '@/theme/tokens';
import { useSessionStore } from '@/state/session';
import type { PrimaryRole } from '@/types';
import { NeoButton, Text, TopBar, VelvetCard } from '@/ui';

export default function SignupRoleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const signupDraft = useSessionStore((s) => s.signupDraft);
  const setSignupDraft = useSessionStore((s) => s.setSignupDraft);

  const selectedRole: PrimaryRole = signupDraft.role || 'both';

  const options: {
    role: PrimaryRole;
    title: string;
    desc: string;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      role: 'buy',
      title: t('auth.role_buying'),
      desc: t('auth.role_buying_desc'),
      accent: C.purple,
      icon: <ShoppingBag size={24} strokeWidth={1.75} color={C.purple} />,
    },
    {
      role: 'sell',
      title: t('auth.role_selling'),
      desc: t('auth.role_selling_desc'),
      accent: C.paccha,
      icon: <Tag size={24} strokeWidth={1.75} color={C.paccha} />,
    },
    {
      role: 'both',
      title: t('auth.role_both'),
      desc: t('auth.role_both_desc'),
      accent: C.paccha,
      icon: <ArrowLeftRight size={24} strokeWidth={1.75} color={C.paccha} />,
    },
  ];

  return (
    <View style={styles.screen}>
      <TopBar progressStage={2} />

      <View
        style={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom + 16, 24) },
        ]}
      >
        <View style={styles.topContent}>
          <Text
            variant="display"
            size={34}
            lineHeight={38}
            color={C.fg}
            style={styles.heading}
          >
            {t('auth.role_title')}
          </Text>

          <View style={styles.cards}>
            {options.map((opt) => {
              const isSelected = selectedRole === opt.role;
              return (
                <VelvetCard
                  key={opt.role}
                  radius={24}
                  padding={20}
                  tone={isSelected ? 'card2' : 'card'}
                  borderColor={isSelected ? opt.accent : C.hairline}
                  style={isSelected ? styles.selectedCard : undefined}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSignupDraft({ role: opt.role });
                  }}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.iconCircle}>{opt.icon}</View>
                    <View style={styles.cardTextCol}>
                      <Text weight={700} size={18} color={C.fg}>
                        {opt.title}
                      </Text>
                      <Text variant="secondary" size={14} color={C.muted}>
                        {opt.desc}
                      </Text>
                    </View>
                  </View>
                </VelvetCard>
              );
            })}
          </View>

          <Text variant="secondary" size={13} color={C.muted}>
            {t('auth.role_footer')}
          </Text>
        </View>

        <NeoButton
          variant="purple"
          size="lg"
          label={t('common.continue')}
          onPress={() => router.push('/(auth)/signup/phone' as never)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    justifyContent: 'space-between',
  },
  topContent: {
    gap: 20,
  },
  heading: {
    textTransform: 'lowercase',
  },
  cards: {
    gap: 12,
  },
  selectedCard: {
    borderWidth: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.card3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    gap: 2,
  },
});
