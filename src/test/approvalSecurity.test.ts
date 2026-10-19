/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { getApproval, type Approval } from '../api/approvals';
import { createClient } from '../api/client';
import { Problem } from '@datalayer/core/lib/portable';
import { decideShown, oneDecisionAtATime, outcomeOf, type DecisionInput } from '../features/approvals/decision';
import { routeOfNotification } from '../push/routes';

const shown: Approval = {
  id: 'approval-1',
  agentId: 'agent-1',
  runtimeName: 'runtime-1',
  toolName: 'send',
  toolArgs: { to: ['person@example.com'], body: 'Complete draft.' },
  status: 'pending',
  read: true,
  note: '',
  expiresAt: '2026-10-14T12:00:00Z',
  createdAt: '2026-10-14T11:00:00Z',
  updatedAt: '2026-10-14T11:00:00Z'
};

const input: DecisionInput = { decision: 'approve', note: 'Looks right.', shown };
const rawApproval = (status = 'pending', toolArgs: Approval['toolArgs'] = shown.toolArgs) => ({
  id: shown.id,
  agent_id: shown.agentId,
  runtime_name: shown.runtimeName,
  tool_name: shown.toolName,
  tool_args: toolArgs,
  status,
  read: shown.read,
  note: shown.note,
  expires_at: shown.expiresAt,
  created_at: shown.createdAt,
  updated_at: shown.updatedAt
});
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
});

function scripted(...steps: (Response | Error)[]): { client: ReturnType<typeof createClient>; fetcher: jest.Mock } {
  const fetcher = jest.fn(async () => {
    const step = steps.shift();
    if (!step) throw new Error('Unexpected request.');
    if (step instanceof Error) throw step;
    return step;
  });
  return {
    client: createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'person', fetch: fetcher as typeof fetch }),
    fetcher
  };
}

const failureOf = async (promise: Promise<unknown>): Promise<Problem> => {
  const failure = await promise.catch(error => error);
  expect(failure).toBeInstanceOf(Problem);
  return failure as Problem;
};

describe('the approval security matrix', () => {
  it('does not turn another person’s id into approval data or a decision call', async () => {
    const { client, fetcher } = scripted(response(403, { detail: 'Not yours.' }));
    const failure = await failureOf(getApproval(client, 'someone-elses-approval'));
    expect(failure.kind).toBe('forbidden');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['approved', 'rejected', 'expired'])('refuses an already %s request before POST', async status => {
    const { client, fetcher } = scripted(response(200, rawApproval(status)));
    const failure = await failureOf(decideShown(client, shown.id, input));
    expect(outcomeOf(failure)).toBe('stale');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refuses changed arguments before POST', async () => {
    const { client, fetcher } = scripted(response(200, rawApproval('pending', { ...shown.toolArgs, body: 'Changed.' })));
    const failure = await failureOf(decideShown(client, shown.id, input));
    expect(outcomeOf(failure)).toBe('stale');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('coalesces a double tap into one in-flight decision', async () => {
    let finish!: (value: Approval) => void;
    const underlying = jest.fn(() => new Promise<Approval>(resolve => { finish = resolve; }));
    const run = oneDecisionAtATime(underlying);
    const first = run(input);
    const second = run(input);
    expect(first).toBe(second);
    expect(underlying).toHaveBeenCalledTimes(1);
    finish({ ...shown, status: 'approved' });
    await expect(first).resolves.toMatchObject({ status: 'approved' });
  });

  it('treats a two-device race at POST as stale server truth', async () => {
    const { client } = scripted(response(200, rawApproval()), response(409, { detail: 'Already answered.' }));
    const failure = await failureOf(decideShown(client, shown.id, input));
    expect(outcomeOf(failure)).toBe('stale');
  });

  it('keeps an offline request retryable and sends no decision', async () => {
    const { client, fetcher } = scripted(new TypeError('Network request failed'));
    const failure = await failureOf(decideShown(client, shown.id, input));
    expect(failure.kind).toBe('offline');
    expect(outcomeOf(failure)).toBe('retry');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('reconciles a lost response before a person retries, without a second POST', async () => {
    const { client, fetcher } = scripted(
      response(200, rawApproval()),
      new TypeError('Connection closed after the server answered.'),
      response(200, rawApproval('approved'))
    );
    expect(outcomeOf(await failureOf(decideShown(client, shown.id, input)))).toBe('retry');
    expect(outcomeOf(await failureOf(decideShown(client, shown.id, input)))).toBe('stale');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('does not automatically retry a temporarily unavailable decision route', async () => {
    const { client, fetcher } = scripted(response(200, rawApproval()), response(503, { detail: 'Run unavailable.' }));
    const failure = await failureOf(decideShown(client, shown.id, input));
    expect(outcomeOf(failure)).toBe('retry');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('opens a notification id safely, then says gone when that approval was deleted', async () => {
    expect(routeOfNotification({ v: 1, route: '/approvals/deleted-1' })).toBe('/approvals/deleted-1');
    const { client, fetcher } = scripted(response(404, { detail: 'Gone.' }));
    const failure = await failureOf(getApproval(client, 'deleted-1'));
    expect(outcomeOf(failure)).toBe('gone');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
