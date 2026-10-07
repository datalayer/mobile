/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from '../../../src/components/primitives';
import { MIN_TOUCH, useNativeTheme } from '../../../src/theme/tokens';

function SettingsLink() {
  return (
    <Link href="/settings" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' }}>
        <Text tone="accent" size="heading">
          Settings
        </Text>
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const { colors, fontFamily } = useNativeTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontFamily: fontFamily ? 'Inter_600SemiBold' : undefined },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        headerRight: () => <SettingsLink />
      }}
    >
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
    </Tabs>
  );
}
