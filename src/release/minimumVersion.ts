/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The minimum-version kill switch (MOBILE M-056). Datalayer serves the oldest
 * version of the app it still supports on each platform (IAM, beside the
 * app's client document); the app reads it at launch and every time it comes
 * back to the foreground, and below it stops at an update screen. Fail closed:
 * an answer that cannot be read is not taken as "supported" — the app says it
 * could not check and offers to try again.
 *
 * Pure: the screen and the hook hold none of the rules.
 */

/** Where IAM serves it, on the control plane. */
export const MINIMUM_VERSION_PATH = '/api/iam/v1/oauth/clients/datalayer-mobile/minimum-version.json';

export type Platform = 'ios' | 'android';

export type Support =
  | { kind: 'supported'; minimum: string }
  | { kind: 'update'; minimum: string; current: string }
  | { kind: 'unknown'; why: string };

export const SUPPORT_WORDS = {
  updateTitle: 'Update Datalayer',
  update: (minimum: string, current: string) =>
    `This version (${current}) is no longer supported. Install version ${minimum} or later to keep using Datalayer.`,
  unknownTitle: 'Datalayer could not be reached',
  unknown: 'Datalayer could not confirm this version of the app is still supported. Check your connection and try again.',
  retry: 'Try again'
} as const;

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** `-1`, `0` or `1`; each must be `major.minor.patch`. */
export function compareVersions(a: string, b: string): number {
  const [x, y] = [VERSION.exec(a), VERSION.exec(b)];
  if (!x || !y) {
    throw new Error(`Not a version like 1.2.3: ${!x ? a : b}`);
  }
  for (let i = 1; i <= 3; i++) {
    const difference = Number(x[i]) - Number(y[i]);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

/** This platform's minimum from IAM's answer, or why it cannot be read. */
export function minimumOf(body: unknown, platform: Platform): string {
  const minimum = body && typeof body === 'object' ? (body as Record<string, unknown>).minimum : undefined;
  const value = minimum && typeof minimum === 'object' ? (minimum as Record<string, unknown>)[platform] : undefined;
  if (typeof value !== 'string' || !VERSION.test(value)) {
    throw new Error(`The minimum ${platform} version was not said.`);
  }
  return value;
}

/** Whether this build may go on, from IAM's answer (`status`, its body). */
export function supportOf(status: number, body: unknown, platform: Platform, current: string | null): Support {
  if (status !== 200) {
    return { kind: 'unknown', why: `IAM answered ${status}.` };
  }
  if (!current || !VERSION.test(current)) {
    return { kind: 'unknown', why: `This build's version is not known (${current ?? 'none'}).` };
  }
  let minimum: string;
  try {
    minimum = minimumOf(body, platform);
  } catch (error) {
    return { kind: 'unknown', why: error instanceof Error ? error.message : String(error) };
  }
  return compareVersions(current, minimum) < 0 ? { kind: 'update', minimum, current } : { kind: 'supported', minimum };
}

/** Asks IAM, once; a network failure is `unknown`, never `supported`. */
export async function checkSupport(
  runUrl: string,
  platform: Platform,
  current: string | null,
  fetcher: typeof fetch = fetch
): Promise<Support> {
  let response: Response;
  try {
    response = await fetcher(`${runUrl}${MINIMUM_VERSION_PATH}`, { headers: { Accept: 'application/json' } });
  } catch (error) {
    return { kind: 'unknown', why: error instanceof Error ? error.message : String(error) };
  }
  const body = await response.json().catch(() => undefined);
  return supportOf(response.status, body, platform, current);
}
