import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ChevronsRight, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { C, R } from '@/theme/tokens';
import { SPRING_CRITICALLY_DAMPED } from '@/theme/motion';
import { Text } from './Text';

export interface SlideToLockProps {
  label: string;
  onComplete: () => void;
  accent?: string;
  disabled?: boolean;
  loading?: boolean;
  completedLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TRACK_HEIGHT = 64;
const KNOB_SIZE = 56;
const TRACK_PAD = 4;
const THRESHOLD_RATIO = 0.85;

export function SlideToLock({
  label,
  onComplete,
  accent = C.paccha,
  disabled = false,
  loading = false,
  completedLabel = 'locked',
  style,
  testID,
}: SlideToLockProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [completed, setCompleted] = useState(false);

  const maxSlide = Math.max(0, trackWidth - KNOB_SIZE - TRACK_PAD * 2);
  const maxSlideRef = useRef(0);
  maxSlideRef.current = maxSlide;

  const disabledRef = useRef(false);
  disabledRef.current = disabled || loading || completed;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const translateX = useSharedValue(0);

  const triggerComplete = () => {
    if (disabledRef.current) return;
    disabledRef.current = true;
    setCompleted(true);
    translateX.value = withSpring(maxSlideRef.current, SPRING_CRITICALLY_DAMPED);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    onCompleteRef.current();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !disabledRef.current && Math.abs(g.dx) > 4,
        onPanResponderGrant: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
        onPanResponderMove: (_, g) => {
          if (disabledRef.current) return;
          const max = maxSlideRef.current;
          if (max <= 0) return;
          const next = Math.max(0, Math.min(max, g.dx));
          translateX.value = next;
        },
        onPanResponderRelease: (_, g) => {
          if (disabledRef.current) return;
          const max = maxSlideRef.current;
          if (max > 0 && g.dx >= max * THRESHOLD_RATIO) {
            triggerComplete();
          } else {
            translateX.value = withSpring(0, SPRING_CRITICALLY_DAMPED);
          }
        },
        onPanResponderTerminate: () => {
          if (!disabledRef.current) {
            translateX.value = withSpring(0, SPRING_CRITICALLY_DAMPED);
          }
        },
      }),
    [translateX]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setTrackWidth(w);
      if (completed) {
        translateX.value = Math.max(0, w - KNOB_SIZE - TRACK_PAD * 2);
      }
    }
  };

  const knobAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: translateX.value + KNOB_SIZE + TRACK_PAD,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const max = Math.max(1, maxSlide);
    const opacity = interpolate(
      translateX.value,
      [0, max * 0.65],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const knobTextColor = accent === C.paccha ? C.bg : C.fg;

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="slide right or long press to confirm"
      accessibilityState={{ disabled: disabled || loading }}
      onAccessibilityAction={() => triggerComplete()}
      style={[
        styles.track,
        disabled && styles.disabled,
        style,
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fillTrack,
          { backgroundColor: accent },
          fillAnimatedStyle,
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.labelWrap, labelAnimatedStyle]}
      >
        <Text
          weight={600}
          size={15}
          color={C.muted}
          style={styles.labelText}
          numberOfLines={1}
        >
          {completed ? completedLabel : label}
        </Text>
      </Animated.View>

      <Pressable
        disabled={disabled || loading || completed}
        onLongPress={() => {
          translateX.value = withTiming(maxSlide, { duration: 180 });
          triggerComplete();
        }}
        delayLongPress={350}
        style={styles.knobPressable}
      >
        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: accent },
            knobAnimatedStyle,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={knobTextColor} />
          ) : completed ? (
            <Check size={24} strokeWidth={2.25} color={knobTextColor} />
          ) : (
            <ChevronsRight size={24} strokeWidth={2.25} color={knobTextColor} />
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: C.card2,
    borderRadius: R.action,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: TRACK_PAD,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
  fillTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.18,
  },
  labelWrap: {
    position: 'absolute',
    left: KNOB_SIZE + 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    textTransform: 'lowercase',
    letterSpacing: 0.3,
  },
  knobPressable: {
    alignSelf: 'flex-start',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE - TRACK_PAD * 0.5,
    borderRadius: R.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
