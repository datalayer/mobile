/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Link, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { MIN_TOUCH, useColors } from '../../../src/theme/tokens';

function SettingsLink() {
  const colors = useColors();
  return (
    <Link href="/settings" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.accent, fontSize: 17 }}>Settings</Text>
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        headerRight: () => <SettingsLink />
      }}
    >
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
    </Tabs>
  );
}
