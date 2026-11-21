import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  value?: string | React.ReactNode;
  left?: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ListRow({
  title,
  subtitle,
  value,
  left,
  icon,
  right,
  showChevron,
  onPress,
  destructive = false,
  disabled = false,
  divider = false,
  style,
  testID,
}: ListRowProps) {
  const hasChevron = showChevron ?? Boolean(onPress && !right);
  const leftContent = left ?? (icon ? <View style={styles.iconCircle}>{icon}</View> : null);

  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={title}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.pressed : null,
        disabled ? styles.disabled : null,
        divider ? styles.bottomDivider : null,
        style,
      ]}
    >
      {leftContent ? <View style={styles.leftSlot}>{leftContent}</View> : null}

      <View style={styles.centerSlot}>
        <Text
          weight={500}
          size={16}
          color={destructive ? C.danger : C.fg}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="secondary" size={13} color={C.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text weight={600} size={15} color={C.fg2} tabular numberOfLines={1}>
            {value}
          </Text>
        ) : (
          value
        )}
        {right}
        {hasChevron ? (
          <ChevronRight size={18} strokeWidth={1.75} color={C.muted} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pressed: {
    backgroundColor: C.card2,
  },
  disabled: {
    opacity: 0.45,
  },
  bottomDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  leftSlot: {
    width: 40,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.hairline,
  },
  centerSlot: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
});
