import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { C, F, R } from '@/theme/tokens';
import { useFeed } from '@/features/hooks';
import { underChipMinorForCurrency } from '@/lib/money';
import { useSessionStore } from '@/state/session';
import type { FeedFilters, ListingCategory, ListingCondition, ListingKind } from '@/types';
import {
  EmptyState, Eyebrow, ListingCard, NeoButton, SegmentedControl,
  Sheet, Skeleton, Text, TopBar,
} from '@/ui';

const CATEGORIES: ListingCategory[] = [
  'books', 'electronics', 'phones', 'home', 'rides',
  'fashion', 'sports', 'hobbies', 'tickets', 'other',
];

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; kind?: string }>();
  const { t } = useTranslation();
  const me = useSessionStore((s) => s.me);

  const [queryText, setQueryText] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | 'all'>('all');
  const [selectedKind, setSelectedKind] = useState<ListingKind | 'all'>('all');
  const [selectedCondition, setSelectedCondition] = useState<ListingCondition | 'all'>('all');
  const [underMaxMinor, setUnderMaxMinor] = useState<number | null>(null);
  const [campusOnly, setCampusOnly] = useState(false);
  const [sort, setSort] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const currency = me?.currency || 'INR';
  const underChip = useMemo(() => underChipMinorForCurrency(currency), [currency]);

  useEffect(() => {
    if (params.category && CATEGORIES.includes(params.category as ListingCategory)) {
      setSelectedCategory(params.category as ListingCategory);
    }
    if (params.kind && ['sell', 'swap', 'free'].includes(params.kind)) {
      setSelectedKind(params.kind as ListingKind);
    }
  }, [params.category, params.kind]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(queryText.trim()), 300);
    return () => clearTimeout(timer);
  }, [queryText]);

  const filters: FeedFilters = useMemo(
    () => ({
      q: debouncedQ || undefined,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      kind: selectedKind === 'all' ? undefined : selectedKind,
      condition: selectedCondition === 'all' ? undefined : selectedCondition,
      max: underMaxMinor ?? undefined,
      campus_only: campusOnly || undefined,
      sort,
    }),
    [debouncedQ, selectedCategory, selectedKind, selectedCondition, underMaxMinor, campusOnly, sort]
  );

  const feedQuery = useFeed(filters, 40, 0);
  const items = feedQuery.data ?? [];

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedKind('all');
    setSelectedCondition('all');
    setUnderMaxMinor(null);
    setCampusOnly(false);
    setSort('newest');
  };

  const isAllActive = selectedCategory === 'all' && selectedKind === 'all' && !underMaxMinor;

  return (
    <View style={styles.screen}>
      <TopBar
        title={t('explore.title')}
        showBack={false}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('explore.filters')}
            onPress={() => setFilterSheetOpen(true)}
            style={styles.filterBtn}
          >
            <SlidersHorizontal size={18} strokeWidth={1.75} color={C.fg} />
          </Pressable>
        }
      />

      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={18} strokeWidth={1.75} color={C.muted} />
          <TextInput
            placeholder={t('explore.search_placeholder')}
            placeholderTextColor={C.dim}
            value={queryText}
            onChangeText={setQueryText}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {queryText ? (
            <Pressable onPress={() => setQueryText('')}>
              <X size={16} color={C.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Pressable onPress={resetFilters} style={[styles.chip, isAllActive && styles.chipActive]}>
            <Text weight={600} size={13} color={isAllActive ? C.bg : C.fg2}>{t('categories.all')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedKind((k) => (k === 'free' ? 'all' : 'free'))}
            style={[styles.chip, selectedKind === 'free' && styles.chipActive]}
          >
            <Text weight={600} size={13} color={selectedKind === 'free' ? C.bg : C.fg2}>{t('common.free')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedKind((k) => (k === 'swap' ? 'all' : 'swap'))}
            style={[styles.chip, selectedKind === 'swap' && styles.chipActive]}
          >
            <Text weight={600} size={13} color={selectedKind === 'swap' ? C.bg : C.fg2}>{t('common.swap')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setUnderMaxMinor((m) => (m === underChip.maxMinor ? null : underChip.maxMinor))}
            style={[styles.chip, underMaxMinor === underChip.maxMinor && styles.chipActive]}
          >
            <Text weight={600} size={13} color={underMaxMinor === underChip.maxMinor ? C.bg : C.fg2} tabular>
              {underChip.label}
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory((prev) => (prev === cat ? 'all' : cat))}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text weight={600} size={13} color={active ? C.bg : C.fg2}>{t(`categories.${cat}`)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsScroll}>
        {feedQuery.isLoading ? (
          <View style={styles.gridRow}>
            <Skeleton height={210} radius={20} style={styles.gridCol} />
            <Skeleton height={210} radius={20} style={styles.gridCol} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('explore.empty_title', { q: debouncedQ || selectedCategory })}
            body={t('explore.empty_body')}
            actionLabel={t('explore.reset_filters')}
            onAction={resetFilters}
          />
        ) : (
          <View style={styles.gridWrap}>
            {items.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <ListingCard item={item} onPress={() => router.push(`/listing/${item.id}` as never)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} title={t('explore.filters')} scrollable>
        <View style={styles.sheetBody}>
          <Eyebrow label={t('listing.field_kind').toUpperCase()} />
          <SegmentedControl
            value={selectedKind}
            onChange={setSelectedKind}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'sell', label: t('kinds.sell') },
              { value: 'swap', label: t('kinds.swap') },
              { value: 'free', label: t('kinds.free') },
            ]}
          />

          <Eyebrow label={t('listing.field_condition').toUpperCase()} />
          <SegmentedControl
            value={selectedCondition}
            onChange={setSelectedCondition}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'new', label: t('conditions.new') },
              { value: 'like_new', label: t('conditions.like_new') },
              { value: 'good', label: t('conditions.good') },
              { value: 'fair', label: t('conditions.fair') },
            ]}
          />

          <View style={styles.switchRow}>
            <Text weight={500} size={15}>{t('explore.my_campus_only')}</Text>
            <Switch value={campusOnly} onValueChange={setCampusOnly} trackColor={{ false: C.card3, true: C.purple }} thumbColor={C.fg} />
          </View>

          <Eyebrow label="SORT BY" />
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: t('explore.sort_newest') },
              { value: 'price_low', label: t('explore.sort_price_low') },
              { value: 'price_high', label: t('explore.sort_price_high') },
            ]}
          />

          <View style={styles.sheetActions}>
            <View style={styles.gridCol}>
              <NeoButton variant="ghost" label={t('explore.reset_filters')} onPress={resetFilters} />
            </View>
            <View style={styles.gridCol}>
              <NeoButton variant="purple" label={t('explore.apply_filters')} onPress={() => setFilterSheetOpen(false)} />
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.card2,
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  searchHeader: { paddingTop: 12, paddingBottom: 8, gap: 12 },
  searchBar: {
    marginHorizontal: 16, height: 48, borderRadius: R.chip, backgroundColor: C.card2,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  searchInput: { flex: 1, fontFamily: F.ui, fontSize: 15, color: C.fg },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    height: 34, paddingHorizontal: 14, borderRadius: R.chip, backgroundColor: C.card2,
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: C.fg, borderColor: C.fg },
  resultsScroll: { padding: 16, paddingBottom: 36 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCol: { flex: 1 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '50%', paddingHorizontal: 6, marginBottom: 16 },
  sheetBody: { gap: 14, paddingBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
