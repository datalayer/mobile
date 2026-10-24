/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { AuthRequest, CodeChallengeMethod, ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { OAuthFailure, SCOPES, type OAuthConfig } from './oauth';

WebBrowser.maybeCompleteAuthSession();

/**
 * A provider's consent in a browser tab the app opens — ASWebAuthenticationSession
 * on iOS, Custom Tabs on Android, never a WebView (Google refuses OAuth in one) —
 * at `authorizationEndpoint` (IAM's, which sends it straight on to the provider),
 * back through the build's private scheme: the code and the verifier that alone
 * can redeem it. `state` is checked by `AuthRequest`, which reports a mismatch
 * as an error; the issuer answering (RFC 9207) must be the build's.
 */
export async function browserSignIn(
  config: OAuthConfig,
  authorizationEndpoint: string
): Promise<{ code: string; codeVerifier: string } | undefined> {
  const request = new AuthRequest({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: [...SCOPES],
    responseType: ResponseType.Code,
    usePKCE: true,
    codeChallengeMethod: CodeChallengeMethod.S256
  });
  const result = await request.promptAsync({ authorizationEndpoint });
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return undefined;
  }
  if (result.type !== 'success') {
    const message = result.type === 'error' ? (result.error?.description ?? result.error?.message) : undefined;
    throw new OAuthFailure('authorization', message ?? 'Datalayer did not sign you in.');
  }
  if (result.params.iss && result.params.iss !== config.issuer) {
    throw new OAuthFailure('authorization', 'Another server answered the sign-in.');
  }
  const code = result.params.code;
  if (!code || !request.codeVerifier) {
    throw new OAuthFailure('authorization', 'Datalayer answered without a code.');
  }
  return { code, codeVerifier: request.codeVerifier };
}
