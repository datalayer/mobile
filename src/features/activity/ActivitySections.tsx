/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ACTIVITY_WORDS, entrySaid, type AppActivity, scheduledSays } from '@datalayer/agent-runtimes/lib/portable';
import { EmptyState } from '../../components/primitives';
import { Field, Row, SectionTitle } from '../../components/states';
import { absoluteTime, relativeTime } from '../../i18n/time';

/** Who each row belongs to, on the tab that shows every application's. */
export type Owners = { nameOf: (appUid: string) => string; faceOf: (appUid: string) => ReactNode };

/** In progress, scheduled and completed, for one application or, given `owners`, all of them. */
export function ActivitySections({ work, owners }: { work: AppActivity; owners?: Owners }) {
  const router = useRouter();
  const open = (appUid: string) =>
    owners && appUid ? () => router.push({ pathname: '/apps/[appUid]', params: { appUid } }) : undefined;
  const titled = (appUid: string, says: string) => (owners ? `${owners.nameOf(appUid)}: ${says}` : says);
  return (
    <>
      <SectionTitle>{ACTIVITY_WORDS.inProgress}</SectionTitle>
      {work.inProgress.length === 0 ? <EmptyState title={ACTIVITY_WORDS.nothing} detail="" /> : null}
      {work.inProgress.map(entry => (
        <Row
          key={entry.uid}
          leading={owners?.faceOf(entry.appUid)}
          title={titled(entry.appUid, entry.summary || 'Working')}
          meta={`Since ${absoluteTime(entry.createdAt)} (${relativeTime(entry.createdAt)})`}
          onPress={open(entry.appUid)}
        />
      ))}
      <SectionTitle>{ACTIVITY_WORDS.scheduled}</SectionTitle>
      {work.scheduledProblem ? <Field label="" value={work.scheduledProblem} /> : null}
      {work.scheduled.length === 0 && !work.scheduledProblem ? <EmptyState title={ACTIVITY_WORDS.nothing} detail="" /> : null}
      {work.scheduled.map(run => (
        <Row
          key={`${run.deploymentUid}:${run.cron}:${run.nextAt}`}
          leading={owners?.faceOf(run.appUid)}
          title={titled(run.appUid, scheduledSays(run))}
          meta={run.nextAt ? `Next ${absoluteTime(run.nextAt)} (${relativeTime(run.nextAt)})` : undefined}
          onPress={open(run.appUid)}
        />
      ))}
      <SectionTitle>{ACTIVITY_WORDS.completed}</SectionTitle>
      {work.completed.length === 0 ? <EmptyState title={ACTIVITY_WORDS.nothing} detail="" /> : null}
      {work.completed.map(entry => (
        <Row
          key={entry.uid || entry.sessionUid}
          leading={owners?.faceOf(entry.appUid)}
          title={titled(entry.appUid, entrySaid(entry) || 'A session')}
          meta={`${absoluteTime(entry.createdAt)} (${relativeTime(entry.createdAt)})`}
          onPress={open(entry.appUid)}
        />
      ))}
    </>
  );
}
