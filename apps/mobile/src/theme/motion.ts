import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

export const SPRING_CRITICALLY_DAMPED: WithSpringConfig = {
  damping: 26,
  stiffness: 300,
  overshootClamping: true,
};

export const TIMING_PRESS_IN: WithTimingConfig = {
  duration: 60,
  easing: Easing.linear,
};

export const TIMING_PRESS_OUT: WithTimingConfig = {
  duration: 120,
  easing: Easing.out(Easing.quad),
};

export const TIMING_FAST: WithTimingConfig = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
};

export const TIMING_CROSSFADE: WithTimingConfig = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
};

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduceMotion(Boolean(enabled));
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
