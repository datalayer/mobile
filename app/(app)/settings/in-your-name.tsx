/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Alert, View } from 'react-native';
import { Button } from '../../../src/components/native';
import { EmptyState, Screen, Text } from '../../../src/components/primitives';
import { Field, ProblemView, QueryView, SectionTitle } from '../../../src/components/states';
import { useApplications, useDisconnectProtocolConnection, useProtocolConnections } from '../../../src/features/queries';
import { absoluteTime } from '../../../src/i18n/time';
import { consentWords, sessionWords, type ProtocolConnection } from '../../../src/api/protocolConnections';
import { SPACE } from '../../../src/theme/tokens';

export default function InYourName() {
  const connections = useProtocolConnections();
  const applications = useApplications();
  const disconnecting = useDisconnectProtocolConnection();
  const names = new Map((applications.data ?? []).map(app => [app.appUid, app.name]));

  const disconnect = (connection: ProtocolConnection) => {
    const app = names.get(connection.appUid) || 'This application';
    const pact = connection.protocol === 'pact';
    Alert.alert(
      `Disconnect ${connection.domain}?`,
      `${app} will stop acting for you there. What it already did is not undone.${pact ? ' PACT cannot end the permission at the business from here; end it on the business’s own site too.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: () => disconnecting.mutate(connection.reference, {
            onSuccess: result => Alert.alert(
              'Disconnected',
              pact
                ? `Disconnected at Datalayer. End the permission on ${connection.domain} too.`
                : result.revokedAtCounterpart
                  ? `${connection.domain} ended it too.`
                  : `Disconnected at Datalayer. ${connection.domain} did not confirm that it ended there.`
            )
          })
        }
      ]
    );
  };

  return (
    <Screen refreshing={connections.isRefetching} onRefresh={() => void connections.refetch()}>
      <Text tone="muted">
        Companies and businesses your applications reach in your name after you sign in there. Credentials stay with Datalayer and are never sent to this phone.
      </Text>
      {disconnecting.isError ? <ProblemView error={disconnecting.error} /> : null}
      <QueryView query={connections}>
        {items => items.length === 0 ? (
          <EmptyState title="Nothing acts in your name" detail="A company or business appears here after one of your applications asks you to sign in there." />
        ) : (
          <View style={{ gap: SPACE.lg }}>
            {items.map(connection => (
              <View key={connection.reference} style={{ gap: SPACE.sm }}>
                <SectionTitle>{names.get(connection.appUid) || 'An application'}</SectionTitle>
                <Field label={connection.protocol === 'pap' ? 'Company · PAP' : 'Business · PACT'} value={connection.domain} />
                <Field label="Consent" value={consentWords(connection.consent)} />
                {connection.consent?.resource ? <Field label="Resource" value={connection.consent.resource} /> : null}
                <Field label="Conversation" value={sessionWords(connection.session)} />
                <Field label="Connected" value={absoluteTime(connection.connectedAt)} />
                <Field label="Last used" value={absoluteTime(connection.lastUsed)} />
                <Button
                  label="Disconnect"
                  tone="secondary"
                  busy={disconnecting.isPending && disconnecting.variables === connection.reference}
                  disabled={disconnecting.isPending}
                  onPress={() => disconnect(connection)}
                />
              </View>
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}
