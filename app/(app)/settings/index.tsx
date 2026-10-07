/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../../src/auth/SessionProvider';
import { Button, Screen } from '../../../src/components/primitives';
import { environment } from '../../../src/config/environment';
import { SPACE, useColors } from '../../../src/theme/tokens';

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]} selectable>
        {value}
      </Text>
    </View>
  );
}

/** The account and the build, for support; never a token (M-011). */
export default function Settings() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const env = environment();
  const person = session.status === 'signed-in' ? session.person : undefined;

  const signOut = async () => {
    setBusy(true);
    try {
      await session.signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {person ? <Row label="Signed in as" value={`${person.displayName} (@${person.handle})`} /> : null}
      <Row label="Services" value={env.runUrl} />
      <Row label="Build profile" value={env.profile} />
      <Row label="Variant" value={String(Constants.expoConfig?.extra?.variant ?? 'unknown')} />
      <Row
        label="Version"
        value={`${Application.nativeApplicationVersion ?? '?'} (${Application.nativeBuildVersion ?? '?'})`}
      />
      <Row label="Runtime" value={String(Constants.expoConfig?.runtimeVersion ?? 'unknown')} />
      <Button tone="secondary" label="Sign out" busy={busy} onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACE.xs },
  label: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 17 }
});
