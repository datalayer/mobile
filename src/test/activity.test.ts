/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  activityFixture,
  activityOf,
  entrySaid,
  mergeActivityPages,
  scheduledSays,
  sessionStateSaid
} from '@datalayer/agent-runtimes/lib/portable';
import { readActivity } from '../api/activity';
import { sessionDetail, UNTITLED_SESSION } from '../features/activity/ActivitySections';

const page = (body: Record<string, unknown>) => activityOf(body);

/** A completed row as ai-agents lists a session: the record's row, never an entry. */
const session = (uid: string, appUid = 'app-1', more: Record<string, unknown> = {}) => ({
  uid,
  app_uid: appUid,
  deployment_uid: 'd-1',
  version: 3,
  purpose: '',
  launch_uid: '',
  owner_uid: 'o-1',
  opened_by: 'o-1',
  woken_by: '',
  state: 'paused',
  agent: 'inbox-triage',
  harness: '',
  title: '',
  archived: false,
  runs_on: null,
  lineage: { forked_from: null, imported_from: null },
  turns: 1,
  started_at: '2026-10-21T08:00:00Z',
  kept_until: '',
  ...more
});

describe('Activity on the shared fixture', () => {
  it('reads and says what the Studio reads and says', async () => {
    const client = (async () => activityFixture()) as unknown as Parameters<typeof readActivity>[0];
    const work = await readActivity(client, 'app-1');
    expect(work.inProgress.map(entry => entrySaid(entry))).toEqual(['Triage the inbox']);
    expect(work.scheduled.map(scheduledSays)).toEqual(['Every weekday morning (0 8 * * 1-5) · version 3']);
    // A completed row is a session: its title, its state, its agent, as the record lists it.
    expect(work.completed.map(row => [row.title, sessionStateSaid(row), row.agent])).toEqual([['The inbox, Thursday', 'Ended', 'inbox-triage']]);
    expect(work.nextOffset).toBe(20);
  });
});

describe('the activity of every application', () => {
  it('names the application of each session and scheduled run', () => {
    const work = page({
      in_progress: [{ uid: 'r1', app_uid: 'app-2', session_uid: 's1', kind: 'run' }],
      scheduled: [{ deployment_uid: 'd1', app_uid: 'app-1', cron: '0 9 * * 1', next_at: '2026-10-12T09:00:00Z' }],
      completed: [session('s2', 'app-1')],
      next_offset: 20
    });
    expect(work.inProgress[0]!.appUid).toBe('app-2');
    expect(work.scheduled[0]!.appUid).toBe('app-1');
    expect(work.completed[0]!.appUid).toBe('app-1');
    expect(work.completed[0]!.startedAt).toBe('2026-10-21T08:00:00Z');
    expect(work.nextOffset).toBe(20);
  });

  it('says a session’s state, its agent and where it comes from, as the Studio does', () => {
    const [cloned, imported, plain] = page({
      completed: [
        session('c1', 'app-1', {
          state: 'open',
          turn: 'running',
          agent: 'shield-mvp-codex',
          harness: 'codex',
          title: 'Before the refactor',
          lineage: { forked_from: { uid: 'e67a52b2', at_turn: 2 }, imported_from: null }
        }),
        session('i1', 'app-1', {
          state: 'ended',
          lineage: { forked_from: null, imported_from: { digest: 'sha256:1', exported_at: '2026-10-20', exported_by: 'o-2' } }
        }),
        session('p1')
      ]
    }).completed;
    expect([cloned!.title, sessionStateSaid(cloned!), sessionDetail(cloned!)]).toEqual([
      'Before the refactor',
      'Open · answering',
      'shield-mvp-codex (codex) · Cloned from e67a52b2 at turn 2'
    ]);
    expect([sessionStateSaid(imported!), sessionDetail(imported!)]).toEqual(['Ended', 'inbox-triage · Imported from a file exported 2026-10-20']);
    expect([plain!.title || UNTITLED_SESSION, sessionStateSaid(plain!), sessionDetail(plain!)]).toEqual(['A conversation', 'Paused', 'inbox-triage']);
  });

  it('refuses a row of the older shape in a sentence, never guessing a state', () => {
    // The row ai-agents listed before 0.0.82: an entry with `session_uid`, `kind` and `created_at`, no `state`.
    expect(() => page({ completed: [{ uid: 'o1', app_uid: 'app-1', session_uid: 's2', kind: 'session', created_at: '2026-10-20T08:00:00Z' }] })).toThrow(
      'There is no session state "" (session o1): one of open, paused, ended.'
    );
    expect(() => page({ completed: [{ app_uid: 'app-1', state: 'paused' }] })).toThrow('A session row names its uid; this one does not.');
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
      completed: [session('a'), session('b')],
      next_offset: 2
    });
    const second = page({ completed: [session('b'), session('c')], next_offset: null });
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
