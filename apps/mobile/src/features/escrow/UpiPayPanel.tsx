import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config/brand';
import { mudraApi } from '@/features/api';
import { formatMoney } from '@/lib/money';
import { makeDealTxnRef, openUpiApp } from '@/lib/upi';
import { useSessionStore } from '@/state/session';
import { C, R, S } from '@/theme/tokens';
import type { Deal } from '@/types';
import { ListGroup, ListRow, NeoButton, Price, Text, showToast } from '@/ui';
import { UtrConfirm } from './UtrConfirm';

export interface UpiPayPanelProps {
  deal: Deal;
  onSealed: (hash: string) => void;
  onErrorRefresh?: () => void;
}

export function UpiPayPanel({
  deal,
  onSealed,
  onErrorRefresh,
}: UpiPayPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const locale = useSessionStore((s) => s.locale) ?? 'en';

  const [step, setStep] = useState<'pay' | 'confirm'>('pay');
  const [utr, setUtr] = useState('');
  const openedRef = useRef(false);
  const idemRef = useRef<string>(Crypto.randomUUID());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && openedRef.current) {
        openedRef.current = false;
        setStep('confirm');
      }
    });
    return () => sub.remove();
  }, []);

  const recordMut = useMutation({
    mutationFn: () =>
      mudraApi.recordUpiDepositForDeal({
        amount_minor: deal.amount_minor,
        utr: utr.trim(),
        deal_id: deal.id,
        expected_version: deal.version,
        idem: idemRef.current,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['deal', deal.id], updated);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['messages', deal.id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      const hash =
        updated.latest_voucher_hash ||
        updated.voucher_hash ||
        updated.last_voucher_hash ||
        `ed25519-${updated.short_code}`;
      onSealed(hash);
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
      onErrorRefresh?.();
    },
  });

  const handleOpenUpi = async () => {
    const res = await openUpiApp({
      vpa: BRAND.escrowVpa,
      payeeName: BRAND.escrowName,
      amountMinor: deal.amount_minor,
      note: `mudra escrow ${deal.short_code}`,
      txnRef: makeDealTxnRef(deal.short_code),
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

  const priceFormatted = formatMoney(deal.amount_minor, deal.currency, locale);

  return (
    <View style={styles.wrap}>
      <View style={styles.amountBox}>
        <Price
          minor={deal.amount_minor}
          currency={deal.currency}
          variant="display"
          size={32}
          color={C.fg}
        />
      </View>

      <ListGroup>
        <ListRow
          title={t('escrow.payee_label', 'payee')}
          subtitle={BRAND.escrowName.toLowerCase()}
          value={
            <Text variant="mono" size={13} color={C.fg2}>
              {BRAND.escrowVpa}
            </Text>
          }
        />
      </ListGroup>

      {step === 'pay' ? (
        <View style={styles.payActions}>
          <NeoButton
            testID="pay-with-upi-btn"
            variant="purple"
            size="lg"
            label={t('escrow.pay_with_upi', {
              price: priceFormatted,
              defaultValue: `pay ${priceFormatted} with upi`,
            })}
            onPress={handleOpenUpi}
          />
          <Pressable
            testID="ive-paid-link"
            accessibilityRole="button"
            onPress={() => setStep('confirm')}
            style={styles.ivePaidBtn}
          >
            <Text variant="secondary" size={13} color={C.paccha}>
              {t('escrow.ive_paid', "i've paid")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <UtrConfirm
          utr={utr}
          onChangeUtr={setUtr}
          onConfirm={() => recordMut.mutate()}
          loading={recordMut.isPending}
          mode="slide"
          actionLabel={t('escrow.slide_to_seal', 'slide to seal escrow')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: S.md,
  },
  amountBox: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: R.row,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'flex-start',
  },
  payActions: {
    gap: S.sm,
    alignItems: 'center',
  },
  ivePaidBtn: {
    paddingVertical: S.xs,
    paddingHorizontal: S.md,
  },
});
