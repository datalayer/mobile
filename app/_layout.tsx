/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import { configureForegroundNotifications } from '../src/push/push';
import { UpdateRequired } from '../src/release/UpdateRequired';
import { useSupport } from '../src/release/useSupport';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
configureForegroundNotifications();

function Routes({ fontsReady }: { fontsReady: boolean }) {
  const session = useSession();
  const { theme } = useTheme();
  // The kill switch (M-056): nothing is shown before this build is known to be supported.
  const { support, retry } = useSupport();
  const restoring = session.status === 'restoring' || !fontsReady || support === null;

  useEffect(() => {
    if (!restoring) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [restoring]);

  if (restoring || support === null) {
    return null;
  }
  if (support.kind !== 'supported') {
    return <UpdateRequired support={support} onRetry={retry} />;
  }
  const signedIn = session.status === 'signed-in';
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerTintColor: theme.colors.accent,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text, fontFamily: theme.fontFamily ? 'Inter_600SemiBold' : undefined },
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // No persistence: conversation bodies and approval arguments stay in memory.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 }, mutations: { retry: false } } })
  );
  // A font that fails to load is not fatal: the system face takes over.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionProvider>
          <Routes fontsReady={fontsLoaded || Boolean(fontError)} />
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
