/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The runtime version Settings shows. `expo-updates` knows the one the build
 * resolved (`Updates.runtimeVersion`, the app version under the `appVersion`
 * policy); the app config holds a policy object (`{ policy: 'appVersion' }`),
 * which printed as `[object Object]`. Pure, for the tests.
 */
export function runtimeVersionOf(resolved: string | null | undefined, configured: unknown): string {
  if (resolved) return resolved;
  if (typeof configured === 'string' && configured) return configured;
  if (configured && typeof configured === 'object' && 'policy' in configured) {
    return `${String((configured as { policy: unknown }).policy)} policy`;
  }
  return 'unknown';
}
