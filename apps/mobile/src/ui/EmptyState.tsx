import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { C } from '@/theme/tokens';
import { NeoButton, NeoButtonVariant } from './NeoButton';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: NeoButtonVariant;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  actionVariant = 'purple',
  icon,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}

      <Text
        variant="display"
        size={24}
        lineHeight={28}
        color={C.fg}
        style={styles.title}
      >
        {title}
      </Text>

      {body ? (
        <Text
          variant="secondary"
          size={14}
          lineHeight={20}
          color={C.muted}
          style={styles.body}
        >
          {body}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <View style={styles.actionWrap}>
          <NeoButton
            variant={actionVariant}
            size="md"
            label={actionLabel}
            onPress={onAction}
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    textTransform: 'lowercase',
  },
  body: {
    maxWidth: 320,
  },
  actionWrap: {
    marginTop: 12,
  },
});
