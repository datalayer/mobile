/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import { PROBLEM_WORDS, Problem, kindOfStatus } from '../api/problems';
import { environmentOf, runUrlProblem } from '../config/environment';
import { personOf } from '../auth/iam';

const respond = (status: number, body: unknown): typeof fetch =>
  jest.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('the environment (MOBILE.md §5.4)', () => {
  it('takes HTTPS, and plain HTTP only for a local simulator or emulator', () => {
    expect(runUrlProblem('https://prod1.datalayer.run')).toBe('');
    expect(runUrlProblem('http://localhost:8888')).toBe('');
    expect(runUrlProblem('http://10.0.2.2:8888')).toBe('');
    expect(runUrlProblem('http://192.168.1.10')).toMatch(/must be HTTPS/);
    expect(runUrlProblem('nope')).toMatch(/not a URL/);
    expect(runUrlProblem(undefined)).toMatch(/not set/);
  });

  it('offers the interim sign-in to development builds only (M-019)', () => {
    const of = (profile: string) =>
      environmentOf({ EXPO_PUBLIC_DATALAYER_RUN_URL: 'https://prod1.datalayer.run/', EXPO_PUBLIC_BUILD_PROFILE: profile });
    expect(of('development').allowsInterimSignIn).toBe(true);
    expect(of('e2e').allowsInterimSignIn).toBe(true);
    expect(of('preview').allowsInterimSignIn).toBe(true);
    expect(of('staging').allowsInterimSignIn).toBe(false);
    expect(of('production').allowsInterimSignIn).toBe(false);
    expect(of('unknown').profile).toBe('production');
    expect(of('development').runUrl).toBe('https://prod1.datalayer.run');
  });
});

describe('problems (M-013)', () => {
  it('gives each status its words', () => {
    expect([401, 403, 404, 409, 429, 503, 500].map(kindOfStatus)).toEqual([
      'unauthenticated',
      'forbidden',
      'not-found',
      'conflict',
      'rate-limited',
      'unavailable',
      'unexpected'
    ]);
    expect(new Problem('offline', 'x').message).toBe(PROBLEM_WORDS.offline);
  });
});

describe('the client', () => {
  it('sends the session token and parses JSON', async () => {
    const fetcher = respond(200, { me: { uid: 'u1' } });
    const client = createClient({ baseUrl: 'https://run', getAccessToken: () => 'secret', fetch: fetcher });
    await expect(client('/api/iam/v1/me')).resolves.toEqual({ me: { uid: 'u1' } });
    const [url, init] = (fetcher as jest.Mock).mock.calls[0];
    expect(url).toBe('https://run/api/iam/v1/me');
    expect(init.headers.Authorization).toBe('Bearer secret');
  });

  it('turns a refusal into a Problem whose detail carries no query value', async () => {
    const client = createClient({ baseUrl: 'https://run', getAccessToken: () => undefined, fetch: respond(404, { detail: 'gone' }) });
    const failure = client('/api/x?token=leak').catch(error => error);
    const problem = (await failure) as Problem;
    expect(problem.kind).toBe('not-found');
    expect(problem.detail).toBe('GET https://run/api/x → 404: gone');
    expect(problem.detail).not.toContain('leak');
  });

  it('says offline when the request never reached a server', async () => {
    const fetcher = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const client = createClient({ baseUrl: 'https://run', getAccessToken: () => undefined, fetch: fetcher });
    await expect(client('/x')).rejects.toMatchObject({ kind: 'offline' });
  });

  it('treats a body that says success: false as a failure', async () => {
    const client = createClient({ baseUrl: 'https://run', getAccessToken: () => undefined, fetch: respond(200, { success: false, message: 'no' }) });
    await expect(client('/x')).rejects.toMatchObject({ kind: 'unexpected' });
  });
});

describe('the person', () => {
  it('reads IAM’s user, and refuses one without a handle or uid', () => {
    expect(personOf({ uid: 'u1', handle_s: 'eric', first_name_t: 'Eric', last_name_t: 'Charles' })).toEqual({
      uid: 'u1',
      handle: 'eric',
      displayName: 'Eric Charles',
      avatarIcon: undefined
    });
    expect(personOf({ uid: 'u1', handle_s: 'eric' })?.displayName).toBe('eric');
    expect(personOf({ handle_s: 'eric' })).toBeUndefined();
    expect(personOf(null)).toBeUndefined();
  });
});
