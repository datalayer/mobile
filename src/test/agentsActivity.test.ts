/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { runtimeOf, scheduledSays } from '@datalayer/agent-runtimes/lib/portable';
import { absoluteTime, relativeTime } from '../i18n/time';

describe('a standalone agent stays narrower than an application (M-014a)', () => {
  it('does not project application-only capabilities from a raw runtime', () => {
    expect(
      runtimeOf({
        runtime_name: 'raw-1',
        type: 'agent',
        app_uid: 'must-not-cross',
        deployments: [{ uid: 'must-not-cross' }],
        speaks: { pap: { version: '1' } },
        rules: [{ action: '*' }]
      })
    ).toEqual({
      uid: '',
      runtimeName: 'raw-1',
      givenName: '',
      environment: '',
      agentSpecId: '',
      type: 'agent',
      state: 'running',
      startedAt: '',
      expiredAt: '',
      ingress: ''
    });
  });
});

describe('application activity wording (M-015a)', () => {
  it('describes schedules and gives localised absolute plus accessible relative time', () => {
    expect(
      scheduledSays({
        deploymentUid: 'd1',
        appUid: 'a1',
        version: 3,
        position: 0,
        cron: '0 9 * * 1',
        description: 'Weekly review',
        nextAt: '2026-10-15T09:00:00Z'
      })
    ).toBe('Weekly review (0 9 * * 1) · version 3');
    expect(absoluteTime('2026-10-15T09:00:00Z', 'en-GB')).toMatch(/15 Oct 2026/);
    const at = Date.parse('2026-10-15T08:00:00Z');
    expect(relativeTime('2026-10-15T09:00:00Z', at)).toBe('in 1 hour');
    expect(relativeTime('2026-10-15T05:00:00Z', at)).toBe('3 hours ago');
    expect(relativeTime('2026-10-14T08:00:00Z', at)).toBe('yesterday');
    expect(relativeTime('2026-10-16T08:00:00Z', at)).toBe('tomorrow');
    expect(relativeTime('2026-10-15T08:00:00Z', at)).toBe('now');
    expect(relativeTime('2026-10-12T08:00:00Z', at)).toBe('3 days ago');
    expect(relativeTime('not-a-date')).toBe('');
  });
});
