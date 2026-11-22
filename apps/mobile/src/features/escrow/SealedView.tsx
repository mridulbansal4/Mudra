import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { Text } from '@/ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 132;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export interface SealedViewProps {
  sealedHash: string;
}

export function SealedView({ sealedHash }: SealedViewProps) {
  const { t } = useTranslation();
  const sealProgress = useSharedValue(0);

  useEffect(() => {
    sealProgress.value = withTiming(1, { duration: 600 });
  }, [sealProgress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - sealProgress.value),
  }));

  return (
    <View style={styles.sealedWrap}>
      <View style={styles.ringBox}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={C.card3}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={C.paccha}
            strokeWidth={RING_STROKE}
            strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
            animatedProps={animatedCircleProps}
            fill="none"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringIcon}>
          <ShieldCheck size={42} color={C.paccha} strokeWidth={1.75} />
        </View>
      </View>

      <Text variant="display" size={40} color={C.fg} lowercase>
        {t('escrow.sealed', 'sealed.')}
      </Text>
      <Text variant="mono" size={12} color={C.paccha}>
        {sealedHash.slice(0, 20)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sealedWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 12,
  },
  ringBox: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
