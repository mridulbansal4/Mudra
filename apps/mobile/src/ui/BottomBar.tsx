import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Handshake, Plus, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { C, R } from '@/theme/tokens';
import { useSessionStore } from '@/state/session';
import { AvatarRing } from './AvatarRing';
import { Text } from './Text';

export interface BottomBarProps {
  activeTab?: 'home' | 'explore' | 'deals';
  badgeCount?: number;
  exploreLabel?: string;
  listLabel?: string;
  dealsLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function BottomBar({
  activeTab,
  badgeCount,
  exploreLabel = 'EXPLORE',
  listLabel = '+ LIST',
  dealsLabel = 'DEALS',
  style,
}: BottomBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useSessionStore((s) => s.me);
  const mode = useSessionStore((s) => s.mode) ?? 'buy';

  const isSellMode = mode === 'sell';
  const firstName = ((me?.name || 'home').trim().split(/\s+/)[0] || 'home').toUpperCase();

  const resolvedBadge =
    badgeCount ??
    (me?.counts
      ? (me.counts.unread || 0) + (me.counts.needs_you || 0)
      : (me?.unread || 0) + (me?.needs_you || 0));

  const handleLeftPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isSellMode) {
      router.push('/listing/new' as never);
    } else {
      router.navigate('/(tabs)/explore' as never);
    }
  };

  const handleCenterPress = () => {
    Haptics.selectionAsync().catch(() => {});
    router.navigate('/(tabs)/home' as never);
  };

  const handleCenterLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/profile' as never);
  };

  const handleRightPress = () => {
    Haptics.selectionAsync().catch(() => {});
    router.navigate('/(tabs)/deals' as never);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 10) },
        style,
      ]}
    >
      {/* Left 56px ring: Explore (buy) or + List (sell) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isSellMode ? 'list an item' : 'explore'}
        onPress={handleLeftPress}
        style={styles.itemCol}
      >
        <View
          style={[
            styles.sideCircle,
            isSellMode ? styles.sellCircle : styles.ringCircle,
            activeTab === 'explore' && !isSellMode ? styles.activeRing : null,
          ]}
        >
          {isSellMode ? (
            <Plus size={24} strokeWidth={2.25} color={C.bg} />
          ) : (
            <Search size={20} strokeWidth={1.75} color={C.fg} />
          )}
        </View>
        <Text
          variant="eyebrow"
          size={10}
          color={isSellMode ? C.paccha : activeTab === 'explore' ? C.fg : C.fg2}
          style={styles.bottomLabel}
        >
          {isSellMode ? listLabel : exploreLabel}
        </Text>
      </Pressable>

      {/* Center 68px AvatarRing */}
      <View style={styles.centerCol}>
        <AvatarRing
          name={me?.name || 'Mudra'}
          hue={me?.avatar_hue}
          size={68}
          showBadge
          onPress={handleCenterPress}
          onLongPress={handleCenterLongPress}
        />
        <Text
          variant="eyebrow"
          size={10}
          color={activeTab === 'home' ? C.fg : C.fg2}
          numberOfLines={1}
          style={styles.bottomLabel}
        >
          {firstName}
        </Text>
      </View>

      {/* Right 56px ring: Deals */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="deals"
        onPress={handleRightPress}
        style={styles.itemCol}
      >
        <View
          style={[
            styles.sideCircle,
            styles.ringCircle,
            activeTab === 'deals' ? styles.activeRing : null,
          ]}
        >
          <Handshake size={20} strokeWidth={1.75} color={C.fg} />
          {resolvedBadge > 0 ? (
            <View style={styles.badge}>
              <Text weight={700} size={10} color={C.fg} tabular>
                {resolvedBadge > 99 ? '99+' : String(resolvedBadge)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          variant="eyebrow"
          size={10}
          color={activeTab === 'deals' ? C.fg : C.fg2}
          style={styles.bottomLabel}
        >
          {dealsLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingTop: 10,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  itemCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 72,
  },
  centerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -10,
    minWidth: 80,
  },
  sideCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringCircle: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  activeRing: {
    borderColor: C.fg,
  },
  sellCircle: {
    backgroundColor: C.paccha,
    borderWidth: 1.5,
    borderColor: C.pacchaEdge,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: R.chip,
    backgroundColor: C.danger,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  bottomLabel: {
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
