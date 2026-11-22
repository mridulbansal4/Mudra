import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { mudraApi } from '@/features/api';
import { formatMoney } from '@/lib/money';
import { relativeTime } from '@/lib/time';
import { UPI_ID_RE } from '@/lib/upi';
import { useSessionStore } from '@/state/session';
import { C, F, R, S } from '@/theme/tokens';
import type { WalletTx } from '@/types';
import '@/types/upi';
import {
  ListGroup,
  ListRow,
  NeoButton,
  Price,
  Sheet,
  StatusPill,
  Text,
  showToast,
} from '@/ui';

export interface WithdrawSheetProps {
  visible: boolean;
  onClose: () => void;
  balanceMinor: number;
  defaultUpiId?: string | null;
}

export function WithdrawSheet({
  visible,
  onClose,
  balanceMinor,
  defaultUpiId,
}: WithdrawSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const locale = useSessionStore((s) => s.locale) ?? 'en';

  const [rupeesInput, setRupeesInput] = useState('');
  const [upiInput, setUpiInput] = useState(defaultUpiId || '');
  const [receiptTx, setReceiptTx] = useState<WalletTx | null>(null);

  useEffect(() => {
    if (visible) {
      setUpiInput((defaultUpiId || '').toLowerCase());
      setReceiptTx(null);
      setRupeesInput('');
    }
  }, [visible, defaultUpiId]);

  const maxRupees = Math.min(100000, Math.floor(balanceMinor / 100));
  const rupees = parseInt(rupeesInput.replace(/\D/g, ''), 10) || 0;
  const amountMinor = rupees * 100;
  const cleanUpi = upiInput.trim().toLowerCase();
  const validUpi = UPI_ID_RE.test(cleanUpi);
  const validAmount =
    amountMinor >= 100 &&
    amountMinor <= 10000000 &&
    amountMinor <= balanceMinor;

  const withdrawMut = useMutation({
    mutationFn: () =>
      mudraApi.withdrawUpi({
        amount_minor: amountMinor,
        upi_id: cleanUpi,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['wallet'], updated);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      const latest = (updated.transactions ?? updated.tx ?? [])[0] ?? {
        id: Date.now(),
        currency: 'INR',
        amount_minor: -amountMinor,
        kind: 'upi_withdraw',
        upi_id: cleanUpi,
        status: 'requested',
        created_at: new Date().toISOString(),
      };
      setReceiptTx(latest);
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
    },
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('wallet.withdraw_upi', 'withdraw to upi')}
    >
      {receiptTx ? (
        <View style={styles.body}>
          <View style={styles.receiptHead}>
            <Price
              minor={Math.abs(receiptTx.amount_minor)}
              currency="INR"
              variant="display"
              size={34}
              color={C.fg}
            />
            <StatusPill
              tone="neutral"
              label={t('wallet.status_requested', 'requested')}
            />
          </View>

          <ListGroup>
            <ListRow
              title={t('profile.upi_id', 'upi id')}
              value={
                <Text variant="mono" size={13} color={C.fg2}>
                  {receiptTx.upi_id || cleanUpi}
                </Text>
              }
            />
            <ListRow
              title={t('wallet.ledger_id', 'ledger id')}
              value={
                <Text variant="mono" size={13} color={C.fg2} tabular>
                  #{receiptTx.id}
                </Text>
              }
            />
            <ListRow
              title={t('wallet.status_requested', 'requested')}
              value={relativeTime(receiptTx.created_at)}
            />
          </ListGroup>

          <NeoButton
            testID="withdraw-done-btn"
            variant="paccha"
            size="lg"
            label={t('common.done', 'done')}
            onPress={onClose}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.amountField}>
            <Text variant="display" size={24} color={C.muted}>
              ₹
            </Text>
            <TextInput
              testID="withdraw-amount-input"
              value={rupeesInput}
              onChangeText={(txt) => setRupeesInput(txt.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder={String(Math.min(500, maxRupees || 500))}
              placeholderTextColor={C.muted}
              style={styles.amountInput}
            />
            <Pressable
              testID="withdraw-max-chip"
              accessibilityRole="button"
              onPress={() => setRupeesInput(String(maxRupees))}
              style={styles.maxChip}
            >
              <Text variant="mono" size={12} color={C.paccha}>
                {t('wallet.max_chip', 'max')} ({formatMoney(maxRupees * 100, 'INR', locale)})
              </Text>
            </Pressable>
          </View>

          <TextInput
            testID="withdraw-upi-input"
            value={upiInput}
            onChangeText={(txt) => setUpiInput(txt.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('wallet.upi_id_placeholder', 'name@okaxis')}
            placeholderTextColor={C.muted}
            style={[
              styles.upiInput,
              upiInput.length > 0 && !validUpi ? styles.upiInvalid : null,
            ]}
          />

          <NeoButton
            testID="request-withdrawal-btn"
            variant="purple"
            size="lg"
            label={t('wallet.request_withdrawal', 'request withdrawal')}
            disabled={!validAmount || !validUpi || withdrawMut.isPending}
            loading={withdrawMut.isPending}
            onPress={() => withdrawMut.mutate()}
          />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: S.md,
    paddingBottom: S.md,
  },
  receiptHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  maxChip: {
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.chip,
    backgroundColor: C.card3,
    borderWidth: 1,
    borderColor: C.paccha,
  },
  upiInput: {
    height: 50,
    backgroundColor: C.card2,
    borderRadius: R.row,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.lg,
    color: C.fg,
    fontFamily: F.mono,
    fontSize: 15,
  },
  upiInvalid: {
    borderColor: C.danger,
  },
});
