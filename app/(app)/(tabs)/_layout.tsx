/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from '../../../src/components/primitives';
import { TabIcon } from '../../../src/components/TabIcon';
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
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarButtonTestID: 'tab-inbox', tabBarIcon: ({ color, size }) => <TabIcon name="inbox" color={color} size={size} /> }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents', tabBarButtonTestID: 'tab-agents', tabBarIcon: ({ color, size }) => <TabIcon name="agents" color={color} size={size} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarButtonTestID: 'tab-activity', tabBarIcon: ({ color, size }) => <TabIcon name="activity" color={color} size={size} /> }} />
    </Tabs>
  );
}
