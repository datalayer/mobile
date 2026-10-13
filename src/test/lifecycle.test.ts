/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import {
  changeDeploymentState, deploymentOf, getResetCounts, resetDeployment, resetWords, stoppedWorkOf, stoppedWorkWords
} from '../api/deployments';

describe('owner deployment lifecycle', () => {
  it('pauses the exact version and says everything that did and did not stop', async () => {
    const fetcher = jest.fn(async () => new Response(JSON.stringify({
      deployment: { uid: 'd1', app_uid: 'a1', version: 4, state: 'paused', target: 'hosted' },
      work: {
        stopped: [{ what: 'Conversation one', runtime: 'r1' }],
        not_stopped: [{ what: 'Conversation two', runtime: 'r2', why: 'The runtime was unreachable.' }]
      }
    }), { status: 200 })) as unknown as typeof fetch;
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'owner', fetch: fetcher });
    const result = await changeDeploymentState(client, deploymentOf({ uid: 'd1', version: 4 }), 'paused');
    expect(result.deployment.state).toBe('paused');
    expect(stoppedWorkWords(result.work!)).toBe(
      'Paused: 1 session in progress stopped. Not stopped — Conversation two (r2): The runtime was unreachable.'
    );
    expect(fetcher).toHaveBeenCalledWith('https://run.test/api/ai-agents/v1/apps/deployments/d1', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ version: 4, state: 'paused' })
    }));
  });

  it('says when pause found no work and parses missing lists safely', () => {
    const work = stoppedWorkOf({});
    expect(work).toEqual({ stopped: [], notStopped: [] });
    expect(stoppedWorkWords(work)).toBe('Paused: nothing was running.');
  });

  it('reads reset counts, then posts those exact confirmed counts', async () => {
    const answers = [
      { paused: true, reset: { conversations: 3, entries: 27, schedules: 2, memories_note: 'Its memories stay.' } },
      { deleted: { conversations: 3, schedules: 2 }, not_deleted: [{ what: 'memories', why: 'Its memories stay.' }] }
    ];
    const fetcher = jest.fn(async () => new Response(JSON.stringify(answers.shift()), { status: 200 })) as unknown as typeof fetch;
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'owner', fetch: fetcher });
    const read = await getResetCounts(client, 'd1');
    expect(read).toEqual({
      paused: true,
      counts: { conversations: 3, entries: 27, schedules: 2, memoriesNote: 'Its memories stay.' }
    });
    expect(resetWords(read.counts)).toEqual({
      deletes: '3 conversations and 2 schedules',
      stays: 'The deployment, its address and version stay. Its memories stay.'
    });
    await expect(resetDeployment(client, 'd1', read.counts)).resolves.toEqual({
      notDeleted: [{ what: 'memories', why: 'Its memories stay.' }]
    });
    expect(fetcher).toHaveBeenLastCalledWith(
      'https://run.test/api/ai-agents/v1/apps/deployments/d1/reset',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ conversations: 3, schedules: 2 }) })
    );
  });
});
