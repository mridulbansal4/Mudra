import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Eye, KeyRound, MapPin, ShieldCheck } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { Eyebrow, Text, TopBar, VelvetCard } from '@/ui';

export default function SafetyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const tips = [
    {
      icon: <MapPin size={22} color={C.paccha} strokeWidth={1.75} />,
      title: t('safety.tip1_title', 'meet in public campus spots'),
      body: t(
        'safety.tip1_body',
        'choose busy places like the library gate, canteen, or hostel lobby in daylight.'
      ),
    },
    {
      icon: <ShieldCheck size={22} color={C.paccha} strokeWidth={1.75} />,
      title: t('safety.tip2_title', 'never pay outside the app'),
      body: t(
        'safety.tip2_body',
        'keep money inside mudra escrow so you are protected until you check the item.'
      ),
    },
    {
      icon: <Eye size={22} color={C.paccha} strokeWidth={1.75} />,
      title: t('safety.tip3_title', 'check the item before releasing'),
      body: t(
        'safety.tip3_body',
        'inspect every detail on live camera or in person before sliding to release.'
      ),
    },
    {
      icon: <AlertTriangle size={22} color={C.sunshine} strokeWidth={1.75} />,
      title: t('safety.tip4_title', 'use freeze if pressured'),
      body: t(
        'safety.tip4_body',
        'if anything feels off, tap freeze immediately and let the resolution desk decide.'
      ),
    },
    {
      icon: <KeyRound size={22} color={C.danger} strokeWidth={1.75} />,
      title: t('safety.tip5_title', 'never share otps or upi pins'),
      body: t('safety.tip5_body', 'mudra never asks for bank pins, otps, or passwords.'),
    },
  ];

  return (
    <View style={styles.screen}>
      <TopBar title={t('safety.title', 'safety tips')} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow label="CAMPUS SAFETY" dot dotColor={C.paccha} />
        <Text variant="display" size={30} color={C.fg} lowercase>
          {t('safety.title', 'safety tips')}
        </Text>

        <View style={styles.list}>
          {tips.map((tip, idx) => (
            <VelvetCard key={idx} tone="card" style={styles.tipCard}>
              <View style={styles.iconWrap}>{tip.icon}</View>
              <View style={styles.copyWrap}>
                <Text weight={600} size={16} color={C.fg}>
                  {tip.title}
                </Text>
                <Text variant="secondary" size={14} color={C.fg2}>
                  {tip.body}
                </Text>
              </View>
            </VelvetCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 18 },
  list: { gap: 12 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWrap: { flex: 1, gap: 4 },
});
