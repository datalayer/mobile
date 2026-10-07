/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** What an application, or all of them, is doing (LOOP R-15, MOBILE M-040), from `/api/ai-agents/v1/apps/activity`. */

import type { Client } from './client';
import { count, type Raw, records, segment, text } from './fields';

export type RecordEntry = {
  uid: string;
  appUid: string;
  sessionUid: string;
  deploymentUid: string;
  version: number;
  kind: string;
  summary: string;
  createdAt: string;
};

export type ScheduledRun = {
  deploymentUid: string;
  appUid: string;
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
  /** The offset of the next page of completed sessions; null after the last. */
  nextOffset: number | null;
};

export const entryOf = (raw: Raw): RecordEntry => ({
  uid: text(raw.uid),
  appUid: text(raw.app_uid),
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
      appUid: text(raw.app_uid),
      version: count(raw.version),
      cron: text(raw.cron),
      description: text(raw.description),
      nextAt: text(raw.next_at)
    })),
    scheduledProblem: text(body.scheduled_problem),
    completed: records(body.completed).map(entryOf),
    nextOffset: typeof body.next_offset === 'number' ? body.next_offset : null
  };
}

/** Pages as one: in progress and scheduled from the first, completed from all, the last page's next offset. */
export function mergePages(pages: AppActivity[]): AppActivity {
  const [first] = pages;
  if (!first) {
    return { inProgress: [], scheduled: [], scheduledProblem: '', completed: [], nextOffset: null };
  }
  const seen = new Set<string>();
  const completed = pages
    .flatMap(page => page.completed)
    .filter(entry => {
      const key = entry.uid || entry.sessionUid;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  return { ...first, completed, nextOffset: pages[pages.length - 1]!.nextOffset };
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

/** One application's activity, or, with none, all of the caller's; completed sessions from `offset`. */
export async function readActivity(client: Client, appUid?: string, offset = 0, limit = 20): Promise<AppActivity> {
  const only = appUid ? `app_uid=${segment(appUid)}&` : '';
  return activityOf(await client(`/api/ai-agents/v1/apps/activity?${only}limit=${limit}&offset=${offset}`));
}
