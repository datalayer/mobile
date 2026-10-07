/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Routes() {
  const session = useSession();
  const restoring = session.status === 'restoring';

  useEffect(() => {
    if (!restoring) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [restoring]);

  if (restoring) {
    return null;
  }
  const signedIn = session.status === 'signed-in';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // No persistence: conversation bodies and approval arguments stay in memory (MOBILE.md §2.9).
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 }, mutations: { retry: false } } })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="auto" />
        <Routes />
      </SessionProvider>
    </QueryClientProvider>
  );
}
