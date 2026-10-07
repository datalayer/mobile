/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack } from 'expo-router';
import { useRealtime } from '../../src/realtime/useRealtime';
import { useNativeTheme } from '../../src/theme/tokens';

export default function AppLayout() {
  useRealtime();
  const { colors, fontFamily } = useNativeTheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontFamily: fontFamily ? 'Inter_600SemiBold' : undefined },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="apps/[appUid]/index" options={{ title: 'Application' }} />
      <Stack.Screen name="agents/[runtimeName]/index" options={{ title: 'Agent' }} />
      <Stack.Screen name="approvals/[approvalId]" options={{ title: 'Approval' }} />
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
    </Stack>
  );
}
