/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'datalayer.session.token';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
};

/** The session's token, in the platform keychain/keystore only (MOBILE.md §2.9). */
export const tokenStore = {
  read: (): Promise<string | null> => SecureStore.getItemAsync(TOKEN_KEY, OPTIONS),
  write: (token: string): Promise<void> => SecureStore.setItemAsync(TOKEN_KEY, token, OPTIONS),
  forget: (): Promise<void> => SecureStore.deleteItemAsync(TOKEN_KEY, OPTIONS)
};

export type TokenStore = typeof tokenStore;
