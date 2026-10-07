/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../../src/components/primitives';
import { Field, ProblemView, QueryView, Row, SectionTitle } from '../../../../src/components/states';
import { Problem } from '../../../../src/api/problems';
import { ActivitySections } from '../../../../src/features/activity/ActivitySections';
import { actionOf } from '../../../../src/features/approvals/format';
import { useActivity, useApplications, useFaces, usePendingApprovals } from '../../../../src/features/queries';
import { AppFace } from '../../../../src/identity/AppFace';
import { relativeTime } from '../../../../src/i18n/time';

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
      <QueryView query={activity}>{work => <ActivitySections work={work} />}</QueryView>
    </Screen>
  );
}
