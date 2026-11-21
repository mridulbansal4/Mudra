import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react-native';
import { C, F, R } from '@/theme/tokens';
import {
  COUNTRIES, getCountryByCode, getDefaultCountryCode, validateAndFormatE164,
} from '@/lib/phone';
import { MudraError, rpc } from '@/lib/rpc';
import { useSessionStore } from '@/state/session';
import type { Me } from '@/types';
import {
  Eyebrow, ListGroup, ListRow, NeoButton, PinPad, Sheet, Text, TopBar, showToast,
} from '@/ui';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const setSession = useSessionStore((s) => s.setSession);
  const setMode = useSessionStore((s) => s.setMode);

  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [countryCode, setCountryCode] = useState<string>(getDefaultCountryCode());
  const [nationalPhone, setNationalPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [forgotSheetOpen, setForgotSheetOpen] = useState(false);

  const currentCountry = getCountryByCode(countryCode);
  const validation = useMemo(
    () => validateAndFormatE164(nationalPhone, countryCode),
    [nationalPhone, countryCode]
  );

  const handlePhoneContinue = () => {
    if (!validation.valid) return;
    setPhoneE164(validation.e164);
    setPin('');
    setError(null);
    setNotFound(false);
    setStep('pin');
  };

  const executeLogin = async (targetPhone: string, targetPin: string, forceMode?: 'buy' | 'sell') => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await rpc<{ token: string; me: Me }>('m_login', {
        p_phone: targetPhone,
        p_pin: targetPin,
      });
      await setSession(res.token, res.me);
      if (forceMode) await setMode(forceMode);
      router.replace('/(tabs)/home' as never);
    } catch (err: unknown) {
      setPin('');
      if (err instanceof MudraError) {
        if (err.code === 'NOT_FOUND') {
          setNotFound(true);
          setError(t('auth.no_account'));
        } else {
          setError(err.message);
        }
      } else {
        const msg = err instanceof Error ? err.message : t('errors.UNKNOWN');
        setError(msg);
        showToast(msg, 'danger');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <TopBar
        title={step === 'pin' ? phoneE164 : undefined}
        onBack={() => {
          if (step === 'pin') {
            setStep('phone');
            setPin('');
            setError(null);
          } else {
            router.back();
          }
        }}
      />

      {step === 'phone' ? (
        <View style={[styles.body, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <View style={styles.topContent}>
            <Text variant="display" size={34} lineHeight={38} color={C.fg} lowercase>
              {t('auth.login_title')}
            </Text>

            <View style={styles.phoneRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('auth.select_country')}
                onPress={() => setCountrySheetOpen(true)}
                style={styles.countryBtn}
              >
                <Text weight={700} size={16} color={C.fg} tabular>{currentCountry.label}</Text>
                <ChevronDown size={16} strokeWidth={2} color={C.muted} />
              </Pressable>

              <TextInput
                autoFocus
                keyboardType="phone-pad"
                placeholder={t('auth.phone_placeholder')}
                placeholderTextColor={C.dim}
                value={nationalPhone}
                onChangeText={setNationalPhone}
                onSubmitEditing={handlePhoneContinue}
                returnKeyType="next"
                style={styles.phoneInput}
              />
            </View>

            <View style={styles.demoSection}>
              <Eyebrow label={t('welcome.try_demo').toUpperCase()} dot />
              <View style={styles.demoChips}>
                <Pressable
                  disabled={loading}
                  onPress={() => executeLogin('+919000000001', '1234', 'buy')}
                  style={styles.demoChip}
                >
                  <Text weight={600} size={13} color={C.fg}>{t('auth.demo_buyer')}</Text>
                </Pressable>
                <Pressable
                  disabled={loading}
                  onPress={() => executeLogin('+919000000002', '1234', 'sell')}
                  style={styles.demoChip}
                >
                  <Text weight={600} size={13} color={C.paccha}>{t('auth.demo_seller')}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <NeoButton
            variant="purple"
            size="lg"
            label={t('common.continue')}
            disabled={!validation.valid || loading}
            loading={loading}
            onPress={handlePhoneContinue}
          />
        </View>
      ) : (
        <View style={[styles.pinBody, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <View style={styles.pinHeader}>
            <Text variant="display" size={32} lineHeight={36} align="center" lowercase>
              {t('auth.login_pin_title')}
            </Text>
            {notFound ? (
              <Pressable onPress={() => router.replace('/(auth)/signup/name' as never)} style={styles.textLink}>
                <Text weight={700} size={14} color={C.paccha}>{t('auth.create_one')}</Text>
              </Pressable>
            ) : null}
          </View>

          <PinPad
            value={pin}
            onChange={(v) => {
              if (error) setError(null);
              setPin(v);
            }}
            onComplete={(completed) => executeLogin(phoneE164, completed)}
            error={error}
            loading={loading}
          />

          <Pressable onPress={() => setForgotSheetOpen(true)} style={styles.textLink}>
            <Text weight={500} size={14} color={C.muted}>{t('auth.forgot_pin')}</Text>
          </Pressable>
        </View>
      )}

      <Sheet visible={countrySheetOpen} onClose={() => setCountrySheetOpen(false)} title={t('auth.select_country')} scrollable>
        <ListGroup style={styles.sheetList}>
          {COUNTRIES.map((c) => (
            <ListRow
              key={c.code}
              title={c.name.toLowerCase()}
              subtitle={c.label}
              showChevron={false}
              right={c.code === countryCode ? <Check size={18} strokeWidth={2.25} color={C.paccha} /> : null}
              onPress={() => {
                setCountryCode(c.code);
                setCountrySheetOpen(false);
              }}
            />
          ))}
        </ListGroup>
      </Sheet>

      <Sheet visible={forgotSheetOpen} onClose={() => setForgotSheetOpen(false)} title={t('auth.forgot_pin')}>
        <View style={styles.forgotBox}>
          <Text variant="secondary" size={14} lineHeight={20} color={C.fg2}>{t('auth.forgot_pin_body')}</Text>
          <NeoButton
            variant="purple"
            label={t('auth.create_one')}
            onPress={() => {
              setForgotSheetOpen(false);
              router.replace('/(auth)/signup/name' as never);
            }}
          />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 28, justifyContent: 'space-between' },
  topContent: { gap: 20 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryBtn: {
    height: 60, paddingHorizontal: 14, backgroundColor: C.card2, borderRadius: R.row,
    borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  phoneInput: {
    flex: 1, height: 60, backgroundColor: C.card2, borderRadius: R.row, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 18, fontFamily: F.uiSemi, fontSize: 20, color: C.fg,
  },
  demoSection: { marginTop: 8, gap: 10 },
  demoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  demoChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.chip,
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
  },
  pinBody: {
    flex: 1, paddingHorizontal: 20, paddingTop: 20, justifyContent: 'space-between', alignItems: 'center',
  },
  pinHeader: { alignItems: 'center', gap: 8 },
  textLink: { paddingVertical: 8, paddingHorizontal: 12 },
  sheetList: { marginBottom: 24 },
  forgotBox: { gap: 16, paddingBottom: 12 },
});
