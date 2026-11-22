import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { isWeakPin } from '@/lib/phone';
import { Eyebrow, PinPad, Text, TopBar, showToast } from '@/ui';

type PinStep = 'old' | 'new' | 'confirm';

export default function ChangePinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<PinStep>('old');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOldComplete = (val: string) => {
    setError(null);
    setOldPin(val);
    setStep('new');
  };

  const handleNewComplete = (val: string) => {
    if (isWeakPin(val)) {
      setError(t('auth.pin_weak', 'pick something less guessable.'));
      setNewPin('');
      return;
    }
    setError(null);
    setNewPin(val);
    setStep('confirm');
  };

  const handleConfirmComplete = async (val: string) => {
    if (val !== newPin) {
      setError(t('auth.pin_mismatch', "pins don't match. try again."));
      setConfirmPin('');
      setNewPin('');
      setStep('new');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await mudraApi.changePin(oldPin, val);
      showToast(t('profile.pin_changed', 'pin updated.'), 'success');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/profile' as never);
      }
    } catch (err) {
      setError((err as Error)?.message || t('errors.BAD_PIN_GENERIC'));
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setStep('old');
    } finally {
      setLoading(false);
    }
  };

  const currentVal = step === 'old' ? oldPin : step === 'new' ? newPin : confirmPin;
  const setCurrentVal = (v: string) => {
    setError(null);
    if (step === 'old') setOldPin(v);
    else if (step === 'new') setNewPin(v);
    else setConfirmPin(v);
  };

  const heading =
    step === 'old'
      ? t('profile.old_pin', 'enter current pin')
      : step === 'new'
        ? t('profile.new_pin', 'enter new pin')
        : t('profile.confirm_new_pin', 'confirm new pin');

  return (
    <View style={styles.screen}>
      <TopBar title={t('profile.change_pin', 'change pin')} />

      <View style={[styles.body, { paddingBottom: Math.max(insets.bottom + 20, 32) }]}>
        <View style={styles.topText}>
          <Eyebrow
            label={`STEP ${step === 'old' ? 1 : step === 'new' ? 2 : 3} OF 3`}
            dot
            dotColor={C.paccha}
          />
          <Text variant="display" size={30} color={C.fg} lowercase align="center">
            {heading}
          </Text>
        </View>

        <PinPad
          value={currentVal}
          onChange={setCurrentVal}
          onComplete={
            step === 'old'
              ? handleOldComplete
              : step === 'new'
                ? handleNewComplete
                : handleConfirmComplete
          }
          error={error}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topText: { alignItems: 'center', gap: 10 },
});
