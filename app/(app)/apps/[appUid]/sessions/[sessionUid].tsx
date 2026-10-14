/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A conversation with an application (MOBILE §3.4, M-033): a session of the
 * runtime its deployment is kept on now, read from the deployment each time —
 * `new` starts one with the first message.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, EmptyState } from '../../../../../src/components/primitives';
import { QueryView } from '../../../../../src/components/states';
import { reachOf } from '../../../../../src/api/conversations';
import type { SessionAddress } from '../../../../../src/api/deployments';
import { ConversationView } from '../../../../../src/features/conversations/ConversationView';
import { useConversation } from '../../../../../src/features/conversations/useConversation';
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

export default function ApplicationConversation() {
  const { appUid = '', sessionUid = 'new', deployment = '' } = useLocalSearchParams<{
    appUid: string;
    sessionUid: string;
    deployment: string;
  }>();
  const applications = useApplications();
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
            sessionUid={sessionUid === 'new' ? null : sessionUid}
            name={app?.name ?? ''}
          />
        );
      }}
    </QueryView>
  );
}
