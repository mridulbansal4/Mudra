import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { C } from '@/theme/tokens';
import { Text } from './Text';

export interface EyebrowProps {
  label?: string;
  children?: React.ReactNode;
  dot?: boolean;
  color?: string;
  dotColor?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Eyebrow({
  label,
  children,
  dot = false,
  color = C.muted,
  dotColor = C.paccha,
  right,
  style,
}: EyebrowProps) {
  const text = label ?? (typeof children === 'string' ? children : '');

  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {dot ? (
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        ) : null}
        <Text
          variant="eyebrow"
          weight={700}
          size={11}
          color={color}
          style={styles.label}
        >
          {text}
        </Text>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  label: {
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
