import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { C, F, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { formatMoney } from '@/lib/money';
import { useSessionStore } from '@/state/session';
import {
  CountdownRing,
  Eyebrow,
  NeoButton,
  Skeleton,
  StatusPill,
  Text,
  TopBar,
  VelvetCard,
  showToast,
} from '@/ui';

export default function FreezeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const locale = useSessionStore((s) => s.locale) ?? 'en';

  const [statementText, setStatementText] = useState('');

  const dealQuery = useQuery({
    queryKey: ['deal', id],
    queryFn: () => mudraApi.deal(id!),
    enabled: Boolean(id),
    refetchInterval: 3000,
  });

  const deal = dealQuery.data;
  const isResolved =
    deal?.state === 'ARBITRATED_SPLIT' ||
    deal?.state === 'REFUNDED' ||
    deal?.state === 'CANCELLED';

  const triggerResolve = async () => {
    if (!id) return;
    try {
      const updated = await mudraApi.resolveIfDue(id);
      queryClient.setQueryData(['deal', id], updated);
      if (updated.state !== 'DISPUTED_FROZEN') {
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['messages', id] });
      }
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    if (!id || isResolved) return;
    const timer = setInterval(triggerResolve, 3000);
    return () => clearInterval(timer);
  }, [id, isResolved]);

  const statementMut = useMutation({
    mutationFn: () =>
      mudraApi.dealAction({
        deal_id: id!,
        action: 'ADD_STATEMENT',
        expected_version: deal?.version ?? 1,
        payload: { text: statementText.trim() },
      }),
    onSuccess: (updated) => {
      setStatementText('');
      queryClient.setQueryData(['deal', id], updated);
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      showToast('statement added', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
      dealQuery.refetch();
    },
  });

  if (!deal) {
    return (
      <View style={styles.screen}>
        <TopBar title={t('freeze.eyebrow', 'resolution desk').toLowerCase()} />
        <View style={styles.pad}>
          <Skeleton height={240} radius={R.card} />
          <Skeleton height={140} radius={R.card} />
        </View>
      </View>
    );
  }

  const myStatement =
    deal.my_role === 'buyer' ? deal.buyer_statement : deal.seller_statement;
  const canAddStatement =
    deal.state === 'DISPUTED_FROZEN' &&
    !myStatement &&
    deal.allowed_actions?.includes('ADD_STATEMENT');

  const verdict = deal.verdict;
  const sellerPct = verdict?.seller_pct ?? (deal.state === 'REFUNDED' ? 0 : 70);
  const buyerPct = verdict?.buyer_pct ?? (deal.state === 'REFUNDED' ? 100 : 30);
  const sellerMinor =
    verdict?.seller_minor ?? Math.floor((deal.escrow_locked_minor * sellerPct) / 100);
  const buyerMinor =
    verdict?.buyer_minor ?? deal.escrow_locked_minor - sellerMinor;

  const verdictHeading =
    deal.state === 'REFUNDED' || buyerPct === 100
      ? t('freeze.verdict_refund', 'full refund')
      : t('freeze.verdict_split', {
          seller: sellerPct,
          buyer: buyerPct,
          defaultValue: `verdict: ${sellerPct} / ${buyerPct}`,
        });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TopBar
        title="resolution desk"
        right={
          <StatusPill
            state={deal.state}
            label={t(`deals.state_${deal.state}`, { defaultValue: deal.state })}
          />
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow label={t('freeze.eyebrow', 'RESOLUTION DESK')} dot dotColor={C.sunshine} />

        {isResolved ? (
          <VelvetCard tone="card" borderColor={C.sunshine} style={styles.verdictCard}>
            <Text variant="display" size={32} color={C.fg} tabular lowercase>
              {verdictHeading}
            </Text>

            <View style={styles.splitBarWrap}>
              <View style={styles.splitBarTrack}>
                {sellerPct > 0 ? (
                  <View style={[styles.sellerBar, { flex: sellerPct }]} />
                ) : null}
                {buyerPct > 0 ? (
                  <View style={[styles.buyerBar, { flex: buyerPct }]} />
                ) : null}
              </View>

              <View style={styles.splitLegend}>
                <View style={styles.legendSide}>
                  <Text variant="eyebrow" size={10} color={C.paccha}>
                    SELLER ({sellerPct}%)
                  </Text>
                  <Text weight={700} size={18} color={C.paccha} tabular>
                    {formatMoney(sellerMinor, deal.currency, locale)}
                  </Text>
                </View>

                <View style={[styles.legendSide, styles.legendRight]}>
                  <Text variant="eyebrow" size={10} color={C.purple}>
                    BUYER ({buyerPct}%)
                  </Text>
                  <Text weight={700} size={18} color={C.fg} tabular>
                    {formatMoney(buyerMinor, deal.currency, locale)}
                  </Text>
                </View>
              </View>
            </View>

            <Text size={14} color={C.fg2}>
              {verdict?.reason ||
                'the resolution desk evaluated the live check evidence and split escrow fairly.'}
            </Text>

            <Text variant="secondary" size={12} color={C.muted}>
              {t('freeze.final_for_demo', 'this is final for the demo.')}
            </Text>

            <NeoButton
              variant="paccha"
              size="lg"
              label={t('freeze.back_to_deal', 'back to deal')}
              onPress={() => router.replace(`/deal/${id}` as never)}
            />
          </VelvetCard>
        ) : (
          <View style={styles.ringSection}>
            <CountdownRing
              endsAt={deal.freeze_ends_at || Date.now() + 90000}
              total={90}
              onExpire={triggerResolve}
            />
            <Text variant="secondary" size={13} color={C.muted} align="center">
              {t('freeze.statement_helper', 'both sides can add one short statement.')}
            </Text>
          </View>
        )}

        {canAddStatement ? (
          <VelvetCard tone="card2" style={styles.statementForm}>
            <TextInput
              value={statementText}
              onChangeText={setStatementText}
              placeholder={t('freeze.statement_placeholder', 'what happened? (max 280 chars)')}
              placeholderTextColor={C.muted}
              maxLength={280}
              multiline
              style={styles.input}
            />
            <NeoButton
              variant="purple"
              size="md"
              label={t('freeze.add_statement', 'add statement')}
              disabled={!statementText.trim() || statementMut.isPending}
              loading={statementMut.isPending}
              onPress={() => statementMut.mutate()}
            />
          </VelvetCard>
        ) : null}

        {deal.buyer_statement ? (
          <VelvetCard tone="card" style={styles.statementBox}>
            <Eyebrow label={t('freeze.buyer_statement', 'BUYER STATEMENT')} dot dotColor={C.purple} />
            <Text size={14} color={C.fg}>
              {deal.buyer_statement}
            </Text>
          </VelvetCard>
        ) : null}

        {deal.seller_statement ? (
          <VelvetCard tone="card" style={styles.statementBox}>
            <Eyebrow label={t('freeze.seller_statement', 'SELLER STATEMENT')} dot dotColor={C.paccha} />
            <Text size={14} color={C.fg}>
              {deal.seller_statement}
            </Text>
          </VelvetCard>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, gap: 14 },
  scroll: { padding: 16, gap: 18 },
  ringSection: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  statementForm: { gap: 12 },
  input: {
    minHeight: 84,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    color: C.fg,
    fontFamily: F.ui,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  statementBox: { gap: 8 },
  verdictCard: { gap: 16 },
  splitBarWrap: { gap: 10 },
  splitBarTrack: {
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: C.card3,
    gap: 2,
  },
  sellerBar: { backgroundColor: C.paccha },
  buyerBar: { backgroundColor: C.purple },
  splitLegend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendSide: { gap: 2 },
  legendRight: { alignItems: 'flex-end' },
});
