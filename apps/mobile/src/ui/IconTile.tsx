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
import * as Haptics from 'expo-haptics';
import { C, R } from '@/theme/tokens';
import { TIMING_PRESS_IN, TIMING_PRESS_OUT } from '@/theme/motion';
import { Text } from './Text';

export interface IconTileProps {
  icon: React.ReactNode;
  label: string;
  size?: number;
  onPress?: () => void;
  active?: boolean;
  accentColor?: string;
  badge?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconTile({
  icon,
  label,
  size = 64,
  onPress,
  active = false,
  accentColor = C.paccha,
  badge,
  style,
  testID,
}: IconTileProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, TIMING_PRESS_IN);
    Haptics.selectionAsync().catch(() => {});
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, TIMING_PRESS_OUT);
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, style]}
    >
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: active ? accentColor : C.hairline,
            borderWidth: active ? 1.5 : 1,
          },
          animatedStyle,
        ]}
      >
        {icon}
      </Animated.View>

      {badge ? (
        <View style={styles.badge}>
          <Text weight={700} size={10} color={C.paccha} tabular>
            {badge}
          </Text>
        </View>
      ) : null}

      <Text
        weight={active ? 600 : 500}
        size={12}
        color={active ? C.fg : C.fg2}
        align="center"
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  circle: {
    backgroundColor: C.card3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    marginTop: -14,
    backgroundColor: '#1f2a10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.chip,
  },
  label: {
    textTransform: 'lowercase',
    maxWidth: 80,
  },
});
