import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
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
  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Defs>
          <LinearGradient id="bg" x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#26262b" />
            <Stop offset="48%" stopColor="#141417" />
            <Stop offset="100%" stopColor="#08080a" />
          </LinearGradient>
          <LinearGradient id="rim" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.42} />
            <Stop offset="45%" stopColor="#ffffff" stopOpacity={0.11} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.03} />
          </LinearGradient>
          <LinearGradient id="arch" x1="18" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="55%" stopColor="#e4e4e8" />
            <Stop offset="100%" stopColor="#a4a4ae" />
          </LinearGradient>
          <LinearGradient id="key" x1="32" y1="32" x2="32" y2="45" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#f0ff70" />
            <Stop offset="55%" stopColor={accentColor} />
            <Stop offset="100%" stopColor="#b8d916" />
          </LinearGradient>
          <RadialGradient id="glow" cx="32" cy="38.5" r="13" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={0.24} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
          </RadialGradient>
          <ClipPath id="clip">
            <Path d="M32 4C51.5 4 60 12.5 60 32C60 51.5 51.5 60 32 60C12.5 60 4 51.5 4 32C4 12.5 12.5 4 32 4Z" />
          </ClipPath>
        </Defs>
        <Path
          d="M32 4C51.5 4 60 12.5 60 32C60 51.5 51.5 60 32 60C12.5 60 4 51.5 4 32C4 12.5 12.5 4 32 4Z"
          fill="url(#bg)"
        />
        <G clipPath="url(#clip)">
          <Circle cx="32" cy="38.5" r="13" fill="url(#glow)" />
        </G>
        <Path
          d="M32 7.5C49 7.5 56.5 15 56.5 32C56.5 49 49 56.5 32 56.5C15 56.5 7.5 49 7.5 32C7.5 15 15 7.5 32 7.5Z"
          stroke="#ffffff"
          strokeOpacity={0.055}
          strokeWidth={0.75}
        />
        <Path
          d="M32 4.5C51.1 4.5 59.5 12.9 59.5 32C59.5 51.1 51.1 59.5 32 59.5C12.9 59.5 4.5 51.1 4.5 32C4.5 12.9 12.9 4.5 32 4.5Z"
          stroke="url(#rim)"
          strokeWidth={1.05}
        />
        <Path
          d="M17.5 44.5V24.8C17.5 19.6 22.6 17.8 26.3 21.5L32 27.2L37.7 21.5C41.4 17.8 46.5 19.6 46.5 24.8V44.5"
          stroke="url(#arch)"
          strokeWidth={3.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M32 32.3L37.2 38.4L32 44.5L26.8 38.4Z"
          fill="url(#key)"
        />
        <Path
          d="M32 32.8L35.4 36.8L32 35.8L28.6 36.8Z"
          fill="#ffffff"
          fillOpacity={0.45}
        />
      </Svg>
    </View>
  );
}
