/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { EmptyState, Screen, Text } from '../../../../src/components/primitives';
import { Field, ProblemView, QueryView, SectionTitle } from '../../../../src/components/states';
import { Problem } from '../../../../src/api/problems';
import { consentWords, sessionWords } from '../../../../src/api/protocolConnections';
import { useApplications, useProtocolConnections } from '../../../../src/features/queries';
import { protocolLinesOf } from '../../../../src/protocols/deployments';

const endpointName = (kind: 'discovery' | 'identity' | 'signing_keys'): string =>
  ({ discovery: 'Company discovery', identity: 'Application identity', signing_keys: 'Signing keys' })[kind];

export default function ApplicationProtocols() {
  const { appUid = '' } = useLocalSearchParams<{ appUid: string }>();
  const applications = useApplications();
  const connections = useProtocolConnections();
  return (
    <Screen
      refreshing={applications.isRefetching || connections.isRefetching}
      onRefresh={() => { void applications.refetch(); void connections.refetch(); }}
    >
      <QueryView query={applications}>
        {apps => {
          const app = apps.find(candidate => candidate.appUid === appUid);
          if (!app) return <ProblemView error={new Problem('not-found', `application ${appUid}`)} />;
          return (
            <>
              <Stack.Screen options={{ title: `${app.name || 'Application'} · Protocols` }} />
              <Text tone="muted">
                This is the exact capability projection of each running version. Datalayer keeps credentials and signing keys; this phone receives only safe status and public addresses.
              </Text>
              {app.deployments.map(deployment => (
                <Fragment key={deployment.uid}>
                  <SectionTitle>{`${deployment.target} · version ${deployment.version}`}</SectionTitle>
                  <Field label="State" value={deployment.state === 'paused' ? 'Paused' : 'Live'} />
                  <Field label="What it speaks" value={protocolLinesOf(deployment.speaks).join('\n')} />
                  {deployment.speaks?.endpoints.map(endpoint => (
                    <Field key={`${deployment.uid}-${endpoint.kind}`} label={endpointName(endpoint.kind)} value={endpoint.url} />
                  ))}
                </Fragment>
              ))}
            </>
          );
        }}
      </QueryView>
      <SectionTitle>In your name</SectionTitle>
      <QueryView query={connections}>
        {items => {
          const held = items.filter(connection => connection.appUid === appUid);
          return held.length ? held.map(connection => (
            <Fragment key={connection.reference}>
              <Field label={connection.protocol === 'pap' ? 'Company · PAP' : 'Business · PACT'} value={connection.domain} />
              <Field label="Consent" value={consentWords(connection.consent)} />
              <Field label="Conversation" value={sessionWords(connection.session)} />
            </Fragment>
          )) : <EmptyState title="Not signed in anywhere" detail="This application holds no company or business consent for you." />;
        }}
      </QueryView>
    </Screen>
  );
}
