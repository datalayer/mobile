/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { onOpen } from '../realtime/channel';
import { readPushPreference, registerPush } from './push';
import { openNotification } from './routes';

/** Keeps the installation current: on every reconnect and every token change, when the person turned notifications on. */
export function usePushRegistration(): void {
  useEffect(() => {
    const refresh = () => {
      void (async () => {
        const preference = await readPushPreference();
        if (preference.enabled) {
          await registerPush(preference).catch(() => undefined);
        }
      })();
    };
    const stopOpen = onOpen(refresh);
    const tokens = Notifications.addPushTokenListener(refresh);
    return () => {
      stopOpen();
      tokens.remove();
    };
  }, []);
}

/** A tapped notification opens its item once; the screen reads and authorizes it again. */
export function useNotificationRoutes(): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response) {
      return;
    }
    void Notifications.clearLastNotificationResponseAsync();
    openNotification(response.notification.request.content.data, route => router.push(route as never));
  }, [response, router]);
}

/** The app icon's badge: how many approvals wait, as the server says. */
export function useBadge(count: number | undefined): void {
  useEffect(() => {
    if (count !== undefined) {
      void Notifications.setBadgeCountAsync(count).catch(() => false);
    }
  }, [count]);
  useEffect(() => () => {
    // The protected application layout unmounts on sign-out; no previous
    // account's attention count remains on the phone icon.
    void Notifications.setBadgeCountAsync(0).catch(() => false);
  }, []);
}
