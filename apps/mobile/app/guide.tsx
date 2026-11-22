import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Camera, Handshake, Lock, Scale } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { Eyebrow, NeoButton, Text, TopBar, VelvetCard } from '@/ui';

export default function GuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const steps = [
    {
      icon: <Handshake size={22} color={C.paccha} strokeWidth={1.75} />,
      title: t('guide.step1_title', '1. offer or buy'),
      body: t('guide.step1_body', 'buy at the listed price or send a quick offer inside chat.'),
    },
    {
      icon: <Lock size={22} color={C.paccha} strokeWidth={1.75} />,
      title: t('guide.step2_title', '2. money locks in escrow'),
      body: t(
        'guide.step2_body',
        'the buyer locks demo credits in mudra escrow before meeting up.'
      ),
    },
    {
      icon: <Camera size={22} color={C.paccha} strokeWidth={1.75} />,
      title: t('guide.step3_title', '3. see it live or in person'),
      body: t(
        'guide.step3_body',
        'the seller proves the item on live camera or during a campus meetup.'
      ),
    },
    {
      icon: <Scale size={22} color={C.paccha} strokeWidth={1.75} />,
      title: t('guide.step4_title', '4. release, or freeze for a fair split'),
      body: t(
        'guide.step4_body',
        'happy? slide to release. something wrong? freeze for a 90-second verdict.'
      ),
    },
  ];

  return (
    <View style={styles.screen}>
      <TopBar title={t('guide.title', 'how it works')} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow label="MUDRA ESCROW" dot dotColor={C.paccha} />
        <Text variant="display" size={32} color={C.fg} lowercase>
          {t('welcome.slide1_title', 'buy and sell on campus, without the fear.')}
        </Text>

        <View style={styles.cards}>
          {steps.map((step, idx) => (
            <VelvetCard key={idx} tone="card" style={styles.stepCard}>
              <View style={styles.iconCircle}>{step.icon}</View>
              <View style={styles.stepCopy}>
                <Text variant="display" size={20} color={C.fg} lowercase>
                  {step.title}
                </Text>
                <Text variant="secondary" size={14} color={C.fg2}>
                  {step.body}
                </Text>
              </View>
            </VelvetCard>
          ))}
        </View>

        <NeoButton
          variant="paccha"
          size="lg"
          label={t('explore.title', 'explore')}
          onPress={() => router.push('/(tabs)/explore' as never)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 18 },
  cards: { gap: 12 },
  stepCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: { flex: 1, gap: 4 },
});
