import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config/brand';
import { mudraApi } from '@/features/api';
import { UtrConfirm } from '@/features/escrow/UtrConfirm';
import { formatMoney } from '@/lib/money';
import { makeWalletTxnRef, openUpiApp } from '@/lib/upi';
import { useSessionStore } from '@/state/session';
import { C, F, R, S } from '@/theme/tokens';
import { NeoButton, Sheet, Text, showToast } from '@/ui';

const QUICK_RUPEES = [500, 1000, 2000] as const;

export interface AddMoneySheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AddMoneySheet({ visible, onClose }: AddMoneySheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const locale = useSessionStore((s) => s.locale) ?? 'en';

  const [rupeesInput, setRupeesInput] = useState('1000');
  const [step, setStep] = useState<'pay' | 'confirm'>('pay');
  const [utr, setUtr] = useState('');
  const openedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setStep('pay');
      setUtr('');
    }
  }, [visible]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && openedRef.current) {
        openedRef.current = false;
        setStep('confirm');
      }
    });
    return () => sub.remove();
  }, []);

  const rupees = parseInt(rupeesInput.replace(/\D/g, ''), 10) || 0;
  const amountMinor = rupees * 100;
  const validAmount = amountMinor >= 100 && amountMinor <= 10000000;

  const depositMut = useMutation({
    mutationFn: () =>
      mudraApi.recordUpiDeposit({
        amount_minor: amountMinor,
        utr: utr.trim(),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['wallet'], updated);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      const formatted = formatMoney(amountMinor, 'INR', locale);
      showToast(
        t('wallet.added_unverified_toast', {
          price: formatted,
          defaultValue: `${formatted} added (unverified)`,
        }),
        'success'
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
    },
  });

  const handlePayWithUpi = async () => {
    if (!validAmount) return;
    const res = await openUpiApp({
      vpa: BRAND.escrowVpa,
      payeeName: BRAND.escrowName,
      amountMinor,
      note: 'mudra wallet deposit',
      txnRef: makeWalletTxnRef(),
    });
    if (res === 'no_app') {
      showToast(
        t(
          'escrow.no_upi_app_toast',
          'no upi app on this device. use a test utr to continue.'
        ),
        'neutral'
      );
      setStep('confirm');
    } else {
      openedRef.current = true;
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('wallet.add_money_upi', 'add money via upi')}
    >
      <View style={styles.body}>
        <View style={styles.amountField}>
          <Text variant="display" size={24} color={C.muted}>
            ₹
          </Text>
          <TextInput
            testID="add-money-amount-input"
            value={rupeesInput}
            editable={step === 'pay'}
            onChangeText={(txt) => setRupeesInput(txt.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="1000"
            placeholderTextColor={C.muted}
            style={styles.amountInput}
          />
        </View>

        {step === 'pay' ? (
          <>
            <View style={styles.chipsRow}>
              {QUICK_RUPEES.map((amt) => {
                const active = rupees === amt;
                return (
                  <Pressable
                    key={amt}
                    testID={`chip-${amt}`}
                    accessibilityRole="button"
                    onPress={() => setRupeesInput(String(amt))}
                    style={[styles.chip, active ? styles.chipActive : null]}
                  >
                    <Text
                      weight={600}
                      size={13}
                      color={active ? C.paccha : C.fg2}
                      tabular
                    >
                      {formatMoney(amt * 100, 'INR', locale)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <NeoButton
              testID="sheet-pay-with-upi-btn"
              variant="purple"
              size="lg"
              label={t('wallet.pay_with_upi', 'pay with upi')}
              disabled={!validAmount}
              onPress={handlePayWithUpi}
            />

            <Pressable
              testID="sheet-ive-paid-link"
              accessibilityRole="button"
              disabled={!validAmount}
              onPress={() => setStep('confirm')}
              style={styles.ivePaidBtn}
            >
              <Text variant="secondary" size={13} color={C.paccha}>
                {t('escrow.ive_paid', "i've paid")}
              </Text>
            </Pressable>
          </>
        ) : (
          <UtrConfirm
            utr={utr}
            onChangeUtr={setUtr}
            onConfirm={() => depositMut.mutate()}
            loading={depositMut.isPending}
            mode="button"
            actionLabel={t('wallet.confirm_add_money', 'confirm deposit')}
          />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: S.md,
    paddingBottom: S.md,
  },
  amountField: {
    height: 56,
    backgroundColor: C.card2,
    borderRadius: R.row,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  amountInput: {
    flex: 1,
    color: C.fg,
    fontFamily: F.display,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  chipsRow: {
    flexDirection: 'row',
    gap: S.sm,
  },
  chip: {
    paddingHorizontal: S.md,
    paddingVertical: 8,
    borderRadius: R.chip,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  chipActive: {
    borderColor: C.paccha,
  },
  ivePaidBtn: {
    alignSelf: 'center',
    paddingVertical: S.xs,
    paddingHorizontal: S.md,
  },
});
