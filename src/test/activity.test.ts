/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { activityFixture, activityOf, entrySaid, mergeActivityPages, scheduledSays } from '@datalayer/agent-runtimes/lib/portable';
import { readActivity } from '../api/activity';

const page = (body: Record<string, unknown>) => activityOf(body);

describe('Activity on the shared fixture', () => {
  it('reads and says what the Studio reads and says', async () => {
    const client = (async () => activityFixture()) as unknown as Parameters<typeof readActivity>[0];
    const work = await readActivity(client, 'app-1');
    expect(work.inProgress.map(entry => entrySaid(entry))).toEqual(['Triage the inbox']);
    expect(work.scheduled.map(scheduledSays)).toEqual(['Every weekday morning (0 8 * * 1-5) · version 3']);
    // A session whose words are not kept is said by how its run ended.
    expect(work.completed.map(entry => entrySaid(entry))).toEqual(['Stopped']);
    expect(work.nextOffset).toBe(20);
  });
});

describe('the activity of every application', () => {
  it('names the application of each session and scheduled run', () => {
    const work = page({
      in_progress: [{ uid: 'r1', app_uid: 'app-2', session_uid: 's1', kind: 'run' }],
      scheduled: [{ deployment_uid: 'd1', app_uid: 'app-1', cron: '0 9 * * 1', next_at: '2026-10-12T09:00:00Z' }],
      completed: [{ uid: 'o1', app_uid: 'app-1', session_uid: 's2', kind: 'session' }],
      next_offset: 20
    });
    expect(work.inProgress[0]!.appUid).toBe('app-2');
    expect(work.scheduled[0]!.appUid).toBe('app-1');
    expect(work.completed[0]!.appUid).toBe('app-1');
    expect(work.nextOffset).toBe(20);
  });

  it('has no next page when the server says none', () => {
    expect(page({ completed: [], next_offset: null }).nextOffset).toBeNull();
    expect(page({ completed: [] }).nextOffset).toBeNull();
  });

  it('merges pages: in progress and scheduled from the first, completed from all, once each', () => {
    const first = page({
      in_progress: [{ uid: 'r1', session_uid: 's1' }],
      scheduled: [{ deployment_uid: 'd1', cron: '0 9 * * 1' }],
      scheduled_problem: '',
      completed: [{ uid: 'a', session_uid: 'sa' }, { uid: 'b', session_uid: 'sb' }],
      next_offset: 2
    });
    const second = page({ completed: [{ uid: 'b', session_uid: 'sb' }, { uid: 'c', session_uid: 'sc' }], next_offset: null });
    const merged = mergeActivityPages([first, second]);
    expect(merged.inProgress.map(e => e.uid)).toEqual(['r1']);
    expect(merged.scheduled).toHaveLength(1);
    expect(merged.completed.map(e => e.uid)).toEqual(['a', 'b', 'c']);
    expect(merged.nextOffset).toBeNull();
  });

  it('asks for every application, or one, from an offset', async () => {
    const asked: string[] = [];
    const client = (async (path: string) => {
      asked.push(path);
      return { completed: [] };
    }) as unknown as Parameters<typeof readActivity>[0];
    await readActivity(client, undefined, 40);
    await readActivity(client, 'app 1');
    expect(asked).toEqual([
      '/api/ai-agents/v1/apps/activity?limit=20&offset=40',
      '/api/ai-agents/v1/apps/activity?app_uid=app%201&limit=20&offset=0'
    ]);
  });
});
