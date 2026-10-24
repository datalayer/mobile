/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { isProblem } from '@datalayer/core/lib/portable';
import { OAuthFailure, SIGN_IN_PROVIDERS, type SignInProvider } from './oauth';

const PROVIDER_NAMES: Record<SignInProvider, string> = {
  github: 'GitHub',
  google: 'Google',
  linkedin: 'LinkedIn'
};

/** The sign-in screen's provider buttons, in order. */
export const PROVIDER_BUTTONS: readonly { provider: SignInProvider; label: string }[] = SIGN_IN_PROVIDERS.map(provider => ({
  provider,
  label: `Continue with ${PROVIDER_NAMES[provider]}`
}));

/**
 * What a failed sign-in says, and whether IAM asked for the authenticator's
 * code. IAM's own words when it gave some; never the credentials.
 */
export function signInOutcomeOf(error: unknown): { needsMfaCode: boolean; problem: string } {
  if (error instanceof OAuthFailure) {
    if (error.code === 'mfa_required') {
      return { needsMfaCode: true, problem: '' };
    }
    return { needsMfaCode: error.code === 'invalid_mfa_code', problem: error.message };
  }
  if (isProblem(error) && error.kind === 'unauthenticated') {
    return { needsMfaCode: false, problem: 'That did not sign you in. Check and try again.' };
  }
  return { needsMfaCode: false, problem: error instanceof Error ? error.message : 'Something went wrong.' };
}
