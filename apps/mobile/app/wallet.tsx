import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Shield, Sparkles } from 'lucide-react-native';
import { C, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { formatMoney } from '@/lib/money';
import { relativeTime } from '@/lib/time';
import { useSessionStore } from '@/state/session';
import type { CurrencyCode, WalletTx } from '@/types';
import {
  EmptyState,
  Eyebrow,
  ListGroup,
  ListRow,
  NeoButton,
  Price,
  Skeleton,
  Text,
  TopBar,
  VelvetCard,
  showToast,
} from '@/ui';

export default function WalletScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useSessionStore((s) => s.me);
  const locale = useSessionStore((s) => s.locale) ?? 'en';

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
    onError: (err: Error) => {
      showToast(err.message || t('errors.RATE_LIMIT'), 'danger');
    },
  });

  const activeCurrency: CurrencyCode =
    me?.currency || walletQuery.data?.currency || 'INR';

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
    if (tx.note) return `${base} · ${tx.note}`;
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
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom + 24, 36) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={walletQuery.isRefetching}
              onRefresh={() => {
                void walletQuery.refetch();
              }}
              tintColor={C.paccha}
            />
          }
        >
          <VelvetCard tone="card" style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Eyebrow label="MUDRA WALLET" dot dotColor={C.paccha} />
              <View style={styles.currencyChip}>
                <Text variant="mono" size={12} color={C.paccha}>
                  {activeCurrency}
                </Text>
              </View>
            </View>

            <Price
              minor={activeBalance}
              currency={activeCurrency}
              variant="display"
              size={48}
              color={C.fg}
            />

            <VelvetCard tone="card2" padding={12} radius={14} style={styles.bannerCard}>
              <View style={styles.bannerRow}>
                <Shield size={16} color={C.paccha} />
                <Text variant="secondary" size={13} color={C.fg2} style={styles.bannerText}>
                  {t('wallet.demo_banner', 'demo credits. no real money moves in this version.')}
                </Text>
              </View>
            </VelvetCard>

            <NeoButton
              variant="paccha"
              size="lg"
              label={t('wallet.top_up', 'top up demo credits')}
              icon={<Sparkles size={18} color={C.bg} />}
              loading={topupMut.isPending}
              onPress={() => topupMut.mutate()}
            />
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
                  const formatted = formatMoney(
                    Math.abs(tx.amount_minor),
                    tx.currency || activeCurrency,
                    locale
                  );
                  return (
                    <ListRow
                      key={tx.id}
                      title={getTxTitle(tx)}
                      subtitle={relativeTime(tx.created_at)}
                      onPress={
                        tx.deal_id
                          ? () => router.push(`/deal/${tx.deal_id}` as never)
                          : undefined
                      }
                      icon={
                        isCredit ? (
                          <ArrowDownLeft size={18} color={C.paccha} />
                        ) : (
                          <ArrowUpRight size={18} color={C.fg2} />
                        )
                      }
                      value={
                        <Text
                          weight={700}
                          size={15}
                          color={isCredit ? C.paccha : C.fg}
                          tabular
                        >
                          {isCredit ? `+${formatted}` : `-${formatted}`}
                        </Text>
                      }
                    />
                  );
                })}
              </ListGroup>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, gap: 14 },
  scroll: { padding: 16, gap: 22 },
  heroCard: { gap: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.chip,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  bannerCard: { marginTop: 2 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerText: { flex: 1 },
  txSection: { gap: 10 },
});
