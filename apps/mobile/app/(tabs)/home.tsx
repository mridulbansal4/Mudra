import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  Bike, BookOpen, Cpu, Gamepad2, Home as HomeIcon, Layers,
  Plus, Search, ShieldCheck, Shirt, Smartphone, Sparkles,
  Ticket, Trophy, Wallet, X,
} from 'lucide-react-native';
import { C, R } from '@/theme/tokens';
import { getDealNextStep, useDealAction, useDeals, useFeed, useMyListings } from '@/features/hooks';
import { formatMoney } from '@/lib/money';
import { useSessionStore } from '@/state/session';
import type { DealSummary, ListingCategory } from '@/types';
import {
  Eyebrow, IconTile, ListingCard, NeoButton, Price, ProgressSegments,
  Skeleton, StatusPill, Text, TopBar, VelvetCard,
} from '@/ui';

const CATEGORY_ICONS: { key: ListingCategory; icon: React.ReactNode }[] = [
  { key: 'books', icon: <BookOpen size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'electronics', icon: <Cpu size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'phones', icon: <Smartphone size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'rides', icon: <Bike size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'home', icon: <HomeIcon size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'fashion', icon: <Shirt size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'sports', icon: <Trophy size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'hobbies', icon: <Gamepad2 size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'tickets', icon: <Ticket size={22} strokeWidth={1.75} color={C.fg} /> },
  { key: 'other', icon: <Layers size={22} strokeWidth={1.75} color={C.fg} /> },
];

const CLOSED_STATES = new Set(['RELEASED', 'ARBITRATED_SPLIT', 'REFUNDED', 'DECLINED', 'CANCELLED']);

function ActiveDealCard({ deal, onPress }: { deal: DealSummary; onPress: () => void }) {
  const step = getDealNextStep(deal);
  return (
    <VelvetCard tone="card2" padding={14} onPress={onPress} style={styles.dealCard}>
      <View style={styles.dealRow}>
        <Image source={{ uri: deal.listing?.photo }} style={styles.dealThumb} contentFit="cover" />
        <View style={styles.dealMeta}>
          <Text weight={600} size={15} color={C.fg} numberOfLines={1}>{deal.listing?.title}</Text>
          <Text variant="secondary" size={12} numberOfLines={1}>{deal.counterpart?.name}</Text>
        </View>
        <StatusPill state={deal.state} />
      </View>
      <ProgressSegments stage={deal.story_stage || 1} />
      <Text size={13} weight={500} color={C.paccha} numberOfLines={1}>{step.sentence}</Text>
    </VelvetCard>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const me = useSessionStore((s) => s.me);
  const mode = useSessionStore((s) => s.mode);
  const setMode = useSessionStore((s) => s.setMode);
  const coachmarkDismissed = useSessionStore((s) => s.coachmarkDismissed);
  const dismissCoachmark = useSessionStore((s) => s.dismissCoachmark);

  const feedQuery = useFeed({}, 20, 0);
  const dealsQuery = useDeals('all');
  const myListingsQuery = useMyListings();
  const dealAction = useDealAction();

  const firstName = ((me?.name || 'friend').trim().split(/\s+/)[0] || 'friend').toLowerCase();
  const allDeals = dealsQuery.data ?? [];
  const activeBuyerDeals = allDeals.filter((d) => d.my_role === 'buyer' && !CLOSED_STATES.has(d.state)).slice(0, 2);
  const sellerOffersWaiting = allDeals.filter((d) => d.my_role === 'seller' && d.state === 'OFFERED' && !d.offer_by_me);
  const activeSellerDeals = allDeals.filter((d) => d.my_role === 'seller' && d.state !== 'OFFERED' && !CLOSED_STATES.has(d.state));
  const earnedMinor = allDeals.filter((d) => d.my_role === 'seller' && d.state === 'RELEASED').reduce((sum, d) => sum + (d.amount_minor || 0), 0);

  const myListings = myListingsQuery.data ?? [];
  const feedItems = feedQuery.data ?? [];

  return (
    <View style={styles.screen}>
      <TopBar variant="home" buyLabel={t('common.buy')} sellLabel={t('common.sell')} />
      {!coachmarkDismissed ? (
        <Pressable onPress={dismissCoachmark} style={styles.coachmark}>
          <Text size={12} weight={600} color={C.paccha}>{t('nav.switch_coachmark')}</Text>
          <X size={14} color={C.paccha} />
        </Pressable>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching || dealsQuery.isRefetching}
            onRefresh={() => {
              feedQuery.refetch();
              dealsQuery.refetch();
              if (me) myListingsQuery.refetch();
            }}
            tintColor={C.paccha}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {mode === 'buy' ? (
          <Animated.View key="buy-home" entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={styles.modeStack}>
            <View style={styles.greetingBlock}>
              <Text variant="display" size={32} lineHeight={36}>{t('home.greeting_buy', { name: firstName })}</Text>
              <Text variant="secondary" size={14}>{me?.campus || t('home.subtitle_buy')}</Text>
            </View>

            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/explore' as never)} style={styles.searchPill}>
              <Search size={18} strokeWidth={1.75} color={C.muted} />
              <Text size={15} color={C.muted} numberOfLines={1}>{t('home.search_placeholder')}</Text>
            </Pressable>

            {activeBuyerDeals.length > 0 ? (
              <View style={styles.section}>
                <Eyebrow label={t('home.your_deals')} dot />
                {activeBuyerDeals.map((d) => (
                  <ActiveDealCard key={d.id} deal={d} onPress={() => router.push(`/deal/${d.id}` as never)} />
                ))}
              </View>
            ) : (
              <VelvetCard tone="card2" onPress={() => router.push('/guide' as never)} style={styles.dealCard}>
                <Eyebrow label={t('home.how_buying_works').toUpperCase()} dot />
                <View style={styles.stepsRow}>
                  <Text size={13} weight={600}>1. {t('home.step1_lock')}</Text>
                  <Text size={13} color={C.dim}>→</Text>
                  <Text size={13} weight={600}>2. {t('home.step2_live')}</Text>
                  <Text size={13} color={C.dim}>→</Text>
                  <Text size={13} weight={600} color={C.paccha}>3. {t('home.step3_release')}</Text>
                </View>
              </VelvetCard>
            )}

            <View style={styles.section}>
              <Eyebrow label={t('home.categories')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
                {CATEGORY_ICONS.map((cat) => (
                  <IconTile
                    key={cat.key}
                    icon={cat.icon}
                    label={t(`categories.${cat.key}`)}
                    size={58}
                    onPress={() => router.push({ pathname: '/(tabs)/explore', params: { category: cat.key } } as never)}
                  />
                ))}
                <Pressable
                  onPress={() => router.push({ pathname: '/(tabs)/explore', params: { kind: 'swap' } } as never)}
                  style={styles.freeSwapPill}
                >
                  <Sparkles size={18} color={C.paccha} />
                  <Text weight={700} size={13} color={C.paccha}>{t('home.free_and_swap')}</Text>
                </Pressable>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Eyebrow label={t('home.fresh_near_you')} dot />
              {feedQuery.isLoading ? (
                <View style={styles.gridRow}>
                  <Skeleton height={210} radius={20} style={styles.gridCol} />
                  <Skeleton height={210} radius={20} style={styles.gridCol} />
                </View>
              ) : (
                <View style={styles.gridWrap}>
                  {feedItems.map((item) => (
                    <View key={item.id} style={styles.gridItem}>
                      <ListingCard item={item} onPress={() => router.push(`/listing/${item.id}` as never)} />
                    </View>
                  ))}
                </View>
              )}
            </View>

            <VelvetCard tone="card2" style={styles.sellBanner}>
              <Text variant="display" size={22}>{t('home.got_something_to_sell')}</Text>
              <NeoButton variant="paccha" size="md" label={t('home.switch_to_selling')} onPress={() => setMode('sell')} />
            </VelvetCard>
          </Animated.View>
        ) : (
          <Animated.View key="sell-home" entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={styles.modeStack}>
            <View style={styles.greetingBlock}>
              <Text variant="display" size={32} lineHeight={36}>{t('home.greeting_sell', { name: firstName })}</Text>
              <View style={styles.statsStrip}>
                <VelvetCard tone="card2" padding={12} style={styles.statCell}>
                  <Text variant="display" size={24} tabular>{myListings.filter((l) => l.status === 'active').length}</Text>
                  <Text variant="secondary" size={11}>{t('home.stat_active')}</Text>
                </VelvetCard>
                <VelvetCard tone="card2" padding={12} style={styles.statCell}>
                  <Text variant="display" size={24} tabular color={C.paccha}>{sellerOffersWaiting.length}</Text>
                  <Text variant="secondary" size={11}>{t('home.stat_offers')}</Text>
                </VelvetCard>
                <VelvetCard tone="card2" padding={12} style={styles.statCell}>
                  <Text variant="display" size={20} tabular numberOfLines={1}>{formatMoney(earnedMinor, me?.currency || 'INR')}</Text>
                  <Text variant="secondary" size={11}>{t('home.stat_earned')}</Text>
                </VelvetCard>
              </View>
            </View>

            {myListings.length === 0 ? (
              <VelvetCard tone="card2" padding={20} style={styles.sellBanner}>
                <Text variant="display" size={28} lineHeight={32}>{t('home.no_listings_title')}</Text>
                <Text variant="secondary" size={14}>{t('home.no_listings_body')}</Text>
                <NeoButton variant="paccha" size="lg" label={t('home.list_an_item')} onPress={() => router.push('/listing/new' as never)} />
              </VelvetCard>
            ) : null}

            {sellerOffersWaiting.length > 0 ? (
              <View style={styles.section}>
                <Eyebrow label={t('home.offers_waiting')} dot />
                {sellerOffersWaiting.map((deal) => (
                  <VelvetCard key={deal.id} tone="card2" borderColor={C.paccha} onPress={() => router.push(`/deal/${deal.id}` as never)} style={styles.dealCard}>
                    <View style={styles.dealRow}>
                      <View style={styles.dealMeta}>
                        <Text weight={700} size={15}>{deal.counterpart?.name} · {formatMoney(deal.amount_minor, deal.currency)}</Text>
                        <Text variant="secondary" size={12}>{deal.listing?.title}</Text>
                      </View>
                      <NeoButton variant="paccha" size="md" fullWidth={false} label={t('deals.accept')} loading={dealAction.isPending} onPress={() => dealAction.mutate({ deal_id: deal.id, action: 'ACCEPT', expected_version: deal.version })} />
                    </View>
                  </VelvetCard>
                ))}
              </View>
            ) : null}

            {activeSellerDeals.length > 0 ? (
              <View style={styles.section}>
                <Eyebrow label={t('home.your_sales')} dot />
                {activeSellerDeals.map((d) => (
                  <ActiveDealCard key={d.id} deal={d} onPress={() => router.push(`/deal/${d.id}` as never)} />
                ))}
              </View>
            ) : null}

            {myListings.length > 0 ? (
              <View style={styles.section}>
                <Eyebrow label={t('home.your_listings')} />
                {myListings.map((item) => (
                  <VelvetCard key={item.id} padding={12} onPress={() => router.push(`/listing/${item.id}` as never)}>
                    <View style={styles.dealRow}>
                      <Image source={{ uri: item.photo || item.photos?.[0] }} style={styles.dealThumb} contentFit="cover" />
                      <View style={styles.dealMeta}>
                        <Text weight={600} size={15} numberOfLines={1}>{item.title}</Text>
                        <Price minor={item.price_minor} currency={item.currency} kind={item.kind} size={14} color={C.fg2} />
                      </View>
                      <StatusPill tone={item.status === 'active' ? 'locked' : 'neutral'} label={item.status.toUpperCase()} />
                    </View>
                  </VelvetCard>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Eyebrow label={t('home.seller_tools')} />
              <View style={styles.toolsRow}>
                <IconTile icon={<Plus size={22} color={C.paccha} />} label={t('home.tool_list')} onPress={() => router.push('/listing/new' as never)} />
                <IconTile icon={<Wallet size={22} color={C.fg} />} label={t('home.tool_wallet')} onPress={() => router.push('/wallet' as never)} />
                <IconTile icon={<ShieldCheck size={22} color={C.fg} />} label={t('home.tool_safety')} onPress={() => router.push('/safety' as never)} />
                <IconTile icon={<BookOpen size={22} color={C.fg} />} label={t('home.tool_guide')} onPress={() => router.push('/guide' as never)} />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  coachmark: { backgroundColor: 'rgba(229,254,64,0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(229,254,64,0.25)', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { padding: 16, paddingBottom: 36 },
  modeStack: { gap: 22 },
  greetingBlock: { gap: 6 },
  searchPill: { height: 52, borderRadius: R.chip, backgroundColor: C.card2, borderWidth: 1, borderColor: C.hairline, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: { gap: 12 },
  dealCard: { gap: 10 },
  dealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dealThumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: C.card3 },
  dealMeta: { flex: 1, gap: 2 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  categoriesScroll: { gap: 14, paddingRight: 16, alignItems: 'center' },
  freeSwapPill: { height: 58, paddingHorizontal: 18, borderRadius: R.chip, borderWidth: 1.5, borderColor: C.paccha, backgroundColor: 'rgba(229,254,64,0.08)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCol: { flex: 1 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '50%', paddingHorizontal: 6, marginBottom: 16 },
  sellBanner: { gap: 12 },
  statsStrip: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statCell: { flex: 1, gap: 2 },
  toolsRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
