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
 * first message where the owner's deployment is kept running.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, EmptyState, Screen, Text } from '../../../../../src/components/primitives';
import { ProblemView, QueryView } from '../../../../../src/components/states';
import { reachOf, STARTS_YOUR_RUNTIME } from '../../../../../src/api/conversations';
import type { SessionAddress } from '../../../../../src/api/deployments';
import { ConversationView } from '../../../../../src/features/conversations/ConversationView';
import {
  useConversation, useStartThreadRuntime, useThreadReach
} from '../../../../../src/features/conversations/useConversation';
import { useApplications } from '../../../../../src/features/queries';

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
      <ConversationView controller={controller} view={view} placeholder={`Message ${name || 'the application'}`} />
    </>
  );
}

/** A thread, continued where ai-agents says it continues now. */
function ThreadConversation({ sessionUid }: { sessionUid: string }) {
  const reach = useThreadReach(sessionUid);
  const starting = useStartThreadRuntime(sessionUid);
  return (
    <QueryView query={reach}>
      {place => {
        if (place.kind === 'closed') {
          return <EmptyState title="Not continued now" detail={place.why} />;
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

export default function ApplicationConversation() {
  const { appUid = '', sessionUid = 'new', deployment = '' } = useLocalSearchParams<{
    appUid: string;
    sessionUid: string;
    deployment: string;
  }>();
  const applications = useApplications();
  if (sessionUid !== 'new') {
    return <ThreadConversation sessionUid={sessionUid} />;
  }
  return (
    <QueryView query={applications}>
      {apps => {
        const app = apps.find(item => item.appUid === appUid);
        const found = app?.deployments.find(item => item.uid === deployment);
        const reach = reachOf(found);
        if (reach.kind === 'web' || !found) {
          return <EmptyState title="Not on this phone" detail={reach.kind === 'web' ? reach.why : ''} />;
        }
        return (
          <AppConversation
            address={reach.address}
            appUid={appUid}
            deploymentUid={found.uid}
            version={found.version}
            sessionUid={null}
            name={app?.name ?? ''}
          />
        );
      }}
    </QueryView>
  );
}
