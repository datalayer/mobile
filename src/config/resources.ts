/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Public destinations shown in Settings and entered in the store records. */
export const STORE_LINKS = {
  privacy: 'https://datalayer.ai/privacy',
  support: 'https://datalayer.ai/support',
  /** The web's control, the same as the app's Settings → Delete account: the store records' deletion URL. */
  accountDeletion: 'https://datalayer.ai/settings/profile/danger'
} as const;
