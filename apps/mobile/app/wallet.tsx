import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Shield, Sparkles } from 'lucide-react-native';
import { C, F, R, S } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { AddMoneySheet } from '@/features/wallet/AddMoneySheet';
import { WithdrawSheet } from '@/features/wallet/WithdrawSheet';
import { formatMoney } from '@/lib/money';
import { relativeTime } from '@/lib/time';
import { useSessionStore } from '@/state/session';
import type { CurrencyCode, WalletTx } from '@/types';
import '@/types/upi';
import {
  EmptyState, Eyebrow, ListGroup, NeoButton, Price,
  Skeleton, StatusPill, Text, TopBar, VelvetCard, showToast,
} from '@/ui';

export default function WalletScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useSessionStore((s) => s.me);
  const locale = useSessionStore((s) => s.locale) ?? 'en';
  const [sheet, setSheet] = useState<'add' | 'withdraw' | null>(null);

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => mudraApi.wallet(),
  });

  const topupMut = useMutation({
    mutationFn: () => mudraApi.topupDemo(),
    onSuccess: (updated) => {
      queryClient.setQueryData(['wallet'], updated);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      showToast(t('wallet.tx_topup', 'demo credits top-up'), 'success');
    },
    onError: (err: Error) => showToast(err.message || t('errors.RATE_LIMIT'), 'danger'),
  });

  const activeCurrency: CurrencyCode = me?.currency || walletQuery.data?.currency || 'INR';
  const isInr = activeCurrency === 'INR';

  const activeBalance = useMemo(() => {
    const w = walletQuery.data;
    if (!w) return me?.wallet_balance_minor ?? me?.balance_minor ?? 0;
    const match = w.balances?.find((b) => b.currency === activeCurrency);
    if (match) return match.balance_minor;
    if (typeof w.balance_minor === 'number') return w.balance_minor;
    return w.balances?.[0]?.balance_minor ?? 0;
  }, [walletQuery.data, activeCurrency, me]);

  const txList: WalletTx[] = useMemo(() => {
    const w = walletQuery.data;
    return w?.tx ?? w?.transactions ?? [];
  }, [walletQuery.data]);

  const getTxTitle = (tx: WalletTx): string => {
    const base = t(`wallet.tx_${tx.kind}`, { defaultValue: tx.kind.replace(/_/g, ' ') });
    if (tx.note && tx.kind !== 'upi_deposit' && tx.kind !== 'upi_withdraw') {
      return `${base} · ${tx.note}`;
    }
    return base;
  };

  return (
    <View style={styles.screen}>
      <TopBar title={t('wallet.title', 'wallet')} />

      {walletQuery.isLoading ? (
        <View style={styles.pad}>
          <Skeleton height={160} radius={R.card} />
          <Skeleton height={60} radius={0} />
          <Skeleton height={240} radius={R.row} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={walletQuery.isRefetching}
              onRefresh={() => void walletQuery.refetch()}
              tintColor={C.paccha}
            />
          }
        >
          <VelvetCard tone="card" style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Eyebrow label="MUDRA WALLET" dot dotColor={C.paccha} />
              <View style={styles.currencyChip}>
                <Text variant="mono" size={12} color={C.paccha}>{activeCurrency}</Text>
              </View>
            </View>

            <Price minor={activeBalance} currency={activeCurrency} variant="display" size={48} color={C.fg} />

            <VelvetCard tone="card2" padding={12} radius={14} style={styles.bannerCard}>
              <View style={styles.bannerRow}>
                <Shield size={16} color={C.paccha} />
                <Text variant="secondary" size={13} color={C.fg2} style={styles.bannerText}>
                  {isInr
                    ? t('wallet.upi_banner', 'upi deposits are marked unverified until we add a payment gateway. withdrawals are requests, not instant payouts.')
                    : t('wallet.demo_banner', 'demo credits. no real money moves in this version.')}
                </Text>
              </View>
            </VelvetCard>

            {isInr ? (
              <View style={styles.actionsCol}>
                <NeoButton
                  testID="wallet-add-upi-btn"
                  variant="purple"
                  size="lg"
                  label={t('wallet.add_money_upi', 'add money via upi')}
                  onPress={() => setSheet('add')}
                />
                <NeoButton
                  testID="wallet-withdraw-upi-btn"
                  variant="ghost"
                  size="md"
                  label={t('wallet.withdraw_upi', 'withdraw to upi')}
                  disabled={activeBalance <= 0}
                  onPress={() => setSheet('withdraw')}
                />
                <NeoButton
                  testID="wallet-demo-credits-btn"
                  variant="ghost"
                  size="md"
                  label={t('wallet.demo_credits_testing', 'demo credits (for testing)')}
                  loading={topupMut.isPending}
                  onPress={() => topupMut.mutate()}
                />
              </View>
            ) : (
              <NeoButton
                variant="paccha"
                size="lg"
                label={t('wallet.top_up', 'top up demo credits')}
                icon={<Sparkles size={18} color={C.bg} />}
                loading={topupMut.isPending}
                onPress={() => topupMut.mutate()}
              />
            )}
          </VelvetCard>

          <View style={styles.txSection}>
            <Eyebrow label={t('wallet.transactions', 'TRANSACTIONS')} />

            {txList.length === 0 ? (
              <EmptyState
                title="no transactions yet."
                body="your signup bonus, escrow locks, and releases appear here."
              />
            ) : (
              <ListGroup>
                {txList.map((tx) => {
                  const isCredit = tx.amount_minor >= 0;
                  const formatted = formatMoney(Math.abs(tx.amount_minor), tx.currency || activeCurrency, locale);
                  const monoDetail = tx.utr ? `utr ${tx.utr}` : tx.upi_id ? tx.upi_id : null;

                  return (
                    <Pressable
                      key={tx.id}
                      disabled={!tx.deal_id}
                      onPress={tx.deal_id ? () => router.push(`/deal/${tx.deal_id}` as never) : undefined}
                      style={styles.txRow}
                    >
                      <View style={styles.iconCircle}>
                        {isCredit ? (
                          <ArrowDownLeft size={18} color={C.paccha} />
                        ) : (
                          <ArrowUpRight size={18} color={C.fg2} />
                        )}
                      </View>
                      <View style={styles.txCenter}>
                        <Text weight={500} size={15} color={C.fg} numberOfLines={1}>{getTxTitle(tx)}</Text>
                        {monoDetail ? <Text style={styles.monoLine} numberOfLines={1}>{monoDetail}</Text> : null}
                        <Text variant="secondary" size={12} color={C.muted}>{relativeTime(tx.created_at)}</Text>
                      </View>
                      <View style={styles.txRight}>
                        <Text weight={700} size={15} color={isCredit ? C.paccha : C.fg} tabular>
                          {isCredit ? `+${formatted}` : `-${formatted}`}
                        </Text>
                        {tx.status === 'unverified' ? (
                          <StatusPill tone="sunshine" label={t('wallet.status_unverified', 'unverified')} />
                        ) : tx.status === 'requested' ? (
                          <StatusPill tone="neutral" label={t('wallet.status_requested', 'requested')} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ListGroup>
            )}
          </View>
        </ScrollView>
      )}

      <AddMoneySheet visible={sheet === 'add'} onClose={() => setSheet(null)} />
      <WithdrawSheet
        visible={sheet === 'withdraw'}
        onClose={() => setSheet(null)}
        balanceMinor={activeBalance}
        defaultUpiId={me?.upi_id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: S.lg, gap: 14 },
  scroll: { padding: S.lg, gap: 22 },
  heroCard: { gap: S.lg },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currencyChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.chip, backgroundColor: C.card2, borderWidth: 1, borderColor: C.hairline },
  bannerCard: { marginTop: 2 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerText: { flex: 1 },
  actionsCol: { gap: S.sm },
  txSection: { gap: 10 },
  txRow: { minHeight: 60, paddingHorizontal: S.lg, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: S.md },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.hairline },
  txCenter: { flex: 1, gap: 2 },
  monoLine: { fontFamily: F.mono, fontSize: 12, color: C.muted },
  txRight: { alignItems: 'flex-end', gap: 4 },
});
