/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A conversation with a standalone running agent (MOBILE §3.3, M-033): its
 * runtime's AG-UI mount, narrower than an application's — no session, record,
 * question or end; Stop terminates the run.
 */

import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Screen } from '../../../../src/components/primitives';
import { ProblemView, QueryView, Row, SectionTitle } from '../../../../src/components/states';
import { runtimeAgents } from '../../../../src/api/conversations';
import { Problem } from '../../../../src/api/problems';
import { useSession } from '../../../../src/auth/SessionProvider';
import { ConversationView } from '../../../../src/features/conversations/ConversationView';
import { useConversation } from '../../../../src/features/conversations/useConversation';
import { useAgentRuntimes } from '../../../../src/features/queries';

function AgentConversation({ baseUrl, agent, name, runtimeName }: { baseUrl: string; agent: string; name: string; runtimeName: string }) {
  const [key] = useState(() => `${Date.now()}`);
  const { controller, view } = useConversation({ kind: 'agent', baseUrl, agent, runtimeName, key });
  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <ConversationView controller={controller} view={view} placeholder={`Message ${name}`} />
    </>
  );
}

export default function StandaloneConversation() {
  const { runtimeName = '', agent = '' } = useLocalSearchParams<{ runtimeName: string; agent: string }>();
  const router = useRouter();
  const { accessToken } = useSession();
  const runtimes = useAgentRuntimes();
  const runtime = runtimes.data?.find(item => item.runtimeName === runtimeName);
  const agents = useQuery({
    queryKey: ['conversations', 'agents', runtimeName, runtime?.ingress ?? ''],
    queryFn: () => {
      if (!runtime) throw new Problem('not-found', `runtime ${runtimeName}`);
      return runtimeAgents(runtime, accessToken(), fetch);
    },
    enabled: Boolean(runtime)
  });
  if (!runtime) {
    return (
      <Screen>
        <QueryView query={runtimes}>{() => <ProblemView error={new Problem('not-found', `runtime ${runtimeName}`)} />}</QueryView>
      </Screen>
    );
  }
  return (
    <QueryView query={agents}>
      {({ baseUrl, agents: list }) => {
        const chosen = list.find(item => item.id === agent) ?? (list.length === 1 ? list[0] : undefined);
        if (chosen) {
          return <AgentConversation baseUrl={baseUrl} agent={chosen.id} name={chosen.name} runtimeName={runtimeName} />;
        }
        return (
          <Screen>
            <SectionTitle>Which agent?</SectionTitle>
            {list.map(item => (
              <Row
                key={item.id}
                title={item.name}
                onPress={() =>
                  router.setParams({ agent: item.id } as unknown as Parameters<typeof router.setParams>[0])
                }
              />
            ))}
          </Screen>
        );
      }}
    </QueryView>
  );
}
