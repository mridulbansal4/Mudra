import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { C } from '@/theme/tokens';
import { useMe } from '@/features/hooks';
import { BottomBar } from '@/ui';

export default function TabsLayout() {
  useMe();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: C.bg },
        }}
        tabBar={({ state }) => {
          const routeName = state.routes[state.index]?.name;
          const activeTab =
            routeName === 'explore'
              ? 'explore'
              : routeName === 'deals'
              ? 'deals'
              : 'home';
          return <BottomBar activeTab={activeTab} />;
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="deals" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
