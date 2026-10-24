/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Datalayer Mobile's OAuth contract with IAM: a public
 * client, Authorization Code with PKCE S256, refresh rotation, RFC 7009
 * revocation. Pure: the browser step lives in `browserSignIn`, the random
 * bytes and the digest in `pkce`.
 *
 * Every way in ends with a code for this client, bound to the phone's PKCE
 * challenge and redeemed at the token endpoint: a handle or email and password
 * typed in the app (`passwordCode`), or GitHub, Google or LinkedIn in a
 * browser tab opened straight at IAM (`providerAuthorizationEndpoint`).
 */

/** IAM's discovery, under the services' run URL. */
export const DISCOVERY_PATH = '/api/iam/v1/oauth/.well-known/openid-configuration';

/** Where IAM serves the client document; its URL is the client id. */
export const MOBILE_CLIENT_PATH = '/clients/datalayer-mobile.json';

export const SCOPES = ['openid', 'profile', 'email', 'offline_access'] as const;

/** IAM's in-app sign-in, under the services' run URL. */
export const MOBILE_SIGN_IN_PATH = '/api/iam/v1/oauth2/mobile';

/** The providers the sign-in screen offers, each through IAM. */
export const SIGN_IN_PROVIDERS = ['github', 'google', 'linkedin'] as const;

export type SignInProvider = (typeof SIGN_IN_PROVIDERS)[number];

export type PasswordSignIn = {
  /** A handle or an email. */
  identifier: string;
  password: string;
  /** The authenticator's code, once IAM answered `mfa_required`. */
  mfaCode?: string;
};

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

/** Where the browser tab opens for a provider: IAM, which sends it on to the provider's consent. */
export function providerAuthorizationEndpoint(runUrl: string, provider: SignInProvider): string {
  return `${runUrl}${MOBILE_SIGN_IN_PATH}/${provider}/authorize`;
}

/**
 * A handle or email and password, posted to IAM over HTTPS, for a code bound
 * to `codeChallenge`. The password goes in this one request body and is kept
 * nowhere. Refusals keep IAM's code: `invalid_grant`, `mfa_required`,
 * `invalid_mfa_code`.
 */
export async function passwordCode(
  runUrl: string,
  config: OAuthConfig,
  input: PasswordSignIn,
  codeChallenge: string,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const response = await fetcher(`${runUrl}${MOBILE_SIGN_IN_PATH}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: SCOPES.join(' '),
      identifier: input.identifier.trim(),
      password: input.password,
      mfa_code: input.mfaCode?.trim() ?? ''
    })
  });
  const body = ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  if (!response.ok) {
    const code = typeof body.error === 'string' ? body.error : `http_${response.status}`;
    const description =
      typeof body.error_description === 'string' ? body.error_description : `Datalayer could not sign you in (${response.status}).`;
    throw new OAuthFailure(code, description);
  }
  if (typeof body.code !== 'string' || !body.code) {
    throw new OAuthFailure('invalid_response', 'IAM answered without a code.');
  }
  return body.code;
}

/** RFC 7636's unreserved alphabet, 64 letters so a byte maps without bias. */
const VERIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** A PKCE pair from 64 random bytes and a SHA-256 that answers base64. */
export async function pkceOf(
  randomBytes: Uint8Array,
  sha256Base64: (input: string) => Promise<string>
): Promise<{ verifier: string; challenge: string }> {
  if (randomBytes.length < 43) {
    throw new Error('A PKCE verifier needs at least 43 random bytes.');
  }
  const verifier = Array.from(randomBytes, byte => VERIFIER_ALPHABET[byte & 63]).join('');
  const challenge = (await sha256Base64(verifier)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
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
