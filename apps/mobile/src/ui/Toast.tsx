import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R } from '@/theme/tokens';
import { SPRING_CRITICALLY_DAMPED } from '@/theme/motion';
import { Text } from './Text';

export type ToastTone = 'neutral' | 'success' | 'danger';

interface ToastPayload {
  id: number;
  message: string;
  tone: ToastTone;
}

type ToastListener = (payload: ToastPayload) => void;

const listeners = new Set<ToastListener>();
let nextToastId = 1;

export function showToast(
  message: string,
  tone: ToastTone = 'neutral'
): void {
  const payload: ToastPayload = {
    id: nextToastId++,
    message,
    tone,
  };
  listeners.forEach((fn) => fn(payload));
}

export function useToast() {
  const show = useCallback(
    (message: string, tone: ToastTone = 'neutral') => {
      showToast(message, tone);
    },
    []
  );
  return { showToast: show, show };
}

const TONE_DOT: Record<ToastTone, string> = {
  neutral: C.fg2,
  success: C.paccha,
  danger: C.danger,
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const listener: ToastListener = (payload) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setToast(payload);
      translateY.value = withSpring(0, SPRING_CRITICALLY_DAMPED);
      opacity.value = withTiming(1, { duration: 150 });

      timerRef.current = setTimeout(() => {
        translateY.value = withTiming(-80, { duration: 200 });
        opacity.value = withTiming(0, { duration: 180 });
      }, 2400);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.host, { top: Math.max(insets.top + 8, 16) }]}
    >
      <Animated.View style={[styles.pill, animatedStyle]}>
        <View
          style={[
            styles.dot,
            { backgroundColor: TONE_DOT[toast.tone] },
          ]}
        />
        <Text weight={500} size={14} color={C.fg} numberOfLines={2}>
          {toast.message}
        </Text>
      </Animated.View>
    </View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.border,
    maxWidth: 360,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
