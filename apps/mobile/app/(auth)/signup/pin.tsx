import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C } from '@/theme/tokens';
import { defaultCurrencyForRegion } from '@/lib/money';
import { isWeakPin } from '@/lib/phone';
import { MudraError, rpc } from '@/lib/rpc';
import { useSessionStore } from '@/state/session';
import type { Me } from '@/types';
import { PinPad, Text, TopBar } from '@/ui';

export default function SignupPinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const signupDraft = useSessionStore((s) => s.signupDraft);
  const locale = useSessionStore((s) => s.locale);
  const setSession = useSessionStore((s) => s.setSession);

  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePinChange = (next: string) => {
    if (error) setError(null);
    setPin(next);
  };

  const handleComplete = async (completedPin: string) => {
    if (step === 'create') {
      if (isWeakPin(completedPin)) {
        setError(t('auth.pin_weak'));
        setPin('');
        return;
      }
      setFirstPin(completedPin);
      setPin('');
      setError(null);
      setStep('confirm');
      return;
    }

    if (completedPin !== firstPin) {
      setError(t('auth.pin_mismatch'));
      setPin('');
      setFirstPin('');
      setStep('create');
      return;
    }

    setLoading(true);
    setError(null);
    setPhoneTaken(false);

    try {
      const currency = defaultCurrencyForRegion(signupDraft.countryCode);
      const res = await rpc<{ token: string; me: Me }>('m_signup', {
        p_name: signupDraft.name.trim() || 'Mudra User',
        p_phone: signupDraft.phoneE164,
        p_pin: completedPin,
        p_role: signupDraft.role || 'both',
        p_locale: locale || 'en',
        p_currency: currency,
        p_campus: signupDraft.campus.trim() || 'IIT Bombay',
      });

      await setSession(res.token, res.me);
      router.replace('/(auth)/signup/done' as never);
    } catch (err: unknown) {
      setPin('');
      if (err instanceof MudraError && err.code === 'PHONE_TAKEN') {
        setPhoneTaken(true);
        setError(t('auth.phone_taken'));
      } else {
        setError(err instanceof Error ? err.message : t('errors.UNKNOWN'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar
        progressStage={4}
        onBack={() => {
          if (step === 'confirm') {
            setStep('create');
            setPin('');
            setError(null);
          } else {
            router.back();
          }
        }}
      />

      <View
        style={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom + 20, 28) },
        ]}
      >
        <View style={styles.headerBlock}>
          <Text
            variant="display"
            size={32}
            lineHeight={36}
            align="center"
            color={C.fg}
            style={styles.title}
          >
            {step === 'create'
              ? t('auth.pin_create_title')
              : t('auth.pin_confirm_title')}
          </Text>

          {phoneTaken ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(auth)/login' as never)}
              style={styles.loginLink}
            >
              <Text weight={700} size={14} color={C.paccha}>
                {t('auth.login_instead')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <PinPad
          value={pin}
          onChange={handlePinChange}
          onComplete={handleComplete}
          error={error}
          loading={loading}
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
    paddingTop: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    textTransform: 'lowercase',
  },
  loginLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
