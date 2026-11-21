import React from 'react';
import { TextStyle, StyleProp } from 'react-native';
import { C } from '@/theme/tokens';
import { formatMoney } from '@/lib/money';
import { ListingKind } from '@/types';
import { Text, FontWeightValue, TextVariant } from './Text';

export interface PriceProps {
  minor: number;
  currency?: string;
  size?: number;
  color?: string;
  kind?: ListingKind;
  variant?: TextVariant;
  weight?: FontWeightValue;
  style?: StyleProp<TextStyle>;
}

export function Price({
  minor,
  currency = 'INR',
  size = 18,
  color = C.fg,
  kind = 'sell',
  variant = 'body',
  weight = 700,
  style,
}: PriceProps) {
  let display: string;
  if (kind === 'free') {
    display = 'free';
  } else if (kind === 'swap' && minor <= 0) {
    display = 'swap';
  } else {
    display = formatMoney(minor, currency);
  }

  return (
    <Text
      variant={variant}
      weight={weight}
      size={size}
      color={color}
      tabular
      style={style}
    >
      {display}
    </Text>
  );
}
