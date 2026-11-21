import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { C, R } from '@/theme/tokens';
import { DealState } from '@/types';
import { Text } from './Text';

export type StatusPillTone =
  | 'locked'
  | 'live'
  | 'frozen'
  | 'neutral'
  | 'done'
  | 'danger';

export interface StatusPillProps {
  tone?: StatusPillTone;
  label?: string;
  state?: DealState;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const TONE_STYLES: Record<
  StatusPillTone,
  { bg: string; fg: string; pulse?: boolean }
> = {
  locked: { bg: 'rgba(229, 254, 64, 0.12)', fg: C.paccha },
  live: { bg: 'rgba(255, 135, 68, 0.14)', fg: C.sunshine, pulse: true },
  frozen: { bg: 'rgba(154, 216, 255, 0.12)', fg: '#9ad8ff' },
  done: { bg: 'rgba(61, 220, 132, 0.12)', fg: C.success },
  danger: { bg: 'rgba(255, 77, 77, 0.12)', fg: C.danger },
  neutral: { bg: C.card3, fg: C.fg2 },
};

export function toneForDealState(state: DealState): {
  tone: StatusPillTone;
  defaultLabel: string;
} {
  switch (state) {
    case 'OFFERED':
      return { tone: 'neutral', defaultLabel: 'OFFERED' };
    case 'CREATED':
      return { tone: 'neutral', defaultLabel: 'CREATED' };
    case 'FUNDED':
      return { tone: 'locked', defaultLabel: 'IN ESCROW' };
    case 'INSPECTION_LIVE':
      return { tone: 'live', defaultLabel: 'LIVE CHECK' };
    case 'ASSAY_VERIFIED':
      return { tone: 'locked', defaultLabel: 'VERIFIED' };
    case 'RELEASED':
      return { tone: 'done', defaultLabel: 'RELEASED' };
    case 'DISPUTED_FROZEN':
      return { tone: 'frozen', defaultLabel: 'FROZEN' };
    case 'ARBITRATED_SPLIT':
      return { tone: 'done', defaultLabel: 'SPLIT VERDICT' };
    case 'REFUNDED':
      return { tone: 'neutral', defaultLabel: 'REFUNDED' };
    case 'DECLINED':
      return { tone: 'danger', defaultLabel: 'DECLINED' };
    case 'CANCELLED':
      return { tone: 'neutral', defaultLabel: 'CANCELLED' };
    default:
      return { tone: 'neutral', defaultLabel: String(state) };
  }
}

export function StatusPill({
  tone,
  label,
  state,
  children,
  style,
}: StatusPillProps) {
  const mapped = state ? toneForDealState(state) : null;
  const resolvedTone = tone ?? mapped?.tone ?? 'neutral';
  const resolvedLabel =
    label ??
    (typeof children === 'string' ? children : undefined) ??
    mapped?.defaultLabel ??
    '';

  const palette = TONE_STYLES[resolvedTone];
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (palette.pulse) {
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: 650 }),
          withTiming(1, { duration: 650 })
        ),
        -1,
        false
      );
    } else {
      dotOpacity.value = 1;
    }
  }, [palette.pulse, dotOpacity]);

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: palette.bg },
        style,
      ]}
    >
      {palette.pulse ? (
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: palette.fg },
            animatedDotStyle,
          ]}
        />
      ) : null}
      <Text
        variant="eyebrow"
        weight={700}
        size={11}
        color={palette.fg}
        style={styles.text}
      >
        {resolvedLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: R.chip,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
});
