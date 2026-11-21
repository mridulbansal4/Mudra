import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { C } from '@/theme/tokens';

export interface HudBracketsProps {
  cornerSize?: number;
  strokeWidth?: number;
  color?: string;
  inset?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function HudBrackets({
  cornerSize = 28,
  strokeWidth = 2.5,
  color = C.paccha,
  inset = 20,
  children,
  style,
}: HudBracketsProps) {
  const cornerBase: ViewStyle = {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    borderColor: color,
  };

  return (
    <View pointerEvents="box-none" style={[styles.container, style]}>
      {children}

      {/* Top Left */}
      <View
        pointerEvents="none"
        style={[
          cornerBase,
          {
            top: inset,
            left: inset,
            borderTopWidth: strokeWidth,
            borderLeftWidth: strokeWidth,
          },
        ]}
      />

      {/* Top Right */}
      <View
        pointerEvents="none"
        style={[
          cornerBase,
          {
            top: inset,
            right: inset,
            borderTopWidth: strokeWidth,
            borderRightWidth: strokeWidth,
          },
        ]}
      />

      {/* Bottom Left */}
      <View
        pointerEvents="none"
        style={[
          cornerBase,
          {
            bottom: inset,
            left: inset,
            borderBottomWidth: strokeWidth,
            borderLeftWidth: strokeWidth,
          },
        ]}
      />

      {/* Bottom Right */}
      <View
        pointerEvents="none"
        style={[
          cornerBase,
          {
            bottom: inset,
            right: inset,
            borderBottomWidth: strokeWidth,
            borderRightWidth: strokeWidth,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
