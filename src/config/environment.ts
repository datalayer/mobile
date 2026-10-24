/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** The build profiles of `eas.json`. */
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
  /**
   * The control plane: IAM, the spaces and the library, telemetry — Core's
   * `CONTROL_PLANE_URL` (`@datalayer/core` `config/planes`).
   */
  runUrl: string;
  /**
   * The runtimes plane: ai-agents, runtimes, the scheduler, contents and
   * inference, and the ai-agents WebSocket — Core's `RUNTIMES_PLANE_URL`.
   * Deployed apart from the control plane (since 16 October 2026: neither
   * host serves the other's routes).
   */
  runtimesUrl: string;
  /**
   * The MCP gateway's origin (`/api/mcp/v1/…`: a sign-in under way, a
   * Direct Conversation, the audit), as the web's `mcpServerUrl` without `/mcp`.
   */
  gatewayUrl: string;
  profile: BuildProfile;
  /**
   * Whether a pasted API token may sign in: development, e2e and preview
   * builds only. Handle and password, GitHub, Google and LinkedIn are every
   * build's (the user, 24 October 2026).
   */
  allowsTokenSignIn: boolean;
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
  const runtimes = variables.EXPO_PUBLIC_DATALAYER_RUNTIMES_URL;
  const runtimesProblem = runUrlProblem(runtimes).replace('EXPO_PUBLIC_DATALAYER_RUN_URL', 'EXPO_PUBLIC_DATALAYER_RUNTIMES_URL');
  if (runtimesProblem) {
    throw new Error(runtimesProblem);
  }
  const gateway = variables.EXPO_PUBLIC_DATALAYER_MCP_URL;
  const gatewayProblem = runUrlProblem(gateway).replace('EXPO_PUBLIC_DATALAYER_RUN_URL', 'EXPO_PUBLIC_DATALAYER_MCP_URL');
  if (gatewayProblem) {
    throw new Error(gatewayProblem);
  }
  const requested = variables.EXPO_PUBLIC_BUILD_PROFILE;
  const profile = BUILD_PROFILES.find(name => name === requested) ?? 'production';
  return {
    runUrl: (raw as string).replace(/\/+$/, ''),
    runtimesUrl: (runtimes as string).replace(/\/+$/, ''),
    gatewayUrl: (gateway as string).replace(/\/+$/, '').replace(/\/mcp$/, ''),
    profile,
    allowsTokenSignIn: profile !== 'staging' && profile !== 'production'
  };
}

let current: Environment | undefined;

export const PRODUCTION_RUN_URL = 'https://prod1.datalayer.run';
export const PRODUCTION_RUNTIMES_URL = 'https://r1.datalayer.run';
export const PRODUCTION_MCP_URL = 'https://mcp.datalayer.run';

/** This build's environment; Expo inlines `EXPO_PUBLIC_*` only when each is read by name. */
export function environment(): Environment {
  current ??= environmentOf({
    EXPO_PUBLIC_DATALAYER_RUN_URL: process.env.EXPO_PUBLIC_DATALAYER_RUN_URL ?? PRODUCTION_RUN_URL,
    EXPO_PUBLIC_DATALAYER_RUNTIMES_URL: process.env.EXPO_PUBLIC_DATALAYER_RUNTIMES_URL ?? PRODUCTION_RUNTIMES_URL,
    EXPO_PUBLIC_DATALAYER_MCP_URL: process.env.EXPO_PUBLIC_DATALAYER_MCP_URL ?? PRODUCTION_MCP_URL,
    EXPO_PUBLIC_BUILD_PROFILE: process.env.EXPO_PUBLIC_BUILD_PROFILE
  });
  return current;
}

/**
 * The services on the runtimes plane, by the route prefix they answer under
 * (Core's `DEFAULT_PLANE_URLS`: `aiAgentsUrl`, `runtimesUrl`, `schedulerUrl`,
 * `contentsUrl`, `aiInferenceUrl`). Every other `/api/…` route is the
 * control plane's.
 */
export const RUNTIMES_PLANE_PREFIXES = [
  '/api/ai-agents/',
  '/api/runtimes/',
  '/api/scheduler/',
  '/api/contents/',
  '/api/ai-inference/'
] as const;

/** The host a service route is sent to. */
export const serviceUrlOf = (env: Pick<Environment, 'runUrl' | 'runtimesUrl'>, path: string): string =>
  RUNTIMES_PLANE_PREFIXES.some(prefix => path.startsWith(prefix)) ? env.runtimesUrl : env.runUrl;
