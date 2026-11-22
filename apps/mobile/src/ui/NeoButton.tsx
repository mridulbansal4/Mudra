import React from 'react';
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
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { C, R } from '@/theme/tokens';
import { TIMING_PRESS_IN, TIMING_PRESS_OUT } from '@/theme/motion';
import { Text } from './Text';

export type NeoButtonVariant = 'purple' | 'paccha' | 'white' | 'ghost' | 'danger';
export type NeoButtonSize = 'md' | 'lg';

export interface NeoButtonProps {
  variant?: NeoButtonVariant;
  size?: NeoButtonSize;
  label?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

interface VariantPalette {
  bg: string;
  text: string;
  edge: string;
  shadow: string | null;
  border: string;
}

const PALETTES: Record<NeoButtonVariant, VariantPalette> = {
  purple: {
    bg: C.purple,
    text: C.fg,
    edge: C.purpleEdge,
    shadow: C.purpleShadow,
    border: C.purpleEdge,
  },
  paccha: {
    bg: C.paccha,
    text: C.bg,
    edge: C.pacchaEdge,
    shadow: C.pacchaShadow,
    border: C.pacchaEdge,
  },
  white: {
    bg: C.fg,
    text: C.bg,
    edge: '#bdbdbd',
    shadow: '#8a8a8a',
    border: '#bdbdbd',
  },
  ghost: {
    bg: 'transparent',
    text: C.fg,
    edge: C.border,
    shadow: null,
    border: C.border,
  },
  danger: {
    bg: C.danger,
    text: C.fg,
    edge: '#b32d2d',
    shadow: '#6e1919',
    border: '#b32d2d',
  },
};

const OFFSET = 5;

export function NeoButton({
  variant = 'purple',
  size = 'md',
  label,
  children,
  onPress,
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
  accessibilityLabel,
  testID,
}: NeoButtonProps) {
  const palette = PALETTES[variant];
  const height = size === 'lg' ? 60 : 48;
  const padX = size === 'lg' ? 28 : 20;
  const isInteractive = !disabled && !loading;
  const hasShadow = Boolean(palette.shadow) && !disabled;

  const progress = useSharedValue(0);

  const animatedFaceStyle = useAnimatedStyle(() => {
    const shift = hasShadow ? progress.value * OFFSET : 0;
    return {
      transform: [{ translateX: shift }, { translateY: shift }],
    };
  });

  const handlePressIn = () => {
    if (!isInteractive) return;
    progress.value = withTiming(1, TIMING_PRESS_IN);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    progress.value = withTiming(0, TIMING_PRESS_OUT);
  };

  const resolvedLabel =
    label ?? (typeof children === 'string' ? children : undefined);

  return (
    <View
      style={[
        styles.wrapper,
        fullWidth && styles.fullWidth,
        hasShadow && { paddingRight: OFFSET, paddingBottom: OFFSET },
        disabled && styles.disabledWrapper,
        style,
      ]}
    >
      {hasShadow && palette.shadow ? (
        <View
          pointerEvents="none"
          style={[
            styles.shadowBlock,
            {
              height,
              backgroundColor: palette.shadow,
              top: OFFSET,
              left: OFFSET,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      ) : null}

      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? resolvedLabel}
        accessibilityState={{ disabled: !isInteractive, busy: loading }}
        disabled={!isInteractive}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.face,
            {
              height,
              paddingHorizontal: padX,
              backgroundColor: palette.bg,
              borderColor: palette.border,
            },
            animatedFaceStyle,
          ]}
        >
          {variant !== 'ghost' ? (
            <>
              <View
                pointerEvents="none"
                style={[styles.rightBevel, { backgroundColor: palette.edge }]}
              />
              <View
                pointerEvents="none"
                style={[styles.bottomBevel, { backgroundColor: palette.edge }]}
              />
            </>
          ) : null}

          {loading ? (
            <ActivityIndicator size="small" color={palette.text} />
          ) : (
            <View style={styles.contentRow}>
              {resolvedLabel !== undefined ? (
                <Text
                  weight={600}
                  size={16}
                  color={palette.text}
                  style={styles.label}
                  numberOfLines={1}
                >
                  {resolvedLabel}
                </Text>
              ) : (
                children
              )}
              {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  disabledWrapper: {
    opacity: 0.4,
  },
  shadowBlock: {
    position: 'absolute',
    borderRadius: R.action,
  },
  face: {
    borderRadius: R.action,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  rightBevel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
  },
  bottomBevel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    textTransform: 'lowercase',
    letterSpacing: 0.2,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
