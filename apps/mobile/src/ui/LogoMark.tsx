import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from '@/theme/tokens';

export interface LogoMarkProps {
  size?: number;
  color?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function LogoMark({
  size = 28,
  color = C.fg,
  accentColor = C.paccha,
  style,
}: LogoMarkProps) {
  const height = Math.round((size * 70) / 64);

  return (
    <View style={style}>
      <Svg width={size} height={height} viewBox="0 0 64 70" fill="none">
        <Path
          d="M6 6h52v34c0 13-11 22-26 28C17 62 6 53 6 40V6z"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="miter"
        />
        <Path
          d="M6 6l6 6h40l6-6"
          stroke={color}
          strokeWidth={1.75}
          strokeLinejoin="miter"
          opacity={0.55}
        />
        <Path
          d="M19 50V22l13 16"
          stroke={accentColor}
          strokeWidth={3.5}
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        <Path
          d="M45 50V22L32 38"
          stroke={accentColor}
          strokeWidth={3.5}
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
      </Svg>
    </View>
  );
}
