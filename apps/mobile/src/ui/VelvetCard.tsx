import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { C, R } from '@/theme/tokens';
import { TIMING_PRESS_IN, TIMING_PRESS_OUT } from '@/theme/motion';

export type VelvetCardTone = 'card' | 'card2' | 'card3';

export interface VelvetCardProps {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  tone?: VelvetCardTone;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

const TONE_BG: Record<VelvetCardTone, string> = {
  card: C.card,
  card2: C.card2,
  card3: C.card3,
};

export function VelvetCard({
  children,
  padding = 16,
  radius = R.card,
  tone = 'card',
  borderColor = C.hairline,
  style,
  onPress,
  disabled = false,
  accessibilityLabel,
  testID,
}: VelvetCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle: ViewStyle = {
    backgroundColor: TONE_BG[tone],
    borderRadius: radius,
    padding,
    borderWidth: 1,
    borderColor,
  };

  if (!onPress) {
    return (
      <View testID={testID} style={[styles.base, containerStyle, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.98, TIMING_PRESS_IN);
      }}
      onPressOut={() => {
        scale.value = withTiming(1, TIMING_PRESS_OUT);
      }}
    >
      <Animated.View style={[styles.base, containerStyle, animatedStyle, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
