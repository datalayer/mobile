/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import { AccessibilityInfo, Alert, StyleSheet, TextInput, View } from 'react-native';
import { confirms, DELETION_WORDS, type DeletionRequest } from '../../../src/api/accountDeletion';
import { useSession } from '../../../src/auth/SessionProvider';
import { Button } from '../../../src/components/native';
import { Screen, Text } from '../../../src/components/primitives';
import { ProblemView, QueryView } from '../../../src/components/states';
import { useAccountDeletion, useChangeAccountDeletion } from '../../../src/features/queries';
import { SPACE, useNativeTheme } from '../../../src/theme/tokens';

/** Ask IAM to delete the account, or withdraw the request while its grace period runs. */
export default function DeleteAccount() {
  const session = useSession();
  const deletion = useAccountDeletion();
  const change = useChangeAccountDeletion();
  const { colors, radius } = useNativeTheme();
  const [typed, setTyped] = useState('');
  const handle = session.status === 'signed-in' ? session.person.handle : '';

  const ask = () =>
    Alert.alert(DELETION_WORDS.askTitle, DELETION_WORDS.askBody, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: DELETION_WORDS.ask,
        style: 'destructive',
        onPress: () =>
          change.mutate(handle, {
            onSuccess: request => {
              if (request) AccessibilityInfo.announceForAccessibility(DELETION_WORDS.pending(request));
            }
          })
      }
    ]);

  const keep = () =>
    change.mutate(null, {
      onSuccess: () => {
        setTyped('');
        AccessibilityInfo.announceForAccessibility(DELETION_WORDS.cancelled);
      }
    });

  const pending = (request: DeletionRequest) => (
    <View style={styles.block} accessibilityLiveRegion="assertive">
      <Text size="heading" tone="danger">
        {DELETION_WORDS.pending(request)}
      </Text>
      <Text tone="muted">{DELETION_WORDS.askedOn(request)}</Text>
      <Button label={DELETION_WORDS.cancel} busy={change.isPending} onPress={keep} />
    </View>
  );

  const form = (
    <View style={styles.block}>
      <Text>{DELETION_WORDS.explain}</Text>
      <Text tone="muted">{DELETION_WORDS.typeHandle(handle)}</Text>
      <TextInput
        accessibilityLabel="Your handle"
        placeholder={handle}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        value={typed}
        onChangeText={setTyped}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inset, borderRadius: Math.min(radius.control, 24) }]}
      />
      <Button label={DELETION_WORDS.ask} tone="secondary" busy={change.isPending} disabled={!confirms(handle, typed)} onPress={ask} />
    </View>
  );

  return (
    <Screen refreshing={deletion.isRefetching} onRefresh={() => void deletion.refetch()}>
      <Text accessibilityRole="header" size="title" weight="semibold">
        {DELETION_WORDS.title}
      </Text>
      {change.isError ? <ProblemView error={change.error} /> : null}
      <QueryView query={deletion}>{request => (request ? pending(request) : form)}</QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.md },
  input: { minHeight: 48, borderWidth: 1, paddingHorizontal: SPACE.md, fontSize: 17 }
});
