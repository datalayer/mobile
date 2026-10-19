/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * This phone's push installation, registered over the ai-agents
 * WebSocket the app already holds, never by a route. Asked for only when the
 * person turns notifications on; re-registered on every reconnect and token
 * change; removed on sign-out.
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import { getLocales } from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { request } from '../realtime/channel';
import { deviceStore } from '../storage/deviceStore';
import { type PushPreference, pushPreferenceOf } from './routes';

const INSTALLATION_KEY = 'datalayer.push.installation';
const PREFERENCE_KEY = 'datalayer.push.preference';
/** The Android channel the server's pushes name (`channelId`), and `app.config.ts`'s default. */
export const ANDROID_CHANNEL = 'needs-attention';

export const pushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export const readPushPreference = async (): Promise<PushPreference> =>
  pushPreferenceOf(await deviceStore.get(PREFERENCE_KEY).catch(() => null));

export const writePushPreference = (preference: PushPreference): Promise<void> =>
  deviceStore.set(PREFERENCE_KEY, JSON.stringify(preference));

async function installationId(): Promise<string> {
  const kept = await deviceStore.get(INSTALLATION_KEY);
  if (kept) {
    return kept;
  }
  const created = randomUUID();
  await deviceStore.set(INSTALLATION_KEY, created);
  return created;
}

/** Shown while the app is open: the inbox updates through the WebSocket, the banner says so. */
export function configureForegroundNotifications(): void {
  if (!pushSupported) {
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true
    })
  });
}

/**
 * The Expo push token, asking for permission only when `ask` is set (the
 * person turned notifications on). Says in a sentence what stands in the way.
 */
async function pushToken(ask: boolean): Promise<string> {
  if (!Device.isDevice) {
    throw new Error('Notifications need a physical phone; a simulator cannot receive them.');
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Needs your attention',
      importance: Notifications.AndroidImportance.HIGH
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && ask && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    throw new Error('Notifications are turned off for this app in the phone settings.');
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('This build has no EAS project id, which notifications need (README, Accounts).');
  }
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Registers this phone with the person's categories; `ask` may show the system prompt. */
export async function registerPush(preference: PushPreference, { ask = false } = {}): Promise<void> {
  if (!pushSupported) {
    return;
  }
  const answer = await request('push_installation_register', {
    installationId: await installationId(),
    token: await pushToken(ask),
    platform: Platform.OS,
    provider: 'expo',
    appVersion: Application.nativeApplicationVersion ?? '',
    locale: getLocales()[0]?.languageTag ?? '',
    categories: preference.categories,
    // Kept on the server's installation, which holds what can wait.
    quietHours: preference.quietHours,
    approvalsInQuiet: preference.approvalsInQuiet,
    appCategories: preference.appCategories
  });
  if (answer.error) {
    throw new Error(answer.error);
  }
}

/** Forgets this phone on the server: on sign-out, and when notifications are turned off. */
export async function unregisterPush(): Promise<void> {
  if (!pushSupported) {
    return;
  }
  const kept = await deviceStore.get(INSTALLATION_KEY);
  if (kept) {
    await request('push_installation_remove', { installationId: kept });
  }
}
