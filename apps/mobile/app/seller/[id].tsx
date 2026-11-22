import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { C, R } from '@/theme/tokens';
import { useSellerProfile } from '@/features/hooks';
import { relativeTime } from '@/lib/time';
import {
  AvatarRing,
  EmptyState,
  Eyebrow,
  ListingCard,
  Skeleton,
  Text,
  TopBar,
  VelvetCard,
} from '@/ui';

export default function SellerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const sellerQuery = useSellerProfile(id);
  const data = sellerQuery.data;

  if (sellerQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <TopBar title="" />
        <View style={styles.pad}>
          <Skeleton height={120} radius={24} />
          <Skeleton height={200} radius={20} style={styles.mt} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.screen}>
        <TopBar title="" />
        <EmptyState
          title={t('errors.NOT_FOUND')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const profile = data.profile ?? {
    id: data.id || id || '',
    name: data.name || 'Seller',
    avatar_hue: data.avatar_hue ?? 120,
    rating: data.rating ?? null,
    deals_done: data.deals_done ?? 0,
    campus: data.campus ?? null,
    bio: data.bio ?? null,
    created_at: data.created_at || new Date().toISOString(),
  };

  const listings = data.listings ?? [];
  const reviews = data.reviews ?? [];

  return (
    <View style={styles.screen}>
      <TopBar title={profile.name.toLowerCase()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <VelvetCard tone="card2" padding={20} style={styles.profileCard}>
          <View style={styles.headerRow}>
            <AvatarRing
              name={profile.name}
              hue={profile.avatar_hue}
              size={72}
            />
            <View style={styles.headerText}>
              <Text variant="display" size={26} lineHeight={30}>
                {profile.name}
              </Text>
              <Text variant="secondary" size={13}>
                {profile.campus || 'campus member'} ·{' '}
                {relativeTime(profile.created_at)}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={C.paccha} fill={C.paccha} />
                <Text weight={700} size={14} color={C.fg} tabular>
                  {profile.rating ?? '5.0'} ·{' '}
                  {t('listing.deals_count', { count: profile.deals_done ?? 0 })}
                </Text>
              </View>
            </View>
          </View>

          {profile.bio ? (
            <Text size={14} color={C.fg2}>
              {profile.bio}
            </Text>
          ) : null}
        </VelvetCard>

        <View style={styles.section}>
          <Eyebrow label={t('home.your_listings')} dot />
          {listings.length === 0 ? (
            <Text variant="secondary" size={14}>
              no active listings right now.
            </Text>
          ) : (
            <View style={styles.gridWrap}>
              {listings.map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <ListingCard
                    item={item}
                    onPress={() => router.push(`/listing/${item.id}` as never)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {reviews.length > 0 ? (
          <View style={styles.section}>
            <Eyebrow label={t('profile.reviews_about_me').toUpperCase()} />
            {reviews.map((rev) => (
              <VelvetCard key={rev.id} padding={14} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text weight={600} size={14}>
                    {rev.author_name || 'campus member'}
                  </Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: rev.stars }).map((_, i) => (
                      <Star key={i} size={12} color={C.paccha} fill={C.paccha} />
                    ))}
                  </View>
                </View>
                {rev.body ? (
                  <Text size={14} color={C.fg2}>
                    {rev.body}
                  </Text>
                ) : null}
                {rev.tags?.length ? (
                  <View style={styles.tagsRow}>
                    {rev.tags.map((tag) => (
                      <View key={tag} style={styles.tagPill}>
                        <Text size={11} color={C.muted}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </VelvetCard>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  mt: { marginTop: 14 },
  scroll: { padding: 16, gap: 22, paddingBottom: 36 },
  profileCard: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerText: { flex: 1, gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  section: { gap: 12 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '50%', paddingHorizontal: 6, marginBottom: 16 },
  reviewCard: { gap: 8 },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsRow: { flexDirection: 'row', gap: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.chip,
    backgroundColor: C.card2,
  },
});
