/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState, Screen } from '../../../../src/components/primitives';
import { Field, ProblemView, QueryView, Row, SectionTitle } from '../../../../src/components/states';
import { ACTIVITY_WORDS, scheduledSays } from '../../../../src/api/activity';
import { Problem } from '../../../../src/api/problems';
import { actionOf } from '../../../../src/features/approvals/format';
import { useActivity, useApplications, useFaces, usePendingApprovals } from '../../../../src/features/queries';
import { AppFace } from '../../../../src/identity/AppFace';
import { absoluteTime, relativeTime } from '../../../../src/i18n/time';

export default function ApplicationDetail() {
  const { appUid = '' } = useLocalSearchParams<{ appUid: string }>();
  const router = useRouter();
  const applications = useApplications();
  const faces = useFaces();
  const approvals = usePendingApprovals();
  const activity = useActivity(appUid);
  const refresh = () => {
    void applications.refetch();
    void approvals.refetch();
    void activity.refetch();
  };
  return (
    <Screen refreshing={activity.isRefetching} onRefresh={refresh}>
      <QueryView query={applications}>
        {apps => {
          const app = apps.find(item => item.appUid === appUid);
          if (!app) {
            return <ProblemView error={new Problem('not-found', `application ${appUid}`)} />;
          }
          const waiting = (approvals.data ?? []).filter(a => a.toolArgs._app_uid === appUid);
          return (
            <>
              <Stack.Screen options={{ title: app.name || 'Application' }} />
              <AppFace face={faces.byUid.get(appUid)} size={64} />
              <Field label="State" value={app.state === 'paused' ? 'Paused' : 'Live'} />
              <Field label="Deployments" value={app.deployments.map(d => `${d.target} · version ${d.version}`).join('\n')} />
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
      <QueryView query={activity}>
        {work => (
          <>
            <SectionTitle>{ACTIVITY_WORDS.inProgress}</SectionTitle>
            {work.inProgress.length === 0 ? <EmptyState title={ACTIVITY_WORDS.nothing} detail="" /> : null}
            {work.inProgress.map(entry => (
              <Row
                key={entry.uid}
                title={entry.summary || 'Working'}
                meta={`Since ${absoluteTime(entry.createdAt)} (${relativeTime(entry.createdAt)})`}
              />
            ))}
            <SectionTitle>{ACTIVITY_WORDS.scheduled}</SectionTitle>
            {work.scheduledProblem ? <Field label="" value={work.scheduledProblem} /> : null}
            {work.scheduled.map(run => (
              <Row
                key={`${run.deploymentUid}:${run.cron}:${run.nextAt}`}
                title={scheduledSays(run)}
                meta={run.nextAt ? `Next ${absoluteTime(run.nextAt)} (${relativeTime(run.nextAt)})` : undefined}
              />
            ))}
            <SectionTitle>{ACTIVITY_WORDS.completed}</SectionTitle>
            {work.completed.map(entry => (
              <Row
                key={entry.uid || entry.sessionUid}
                title={entry.summary || 'A session'}
                meta={`${absoluteTime(entry.createdAt)} (${relativeTime(entry.createdAt)})`}
              />
            ))}
          </>
        )}
      </QueryView>
    </Screen>
  );
}
