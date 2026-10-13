/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Screen, Text } from '../../../../src/components/primitives';
import { Field, ProblemView, QueryView, Row, SectionTitle } from '../../../../src/components/states';
import { Problem } from '../../../../src/api/problems';
import { ActivitySections } from '../../../../src/features/activity/ActivitySections';
import { actionOf } from '../../../../src/features/approvals/format';
import { useActivity, useApplications, useChangeDeploymentState, useFaces, usePendingApprovals } from '../../../../src/features/queries';
import { AppFace } from '../../../../src/identity/AppFace';
import { relativeTime } from '../../../../src/i18n/time';
import { protocolLinesOf } from '../../../../src/protocols/deployments';
import { stoppedWorkWords, type Deployment } from '../../../../src/api/deployments';
import { SPACE } from '../../../../src/theme/tokens';

export default function ApplicationDetail() {
  const { appUid = '' } = useLocalSearchParams<{ appUid: string }>();
  const router = useRouter();
  const applications = useApplications();
  const faces = useFaces();
  const approvals = usePendingApprovals();
  const activity = useActivity(appUid);
  const changingState = useChangeDeploymentState();
  const [lifecycleSays, setLifecycleSays] = useState('');
  const refresh = () => {
    void applications.refetch();
    void approvals.refetch();
    void activity.refetch();
  };
  const changeState = (deployment: Deployment) => {
    const next = deployment.state === 'live' ? 'paused' : 'live';
    const verb = next === 'paused' ? 'Pause' : 'Resume';
    Alert.alert(
      `${verb} this ${deployment.target} deployment?`,
      next === 'paused'
        ? 'It will stop accepting new work and Datalayer will try to stop work in progress.'
        : 'It will accept work again using this exact version.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: verb,
          style: next === 'paused' ? 'destructive' : 'default',
          onPress: () => changingState.mutate({ deployment, state: next }, {
            onSuccess: result => setLifecycleSays(result.work ? stoppedWorkWords(result.work) : 'Resumed: it can accept work again.'),
            onError: () => setLifecycleSays('')
          })
        }
      ]
    );
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
              {changingState.isError ? <ProblemView error={changingState.error} /> : null}
              {lifecycleSays ? <Text accessibilityRole="alert">{lifecycleSays}</Text> : null}
              <SectionTitle>Owner controls</SectionTitle>
              <View style={{ gap: SPACE.sm }}>
                {app.deployments.map(deployment => (
                  <Button
                    key={`${deployment.uid}-state`}
                    label={`${deployment.state === 'live' ? 'Pause' : 'Resume'} ${deployment.target}`}
                    tone="secondary"
                    busy={changingState.isPending && changingState.variables?.deployment.uid === deployment.uid}
                    disabled={changingState.isPending}
                    onPress={() => changeState(deployment)}
                  />
                ))}
              </View>
              <Row
                title="Protocols"
                detail={app.deployments.flatMap(deployment => protocolLinesOf(deployment.speaks)).join(' · ')}
                onPress={() => router.push({ pathname: '/apps/[appUid]/protocols', params: { appUid } } as unknown as Href)}
                accessibilityHint="Shows what each running version speaks and its connections"
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
      <QueryView query={activity}>{work => <ActivitySections work={work} />}</QueryView>
    </Screen>
  );
}
