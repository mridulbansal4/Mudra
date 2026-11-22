import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { C } from '@/theme/tokens';
import { SPRING_CRITICALLY_DAMPED } from '@/theme/motion';
import { Text } from './Text';

export interface StampProps {
  label?: string;
  visible?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const BURST_ANGLES = Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180);

export function Stamp({
  label = 'RELEASED',
  visible = true,
  color = C.paccha,
  style,
}: StampProps) {
  const scale = useSharedValue(1.6);
  const opacity = useSharedValue(0);
  const burstOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 1.6;
      opacity.value = 0;
      burstOpacity.value = 0;

      scale.value = withSpring(1, SPRING_CRITICALLY_DAMPED);
      opacity.value = withTiming(1, { duration: 180 });
      burstOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 450 })
      );
    }
  }, [visible, scale, opacity, burstOpacity]);

  const stampAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: '-8deg' }, { scale: scale.value }],
  }));

  const burstAnimatedStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.wrapper, style]}>
      <Animated.View style={[styles.burstWrap, burstAnimatedStyle]}>
        <Svg width={220} height={120} viewBox="0 0 220 120">
          {BURST_ANGLES.map((rad, idx) => {
            const cx = 110;
            const cy = 60;
            const r1 = 56;
            const r2 = 88;
            const x1 = cx + Math.cos(rad) * r1;
            const y1 = cy + Math.sin(rad) * (r1 * 0.65);
            const x2 = cx + Math.cos(rad) * r2;
            const y2 = cy + Math.sin(rad) * (r2 * 0.65);
            return (
              <Line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="square"
              />
            );
          })}
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.stampBox,
          { borderColor: color },
          stampAnimatedStyle,
        ]}
      >
        <Text
          variant="eyebrow"
          weight={700}
          size={20}
          lineHeight={24}
          color={color}
          style={styles.stampText}
        >
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 100,
  },
  burstWrap: {
    position: 'absolute',
    width: 220,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampBox: {
    borderWidth: 2.5,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(13, 13, 13, 0.88)',
  },
  stampText: {
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
