/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A conversation with an application (MOBILE §3.4, M-031, M-033). A thread
 * is continued where ai-agents says it continues now, asked on every open
 * (§4.4.7): the runtime its deployment is kept on, a runtime of the person's
 * own — started here first, after they agree, when nothing runs it for them —
 * or nowhere, in ai-agents' sentence. That holds for an application somebody
 * shared with them as for their own. `new` starts a conversation with the
 * deployment named, located the same way (decided 15 October 2026).
 */

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, EmptyState, Screen, Text } from '../../../../../src/components/primitives';
import { ProblemView, QueryView } from '../../../../../src/components/states';
import { STARTS_YOUR_RUNTIME, type ThreadReach } from '../../../../../src/api/conversations';
import type { SessionAddress } from '../../../../../src/api/deployments';
import { ConversationView } from '../../../../../src/features/conversations/ConversationView';
import { directControllerFor } from '../../../../../src/features/conversations/direct';
import { protectedInputClient, signInStatusClient } from '@datalayer/agent-runtimes/lib/portable';
import { useSession } from '../../../../../src/auth/SessionProvider';
import { environment } from '../../../../../src/config/environment';
import {
  useConversation, useNewReach, useStartNewRuntime, useStartThreadRuntime, useThreadReach
} from '../../../../../src/features/conversations/useConversation';

function AppConversation({
  address,
  appUid,
  deploymentUid,
  version,
  sessionUid,
  name
}: {
  address: SessionAddress;
  appUid: string;
  deploymentUid: string;
  version: number;
  sessionUid: string | null;
  name: string;
}) {
  // A new conversation is told apart from another started here by when this screen opened.
  const [key] = useState(() => `${Date.now()}`);
  const { controller, view } = useConversation({ kind: 'app', address, appUid, deploymentUid, version, sessionUid, key });
  const { accessToken } = useSession();
  // A Direct Conversation under this one, opened from what a company answered (M-038); in memory only.
  const [direct] = useState(() => directControllerFor(appUid, environment().runUrl, environment().gatewayUrl, accessToken, (input, init) => fetch(input, init)));
  // How a sign-in this conversation started stands, asked with the person's own sign-in (M-039).
  const [signIns] = useState(() => ({
    appUid,
    ask: signInStatusClient({ baseUrl: environment().gatewayUrl, getAccessToken: accessToken, fetch: (input, init) => fetch(input, init) }),
    typed: protectedInputClient({ iamUrl: environment().runUrl, getAccessToken: accessToken, fetch: (input, init) => fetch(input, init) })
  }));
  const end = () =>
    Alert.alert('End this conversation?', 'It cannot be continued afterwards. What its record keeps stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => void controller.end() }
    ]);
  return (
    <>
      <Stack.Screen
        options={{
          title: name || 'Conversation',
          headerRight: view.uid && !view.ended ? () => <Button label="End" tone="plain" onPress={end} /> : undefined
        }}
      />
      <ConversationView controller={controller} view={view} placeholder={`Message ${name || 'the application'}`} direct={direct} signIns={signIns} />
    </>
  );
}

/** A conversation where ai-agents says it is had now: a thread (`sessionUid`) or a new one (`null`). */
function Located({
  reach,
  starting,
  sessionUid
}: {
  reach: UseQueryResult<ThreadReach>;
  starting: UseMutationResult<ThreadReach, Error, void>;
  sessionUid: string | null;
}) {
  return (
    <QueryView query={reach}>
      {place => {
        if (place.kind === 'closed') {
          return <EmptyState title={sessionUid ? 'Not continued now' : 'Not started now'} detail={place.why} />;
        }
        if (place.kind === 'launch') {
          return (
            <Screen>
              <Stack.Screen options={{ title: place.appName || 'Conversation' }} />
              <Text>{STARTS_YOUR_RUNTIME}</Text>
              {starting.isError ? <ProblemView error={starting.error} /> : null}
              <Button
                label="Start and continue"
                busy={starting.isPending}
                disabled={starting.isPending}
                onPress={() => starting.mutate()}
                testID="conversation-start-runtime"
              />
            </Screen>
          );
        }
        return (
          <AppConversation
            address={place.address}
            appUid={place.appUid}
            deploymentUid={place.deploymentUid}
            version={place.version}
            sessionUid={sessionUid}
            name={place.appName}
          />
        );
      }}
    </QueryView>
  );
}

function ThreadConversation({ sessionUid }: { sessionUid: string }) {
  return <Located reach={useThreadReach(sessionUid)} starting={useStartThreadRuntime(sessionUid)} sessionUid={sessionUid} />;
}

function NewConversation({ deploymentUid }: { deploymentUid: string }) {
  return <Located reach={useNewReach(deploymentUid)} starting={useStartNewRuntime(deploymentUid)} sessionUid={null} />;
}

export default function ApplicationConversation() {
  const { sessionUid = 'new', deployment = '' } = useLocalSearchParams<{
    appUid: string;
    sessionUid: string;
    deployment: string;
  }>();
  return sessionUid === 'new' ? <NewConversation deploymentUid={deployment} /> : <ThreadConversation sessionUid={sessionUid} />;
}
