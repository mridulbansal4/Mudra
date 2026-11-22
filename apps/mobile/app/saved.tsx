import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { C } from '@/theme/tokens';
import { useSavedListings } from '@/features/hooks';
import {
  EmptyState,
  ListingCard,
  Skeleton,
  TopBar,
} from '@/ui';

export default function SavedListingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const savedQuery = useSavedListings();
  const items = savedQuery.data ?? [];

  return (
    <View style={styles.screen}>
      <TopBar title={t('profile.saved')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {savedQuery.isLoading ? (
          <View style={styles.gridRow}>
            <Skeleton height={210} radius={20} style={styles.gridCol} />
            <Skeleton height={210} radius={20} style={styles.gridCol} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title="no saved items yet."
            body="tap the heart on any listing to save it here."
            actionLabel={t('explore.title')}
            onAction={() => router.push('/(tabs)/explore' as never)}
          />
        ) : (
          <View style={styles.gridWrap}>
            {items.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <ListingCard
                  item={item}
                  onPress={() => router.push(`/listing/${item.id}` as never)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 36 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCol: { flex: 1 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '50%', paddingHorizontal: 6, marginBottom: 16 },
});
