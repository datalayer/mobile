/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createHash } from 'node:crypto';
import { Problem } from '@datalayer/core/lib/portable';
import { createClient } from '../api/client';
import {
  OAuthFailure,
  SIGN_IN_PROVIDERS,
  credentialOf,
  discover,
  exchangeCode,
  needsRefresh,
  passwordCode,
  pkceOf,
  providerAuthorizationEndpoint,
  redirectUriOf,
  refreshCredential,
  revoke,
  type OAuthConfig
} from '../auth/oauth';
import { PROVIDER_BUTTONS, signInOutcomeOf } from '../auth/signInWords';
import { credentialFromKept } from '../auth/tokenStore';

const ISSUER = 'https://prod1.datalayer.run/api/iam/v1/oauth';

const CONFIG: OAuthConfig = {
  issuer: ISSUER,
  clientId: `${ISSUER}/clients/datalayer-mobile.json`,
  authorizationEndpoint: `${ISSUER}/authorize`,
  tokenEndpoint: `${ISSUER}/token`,
  revocationEndpoint: `${ISSUER}/revoke`,
  redirectUri: 'ai.datalayer.mobile://oauth'
};

type Sent = { url: string; init: RequestInit };

function server(answer: (sent: Sent) => [number, unknown]) {
  const sent: Sent[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const call = { url, init };
    sent.push(call);
    const [status, body] = answer(call);
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  return { sent, fetcher };
}

const form = (sent: Sent | undefined) => Object.fromEntries(new URLSearchParams(String(sent?.init.body)));

describe('the OAuth contract with IAM', () => {
  it('reads its endpoints from discovery; the client id is the document under the issuer', async () => {
    const { sent, fetcher } = server(() => [
      200,
      {
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        revocation_endpoint: `${ISSUER}/revoke`
      }
    ]);
    const config = await discover('https://prod1.datalayer.run', 'ai.datalayer.mobile.preview', fetcher);
    expect(sent[0]?.url).toBe('https://prod1.datalayer.run/api/iam/v1/oauth/.well-known/openid-configuration');
    expect(config.clientId).toBe(`${ISSUER}/clients/datalayer-mobile.json`);
    expect(config.redirectUri).toBe('ai.datalayer.mobile.preview://oauth');
  });

  it('refuses a discovery without a token endpoint', async () => {
    const { fetcher } = server(() => [200, { issuer: ISSUER, authorization_endpoint: 'x', revocation_endpoint: 'y' }]);
    await expect(discover('https://run', 'ai.datalayer.mobile', fetcher)).rejects.toThrow('token_endpoint');
  });

  it('each build returns to its own private scheme', () => {
    expect(redirectUriOf('ai.datalayer.mobile')).toBe('ai.datalayer.mobile://oauth');
    expect(redirectUriOf('ai.datalayer.mobile.dev')).toBe('ai.datalayer.mobile.dev://oauth');
  });

  it('exchanges the code with its verifier, as a public client', async () => {
    const { sent, fetcher } = server(() => [200, { access_token: 'a', refresh_token: 'r', expires_in: 3600 }]);
    const credential = await exchangeCode(CONFIG, 'the-code', 'the-verifier', fetcher, () => 1000);
    expect(sent[0]?.url).toBe(`${ISSUER}/token`);
    expect(form(sent[0])).toEqual({
      grant_type: 'authorization_code',
      code: 'the-code',
      code_verifier: 'the-verifier',
      redirect_uri: 'ai.datalayer.mobile://oauth',
      client_id: CONFIG.clientId
    });
    expect(form(sent[0]).client_secret).toBeUndefined();
    expect(credential).toEqual({ accessToken: 'a', refreshToken: 'r', expiresAt: 1000 + 3600 * 1000 });
  });

  it('rotates on refresh, and a refused refresh token signs out', async () => {
    const { sent, fetcher } = server(() => [200, { access_token: 'a2', refresh_token: 'r2', expires_in: 3600 }]);
    expect((await refreshCredential(CONFIG, 'r1', fetcher, () => 0)).refreshToken).toBe('r2');
    expect(form(sent[0])).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'r1' });

    const refused = server(() => [400, { error: 'invalid_grant', error_description: 'Unknown or revoked refresh token.' }]);
    const failure = await refreshCredential(CONFIG, 'r1', refused.fetcher).catch(error => error);
    expect(failure).toBeInstanceOf(OAuthFailure);
    expect(failure.signsOut).toBe(true);
  });

  it('revokes the refresh token on sign-out', async () => {
    const { sent, fetcher } = server(() => [200, {}]);
    await revoke(CONFIG, 'r1', fetcher);
    expect(sent[0]?.url).toBe(`${ISSUER}/revoke`);
    expect(form(sent[0])).toMatchObject({ token: 'r1', token_type_hint: 'refresh_token' });
  });

  it('refreshes a minute before expiry, and never a credential without a refresh token', () => {
    expect(needsRefresh({ accessToken: 'a', refreshToken: 'r', expiresAt: 100_000 }, 30_000)).toBe(false);
    expect(needsRefresh({ accessToken: 'a', refreshToken: 'r', expiresAt: 100_000 }, 50_000)).toBe(true);
    expect(needsRefresh({ accessToken: 'a', expiresAt: 0 }, 50_000)).toBe(false);
    expect(() => credentialOf({}, 0)).toThrow(OAuthFailure);
  });

  it('reads a kept credential, and a bare token kept by an earlier build', () => {
    expect(credentialFromKept(JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: 5 }))).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 5
    });
    expect(credentialFromKept('bare-token')).toEqual({ accessToken: 'bare-token' });
    expect(credentialFromKept(null)).toBeNull();
  });
});

describe('signing in inside the app', () => {
  const RUN = 'https://prod1.datalayer.run';
  const json = (sent: Sent | undefined) => JSON.parse(String(sent?.init.body)) as Record<string, string>;

  it('posts a handle or email and password with the request of the app, for a code', async () => {
    const { sent, fetcher } = server(() => [200, { code: 'the-code', iss: ISSUER }]);
    const code = await passwordCode(RUN, CONFIG, { identifier: '  eric ', password: ' pass word ' }, 'the-challenge', fetcher);
    expect(code).toBe('the-code');
    expect(sent[0]?.url).toBe('https://prod1.datalayer.run/api/iam/v1/oauth2/mobile/password');
    expect(sent[0]?.init.method).toBe('POST');
    expect(json(sent[0])).toEqual({
      client_id: CONFIG.clientId,
      redirect_uri: 'ai.datalayer.mobile://oauth',
      code_challenge: 'the-challenge',
      code_challenge_method: 'S256',
      scope: 'openid profile email offline_access',
      identifier: 'eric',
      // A password is sent as typed: its spaces are its own.
      password: ' pass word ',
      mfa_code: ''
    });
    // Nothing of the credentials in the URL.
    expect(sent[0]?.url).not.toContain('?');
  });

  it('keeps the refusal IAM gives: a wrong password, a second factor asked, then a wrong code', async () => {
    const refusal = (body: unknown) => passwordCode(RUN, CONFIG, { identifier: 'eric', password: 'x' }, 'c', server(() => [401, body]).fetcher).catch(e => e);
    const wrong = await refusal({ error: 'invalid_grant', error_description: 'That handle or email and password do not match.' });
    expect(wrong).toBeInstanceOf(OAuthFailure);
    expect(signInOutcomeOf(wrong)).toEqual({ needsMfaCode: false, problem: 'That handle or email and password do not match.' });
    expect(signInOutcomeOf(await refusal({ error: 'mfa_required', error_description: 'Enter the code.' }))).toEqual({
      needsMfaCode: true,
      problem: ''
    });
    expect(signInOutcomeOf(await refusal({ error: 'invalid_mfa_code', error_description: 'That code is not the one expected.' }))).toEqual({
      needsMfaCode: true,
      problem: 'That code is not the one expected.'
    });
    const unreachable = await passwordCode(RUN, CONFIG, { identifier: 'e', password: 'x' }, 'c', server(() => [503, null]).fetcher).catch(e => e);
    expect(unreachable.message).toBe('Datalayer could not sign you in (503).');
  });

  it('sends the authenticator code once asked', async () => {
    const { sent, fetcher } = server(() => [200, { code: 'c' }]);
    await passwordCode(RUN, CONFIG, { identifier: 'ada', password: 'p', mfaCode: ' 123456 ' }, 'ch', fetcher);
    expect(json(sent[0]).mfa_code).toBe('123456');
  });

  it('refuses an answer without a code', async () => {
    const failure = await passwordCode(RUN, CONFIG, { identifier: 'e', password: 'p' }, 'c', server(() => [200, {}]).fetcher).catch(e => e);
    expect(failure).toBeInstanceOf(OAuthFailure);
  });

  it('opens each provider at IAM, never at the web application', () => {
    expect(SIGN_IN_PROVIDERS).toEqual(['github', 'google', 'linkedin']);
    expect(providerAuthorizationEndpoint(RUN, 'github')).toBe('https://prod1.datalayer.run/api/iam/v1/oauth2/mobile/github/authorize');
    for (const provider of SIGN_IN_PROVIDERS) {
      expect(providerAuthorizationEndpoint(RUN, provider)).not.toMatch(/datalayer\.ai/);
    }
    expect(PROVIDER_BUTTONS.map(button => button.label)).toEqual([
      'Continue with GitHub',
      'Continue with Google',
      'Continue with LinkedIn'
    ]);
  });

  it('makes a PKCE pair whose challenge is the S256 of its verifier', async () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, i) => (i * 37) % 256);
    const sha256 = async (input: string) => createHash('sha256').update(input).digest('base64');
    const { verifier, challenge } = await pkceOf(bytes, sha256);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
    await expect(pkceOf(new Uint8Array(16), sha256)).rejects.toThrow('43');
  });

  it('says a refused token, or an unreachable server, in a sentence', () => {
    expect(signInOutcomeOf(new Problem('unauthenticated', '', 401)).problem).toBe('That did not sign you in. Check and try again.');
    expect(signInOutcomeOf(new Error('Network request failed')).problem).toBe('Network request failed');
    expect(signInOutcomeOf('nope').problem).toBe('Something went wrong.');
  });
});

describe('the client after a 401', () => {
  it('refreshes once and sends the request again with the new token', async () => {
    const { sent, fetcher } = server(sent =>
      (sent.init.headers as Record<string, string>).Authorization === 'Bearer fresh' ? [200, { ok: true }] : [401, {}]
    );
    const refresh = jest.fn(async () => 'fresh');
    const client = createClient({ baseUrl: 'https://run', getAccessToken: () => 'stale', refreshAccessToken: refresh, fetch: fetcher });
    await expect(client('/api/x', { method: 'POST', body: {} })).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
  });

  it('says unauthenticated when no fresh token can be had', async () => {
    const { sent, fetcher } = server(() => [401, {}]);
    const client = createClient({
      baseUrl: 'https://run',
      getAccessToken: () => 'stale',
      refreshAccessToken: async () => undefined,
      fetch: fetcher
    });
    await expect(client('/api/x')).rejects.toMatchObject({ kind: 'unauthenticated' });
    expect(sent).toHaveLength(1);
  });

  it('does not refresh for a token given by the caller', async () => {
    const { fetcher } = server(() => [401, {}]);
    const refresh = jest.fn(async () => 'fresh');
    const client = createClient({ baseUrl: 'https://run', getAccessToken: () => 'x', refreshAccessToken: refresh, fetch: fetcher });
    await expect(client('/api/iam/v1/me', { token: 'candidate' })).rejects.toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
