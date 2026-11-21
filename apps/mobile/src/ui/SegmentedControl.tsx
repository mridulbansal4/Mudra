import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { C, R } from '@/theme/tokens';
import { SPRING_CRITICALLY_DAMPED } from '@/theme/motion';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const PADDING = 3;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
  testID,
}: SegmentedControlProps<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const count = Math.max(options.length, 1);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const segmentWidth = trackWidth > 0 ? (trackWidth - PADDING * 2) / count : 0;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withSpring(
        activeIndex * segmentWidth,
        SPRING_CRITICALLY_DAMPED
      );
    }
  }, [activeIndex, segmentWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trackWidth) {
      setTrackWidth(w);
    }
  };

  const height = size === 'sm' ? 34 : 40;

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      style={[styles.track, { height }, style]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              width: segmentWidth,
              height: height - PADDING * 2,
            },
            indicatorStyle,
          ]}
        />
      ) : null}

      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={opt.label}
            onPress={() => {
              if (opt.value !== value) {
                Haptics.selectionAsync().catch(() => {});
                onChange(opt.value);
              }
            }}
            style={[
              styles.segment,
              segmentWidth === 0 && isActive ? styles.fallbackActive : null,
            ]}
          >
            <Text
              weight={isActive ? 700 : 500}
              size={size === 'sm' ? 13 : 14}
              color={isActive ? C.bg : C.fg2}
              numberOfLines={1}
              style={styles.label}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card2,
    borderRadius: R.chip,
    padding: PADDING,
    borderWidth: 1,
    borderColor: C.hairline,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: PADDING,
    left: PADDING,
    backgroundColor: C.fg,
    borderRadius: R.chip,
  },
  segment: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.chip,
    zIndex: 1,
  },
  fallbackActive: {
    backgroundColor: C.fg,
  },
  label: {
    textTransform: 'lowercase',
  },
});
