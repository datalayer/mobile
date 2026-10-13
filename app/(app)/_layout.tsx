/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack } from 'expo-router';
import { usePendingApprovals } from '../../src/features/queries';
import { useBadge, useNotificationRoutes, usePushRegistration } from '../../src/push/usePush';
import { useRealtime } from '../../src/realtime/useRealtime';
import { useNativeTheme } from '../../src/theme/tokens';

export default function AppLayout() {
  useRealtime();
  usePushRegistration();
  useNotificationRoutes();
  useBadge(usePendingApprovals().data?.length);
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
      <Stack.Screen name="settings/in-your-name" options={{ title: 'In your name' }} />
      <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
    </Stack>
  );
}
