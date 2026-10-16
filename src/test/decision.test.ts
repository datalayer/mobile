/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { approvalOf, decide } from '../api/approvals';
import { createClient } from '../api/client';
import { Problem } from '@datalayer/core/lib/portable';
import { confirmTitle, outcomeOf, outcomeSays, statusSays } from '../features/approvals/decision';

const respond = (status: number, body: unknown): typeof fetch => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  (fetcher as unknown as { calls: typeof calls }).calls = calls;
  return fetcher;
};

const callsOf = (fetcher: typeof fetch) => (fetcher as unknown as { calls: { url: string; init?: RequestInit }[] }).calls;

describe('a decision (M-020)', () => {
  it('names the action it confirms', () => {
    expect(confirmTitle('approve', 'Send email')).toBe('Approve: Send email?');
    expect(confirmTitle('reject', 'Send email')).toBe('Reject: Send email?');
  });

  it('goes through the audited route with the note, and nothing else', async () => {
    const fetcher = respond(200, { success: true, approval: { id: 'a1', status: 'approved', tool_name: 'send' } });
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 't', fetch: fetcher });
    const approved = await decide(client, 'a1', 'approve', '  ok  ');
    expect(approved.status).toBe('approved');
    const [call] = callsOf(fetcher);
    expect(call!.url).toBe('https://run.test/api/ai-agents/v1/tool-approvals/a1/approve');
    expect(call!.init?.method).toBe('POST');
    expect(JSON.parse(String(call!.init?.body))).toEqual({ note: 'ok' });
  });

  it('sends an empty body without a note', async () => {
    const fetcher = respond(200, { success: true, approval: { id: 'a1', status: 'rejected' } });
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 't', fetch: fetcher });
    await decide(client, 'a1', 'reject');
    expect(JSON.parse(String(callsOf(fetcher)[0]!.init?.body))).toEqual({});
  });

  it.each([
    [409, 'stale'],
    [404, 'gone'],
    [503, 'retry'],
    [500, 'retry']
  ])('a %i replaces the controls as the plan says: %s', async (status, outcome) => {
    const fetcher = respond(status, { detail: 'no' });
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 't', fetch: fetcher });
    const failure = await decide(client, 'a1', 'approve').catch(error => error);
    expect(failure).toBeInstanceOf(Problem);
    expect(outcomeOf(failure)).toBe(outcome);
    expect(outcomeSays(outcomeOf(failure))).not.toBe('');
  });

  it('says every status in words', () => {
    expect(statusSays('pending')).toBe('Waiting for your answer.');
    expect(statusSays('expired')).toMatch(/no longer be answered/);
    expect(statusSays('odd')).toBe('odd');
  });

  it('reads the server answer back as an approval', () => {
    expect(approvalOf({ id: 'a', status: 'approved', read: true }).read).toBe(true);
  });
});
