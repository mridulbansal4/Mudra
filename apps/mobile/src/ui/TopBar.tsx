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
import { ChevronLeft } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { RoleMode } from '@/types';
import { useSessionStore } from '@/state/session';
import { AvatarRing } from './AvatarRing';
import { LogoMark } from './LogoMark';
import { ProgressSegments } from './ProgressSegments';
import { SegmentedControl } from './SegmentedControl';
import { Text } from './Text';

export interface TopBarProps {
  variant?: 'home' | 'standard';
  modeSwitch?: boolean;
  title?: string;
  subtitle?: string | null;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  rightAction?: React.ReactNode;
  progressStage?: 1 | 2 | 3 | 4;
  buyLabel?: string;
  sellLabel?: string;
  includeSafeArea?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TopBar({
  variant,
  modeSwitch,
  title,
  subtitle,
  showBack = true,
  onBack,
  right,
  rightAction,
  progressStage,
  buyLabel = 'buy',
  sellLabel = 'sell',
  includeSafeArea = true,
  style,
}: TopBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useSessionStore((s) => s.me);
  const mode = useSessionStore((s) => s.mode) ?? 'buy';
  const setMode = useSessionStore((s) => s.setMode);

  const isHomeVariant =
    variant === 'home' ||
    Boolean(modeSwitch) ||
    (title === undefined && progressStage === undefined);

  const topPad = includeSafeArea ? insets.top : 0;
  const resolvedRight = right ?? rightAction;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home' as never);
    }
  };

  if (isHomeVariant) {
    return (
      <View style={[styles.wrapper, { paddingTop: topPad }, style]}>
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="mudra home"
            hitSlop={10}
            onPress={() => router.navigate('/(tabs)/home' as never)}
            style={styles.logoTouch}
          >
            <LogoMark size={28} />
          </Pressable>

          <View style={styles.modeCenter}>
            <SegmentedControl<RoleMode>
              size="sm"
              value={mode}
              onChange={(nextMode) => setMode?.(nextMode)}
              options={[
                { value: 'buy', label: buyLabel },
                { value: 'sell', label: sellLabel },
              ]}
              style={styles.modePill}
            />
          </View>

          <View style={styles.rightCluster}>
            {resolvedRight}
            <AvatarRing
              name={me?.name || 'Guest'}
              hue={me?.avatar_hue}
              size={34}
              onPress={() => router.push('/profile' as never)}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { paddingTop: topPad }, style]}>
      <View style={styles.bar}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="go back"
            hitSlop={10}
            onPress={handleBack}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} strokeWidth={1.75} color={C.fg} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <View style={styles.titleCenter}>
          {progressStage !== undefined ? (
            <ProgressSegments
              stage={progressStage}
              total={4}
              accent={mode === 'sell' ? C.paccha : C.purple}
            />
          ) : (
            <View>
              {title ? (
                <Text
                  variant="display"
                  size={22}
                  lineHeight={26}
                  color={C.fg}
                  numberOfLines={1}
                  style={styles.titleText}
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text
                  variant="secondary"
                  size={12}
                  color={C.muted}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.rightCluster}>
          {resolvedRight ?? <View style={styles.backSpacer} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  bar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  logoTouch: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  modeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePill: {
    width: 156,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 40,
  },
  titleCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    textTransform: 'lowercase',
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 40,
  },
});
