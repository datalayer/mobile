/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The web preview's stand-in for the keychain (`make dev-web`, development
 * only): the tab's session storage, gone when the tab closes. Never a store
 * build: those are iOS and Android, where `deviceStore.ts` is used.
 */

export const deviceStore = {
  get: async (key: string): Promise<string | null> => globalThis.sessionStorage?.getItem(key) ?? null,
  set: async (key: string, value: string): Promise<void> => globalThis.sessionStorage?.setItem(key, value),
  remove: async (key: string): Promise<void> => globalThis.sessionStorage?.removeItem(key)
};
