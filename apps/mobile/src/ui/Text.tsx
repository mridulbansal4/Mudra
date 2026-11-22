import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from 'react-native';
import { C, F } from '@/theme/tokens';
import { useSessionStore } from '@/state/session';

export type TextVariant =
  | 'display'
  | 'displayItalic'
  | 'body'
  | 'secondary'
  | 'mono'
  | 'eyebrow';

export type FontWeightValue = 400 | 500 | 600 | 700 | '400' | '500' | '600' | '700';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: FontWeightValue;
  tabular?: boolean;
  color?: string;
  size?: number;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  uppercase?: boolean;
  lowercase?: boolean;
  style?: StyleProp<TextStyle>;
}

const INDIC_LOCALES = new Set(['hi', 'ta', 'mr']);

function resolveFontFamily(
  variant: TextVariant,
  weight: FontWeightValue | undefined,
  locale: string
): string {
  const isIndic = INDIC_LOCALES.has(locale);

  if (variant === 'mono') {
    return F.mono;
  }

  if (variant === 'display') {
    return isIndic ? F.uiSemi : F.display;
  }

  if (variant === 'displayItalic') {
    return isIndic ? F.uiSemi : F.displayItalic;
  }

  if (variant === 'eyebrow') {
    return F.uiBold;
  }

  const w = Number(weight ?? (variant === 'secondary' ? 400 : 400));
  if (w >= 700) return F.uiBold;
  if (w >= 600) return F.uiSemi;
  if (w >= 500) return F.uiMed;
  return F.ui;
}

export function Text({
  variant = 'body',
  weight,
  tabular = false,
  color,
  size,
  lineHeight,
  align,
  uppercase = false,
  lowercase = false,
  style,
  maxFontSizeMultiplier = 1.3,
  children,
  ...rest
}: TextProps) {
  const locale = useSessionStore((s) => s.locale) ?? 'en';
  const fontFamily = resolveFontFamily(variant, weight, locale);

  const variantPreset = VARIANT_STYLES[variant];
  const resolvedSize = size ?? variantPreset.fontSize;
  const resolvedLineHeight =
    lineHeight ??
    (size
      ? Math.round(size * (variant === 'display' || variant === 'displayItalic' ? 1.12 : 1.4))
      : variantPreset.lineHeight);

  const computedStyle: TextStyle = {
    fontFamily,
    fontSize: resolvedSize,
    lineHeight: resolvedLineHeight,
    color: color ?? variantPreset.color,
    ...(align ? { textAlign: align } : null),
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
    ...(variant === 'eyebrow' || uppercase
      ? { textTransform: 'uppercase', letterSpacing: 1.1 }
      : null),
    ...(lowercase ? { textTransform: 'lowercase' } : null),
  };

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[computedStyle, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const VARIANT_STYLES: Record<
  TextVariant,
  { fontSize: number; lineHeight: number; color: string }
> = StyleSheet.create({
  display: {
    fontSize: 32,
    lineHeight: 36,
    color: C.fg,
  },
  displayItalic: {
    fontSize: 32,
    lineHeight: 36,
    color: C.fg,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: C.fg,
  },
  secondary: {
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
  },
  mono: {
    fontSize: 12,
    lineHeight: 16,
    color: C.fg2,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    color: C.muted,
  },
});
