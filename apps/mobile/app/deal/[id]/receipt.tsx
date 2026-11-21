import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { C, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { formatMoney } from '@/lib/money';
import { relativeTime } from '@/lib/time';
import { useSessionStore } from '@/state/session';
import {
  NeoButton,
  Receipt,
  Skeleton,
  SlideToLock,
  StatusPill,
  Text,
  TopBar,
  VelvetCard,
  showToast,
} from '@/ui';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useSessionStore((s) => s.me);
  const locale = useSessionStore((s) => s.locale) ?? 'en';

  const [justReleased, setJustReleased] = useState(false);

  const dealQuery = useQuery({
    queryKey: ['deal', id],
    queryFn: () => mudraApi.deal(id!),
    enabled: Boolean(id),
    refetchInterval: 4000,
  });

  const deal = dealQuery.data;

  useEffect(() => {
    if (!id || !deal?.counterpart?.is_demo_bot) return;
    const timer = setInterval(async () => {
      try {
        const updated = await mudraApi.demoTick(id);
        queryClient.setQueryData(['deal', id], updated);
      } catch {
        // ignore transient error
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [id, deal?.counterpart?.is_demo_bot, queryClient]);

  const releaseMut = useMutation({
    mutationFn: () =>
      mudraApi.dealAction({
        deal_id: id!,
        action: 'RELEASE_FUNDS',
        expected_version: deal?.version ?? 1,
      }),
    onSuccess: (updated) => {
      setJustReleased(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      queryClient.setQueryData(['deal', id], updated);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
      dealQuery.refetch();
    },
  });

  if (!deal) {
    return (
      <View style={styles.screen}>
        <TopBar title={t('receipt.title', 'receipt')} />
        <View style={styles.pad}>
          <Skeleton height={340} radius={R.card} />
        </View>
      </View>
    );
  }

  const isBuyer = deal.my_role === 'buyer';
  const buyerName = isBuyer ? me?.name || 'you' : deal.counterpart?.name || 'buyer';
  const sellerName = !isBuyer ? me?.name || 'you' : deal.counterpart?.name || 'seller';
  const isReleased = deal.state === 'RELEASED' || justReleased;
  const canRelease =
    isBuyer &&
    (deal.state === 'ASSAY_VERIFIED' || deal.allowed_actions?.includes('RELEASE_FUNDS')) &&
    !isReleased;

  const formattedAmount = formatMoney(deal.amount_minor, deal.currency, locale);
  const counterpartFirstName = (deal.counterpart?.name || 'them').split(' ')[0].toLowerCase();

  return (
    <View style={styles.screen}>
      <TopBar
        title={t('receipt.title', 'receipt')}
        right={
          <StatusPill
            state={deal.state}
            label={t(`deals.state_${deal.state}`, { defaultValue: deal.state })}
          />
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
      >
        <Receipt
          shortCode={deal.short_code}
          itemTitle={deal.listing?.title || deal.short_code}
          amountMinor={deal.amount_minor}
          currency={deal.currency}
          kind={deal.kind}
          buyerName={buyerName}
          sellerName={sellerName}
          voucherHash={deal.voucher_hash || deal.last_voucher_hash}
          timestamp={relativeTime(deal.updated_at)}
          released={isReleased}
          stampLabel={t('receipt.released_stamp', 'RELEASED')}
          extraRows={[
            {
              label: 'status',
              value: t(`deals.state_${deal.state}`, { defaultValue: deal.state }).toLowerCase(),
            },
            {
              label: 'created',
              value: relativeTime(deal.created_at),
              mono: true,
            },
          ]}
        >
          {canRelease ? (
            <View style={styles.slotWrap}>
              <SlideToLock
                label={t('receipt.slide_to_release', 'slide to release money')}
                accent={C.paccha}
                loading={releaseMut.isPending}
                disabled={releaseMut.isPending}
                onComplete={() => releaseMut.mutate()}
              />
            </View>
          ) : null}
        </Receipt>

        {!isBuyer && !isReleased ? (
          <VelvetCard tone="card2" style={styles.noteCard}>
            <Text size={14} color={C.muted}>
              {t('receipt.waiting_buyer_release', 'money arrives when the buyer releases.')}
            </Text>
          </VelvetCard>
        ) : null}

        {!isBuyer && isReleased && deal.amount_minor > 0 ? (
          <VelvetCard tone="card2" borderColor={C.paccha} style={styles.noteCard}>
            <Text weight={600} size={15} color={C.paccha} tabular>
              {t('receipt.added_to_wallet', {
                price: formattedAmount,
                defaultValue: `${formattedAmount} added to your wallet.`,
              })}
            </Text>
          </VelvetCard>
        ) : null}

        {isReleased ? (
          <View style={styles.actions}>
            {!deal.reviewed_by_me ? (
              <NeoButton
                variant="paccha"
                size="lg"
                label={t('receipt.rate_seller', {
                  name: counterpartFirstName,
                  defaultValue: `rate ${counterpartFirstName}`,
                })}
                onPress={() => router.push(`/deal/${id}/review` as never)}
              />
            ) : null}
            <NeoButton
              variant="ghost"
              size="md"
              label={t('freeze.back_to_deal', 'back to deal')}
              onPress={() => router.replace(`/deal/${id}` as never)}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  scroll: { padding: 16, gap: 18 },
  slotWrap: { marginTop: 8 },
  noteCard: { alignItems: 'center' },
  actions: { gap: 12, marginTop: 4 },
});
