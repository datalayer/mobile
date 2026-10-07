/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch } from '../../../src/components/native';
import { Screen, Text } from '../../../src/components/primitives';
import { SectionTitle } from '../../../src/components/states';
import { pushSupported, readPushPreference, registerPush, unregisterPush, writePushPreference } from '../../../src/push/push';
import { DEFAULT_PUSH_PREFERENCE, PUSH_CATEGORIES, type PushCategory, type PushPreference } from '../../../src/push/routes';
import { isConnected } from '../../../src/realtime/channel';
import { SPACE } from '../../../src/theme/tokens';

/**
 * Notifications on this phone (M-024): explained before the system asks,
 * asked only when turned on, by category, kept on the server's installation.
 * A notification says only that something waits; the app shows it once open.
 */
export default function NotificationSettings() {
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

  if (!pushSupported) {
    return (
      <Screen>
        <Text tone="muted">Notifications reach the iOS and Android apps, not this preview.</Text>
      </Screen>
    );
  }

  const shown = preference ?? DEFAULT_PUSH_PREFERENCE;

  const apply = async (next: PushPreference, ask: boolean) => {
    setBusy(true);
    setProblem('');
    try {
      if (!isConnected()) {
        throw new Error('Not connected to Datalayer right now. Try again in a moment.');
      }
      if (next.enabled) {
        await registerPush(next, { ask });
      } else {
        await unregisterPush();
      }
      await writePushPreference(next);
      setPreference(next);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleCategory = (category: PushCategory, on: boolean) => {
    const categories = on ? [...shown.categories, category] : shown.categories.filter(item => item !== category);
    void apply({ ...shown, categories }, false);
  };

  return (
    <Screen>
      <Text>
        When an agent waits for your approval, or something needs you, this phone can tell you. The notification says only
        that something waits; what it is, you read in the app once it is open.
      </Text>
      <Switch
        label="Notify me on this phone"
        value={shown.enabled}
        disabled={busy || preference === null}
        onValueChange={on => void apply({ ...shown, enabled: on }, on)}
      />
      {problem ? (
        <Text tone="danger" accessibilityRole="alert">
          {problem}
        </Text>
      ) : null}
      {shown.enabled ? (
        <View style={styles.group}>
          <SectionTitle>What to notify</SectionTitle>
          {PUSH_CATEGORIES.map(category => (
            <Switch
              key={category.value}
              label={category.label}
              value={shown.categories.includes(category.value)}
              disabled={busy}
              onValueChange={on => toggleCategory(category.value, on)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: SPACE.sm }
});
