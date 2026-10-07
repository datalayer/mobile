/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useRouter } from 'expo-router';
import { EmptyState, Screen } from '../../../src/components/primitives';
import { QueryView, Row, SectionTitle } from '../../../src/components/states';
import { useAgentRuntimes, useApplications } from '../../../src/features/queries';
import { relativeTime } from '../../../src/i18n/time';

export default function Agents() {
  const router = useRouter();
  const applications = useApplications();
  const runtimes = useAgentRuntimes();
  const refresh = () => {
    void applications.refetch();
    void runtimes.refetch();
  };
  return (
    <Screen refreshing={applications.isRefetching || runtimes.isRefetching} onRefresh={refresh}>
      <SectionTitle>Applications</SectionTitle>
      <QueryView query={applications}>
        {apps =>
          apps.length === 0 ? (
            <EmptyState title="No application deployed" detail="Applications you deploy on Datalayer appear here." />
          ) : (
            apps.map(app => (
              <Row
                key={app.appUid}
                title={app.name || 'Application'}
                badge={app.state === 'paused' ? 'Paused' : 'Live'}
                meta={app.deployments.map(d => d.target).join(', ')}
                onPress={() => router.push({ pathname: '/apps/[appUid]', params: { appUid: app.appUid } })}
              />
            ))
          )
        }
      </QueryView>
      <SectionTitle>Running agents</SectionTitle>
      <QueryView query={runtimes}>
        {list =>
          list.length === 0 ? (
            <EmptyState title="No agent running" detail="Agents you launch outside an application appear here." />
          ) : (
            list.map(runtime => (
              <Row
                key={runtime.runtimeName}
                title={runtime.givenName || runtime.runtimeName}
                badge={runtime.state}
                detail={runtime.agentSpecId || runtime.environment}
                meta={runtime.startedAt ? `Started ${relativeTime(runtime.startedAt)}` : undefined}
                onPress={() =>
                  router.push({ pathname: '/agents/[runtimeName]', params: { runtimeName: runtime.runtimeName } })
                }
              />
            ))
          )
        }
      </QueryView>
    </Screen>
  );
}
