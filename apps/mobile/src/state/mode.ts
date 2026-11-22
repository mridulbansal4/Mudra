import { C } from '@/theme/tokens';
import type { RoleMode } from '@/types';
import { useSessionStore } from './session';

export interface ModeTheme {
  mode: RoleMode;
  accent: string;
  onAccent: string;
  edge: string;
  shadow: string;
  buttonVariant: 'purple' | 'paccha';
}

export function getModeTheme(mode: RoleMode): ModeTheme {
  if (mode === 'sell') {
    return {
      mode: 'sell',
      accent: C.paccha,
      onAccent: '#000000',
      edge: C.pacchaEdge,
      shadow: C.pacchaShadow,
      buttonVariant: 'paccha',
    };
  }
  return {
    mode: 'buy',
    accent: C.purple,
    onAccent: '#ffffff',
    edge: C.purpleEdge,
    shadow: C.purpleShadow,
    buttonVariant: 'purple',
  };
}

/**
 * Convenience hook for reading & switching global buy/sell mode + NeoPOP mode accent colors.
 */
export function useMode() {
  const mode = useSessionStore((s) => s.mode);
  const setMode = useSessionStore((s) => s.setMode);
  const toggleMode = useSessionStore((s) => s.toggleMode);
  const coachmarkDismissed = useSessionStore((s) => s.coachmarkDismissed);
  const dismissCoachmark = useSessionStore((s) => s.dismissCoachmark);

  return {
    ...getModeTheme(mode),
    setMode,
    toggleMode,
    coachmarkDismissed,
    dismissCoachmark,
  };
}

export { useSessionStore };
