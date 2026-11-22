import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { C } from '@/theme/tokens';
import { Text } from './Text';

export interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string | null;
  loading?: boolean;
  disabled?: boolean;
  length?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['empty', '0', 'back'],
] as const;

export function PinPad({
  value,
  onChange,
  onComplete,
  error,
  loading = false,
  disabled = false,
  length = 4,
  style,
  testID,
}: PinPadProps) {
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 70 })
      );
    }
  }, [error, shakeX]);

  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const isDisabled = disabled || loading;

  const handleDigit = (digit: string) => {
    if (isDisabled || value.length >= length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = value + digit;
    onChange(next);
    if (next.length === length) {
      onComplete?.(next);
    }
  };

  const handleBackspace = () => {
    if (isDisabled || value.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(value.slice(0, -1));
  };

  return (
    <View testID={testID} style={[styles.container, style]}>
      <Animated.View style={[styles.dotsRow, dotsStyle]}>
        {Array.from({ length }).map((_, idx) => {
          const filled = idx < value.length;
          return (
            <View
              key={idx}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                Boolean(error) && styles.dotError,
              ]}
            />
          );
        })}
      </Animated.View>

      <View style={styles.statusSlot}>
        {loading ? (
          <ActivityIndicator size="small" color={C.paccha} />
        ) : error ? (
          <Text size={13} color={C.danger} align="center">
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        {ROWS.map((row, rIdx) => (
          <View key={rIdx} style={styles.gridRow}>
            {row.map((key) => {
              if (key === 'empty') {
                return <View key={key} style={styles.keySpacer} />;
              }

              if (key === 'back') {
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel="backspace"
                    disabled={isDisabled}
                    onPress={handleBackspace}
                    style={({ pressed }) => [
                      styles.key,
                      styles.backKey,
                      pressed && styles.keyPressed,
                    ]}
                  >
                    <Delete size={24} strokeWidth={1.75} color={C.fg2} />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={key}
                  testID={`pin-key-${key}`}
                  accessibilityRole="button"
                  accessibilityLabel={key}
                  disabled={isDisabled}
                  onPress={() => handleDigit(key)}
                  style={({ pressed }) => [
                    styles.key,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text weight={500} size={28} lineHeight={32} tabular color={C.fg}>
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginVertical: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: C.fg,
    borderColor: C.fg,
  },
  dotError: {
    borderColor: C.danger,
  },
  statusSlot: {
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  grid: {
    gap: 14,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backKey: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyPressed: {
    backgroundColor: C.card3,
  },
  keySpacer: {
    width: 72,
    height: 72,
  },
});
