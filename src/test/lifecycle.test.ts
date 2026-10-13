/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import { changeDeploymentState, deploymentOf, stoppedWorkOf, stoppedWorkWords } from '../api/deployments';

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
});
