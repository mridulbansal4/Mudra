import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { C } from '@/theme/tokens';
import { Text } from './Text';

export interface SystemLineProps {
  text?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function SystemLine({
  text,
  children,
  icon,
  color = C.muted,
  style,
}: SystemLineProps) {
  const content = text ?? (typeof children === 'string' ? children : '');

  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <View style={styles.center}>
        {icon}
        <Text
          variant="secondary"
          size={12}
          color={color}
          align="center"
          style={styles.text}
        >
          {content}
        </Text>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: C.hairline,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '78%',
  },
  text: {
    textTransform: 'lowercase',
  },
});
