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
    expect(relativeTime('2026-10-15T09:00:00Z', Date.parse('2026-10-15T08:00:00Z'), 'en')).toBe('in 1 hour');
    expect(relativeTime('not-a-date')).toBe('');
  });
});
