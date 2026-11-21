import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { C, R } from '@/theme/tokens';
import { TIMING_PRESS_IN, TIMING_PRESS_OUT } from '@/theme/motion';
import { ListingCardData } from '@/types';
import { formatMoney } from '@/lib/money';
import { Text } from './Text';

export interface ListingCardProps {
  item: ListingCardData;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ListingCard({
  item,
  onPress,
  style,
  testID,
}: ListingCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const coverUri = item.photo || item.photos?.[0] || '';
  const priceLabel =
    item.kind === 'free'
      ? 'free'
      : item.kind === 'swap'
      ? 'swap'
      : formatMoney(item.price_minor, item.currency);

  const subtitle = item.meetup_spot || item.campus || item.condition.replace('_', ' ');

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${priceLabel}`}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, TIMING_PRESS_IN);
      }}
      onPressOut={() => {
        scale.value = withTiming(1, TIMING_PRESS_OUT);
      }}
      style={[styles.container, style]}
    >
      <Animated.View style={animatedStyle}>
        <View style={styles.imageWrap}>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}

          {item.kind !== 'sell' ? (
            <View
              style={[
                styles.kindChip,
                item.kind === 'free' ? styles.freeChip : styles.swapChip,
              ]}
            >
              <Text
                variant="eyebrow"
                size={10}
                color={item.kind === 'free' ? C.bg : C.fg}
              >
                {item.kind.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {item.status !== 'active' ? (
            <View style={styles.statusChip}>
              <Text variant="eyebrow" size={10} color={C.sunshine}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          ) : null}

          <View style={styles.priceChip}>
            <Text weight={700} size={13} color={C.fg} tabular>
              {priceLabel}
            </Text>
          </View>
        </View>

        <View style={styles.meta}>
          <Text weight={600} size={14} color={C.fg} numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="secondary" size={12} color={C.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: R.row,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: C.card3,
  },
  kindChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.chip,
  },
  freeChip: {
    backgroundColor: C.paccha,
  },
  swapChip: {
    backgroundColor: C.purple,
  },
  statusChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.chip,
  },
  priceChip: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  meta: {
    paddingTop: 8,
    paddingHorizontal: 2,
    gap: 2,
  },
});
