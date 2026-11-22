import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { C, R } from '@/theme/tokens';
import { Eyebrow } from './Eyebrow';

export interface ListGroupProps {
  children: React.ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
}

export function ListGroup({ children, title, style }: ListGroupProps) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={style}>
      {title ? <Eyebrow label={title} style={styles.eyebrow} /> : null}
      <View style={styles.group}>
        {items.map((child, idx) => (
          <React.Fragment key={idx}>
            {child}
            {idx < items.length - 1 ? <View style={styles.divider} /> : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: C.card,
    borderRadius: R.row,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: C.hairline,
    marginLeft: 56,
  },
});
