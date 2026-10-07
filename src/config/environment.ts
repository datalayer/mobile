/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** The build profiles of `eas.json` (MOBILE.md §5.1). */
export const BUILD_PROFILES = [
  'development',
  'development-simulator',
  'e2e',
  'preview',
  'staging',
  'production'
] as const;

export type BuildProfile = (typeof BUILD_PROFILES)[number];

export type Environment = {
  /** IAM, runtimes and ai-agents are under it, as the web's `configuration.runUrl`. */
  runUrl: string;
  profile: BuildProfile;
  /** Whether the interim sign-in of MOBILE.md §5.5 may be offered. */
  allowsInterimSignIn: boolean;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

/** What is wrong with a run URL, in a sentence, or `''`. */
export function runUrlProblem(raw: string | undefined): string {
  if (!raw) {
    return 'EXPO_PUBLIC_DATALAYER_RUN_URL is not set.';
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return `“${raw}” is not a URL.`;
  }
  if (url.protocol === 'https:') {
    return '';
  }
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) {
    return '';
  }
  return `“${raw}” must be HTTPS; plain HTTP is only for a local simulator or emulator.`;
}

/** The environment from its variables, or an error naming what is wrong. */
export function environmentOf(variables: Record<string, string | undefined>): Environment {
  const raw = variables.EXPO_PUBLIC_DATALAYER_RUN_URL;
  const problem = runUrlProblem(raw);
  if (problem) {
    throw new Error(problem);
  }
  const requested = variables.EXPO_PUBLIC_BUILD_PROFILE;
  const profile = BUILD_PROFILES.find(name => name === requested) ?? 'production';
  return {
    runUrl: (raw as string).replace(/\/+$/, ''),
    profile,
    allowsInterimSignIn: profile !== 'staging' && profile !== 'production'
  };
}

let current: Environment | undefined;

export const PRODUCTION_RUN_URL = 'https://prod1.datalayer.run';

/** This build's environment; Expo inlines `EXPO_PUBLIC_*` only when each is read by name. */
export function environment(): Environment {
  current ??= environmentOf({
    EXPO_PUBLIC_DATALAYER_RUN_URL: process.env.EXPO_PUBLIC_DATALAYER_RUN_URL ?? PRODUCTION_RUN_URL,
    EXPO_PUBLIC_BUILD_PROFILE: process.env.EXPO_PUBLIC_BUILD_PROFILE
  });
  return current;
}
/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** The build profiles of eas.json (MOBILE.md §5.1). */
export type BuildProfile =
  | 'development'
  | 'development-simulator'
  | 'e2e'
  | 'preview'
  | 'staging'
  | 'production';

const PROFILES: readonly BuildProfile[] = [
  'development',
  'development-simulator',
  'e2e',
  'preview',
  'staging',
  'production'
];

export type Environment = {
  /** The Datalayer services, without a trailing slash: IAM, runtimes and ai-agents live under it. */
  runUrl: string;
  profile: BuildProfile;
  /** Whether the interim sign-in of MOBILE.md §5.5 is offered: never on a store build. */
  interimSignIn: boolean;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** What is wrong with a run URL, in a sentence, or `''`. */
export function runUrlProblem(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `“${value}” is not an address.`;
  }
  if (url.protocol === 'https:') {
    return url.pathname === '/' || url.pathname === '' ? '' : 'The address has no path: the services are under its root.';
  }
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) {
    return '';
  }
  return 'The address must be HTTPS; plain HTTP is only for localhost on a simulator or emulator.';
}

/** The environment of this build, from its `EXPO_PUBLIC_*` values; throws a sentence when it is wrong. */
export function environmentOf(values: Record<string, string | undefined>): Environment {
  const raw = (values.EXPO_PUBLIC_DATALAYER_RUN_URL ?? 'https://prod1.datalayer.run').trim();
  const problem = runUrlProblem(raw);
  if (problem) {
    throw new Error(`EXPO_PUBLIC_DATALAYER_RUN_URL: ${problem}`);
  }
  const named = values.EXPO_PUBLIC_BUILD_PROFILE ?? 'development';
  if (!PROFILES.includes(named as BuildProfile)) {
    throw new Error(`EXPO_PUBLIC_BUILD_PROFILE: “${named}” is not one of ${PROFILES.join(', ')}.`);
  }
  const profile = named as BuildProfile;
  return {
    runUrl: raw.replace(/\/+$/, ''),
    profile,
    interimSignIn: profile !== 'staging' && profile !== 'production'
  };
}

// Expo inlines EXPO_PUBLIC_* only when each is read by its full name.
export const ENVIRONMENT: Environment = environmentOf({
  EXPO_PUBLIC_DATALAYER_RUN_URL: process.env.EXPO_PUBLIC_DATALAYER_RUN_URL,
  EXPO_PUBLIC_BUILD_PROFILE: process.env.EXPO_PUBLIC_BUILD_PROFILE
});
