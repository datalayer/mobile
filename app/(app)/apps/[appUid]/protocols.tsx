/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { EmptyState, Screen, Text } from '../../../../src/components/primitives';
import { Field, ProblemView, QueryView, SectionTitle } from '../../../../src/components/states';
import { Problem } from '@datalayer/core/lib/portable';
import { signedRequestHealthOf, testMerchantsOf } from '../../../../src/api/protocolActivity';
import { consentWords, sessionWords } from '../../../../src/api/protocolConnections';
import { useCheckedDeployments, useProtocolActivity, useProtocolConnections } from '../../../../src/features/queries';
import { absoluteTime, relativeTime } from '../../../../src/i18n/time';
import { identityLinesOf, protocolLinesOf } from '../../../../src/protocols/deployments';

const endpointName = (kind: 'discovery' | 'identity' | 'signing_keys'): string =>
  ({ discovery: 'Company discovery', identity: 'Application identity', signing_keys: 'Signing keys' })[kind];

export default function ApplicationProtocols() {
  const { appUid = '' } = useLocalSearchParams<{ appUid: string }>();
  const applications = useCheckedDeployments(appUid);
  const connections = useProtocolConnections();
  const activity = useProtocolActivity();
  return (
    <Screen
      refreshing={applications.isRefetching || connections.isRefetching || activity.isRefetching}
      onRefresh={() => { void applications.refetch(); void connections.refetch(); void activity.refetch(); }}
    >
      <QueryView query={applications}>
        {deployments => {
          const shown = deployments.filter(deployment => deployment.target !== 'preview');
          const [first] = shown;
          if (!first) return <ProblemView error={new Problem('not-found', `application ${appUid}`)} />;
          return (
            <>
              <Stack.Screen options={{ title: `${first.appName || 'Application'} · Protocols` }} />
              <Text tone="muted">
                This is the exact capability projection of each running version. Datalayer keeps credentials and signing keys; this phone receives only safe status and public addresses.
              </Text>
              {shown.map(deployment => (
                <Fragment key={deployment.uid}>
                  <SectionTitle>{`${deployment.target} · version ${deployment.version}`}</SectionTitle>
                  <Field label="State" value={deployment.state === 'paused' ? 'Paused' : 'Live'} />
                  <Field label="What it speaks" value={protocolLinesOf(deployment.speaks).join('\n')} />
                  {deployment.speaks?.identity ? (
                    <Field
                      label={deployment.speaks.identity.checkedAt ? `Its identity, checked ${relativeTime(deployment.speaks.identity.checkedAt)}` : 'Its identity'}
                      value={identityLinesOf(deployment.speaks.identity).join('\n')}
                    />
                  ) : null}
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
      <QueryView query={activity}>
        {rows => {
          const merchants = testMerchantsOf(rows, appUid);
          const signed = signedRequestHealthOf(rows, appUid);
          return (
            <>
              <SectionTitle>Test merchants</SectionTitle>
              {merchants.length ? merchants.map(merchant => (
                <Field
                  key={`${merchant.protocol}:${merchant.counterpart}`}
                  label={`${merchant.protocol.toUpperCase()} · ${merchant.counterpart}`}
                  value={`Last activity ${absoluteTime(merchant.lastAt)} (${relativeTime(merchant.lastAt)})`}
                />
              )) : <EmptyState title="No test merchant activity" detail="No UCP or ACP test merchant is recorded for this application." />}
              <SectionTitle>Signed requests</SectionTitle>
              {signed.length ? signed.map(request => (
                <Field
                  key={`${request.protocol}:${request.counterpart}`}
                  label={`${request.protocol.toUpperCase()} · ${request.counterpart}`}
                  value={`${request.outcome} · ${absoluteTime(request.lastAt)} (${relativeTime(request.lastAt)})`}
                />
              )) : (
                <EmptyState
                  title="No signed request recorded"
                  detail="This does not mean requests are unsigned; it means no safe audit result is available for this application yet."
                />
              )}
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}
