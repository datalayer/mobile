/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import {
  OAuthFailure,
  credentialOf,
  discover,
  exchangeCode,
  needsRefresh,
  redirectUriOf,
  refreshCredential,
  revoke,
  type OAuthConfig
} from '../auth/oauth';
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

describe('the OAuth contract with IAM (M-004)', () => {
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
