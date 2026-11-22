import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { C, F, R, S } from '@/theme/tokens';
import { UTR_RE, makeTestUtr } from '@/lib/upi';
import { NeoButton, SlideToLock, Text } from '@/ui';

export interface UtrConfirmProps {
  utr: string;
  onChangeUtr: (val: string) => void;
  onConfirm: () => void;
  loading?: boolean;
  mode?: 'slide' | 'button';
  actionLabel?: string;
}

export function UtrConfirm({
  utr,
  onChangeUtr,
  onConfirm,
  loading = false,
  mode = 'slide',
  actionLabel,
}: UtrConfirmProps) {
  const { t } = useTranslation();
  const cleanUtr = utr.replace(/\D/g, '').slice(0, 12);
  const valid = UTR_RE.test(cleanUtr);

  return (
    <View style={styles.wrap}>
      <Text variant="secondary" size={13} color={C.fg2}>
        {t(
          'escrow.enter_utr_prompt',
          'after paying, enter the 12-digit utr from your upi app.'
        )}
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          testID="utr-input"
          value={cleanUtr}
          onChangeText={(txt) => onChangeUtr(txt.replace(/\D/g, '').slice(0, 12))}
          keyboardType="number-pad"
          maxLength={12}
          placeholder={t('escrow.utr_placeholder', '12-digit utr')}
          placeholderTextColor={C.muted}
          style={styles.input}
        />

        <Pressable
          testID="autofill-test-utr"
          accessibilityRole="button"
          accessibilityLabel={t('escrow.autofill_test_utr', 'auto-fill test utr')}
          onPress={() => onChangeUtr(makeTestUtr())}
          style={({ pressed }) => [styles.testPill, pressed ? styles.pressed : null]}
        >
          <Text variant="mono" size={12} color={C.paccha}>
            {t('escrow.autofill_test_utr', 'auto-fill test utr')}
          </Text>
        </Pressable>
      </View>

      {mode === 'slide' ? (
        <SlideToLock
          label={actionLabel || t('escrow.slide_to_seal', 'slide to seal escrow')}
          accent={C.paccha}
          disabled={!valid || loading}
          loading={loading}
          onComplete={onConfirm}
        />
      ) : (
        <NeoButton
          variant="purple"
          size="lg"
          label={actionLabel || t('wallet.confirm_add_money', 'confirm deposit')}
          disabled={!valid || loading}
          loading={loading}
          onPress={onConfirm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: S.md,
  },
  inputRow: {
    gap: S.sm,
  },
  input: {
    height: 52,
    backgroundColor: C.card2,
    borderRadius: R.row,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.lg,
    color: C.fg,
    fontFamily: F.mono,
    fontSize: 18,
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  testPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: R.chip,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.paccha,
  },
  pressed: {
    opacity: 0.75,
  },
});
