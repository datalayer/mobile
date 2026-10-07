/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '../../../src/auth/SessionProvider';
import { Picker } from '../../../src/components/native';
import { Button, Screen, Text } from '../../../src/components/primitives';
import { Row as LinkRow, SectionTitle } from '../../../src/components/states';
import { environment } from '../../../src/config/environment';
import { pushSupported, unregisterPush } from '../../../src/push/push';
import { type ColorMode, useTheme } from '../../../src/theme/ThemeProvider';
import { portableThemeOf, themeVariants } from '../../../src/theme/primer';
import { SPACE } from '../../../src/theme/tokens';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text tone="muted" size="small" style={styles.label}>
        {label}
      </Text>
      <Text selectable size="heading">
        {value}
      </Text>
    </View>
  );
}

const THEME_OPTIONS = themeVariants.map(variant => ({ value: variant, label: portableThemeOf(variant).label }));
const MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

/** The account and the build, for support; never a token (M-011). */
export default function Settings() {
  const session = useSession();
  const router = useRouter();
  const { preference, setPreference } = useTheme();
  const [busy, setBusy] = useState(false);
  const env = environment();
  const person = session.status === 'signed-in' ? session.person : undefined;

  const signOut = async () => {
    setBusy(true);
    try {
      // Best effort: the server also drops a token Expo says is gone.
      await unregisterPush().catch(() => undefined);
      await session.signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {pushSupported ? (
        <LinkRow
          title="Notifications"
          detail="What this phone tells you while the app is closed"
          onPress={() => router.push('/settings/notifications')}
        />
      ) : null}
      <SectionTitle>Appearance</SectionTitle>
      <View style={styles.row} accessible accessibilityLabel="Theme">
        <Text tone="muted" size="small" style={styles.label}>
          Theme
        </Text>
        <Picker selectedValue={preference.variant} onValueChange={variant => setPreference({ variant })} options={THEME_OPTIONS} />
      </View>
      <View style={styles.row} accessible accessibilityLabel="Colour mode">
        <Text tone="muted" size="small" style={styles.label}>
          Colour mode
        </Text>
        <Picker selectedValue={preference.colorMode} onValueChange={colorMode => setPreference({ colorMode })} options={MODE_OPTIONS} />
      </View>
      <SectionTitle>Account and build</SectionTitle>
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
  label: { textTransform: 'uppercase', letterSpacing: 0.5 }
});
