/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ACTIVITY_WORDS,
  entrySaid,
  type AppActivity,
  scheduledSays,
  sessionAgentSaid,
  sessionLineageSaid,
  sessionStateSaid
} from '@datalayer/agent-runtimes/lib/portable';
import { EmptyState } from '../../components/primitives';
import { Field, Row, SectionTitle } from '../../components/states';
import { absoluteTime, relativeTime } from '../../i18n/time';

/** Who each row belongs to, on the tab that shows every application's. */
export type Owners = { nameOf: (appUid: string) => string; faceOf: (appUid: string) => ReactNode };

/** A session with no words yet, as the Studio lists it. */
export const UNTITLED_SESSION = 'A conversation';

/**
 * What a completed session's row says under its title: the agent it is bound
 * to now (with its harness), and where it comes from — *Cloned from … at
 * turn 2*, *Imported from a file …* — as the record says them; `''` for an
 * ordinary session of a model agent.
 */
export function sessionDetail(session: Parameters<typeof sessionAgentSaid>[0] & Parameters<typeof sessionLineageSaid>[0]): string {
  return [sessionAgentSaid(session), sessionLineageSaid(session)].filter(Boolean).join(' · ');
}

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
      {/* Each completed row is a session as the record lists it: its title, its state, its agent, where it comes from. */}
      {work.completed.map(session => (
        <Row
          key={session.uid}
          leading={owners?.faceOf(session.appUid)}
          title={titled(session.appUid, session.title || UNTITLED_SESSION)}
          detail={sessionDetail(session) || undefined}
          badge={sessionStateSaid(session)}
          meta={session.startedAt ? `${absoluteTime(session.startedAt)} (${relativeTime(session.startedAt)})` : undefined}
          onPress={open(session.appUid)}
        />
      ))}
    </>
  );
}
