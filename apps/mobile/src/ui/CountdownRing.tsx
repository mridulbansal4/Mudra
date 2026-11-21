import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '@/theme/tokens';
import { getServerNow } from '@/lib/time';
import { Text } from './Text';

export interface CountdownRingProps {
  endsAt: string | number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  onExpire?: () => void;
  style?: StyleProp<ViewStyle>;
}

function computeRemainingSeconds(endsAt: string | number): number {
  const targetMs =
    typeof endsAt === 'number' ? endsAt : Date.parse(String(endsAt));
  if (Number.isNaN(targetMs)) return 0;
  const nowMs = getServerNow();
  return Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
}

function formatMmSs(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function CountdownRing({
  endsAt,
  total = 90,
  size = 220,
  strokeWidth = 8,
  onExpire,
  style,
}: CountdownRingProps) {
  const [remaining, setRemaining] = useState<number>(() =>
    computeRemainingSeconds(endsAt)
  );
  const expiredCalledRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredCalledRef.current = false;
    const tick = () => {
      const rem = computeRemainingSeconds(endsAt);
      setRemaining(rem);
      if (rem <= 0 && !expiredCalledRef.current) {
        expiredCalledRef.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(1, total);
  const fraction = Math.min(1, Math.max(0, remaining / safeTotal));
  const strokeDashoffset = circumference * (1 - fraction);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        style,
      ]}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.card3}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={remaining <= 15 ? C.danger : C.sunshine}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text
          variant="display"
          size={56}
          lineHeight={60}
          tabular
          color={C.fg}
        >
          {formatMmSs(remaining)}
        </Text>
        <Text variant="eyebrow" size={10} color={C.muted}>
          {remaining > 0 ? 'REMAINING' : 'RESOLVING'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
