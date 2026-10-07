/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Datalayer Mobile's OAuth contract with IAM (MOBILE.md §6.1, M-004): a public
 * client, Authorization Code with PKCE S256, refresh rotation, RFC 7009
 * revocation. Pure: the browser step lives in `browserSignIn`.
 */

/** IAM's discovery, under the services' run URL. */
export const DISCOVERY_PATH = '/api/iam/v1/oauth/.well-known/openid-configuration';

/** Where IAM serves the client document; its URL is the client id. */
export const MOBILE_CLIENT_PATH = '/clients/datalayer-mobile.json';

export const SCOPES = ['openid', 'profile', 'email', 'offline_access'] as const;

/** Refresh this long before the access token expires. */
const EXPIRY_MARGIN_MS = 60_000;

export type OAuthConfig = {
  issuer: string;
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  redirectUri: string;
};

/** What a session keeps in SecureStore. A token pasted in a development build has no refresh. */
export type Credential = {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
};

export class OAuthFailure extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }

  /** The refresh token is gone: the person signs in again. */
  get signsOut(): boolean {
    return this.code === 'invalid_grant';
  }
}

/** Each build returns to the private scheme named by its application id (RFC 8252 §7.1). */
export function redirectUriOf(applicationId: string): string {
  return `${applicationId}://oauth`;
}

export async function discover(runUrl: string, applicationId: string, fetcher: typeof fetch = fetch): Promise<OAuthConfig> {
  const response = await fetcher(`${runUrl}${DISCOVERY_PATH}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new OAuthFailure('discovery', `IAM's sign-in could not be reached (${response.status}).`);
  }
  const metadata = (await response.json()) as Record<string, unknown>;
  const field = (name: string): string => {
    const value = metadata[name];
    if (typeof value !== 'string' || !value) {
      throw new OAuthFailure('discovery', `IAM's discovery has no ${name}.`);
    }
    return value;
  };
  const issuer = field('issuer');
  return {
    issuer,
    clientId: `${issuer}${MOBILE_CLIENT_PATH}`,
    authorizationEndpoint: field('authorization_endpoint'),
    tokenEndpoint: field('token_endpoint'),
    revocationEndpoint: field('revocation_endpoint'),
    redirectUri: redirectUriOf(applicationId)
  };
}

export function credentialOf(body: Record<string, unknown>, now: number): Credential {
  if (typeof body.access_token !== 'string' || !body.access_token) {
    throw new OAuthFailure('invalid_response', 'IAM answered without an access token.');
  }
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === 'string' && body.refresh_token ? body.refresh_token : undefined,
    expiresAt: typeof body.expires_in === 'number' ? now + body.expires_in * 1000 : undefined
  };
}

export function needsRefresh(credential: Credential, now: number): boolean {
  return Boolean(credential.refreshToken && credential.expiresAt !== undefined && credential.expiresAt - EXPIRY_MARGIN_MS <= now);
}

async function tokenRequest(
  config: OAuthConfig,
  form: Record<string, string>,
  fetcher: typeof fetch,
  now: () => number
): Promise<Credential> {
  const response = await fetcher(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ ...form, client_id: config.clientId }).toString()
  });
  const body = ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  if (!response.ok) {
    const code = typeof body.error === 'string' ? body.error : `http_${response.status}`;
    const description = typeof body.error_description === 'string' ? body.error_description : 'IAM refused the sign-in.';
    throw new OAuthFailure(code, description);
  }
  return credentialOf(body, now());
}

export function exchangeCode(
  config: OAuthConfig,
  code: string,
  codeVerifier: string,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<Credential> {
  return tokenRequest(
    config,
    { grant_type: 'authorization_code', code, code_verifier: codeVerifier, redirect_uri: config.redirectUri },
    fetcher,
    now
  );
}

/** A new pair; the refresh token is rotated, so the old one must be forgotten at once. */
export function refreshCredential(
  config: OAuthConfig,
  refreshToken: string,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<Credential> {
  return tokenRequest(config, { grant_type: 'refresh_token', refresh_token: refreshToken }, fetcher, now);
}

/** RFC 7009: IAM answers 200 whatever the token; a failure here never blocks signing out. */
export async function revoke(config: OAuthConfig, refreshToken: string, fetcher: typeof fetch = fetch): Promise<void> {
  await fetcher(config.revocationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken, token_type_hint: 'refresh_token', client_id: config.clientId }).toString()
  });
}
