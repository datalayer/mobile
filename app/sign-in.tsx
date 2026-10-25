/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useSession } from '../src/auth/SessionProvider';
import type { SignInProvider } from '../src/auth/oauth';
import { PROVIDER_BUTTONS, signInOutcomeOf } from '../src/auth/signInWords';
import { Button, Screen, Text } from '../src/components/primitives';
import { PasswordToggle } from '../src/components/PasswordToggle';
import { Wordmark } from '../src/identity/Wordmark';
import { environment } from '../src/config/environment';
import { SPACE, useNativeTheme } from '../src/theme/tokens';

type Way = 'password' | 'token';

/**
 * Signing in happens here, in the app (the user, 24 October 2026): a handle or
 * email and password, or GitHub, Google or LinkedIn in a browser tab that opens
 * at the provider and comes back. A pasted API token only in development, e2e
 * and preview builds.
 */
export default function SignIn() {
  const session = useSession();
  const { colors, radius } = useNativeTheme();
  const [way, setWay] = useState<Way>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfaCode, setNeedsMfaCode] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState<Way | SignInProvider | undefined>();
  const [problem, setProblem] = useState('');

  const { allowsTokenSignIn } = environment();

  const run = async (which: Way | SignInProvider, attempt: () => Promise<unknown>) => {
    setBusy(which);
    setProblem('');
    try {
      await attempt();
    } catch (error) {
      const outcome = signInOutcomeOf(error);
      if (which === 'password') {
        setNeedsMfaCode(needsMfaCode || outcome.needsMfaCode);
      }
      setProblem(outcome.problem);
    } finally {
      setBusy(undefined);
    }
  };

  const submit = () =>
    way === 'password'
      ? run('password', () => session.signInWithPassword({ identifier, password, mfaCode: needsMfaCode ? mfaCode : undefined }))
      : run('token', () => session.signInWithToken(token));

  const input = [
    styles.input,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.inset, borderRadius: Math.min(radius.control, 24) }
  ];

  return (
    <Screen headerless>
      <Wordmark />
      <Text accessibilityRole="header" size="title" weight="semibold" style={styles.title}>
        Sign in to Datalayer
      </Text>
      {allowsTokenSignIn ? <Text tone="muted">Development build · {environment().runUrl}</Text> : null}
      {way === 'password' ? (
        <View style={styles.fields}>
          <TextInput
            accessibilityLabel="Handle or email"
            placeholder="Handle or email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="username"
            importantForAutofill="yes"
            value={identifier}
            onChangeText={setIdentifier}
            style={input}
          />
          <View>
            <TextInput
              accessibilityLabel="Password"
              placeholder="Password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!passwordVisible}
              textContentType="password"
              autoComplete="current-password"
              importantForAutofill="yes"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={needsMfaCode ? undefined : submit}
              style={[input, styles.withToggle]}
            />
            <PasswordToggle
              visible={passwordVisible}
              onToggle={() => setPasswordVisible(visible => !visible)}
              color={colors.muted}
            />
          </View>
          {needsMfaCode ? (
            <>
              <Text tone="muted">Enter the code from your authenticator app.</Text>
              <TextInput
                accessibilityLabel="Authentication code"
                placeholder="Authentication code"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                value={mfaCode}
                onChangeText={setMfaCode}
                onSubmitEditing={submit}
                style={input}
              />
            </>
          ) : null}
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
        busy={busy === way}
        disabled={
          busy !== undefined || (way === 'password' ? !identifier.trim() || !password || (needsMfaCode && !mfaCode.trim()) : !token)
        }
        onPress={submit}
      />
      {allowsTokenSignIn ? (
        <Button
          tone="plain"
          label={way === 'password' ? 'Use an API token instead' : 'Use a handle and password instead'}
          disabled={busy !== undefined}
          onPress={() => {
            setProblem('');
            setWay(way === 'password' ? 'token' : 'password');
          }}
        />
      ) : null}
      {way === 'password' ? (
        <View style={styles.providers}>
          <Text tone="muted" style={styles.or}>
            or
          </Text>
          {PROVIDER_BUTTONS.map(({ provider, label }) => (
            <Button
              key={provider}
              tone="secondary"
              label={label}
              busy={busy === provider}
              disabled={busy !== undefined}
              onPress={() => run(provider, () => session.signInWithProvider(provider))}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: SPACE.xl },
  fields: { gap: SPACE.sm },
  providers: { gap: SPACE.sm },
  or: { textAlign: 'center' },
  input: { minHeight: 48, borderWidth: 1, paddingHorizontal: SPACE.md, fontSize: 17 },
  // Room for the eye at the field's end.
  withToggle: { paddingRight: 48 }
});
