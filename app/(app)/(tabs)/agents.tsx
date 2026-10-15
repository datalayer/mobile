/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useRouter, type Href } from 'expo-router';
import { EmptyState, Screen } from '../../../src/components/primitives';
import { QueryView, Row, SectionTitle } from '../../../src/components/states';
import { useAgentRuntimes, useApplications, useFaces } from '../../../src/features/queries';
import { AppFace } from '../../../src/identity/AppFace';
import { relativeTime } from '../../../src/i18n/time';
import { threadTitle } from '../../../src/api/conversations';
import { useAllThreads } from '../../../src/features/conversations/useConversation';

export default function Agents() {
  const router = useRouter();
  const applications = useApplications();
  const faces = useFaces();
  const runtimes = useAgentRuntimes();
  const threads = useAllThreads();
  const refresh = () => {
    void applications.refetch();
    void runtimes.refetch();
    void threads.refetch();
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
                leading={<AppFace face={faces.byUid.get(app.appUid)} />}
                title={app.name || 'Application'}
                badge={app.state === 'paused' ? 'Paused' : 'Live'}
                meta={app.deployments.map(d => d.target).join(', ')}
                onPress={() => router.push({ pathname: '/apps/[appUid]', params: { appUid: app.appUid } })}
              />
            ))
          )
        }
      </QueryView>
      <SectionTitle>Your conversations</SectionTitle>
      <QueryView query={threads}>
        {list =>
          list.length === 0 ? (
            <EmptyState
              title="No conversation yet"
              detail="Your conversations with applications, yours or shared with you, appear here."
            />
          ) : (
            list.slice(0, 20).map(thread => (
              <Row
                key={thread.sessionUid}
                leading={<AppFace face={faces.byUid.get(thread.appUid)} />}
                title={threadTitle(thread)}
                meta={`${relativeTime(thread.startedAt)} · ${thread.turns} ${thread.turns === 1 ? 'turn' : 'turns'}`}
                onPress={() =>
                  router.push({
                    pathname: '/apps/[appUid]/sessions/[sessionUid]',
                    params: { appUid: thread.appUid, sessionUid: thread.sessionUid, deployment: thread.deploymentUid }
                  } as unknown as Href)
                }
                accessibilityHint="Opens this conversation where it continues now"
              />
            ))
          )
        }
      </QueryView>
      <QueryView query={threads}>
        {list => {
          // Applications shared with the person, met through their conversations: a new one starts there too.
          const own = new Set((applications.data ?? []).map(app => app.appUid));
          const shared = [...new Map(list.filter(t => !own.has(t.appUid) && t.deploymentUid).map(t => [t.appUid, t])).values()];
          return shared.length ? (
            <>
              <SectionTitle>Shared with you</SectionTitle>
              {shared.map(thread => (
                <Row
                  key={`new-${thread.appUid}`}
                  leading={<AppFace face={faces.byUid.get(thread.appUid)} />}
                  title="New conversation"
                  detail={`With the application of “${threadTitle(thread)}”`}
                  onPress={() =>
                    router.push({
                      pathname: '/apps/[appUid]/sessions/[sessionUid]',
                      params: { appUid: thread.appUid, sessionUid: 'new', deployment: thread.deploymentUid }
                    } as unknown as Href)
                  }
                  accessibilityHint="Starts a new conversation with this application"
                />
              ))}
            </>
          ) : null;
        }}
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
