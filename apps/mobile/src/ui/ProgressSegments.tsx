import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { C } from '@/theme/tokens';

export interface ProgressSegmentsProps {
  stage: number;
  total?: number;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressSegments({
  stage,
  total = 4,
  accent = C.paccha,
  style,
}: ProgressSegmentsProps) {
  const safeTotal = Math.max(1, total);

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: safeTotal }).map((_, idx) => {
        const filled = idx < stage;
        return (
          <View
            key={idx}
            style={[
              styles.segment,
              { backgroundColor: filled ? accent : C.card3 },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
