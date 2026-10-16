/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Screen } from '../../../../src/components/primitives';
import { Field, ProblemView, QueryView, Row, SectionTitle } from '../../../../src/components/states';
import { Problem } from '@datalayer/core/lib/portable';
import { actionOf } from '../../../../src/features/approvals/format';
import { useAgentRuntimes, usePendingApprovals } from '../../../../src/features/queries';
import { absoluteTime, relativeTime } from '../../../../src/i18n/time';

/** A standalone agent runtime: no Appspec, activity, rules or reset. */
export default function AgentDetail() {
  const { runtimeName = '' } = useLocalSearchParams<{ runtimeName: string }>();
  const router = useRouter();
  const runtimes = useAgentRuntimes();
  const approvals = usePendingApprovals();
  return (
    <Screen refreshing={runtimes.isRefetching} onRefresh={() => void runtimes.refetch()}>
      <QueryView query={runtimes}>
        {list => {
          const runtime = list.find(item => item.runtimeName === runtimeName);
          if (!runtime) {
            return <ProblemView error={new Problem('not-found', `runtime ${runtimeName}`)} />;
          }
          const waiting = (approvals.data ?? []).filter(a => a.runtimeName === runtimeName);
          return (
            <>
              <Stack.Screen options={{ title: runtime.givenName || runtime.runtimeName }} />
              <Field label="State" value={runtime.state} />
              <Field label="Agent" value={runtime.agentSpecId} />
              <Field label="Environment" value={runtime.environment} />
              <Field label="Started" value={runtime.startedAt ? `${absoluteTime(runtime.startedAt)} (${relativeTime(runtime.startedAt)})` : ''} />
              <Field label="Ends" value={absoluteTime(runtime.expiredAt)} />
              <Row
                title="Talk to this agent"
                detail="A conversation with it while it runs. It keeps no record and asks no questions an application would."
                onPress={() =>
                  router.push({ pathname: '/agents/[runtimeName]/conversation', params: { runtimeName } } as unknown as Href)
                }
              />
              <SectionTitle>{`Waiting for you (${waiting.length})`}</SectionTitle>
              {waiting.map(approval => (
                <Row
                  key={approval.id}
                  title={actionOf(approval.toolName)}
                  meta={relativeTime(approval.createdAt)}
                  onPress={() => router.push({ pathname: '/approvals/[approvalId]', params: { approvalId: approval.id } })}
                />
              ))}
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}
