/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { deviceStore } from '../storage/deviceStore';
import type { Credential } from './oauth';

const TOKEN_KEY = 'datalayer.session.token';

/** A kept value: the credential as JSON, or a bare token from before refresh existed. */
export function credentialFromKept(kept: string | null): Credential | null {
  if (!kept) {
    return null;
  }
  try {
    const parsed = JSON.parse(kept) as Partial<Credential>;
    if (parsed && typeof parsed.accessToken === 'string' && parsed.accessToken) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : undefined,
        expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined
      };
    }
  } catch {
    // A bare token.
  }
  return { accessToken: kept };
}

/** The session's credential, in the platform keychain/keystore only. */
export const tokenStore = {
  read: async (): Promise<Credential | null> => credentialFromKept(await deviceStore.get(TOKEN_KEY)),
  write: (credential: Credential): Promise<void> => deviceStore.set(TOKEN_KEY, JSON.stringify(credential)),
  forget: (): Promise<void> => deviceStore.remove(TOKEN_KEY)
};

export type TokenStore = typeof tokenStore;
