import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, Globe, ScanEye, Scale, Vault } from 'lucide-react-native';
import { C, R } from '@/theme/tokens';
import { LANGUAGES } from '@/i18n';
import { rpc } from '@/lib/rpc';
import { useSessionStore } from '@/state/session';
import type { LocaleCode, Me } from '@/types';
import {
  ListGroup,
  ListRow,
  LogoMark,
  NeoButton,
  Sheet,
  Text,
  VelvetCard,
  showToast,
} from '@/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const locale = useSessionStore((s) => s.locale);
  const setLocale = useSessionStore((s) => s.setLocale);
  const setSession = useSessionStore((s) => s.setSession);
  const setMode = useSessionStore((s) => s.setMode);
  const enterGuestMode = useSessionStore((s) => s.enterGuestMode);
  const resetSignupDraft = useSessionStore((s) => s.resetSignupDraft);

  const [slideIndex, setSlideIndex] = useState(0);
  const [langSheetVisible, setLangSheetVisible] = useState(false);
  const [demoSheetVisible, setDemoSheetVisible] = useState(false);
  const [demoLoading, setDemoLoading] = useState<'buyer' | 'seller' | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];
  const slides = [
    {
      key: '1',
      icon: <Vault size={36} strokeWidth={1.75} color={C.paccha} />,
      title: t('welcome.slide1_title'),
      body: t('welcome.slide1_body'),
    },
    {
      key: '2',
      icon: <ScanEye size={36} strokeWidth={1.75} color={C.purple} />,
      title: t('welcome.slide2_title'),
      body: t('welcome.slide2_body'),
    },
    {
      key: '3',
      icon: <Scale size={36} strokeWidth={1.75} color={C.sunshine} />,
      title: t('welcome.slide3_title'),
      body: t('welcome.slide3_body'),
    },
  ];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== slideIndex && idx >= 0 && idx < slides.length) {
      setSlideIndex(idx);
    }
  };

  const handleDemoLogin = async (role: 'buyer' | 'seller') => {
    const phone = role === 'buyer' ? '+919000000001' : '+919000000002';
    setDemoLoading(role);
    try {
      const res = await rpc<{ token: string; me: Me }>('m_login', {
        p_phone: phone,
        p_pin: '1234',
      });
      await setSession(res.token, res.me);
      await setMode(role === 'seller' ? 'sell' : 'buy');
      setDemoSheetVisible(false);
      router.replace('/(tabs)/home' as never);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'demo login failed', 'danger');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 12, 24),
          paddingBottom: Math.max(insets.bottom + 16, 24),
        },
      ]}
    >
      <View style={styles.topRow}>
        <LogoMark size={52} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="select language"
          onPress={() => setLangSheetVisible(true)}
          style={styles.langChip}
        >
          <Globe size={15} strokeWidth={1.75} color={C.fg2} />
          <Text variant="eyebrow" size={11} color={C.fg}>
            {currentLang.short}
          </Text>
        </Pressable>
      </View>

      <View style={styles.pagerWrap}>
        <FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <View style={styles.slideIconBox}>{item.icon}</View>
              <Text variant="display" size={38} lineHeight={42} color={C.fg} lowercase>
                {item.title}
              </Text>
              <Text size={16} lineHeight={24} color={C.muted} style={styles.slideBody}>
                {item.body}
              </Text>
            </View>
          )}
        />
        <View style={styles.dotsRow}>
          {slides.map((s, idx) => (
            <View
              key={s.key}
              style={[styles.dot, idx === slideIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      </View>

      <View style={styles.bottomActions}>
        <NeoButton
          variant="purple"
          size="lg"
          label={t('welcome.get_started')}
          onPress={() => {
            resetSignupDraft();
            router.push('/(auth)/signup/name' as never);
          }}
        />
        <NeoButton
          variant="ghost"
          size="md"
          label={t('welcome.have_account')}
          onPress={() => router.push('/(auth)/login' as never)}
        />
        <View style={styles.linksRow}>
          <Pressable onPress={() => setDemoSheetVisible(true)} style={styles.textLinkBtn}>
            <Text weight={600} size={14} color={C.paccha}>
              {t('welcome.try_demo')}
            </Text>
          </Pressable>
          <View style={styles.dotSep} />
          <Pressable
            onPress={async () => {
              await enterGuestMode();
              router.replace('/(tabs)/home' as never);
            }}
            style={styles.textLinkBtn}
          >
            <Text weight={500} size={14} color={C.muted}>
              {t('welcome.browse_guest')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Sheet
        visible={langSheetVisible}
        onClose={() => setLangSheetVisible(false)}
        title={t('profile.language')}
      >
        <ListGroup>
          {LANGUAGES.map((lang) => (
            <ListRow
              key={lang.code}
              title={lang.nativeLabel}
              subtitle={lang.label}
              showChevron={false}
              right={
                lang.code === locale ? (
                  <Check size={18} strokeWidth={2.25} color={C.paccha} />
                ) : null
              }
              onPress={async () => {
                await setLocale(lang.code as LocaleCode);
                setLangSheetVisible(false);
              }}
            />
          ))}
        </ListGroup>
      </Sheet>

      <Sheet
        visible={demoSheetVisible}
        onClose={() => setDemoSheetVisible(false)}
        title={t('welcome.try_demo')}
      >
        <View style={styles.demoSheetBody}>
          <VelvetCard
            tone="card2"
            borderColor={C.purple}
            onPress={() => handleDemoLogin('buyer')}
            disabled={demoLoading !== null}
          >
            <Text weight={700} size={16} color={C.fg}>{t('auth.demo_buyer')}</Text>
            <Text variant="secondary" size={13} color={C.muted}>
              +91 90000 00001 · pin 1234 · active deal ready to lock escrow
            </Text>
          </VelvetCard>
          <VelvetCard
            tone="card2"
            borderColor={C.paccha}
            onPress={() => handleDemoLogin('seller')}
            disabled={demoLoading !== null}
          >
            <Text weight={700} size={16} color={C.fg}>{t('auth.demo_seller')}</Text>
            <Text variant="secondary" size={13} color={C.muted}>
              +91 90000 00002 · pin 1234 · offer waiting on your cycle listing
            </Text>
          </VelvetCard>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.void, justifyContent: 'space-between' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: R.chip,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  pagerWrap: { flex: 1, justifyContent: 'center' },
  slide: { paddingHorizontal: 24, justifyContent: 'center', gap: 16 },
  slideIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  slideBody: { maxWidth: 340 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginTop: 28 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: C.paccha },
  dotInactive: { width: 6, backgroundColor: C.card3 },
  bottomActions: { paddingHorizontal: 20, gap: 12 },
  linksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 },
  textLinkBtn: { paddingVertical: 8, paddingHorizontal: 6 },
  dotSep: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.dim },
  demoSheetBody: { gap: 12, paddingBottom: 12 },
});
