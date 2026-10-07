/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** What an application is doing (LOOP R-15), from `/api/ai-agents/v1/apps/activity`. */

import type { Client } from './client';
import { count, type Raw, records, segment, text } from './fields';

export type RecordEntry = {
  uid: string;
  sessionUid: string;
  deploymentUid: string;
  version: number;
  kind: string;
  summary: string;
  createdAt: string;
};

export type ScheduledRun = {
  deploymentUid: string;
  version: number;
  cron: string;
  description: string;
  nextAt: string;
};

export type AppActivity = {
  inProgress: RecordEntry[];
  scheduled: ScheduledRun[];
  scheduledProblem: string;
  completed: RecordEntry[];
};

export const entryOf = (raw: Raw): RecordEntry => ({
  uid: text(raw.uid),
  sessionUid: text(raw.session_uid),
  deploymentUid: text(raw.deployment_uid),
  version: count(raw.version),
  kind: text(raw.kind) || 'output',
  summary: text(raw.summary),
  createdAt: text(raw.created_at)
});

export function activityOf(body: Raw): AppActivity {
  return {
    inProgress: records(body.in_progress).map(entryOf),
    scheduled: records(body.scheduled).map(raw => ({
      deploymentUid: text(raw.deployment_uid),
      version: count(raw.version),
      cron: text(raw.cron),
      description: text(raw.description),
      nextAt: text(raw.next_at)
    })),
    scheduledProblem: text(body.scheduled_problem),
    completed: records(body.completed).map(entryOf)
  };
}

export const ACTIVITY_WORDS = {
  inProgress: 'In progress',
  scheduled: 'Scheduled',
  completed: 'Completed',
  nothing: 'Nothing yet.'
} as const;

/** A scheduled run in words, as the web says it. */
export const scheduledSays = (run: ScheduledRun): string =>
  `${run.description || 'Its schedule'} (${run.cron}) · version ${run.version}`;

export async function readActivity(client: Client, appUid: string, limit = 20): Promise<AppActivity> {
  return activityOf(await client(`/api/ai-agents/v1/apps/activity?app_uid=${segment(appUid)}&limit=${limit}`));
}
