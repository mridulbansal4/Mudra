import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { C } from '@/theme/tokens';
import { useSessionStore } from '@/state/session';

export default function IndexRedirectScreen() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const token = useSessionStore((s) => s.token);
  const isGuest = useSessionStore((s) => s.isGuest);

  if (!hydrated) {
    return <View style={styles.blank} />;
  }

  if (token || isGuest) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
