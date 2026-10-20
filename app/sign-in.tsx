/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { isProblem } from '@datalayer/core/lib/portable';
import { useSession } from '../src/auth/SessionProvider';
import { Button, Screen, Text } from '../src/components/primitives';
import { Wordmark } from '../src/identity/Wordmark';
import { environment } from '../src/config/environment';
import { SPACE, useNativeTheme } from '../src/theme/tokens';

type Way = 'password' | 'token';

export default function SignIn() {
  const session = useSession();
  const { colors, radius } = useNativeTheme();
  const [way, setWay] = useState<Way>('password');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const { allowsInterimSignIn } = environment();

  const withDatalayer = async () => {
    setBusy(true);
    setProblem('');
    try {
      await session.signInWithDatalayer();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

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

  const input = [
    styles.input,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.inset, borderRadius: Math.min(radius.control, 24) }
  ];

  if (!allowsInterimSignIn) {
    return (
      <Screen headerless>
        <Wordmark />
        <Text accessibilityRole="header" size="title" weight="semibold" style={styles.title}>
          Sign in to Datalayer
        </Text>
        <Text tone="muted">Datalayer opens in your browser, and brings you back here.</Text>
        {problem ? (
          <Text accessibilityLiveRegion="polite" tone="danger">
            {problem}
          </Text>
        ) : null}
        <Button label="Sign in with Datalayer" busy={busy} onPress={withDatalayer} />
      </Screen>
    );
  }

  return (
    <Screen headerless>
      <Wordmark />
      <Text accessibilityRole="header" size="title" weight="semibold" style={styles.title}>
        Sign in to Datalayer
      </Text>
      <Text tone="muted">Development sign-in · {environment().runUrl}</Text>
      <Button tone="secondary" label="Sign in with Datalayer" busy={busy} onPress={withDatalayer} />
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
        <Text accessibilityLiveRegion="polite" tone="danger">
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
  title: { marginTop: SPACE.xl },
  fields: { gap: SPACE.sm },
  input: { minHeight: 48, borderWidth: 1, paddingHorizontal: SPACE.md, fontSize: 17 }
});
