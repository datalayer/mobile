/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { isProblem } from '../src/api/problems';
import { useSession } from '../src/auth/SessionProvider';
import { Button, Screen } from '../src/components/primitives';
import { environment } from '../src/config/environment';
import { SPACE, useColors } from '../src/theme/tokens';

type Way = 'password' | 'token';

export default function SignIn() {
  const session = useSession();
  const colors = useColors();
  const [way, setWay] = useState<Way>('password');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const { allowsInterimSignIn } = environment();

  const submit = async () => {
    setBusy(true);
    setProblem('');
    try {
      if (way === 'password') {
        await session.signInWithPassword(handle, password);
      } else {
        await session.signInWithToken(token);
      }
    } catch (error) {
      setProblem(
        isProblem(error) && error.kind === 'unauthenticated'
          ? 'That did not sign you in. Check and try again.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong.'
      );
    } finally {
      setBusy(false);
    }
  };

  const input = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];

  if (!allowsInterimSignIn) {
    return (
      <Screen>
        <Text style={[styles.title, { color: colors.text }]}>Datalayer</Text>
        <Text style={{ color: colors.muted }}>Sign-in with Datalayer arrives with the native sign-in (M-004).</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        Sign in to Datalayer
      </Text>
      <Text style={{ color: colors.muted }}>Development sign-in · {environment().runUrl}</Text>
      {way === 'password' ? (
        <View style={styles.fields}>
          <TextInput
            accessibilityLabel="Handle"
            placeholder="Handle"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            value={handle}
            onChangeText={setHandle}
            style={input}
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            style={input}
          />
        </View>
      ) : (
        <TextInput
          accessibilityLabel="Datalayer API token"
          placeholder="Datalayer API token"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={token}
          onChangeText={setToken}
          onSubmitEditing={submit}
          style={input}
        />
      )}
      {problem ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {problem}
        </Text>
      ) : null}
      <Button
        label="Sign in"
        busy={busy}
        disabled={way === 'password' ? !handle || !password : !token}
        onPress={submit}
      />
      <Button
        tone="secondary"
        label={way === 'password' ? 'Use an API token instead' : 'Use a handle and password instead'}
        onPress={() => setWay(way === 'password' ? 'token' : 'password')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', marginTop: SPACE.xl },
  fields: { gap: SPACE.sm },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: SPACE.md, fontSize: 17 }
});
