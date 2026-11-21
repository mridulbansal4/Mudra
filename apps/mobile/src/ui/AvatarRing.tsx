import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { Text } from './Text';

export interface AvatarRingProps {
  name: string;
  hue?: number;
  size?: number;
  showBadge?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function getInitials(name: string): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return 'M';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function AvatarRing({
  name,
  size = 44,
  showBadge = false,
  onPress,
  onLongPress,
  style,
  testID,
}: AvatarRingProps) {
  const initials = getInitials(name);
  const ringPadding = size >= 56 ? 2.5 : 2;
  const innerSize = size - ringPadding * 2;
  const fontSize = Math.max(11, Math.round(size * 0.3));

  const ring = (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={[C.paccha, C.purple, C.sunshine, C.paccha]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            padding: ringPadding,
          },
        ]}
      >
        <View
          style={[
            styles.innerCircle,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text weight={700} size={fontSize} color={C.fg}>
            {initials}
          </Text>
        </View>
      </LinearGradient>

      {showBadge ? (
        <View style={styles.badge}>
          <ArrowUpRight size={11} strokeWidth={2.25} color={C.bg} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress && !onLongPress) {
    return ring;
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={name || 'avatar'}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {ring}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradientRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    backgroundColor: C.card3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.fg,
    borderWidth: 1.5,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
