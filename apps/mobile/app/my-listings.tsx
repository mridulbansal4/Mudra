import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { useMyListings, useSetListingStatus } from '@/features/hooks';
import {
  EmptyState,
  NeoButton,
  Price,
  Skeleton,
  StatusPill,
  Text,
  TopBar,
  VelvetCard,
} from '@/ui';

export default function MyListingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const myListingsQuery = useMyListings();
  const setStatus = useSetListingStatus();
  const items = myListingsQuery.data ?? [];

  return (
    <View style={styles.screen}>
      <TopBar
        title={t('profile.my_listings')}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.list_an_item')}
            onPress={() => router.push('/listing/new' as never)}
            style={styles.addBtn}
          >
            <Plus size={20} strokeWidth={2.25} color={C.bg} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {myListingsQuery.isLoading ? (
          <View style={styles.stack}>
            <Skeleton height={92} radius={20} />
            <Skeleton height={92} radius={20} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('home.no_listings_title')}
            body={t('home.no_listings_body')}
            actionLabel={t('home.list_an_item')}
            actionVariant="paccha"
            onAction={() => router.push('/listing/new' as never)}
          />
        ) : (
          <View style={styles.stack}>
            {items.map((item) => (
              <VelvetCard
                key={item.id}
                padding={14}
                onPress={() => router.push(`/listing/${item.id}` as never)}
                style={styles.card}
              >
                <View style={styles.row}>
                  <Image
                    source={{ uri: item.photo || item.photos?.[0] }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                  <View style={styles.meta}>
                    <Text weight={600} size={16} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Price
                      minor={item.price_minor}
                      currency={item.currency}
                      kind={item.kind}
                      size={15}
                      color={C.paccha}
                    />
                    <Text variant="secondary" size={12}>
                      {item.offer_count ?? item.offers_count ?? 0} offers
                    </Text>
                  </View>
                  <StatusPill
                    tone={item.status === 'active' ? 'locked' : 'neutral'}
                    label={item.status.toUpperCase()}
                  />
                </View>

                {item.status === 'active' ? (
                  <View style={styles.actionsRow}>
                    <View style={styles.flex1}>
                      <NeoButton
                        variant="ghost"
                        size="md"
                        label={t('common.edit')}
                        onPress={() =>
                          router.push(`/listing/new?edit=${item.id}` as never)
                        }
                      />
                    </View>
                    <View style={styles.flex1}>
                      <NeoButton
                        variant="paccha"
                        size="md"
                        label={t('listing.mark_sold')}
                        loading={setStatus.isPending}
                        onPress={() =>
                          setStatus.mutate({
                            listingId: item.id,
                            status: 'sold',
                          })
                        }
                      />
                    </View>
                  </View>
                ) : null}
              </VelvetCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.paccha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 16, paddingBottom: 36 },
  stack: { gap: 12 },
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 14, backgroundColor: C.card3 },
  meta: { flex: 1, gap: 2 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
});
