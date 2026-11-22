import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { C, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { relativeTime } from '@/lib/time';
import { useMode, useSessionStore } from '@/state/mode';
import type { DealState, DealSummary } from '@/types';
import {
  EmptyState,
  Eyebrow,
  Price,
  Skeleton,
  StatusPill,
  Text,
  TopBar,
  VelvetCard,
} from '@/ui';

const DONE_STATES = new Set<DealState>([
  'RELEASED',
  'ARBITRATED_SPLIT',
  'REFUNDED',
  'DECLINED',
  'CANCELLED',
]);

function isNeedsYou(deal: DealSummary): boolean {
  if (DONE_STATES.has(deal.state)) return false;
  if (typeof deal.needs_you === 'boolean') return deal.needs_you;
  const actions = deal.allowed_actions || [];
  if (actions.length === 0) return false;
  if (deal.state === 'OFFERED') return !deal.offer_by_me;
  if (deal.state === 'CREATED') return deal.my_role === 'buyer';
  if (deal.state === 'FUNDED') {
    return deal.inspection_mode === 'in_person'
      ? deal.my_role === 'buyer'
      : deal.my_role === 'seller';
  }
  if (deal.state === 'INSPECTION_LIVE') return true;
  if (deal.state === 'ASSAY_VERIFIED') return deal.my_role === 'buyer';
  if (deal.state === 'DISPUTED_FROZEN') return true;
  return false;
}

export default function DealsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const { mode, accent, buttonVariant } = useMode();
  const [showAll, setShowAll] = useState(false);

  const roleParam: 'buyer' | 'seller' | 'all' = showAll
    ? 'all'
    : mode === 'sell'
      ? 'seller'
      : 'buyer';

  const dealsQuery = useQuery({
    queryKey: ['deals', roleParam, token],
    queryFn: () => mudraApi.deals(roleParam),
    enabled: Boolean(token),
    refetchInterval: 6000,
  });

  useFocusEffect(
    useCallback(() => {
      if (token) void dealsQuery.refetch();
    }, [token, dealsQuery.refetch])
  );

  const { needsYou, inProgress, done } = useMemo(() => {
    const list = dealsQuery.data ?? [];
    const ny: DealSummary[] = [];
    const ip: DealSummary[] = [];
    const dn: DealSummary[] = [];
    for (const d of list) {
      if (DONE_STATES.has(d.state)) dn.push(d);
      else if (isNeedsYou(d)) ny.push(d);
      else ip.push(d);
    }
    return { needsYou: ny, inProgress: ip, done: dn };
  }, [dealsQuery.data]);

  const renderDealRow = (deal: DealSummary) => {
    const stateLabel = t(`deals.state_${deal.state}`, { defaultValue: deal.state });
    const hasUnread = (deal.unread ?? 0) > 0;
    return (
      <Pressable
        key={deal.id}
        testID={`deal-row-${deal.short_code}`}
        accessibilityRole="button"
        accessibilityLabel={`${deal.listing?.title || 'deal'} with ${deal.counterpart?.name || 'user'}`}
        onPress={() => router.push(`/deal/${deal.id}` as never)}
        style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
      >
        <Image source={{ uri: deal.listing?.photo }} style={styles.thumb} contentFit="cover" transition={150} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text weight={600} size={15} color={C.fg} numberOfLines={1} style={styles.titleText}>
              {deal.listing?.title || deal.short_code}
            </Text>
            <View style={styles.timeCluster}>
              {hasUnread ? <View style={[styles.unreadDot, { backgroundColor: accent }]} /> : null}
              <Text variant="secondary" size={12} color={C.muted} tabular>{relativeTime(deal.updated_at)}</Text>
            </View>
          </View>
          <Text variant="secondary" size={13} color={C.muted} numberOfLines={1}>
            {deal.counterpart?.name || 'counterpart'} · {deal.short_code}
          </Text>
          <View style={styles.rowBottom}>
            <Price minor={deal.amount_minor} currency={deal.currency} kind={deal.kind} size={14} weight={600} color={C.fg2} />
            <StatusPill state={deal.state} label={stateLabel} />
          </View>
        </View>
      </Pressable>
    );
  };

  const totalCount = needsYou.length + inProgress.length + done.length;

  return (
    <View style={styles.screen}>
      <TopBar variant="home" buyLabel={t('common.buy', 'buy')} sellLabel={t('common.sell', 'sell')} />
      <View style={styles.filterHeader}>
        <Text variant="display" size={26} color={C.fg} lowercase>{t('deals.title', 'deals')}</Text>
        {token ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showAll ? t('deals.show_mode_only') : t('deals.show_all')}
            onPress={() => setShowAll((v) => !v)}
            style={styles.toggleBtn}
          >
            <Text size={13} weight={600} color={showAll ? accent : C.muted}>
              {showAll ? t('deals.show_mode_only', 'filter by mode') : t('deals.show_all', 'show all deals')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!token ? (
        <EmptyState
          title={t('auth.guest_prompt_title', 'create a free account to deal.')}
          body={t('auth.guest_prompt_body', 'create a free account to deal. takes 30 seconds.')}
          actionLabel={t('welcome.get_started', 'get started')}
          actionVariant={buttonVariant}
          onAction={() => router.push('/welcome' as never)}
        />
      ) : dealsQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={88} radius={R.row} />
          <Skeleton height={88} radius={R.row} />
          <Skeleton height={88} radius={R.row} />
        </View>
      ) : dealsQuery.isError ? (
        <View style={styles.pad}>
          <VelvetCard tone="card2" style={styles.errorCard}>
            <Text size={14} color={C.danger}>{(dealsQuery.error as Error)?.message || t('errors.UNKNOWN')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.try_again')} onPress={() => void dealsQuery.refetch()}>
              <Text weight={600} size={14} color={accent}>{t('common.try_again', 'try again')}</Text>
            </Pressable>
          </VelvetCard>
        </View>
      ) : totalCount === 0 ? (
        mode === 'buy' ? (
          <EmptyState
            title={t('deals.empty_buy_body', 'no deals yet. find something you like.')}
            actionLabel={t('explore.title', 'explore')}
            actionVariant="purple"
            onAction={() => router.push('/(tabs)/explore' as never)}
          />
        ) : (
          <EmptyState
            title={t('deals.empty_sell_body', 'no deals yet. list something and offers will land here.')}
            actionLabel={t('home.tool_list', 'list item')}
            actionVariant="paccha"
            onAction={() => router.push('/listing/new' as never)}
          />
        )
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={dealsQuery.isRefetching}
              onRefresh={() => {
                void dealsQuery.refetch();
              }}
              tintColor={accent}
            />
          }
        >
          {needsYou.length > 0 ? (
            <View style={styles.section}>
              <Eyebrow label={t('deals.needs_you', 'NEEDS YOU')} dot dotColor={accent} />
              <View style={styles.list}>{needsYou.map(renderDealRow)}</View>
            </View>
          ) : null}
          {inProgress.length > 0 ? (
            <View style={styles.section}>
              <Eyebrow label={t('deals.in_progress', 'IN PROGRESS')} />
              <View style={styles.list}>{inProgress.map(renderDealRow)}</View>
            </View>
          ) : null}
          {done.length > 0 ? (
            <View style={styles.section}>
              <Eyebrow label={t('deals.done', 'DONE')} />
              <View style={styles.list}>{done.map(renderDealRow)}</View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: R.chip, backgroundColor: C.card2, borderWidth: 1, borderColor: C.hairline },
  skeletonWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  pad: { paddingHorizontal: 16, paddingTop: 16 },
  errorCard: { gap: 10 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 24 },
  section: { gap: 10 },
  list: { gap: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.row, borderWidth: 1, borderColor: C.hairline, padding: 12, gap: 12 },
  rowPressed: { backgroundColor: C.card2 },
  thumb: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.card2 },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleText: { flex: 1 },
  timeCluster: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  rowBottom: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
