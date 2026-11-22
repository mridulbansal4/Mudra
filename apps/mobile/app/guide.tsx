import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Camera, Handshake, Lock, Scale } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { Eyebrow, NeoButton, StatusPill, Text, TopBar, VelvetCard } from '@/ui';
import { NexconnCall } from '../modules/nexconn-chat';
import { NEXCONN_ANDROID_CALL_SDK, NEXCONN_ANDROID_SDK, useNexconnStore } from '@/lib/nexconn';

export default function GuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nexconn = useNexconnStore();

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

        <VelvetCard tone="card" style={styles.nexconnCard}>
          <View style={styles.nexconnHead}>
            <Text variant="display" size={20} color={C.fg} lowercase>
              nexconn connection
            </Text>
            <StatusPill
              tone={nexconn.status === 'live' ? 'done' : nexconn.status === 'connecting' ? 'sunshine' : nexconn.status === 'error' ? 'danger' : 'neutral'}
              label={nexconn.status === 'live' ? 'Nexconn live' : nexconn.status === 'connecting' ? 'Nexconn connecting' : 'Nexconn offline'}
            />
          </View>
          <NexconnRow label="user id" value={nexconn.userId ?? 'not signed in'} />
          <NexconnRow
            label="sdk"
            value={`Android Chat SDK ${nexconn.sdkVersion ?? ''} (${NEXCONN_ANDROID_SDK})`}
          />
          <NexconnRow
            label="call sdk"
            value={`Call SDK ${NexconnCall.sdkVersion() ?? ''}: 1:1 inspection video call (${NEXCONN_ANDROID_CALL_SDK})${nexconn.status === 'live' && !NexconnCall.isReady() ? ' - not ready' : ''}`}
          />
          <NexconnRow label="last message id" value={nexconn.lastMessageId ?? 'none yet'} />
          {nexconn.lastStatusEvent ? <NexconnRow label="sdk status" value={nexconn.lastStatusEvent} /> : null}
          {nexconn.error ? <NexconnRow label="last error" value={nexconn.error} /> : null}
        </VelvetCard>

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

function NexconnRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nexconnRow}>
      <Text variant="secondary" size={12} color={C.muted}>
        {label}
      </Text>
      <Text variant="mono" size={12} color={C.fg2} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nexconnCard: { gap: 10 },
  nexconnHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nexconnRow: { gap: 2 },
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
