import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { C, F, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import {
  AvatarRing,
  Eyebrow,
  NeoButton,
  Skeleton,
  Text,
  TopBar,
  VelvetCard,
  showToast,
} from '@/ui';

const REVIEW_TAG_KEYS = [
  { key: 'on_time', fallback: 'on time' },
  { key: 'as_described', fallback: 'as described' },
  { key: 'friendly', fallback: 'friendly' },
  { key: 'fair_price', fallback: 'fair price' },
] as const;

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [stars, setStars] = useState(5);
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['on time', 'as described']);

  const dealQuery = useQuery({
    queryKey: ['deal', id],
    queryFn: () => mudraApi.deal(id!),
    enabled: Boolean(id),
  });

  const deal = dealQuery.data;

  const toggleTag = (tagLabel: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedTags((prev) =>
      prev.includes(tagLabel) ? prev.filter((item) => item !== tagLabel) : [...prev, tagLabel]
    );
  };

  const reviewMut = useMutation({
    mutationFn: () =>
      mudraApi.dealAction({
        deal_id: id!,
        action: 'LEAVE_REVIEW',
        expected_version: deal?.version ?? 1,
        payload: {
          stars,
          body: body.trim(),
          tags: selectedTags,
        },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['deal', id], updated);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      showToast(t('review.review_submitted', 'thanks for your review.'), 'success');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/deal/${id}` as never);
      }
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
      dealQuery.refetch();
    },
  });

  if (!deal) {
    return (
      <View style={styles.screen}>
        <TopBar title={t('review.title', 'leave a review')} />
        <View style={styles.pad}>
          <Skeleton height={220} radius={R.card} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TopBar title={t('review.title', 'leave a review')} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VelvetCard tone="card" style={styles.counterpartCard}>
          <AvatarRing
            name={deal.counterpart?.name || 'User'}
            hue={deal.counterpart?.avatar_hue}
            size={64}
          />
          <Text variant="display" size={24} color={C.fg} lowercase>
            {deal.counterpart?.name || 'counterpart'}
          </Text>
          <Text variant="secondary" size={13} color={C.muted}>
            {deal.listing?.title || deal.short_code}
          </Text>
        </VelvetCard>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= stars;
            return (
              <Pressable
                key={value}
                testID={`review-star-${value}`}
                accessibilityRole="button"
                accessibilityLabel={`${value} stars`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setStars(value);
                }}
                style={styles.starBtn}
              >
                <Star
                  size={36}
                  strokeWidth={1.75}
                  color={active ? C.paccha : C.border}
                  fill={active ? C.paccha : 'transparent'}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tagsSection}>
          <Eyebrow label="HIGHLIGHTS" dot dotColor={C.paccha} />
          <View style={styles.tagsWrap}>
            {REVIEW_TAG_KEYS.map((item) => {
              const label = t(`review.tag_${item.key}`, item.fallback);
              const selected = selectedTags.includes(label);
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => toggleTag(label)}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                >
                  <Text
                    size={13}
                    weight={600}
                    color={selected ? C.bg : C.fg2}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <VelvetCard tone="card2" style={styles.inputCard}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('review.placeholder', 'how did the deal go? (optional)')}
            placeholderTextColor={C.muted}
            maxLength={200}
            multiline
            style={styles.input}
          />
          <Text variant="mono" size={11} color={C.muted} align="right" tabular>
            {body.length}/200
          </Text>
        </VelvetCard>

        <NeoButton
          variant="paccha"
          size="lg"
          label={t('review.submit_review', 'submit review')}
          loading={reviewMut.isPending}
          disabled={reviewMut.isPending}
          onPress={() => reviewMut.mutate()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  scroll: { padding: 16, gap: 22 },
  counterpartCard: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  starBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsSection: { gap: 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: R.chip,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagChipSelected: {
    backgroundColor: C.paccha,
    borderColor: C.paccha,
  },
  inputCard: { gap: 6 },
  input: {
    minHeight: 96,
    color: C.fg,
    fontFamily: F.ui,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
