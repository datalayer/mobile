/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { deviceStore } from '../storage/deviceStore';

const TOKEN_KEY = 'datalayer.session.token';

/** The session's token, in the platform keychain/keystore only (MOBILE.md §2.9). */
export const tokenStore = {
  read: (): Promise<string | null> => deviceStore.get(TOKEN_KEY),
  write: (token: string): Promise<void> => deviceStore.set(TOKEN_KEY, token),
  forget: (): Promise<void> => deviceStore.remove(TOKEN_KEY)
};

export type TokenStore = typeof tokenStore;
