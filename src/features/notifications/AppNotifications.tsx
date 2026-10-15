/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What one application sends this phone (MOBILE M-043): as every other, or
 * told otherwise — by category, nothing at all included. Kept on the server's
 * installation with the rest of the preference, which decides what is pushed;
 * the inbox and the application's page always say everything.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Switch } from '../../components/native';
import { Text } from '../../components/primitives';
import { SectionTitle } from '../../components/states';
import { pushSupported, readPushPreference, registerPush, writePushPreference } from '../../push/push';
import { categoriesOfApp, PUSH_CATEGORIES, withAppCategories, type PushCategory, type PushPreference } from '../../push/routes';
import { isConnected } from '../../realtime/channel';
import { SPACE } from '../../theme/tokens';

export function AppNotifications({ appUid, name }: { appUid: string; name: string }) {
  const [preference, setPreference] = useState<PushPreference | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let current = true;
    void readPushPreference().then(kept => current && setPreference(kept));
    return () => {
      current = false;
    };
  }, []);

  if (!pushSupported || !preference) {
    return null;
  }
  if (!preference.enabled) {
    return (
      <>
        <SectionTitle>Notifications</SectionTitle>
        <Text tone="muted" size="small">Notifications are off on this phone: turn them on in Settings.</Text>
      </>
    );
  }

  const own = preference.appCategories[appUid] !== undefined;
  const chosen = categoriesOfApp(preference, appUid);
  const apply = async (next: PushPreference) => {
    setBusy(true);
    setProblem('');
    try {
      if (!isConnected()) {
        throw new Error('Not connected to Datalayer right now. Try again in a moment.');
      }
      await registerPush(next);
      await writePushPreference(next);
      setPreference(next);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (category: PushCategory, on: boolean) =>
    void apply(withAppCategories(preference, appUid, on ? [...chosen, category] : chosen.filter(item => item !== category)));

  return (
    <View style={{ gap: SPACE.sm }}>
      <SectionTitle>Notifications</SectionTitle>
      <Switch
        label={`${name || 'This application'} as every other`}
        value={!own}
        disabled={busy}
        onValueChange={same => void apply(withAppCategories(preference, appUid, same ? null : chosen))}
      />
      {own
        ? PUSH_CATEGORIES.map(category => (
            <Switch
              key={category.value}
              label={category.label}
              value={chosen.includes(category.value)}
              disabled={busy}
              onValueChange={on => toggle(category.value, on)}
            />
          ))
        : null}
      <Text tone="muted" size="small">
        {own && chosen.length === 0
          ? 'Nothing of it reaches this phone. Its approvals and news stay in your inbox.'
          : 'Only what reaches this phone changes: its approvals and news stay in your inbox.'}
      </Text>
      {problem ? (
        <Text tone="danger" accessibilityRole="alert">
          {problem}
        </Text>
      ) : null}
    </View>
  );
}
