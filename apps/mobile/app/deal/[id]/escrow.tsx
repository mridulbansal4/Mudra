import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { C, R, S } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import {
  EscrowPayMethod,
  PayMethodPicker,
} from '@/features/escrow/PayMethodPicker';
import { SealedView } from '@/features/escrow/SealedView';
import { UpiPayPanel } from '@/features/escrow/UpiPayPanel';
import { formatMoney } from '@/lib/money';
import { useSessionStore } from '@/state/session';
import '@/types/upi';
import {
  Eyebrow, ListGroup, ListRow, NeoButton,
  Skeleton, SlideToLock, Text, VelvetCard, showToast,
} from '@/ui';

export default function EscrowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const locale = useSessionStore((s) => s.locale) ?? 'en';

  const [sealedHash, setSealedHash] = useState<string | null>(null);
  const [method, setMethod] = useState<EscrowPayMethod>('wallet');

  const dealQuery = useQuery({
    queryKey: ['deal', id],
    queryFn: () => mudraApi.deal(id!),
    enabled: Boolean(id),
  });

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => mudraApi.wallet(),
  });

  const deal = dealQuery.data;
  const currency = deal?.currency || 'INR';
  const isInr = currency === 'INR';

  const balanceMinor = useMemo(() => {
    const w = walletQuery.data;
    if (!w) return 0;
    const found = w.balances?.find((b) => b.currency === currency);
    if (found) return found.balance_minor;
    return w.balance_minor ?? 0;
  }, [walletQuery.data, currency]);

  const insufficient = Boolean(deal && balanceMinor < deal.amount_minor);

  const topupMut = useMutation({
    mutationFn: () => mudraApi.topupDemo(),
    onSuccess: (w) => {
      queryClient.setQueryData(['wallet'], w);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      showToast(t('wallet.tx_topup', 'demo credits top-up'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
    },
  });

  const lockMut = useMutation({
    mutationFn: () =>
      mudraApi.dealAction({
        deal_id: id!,
        action: 'LOCK_ESCROW',
        expected_version: deal?.version ?? 1,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['deal', id], updated);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      const hash =
        updated.latest_voucher_hash ||
        updated.voucher_hash ||
        updated.last_voucher_hash ||
        `ed25519-${updated.short_code}`;
      setSealedHash(hash);
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
      void dealQuery.refetch();
    },
  });

  useEffect(() => {
    if (!sealedHash) return;
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/deal/${id}` as never);
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, [sealedHash, id, router]);

  const priceFormatted = deal
    ? formatMoney(deal.amount_minor, deal.currency, locale)
    : '';
  const balanceFormatted = formatMoney(balanceMinor, currency, locale);
  const activeMethod: EscrowPayMethod = isInr ? method : 'wallet';

  return (
    <View style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={() =>
          router.canGoBack()
            ? router.back()
            : router.replace(`/deal/${id}` as never)
        }
      />

      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom + 16, 28) },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {sealedHash ? (
          <SealedView sealedHash={sealedHash} />
        ) : !deal ? (
          <View style={styles.pad}>
            <Skeleton height={44} />
            <Skeleton height={180} radius={R.row} />
            <Skeleton height={64} radius={0} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.pad}
          >
            <View style={styles.topRow}>
              <Eyebrow
                label={t('escrow.eyebrow', 'ESCROW')}
                dot
                dotColor={C.paccha}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace(`/deal/${id}` as never)
                }
                style={styles.closeBtn}
              >
                <X size={18} color={C.muted} />
              </Pressable>
            </View>

            <Text variant="display" size={32} color={C.fg} tabular lowercase>
              {t('escrow.lock_title', {
                price: priceFormatted,
                defaultValue: `lock ${priceFormatted}`,
              })}
            </Text>

            {isInr ? (
              <PayMethodPicker
                method={activeMethod}
                onChange={setMethod}
                balanceFormatted={balanceFormatted}
              />
            ) : null}

            <ListGroup>
              <ListRow
                title={t('escrow.row_item', 'item')}
                value={deal.listing?.title || deal.short_code}
              />
              {!isInr ? (
                <ListRow
                  title={t('escrow.row_pay_from', 'pay from')}
                  subtitle={t('escrow.mudra_wallet', 'mudra wallet')}
                  value={balanceFormatted}
                />
              ) : null}
              <ListRow
                title={t('escrow.row_seller_gets', 'seller gets it when')}
                value={t(
                  'escrow.seller_gets_val',
                  'you release after checking'
                )}
              />
              <ListRow
                title={t('escrow.row_fee', 'fee')}
                value={t('escrow.fee_val', '0 (demo)')}
              />
            </ListGroup>

            {activeMethod === 'upi' ? (
              <UpiPayPanel
                deal={deal}
                onSealed={(hash) => setSealedHash(hash)}
                onErrorRefresh={() => {
                  void dealQuery.refetch();
                }}
              />
            ) : (
              <>
                {insufficient ? (
                  <VelvetCard
                    tone="card2"
                    borderColor={C.danger}
                    style={styles.shortfallCard}
                  >
                    <Text weight={600} size={14} color={C.danger}>
                      {t('escrow.not_enough_credits', 'not enough demo credits')}
                    </Text>
                    <NeoButton
                      variant="paccha"
                      size="md"
                      label={t('escrow.top_up_credits', 'top up demo credits')}
                      loading={topupMut.isPending}
                      onPress={() => topupMut.mutate()}
                    />
                  </VelvetCard>
                ) : null}

                <SlideToLock
                  label={t('escrow.slide_to_lock', 'slide to lock money')}
                  accent={C.paccha}
                  disabled={insufficient || lockMut.isPending}
                  loading={lockMut.isPending}
                  onComplete={() => lockMut.mutate()}
                />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet,
    borderTopWidth: 1, borderColor: C.hairline, paddingHorizontal: 20, maxHeight: '90%',
  },
  handleWrap: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border },
  pad: { gap: S.lg, paddingTop: S.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.card2,
    alignItems: 'center', justifyContent: 'center',
  },
  shortfallCard: { gap: 10 },
});
