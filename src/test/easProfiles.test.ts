/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import appConfig, { EAS_PROJECT_ID } from '../../app.config';
import eas from '../../eas.json';

type Profile = { channel?: string; environment?: string; extends?: string; env?: Record<string, string> };

const profiles = eas.build as Record<string, Profile>;

describe('the EAS profiles', () => {
  it('builds every profile on its own update channel', () => {
    for (const name of ['development', 'development-simulator', 'e2e', 'preview', 'staging', 'production']) {
      expect(profiles[name]?.channel).toBe(name);
    }
  });

  it('gives development, staging and production each their own EAS environment (decided 16 October 2026)', () => {
    expect(profiles.development?.environment).toBe('development');
    expect(profiles.preview?.environment).toBe('preview');
    expect(profiles.staging?.environment).toBe('staging');
    expect(profiles.production?.environment).toBe('production');
  });
});

describe('the Expo project and the app it builds', () => {
  const production = appConfig({ config: {} } as never);

  it('names the app Datalayer Agents, keeping the identifiers already registered', () => {
    expect(production.name).toBe('Datalayer Agents');
    expect(production.slug).toBe('datalayer-agents');
    expect(production.ios?.bundleIdentifier).toBe('ai.datalayer.mobile');
    expect(production.android?.package).toBe('ai.datalayer.mobile');
  });

  it('belongs to the datalayer-agents Expo project of the datalayer account, whose address serves its updates', () => {
    expect(production.owner).toBe('datalayer');
    expect(EAS_PROJECT_ID).toBe('790468fa-e6ee-44a8-9fff-b303c45f4f84');
    expect(EAS_PROJECT_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect((production.extra as { eas: { projectId: string } }).eas.projectId).toBe(EAS_PROJECT_ID);
    expect(production.updates?.url).toBe(`https://u.expo.dev/${EAS_PROJECT_ID}`);
    expect(production.runtimeVersion).toEqual({ policy: 'appVersion' });
  });

  it('gives every built profile the three services it is refused without, over HTTPS', () => {
    for (const name of ['e2e', 'preview', 'staging', 'production']) {
      const env = profiles[name]?.env ?? {};
      for (const key of ['EXPO_PUBLIC_DATALAYER_RUN_URL', 'EXPO_PUBLIC_DATALAYER_RUNTIMES_URL', 'EXPO_PUBLIC_DATALAYER_MCP_URL']) {
        expect(`${name} ${key} ${env[key]}`).toMatch(/ https:\/\/[a-z0-9.-]+$/);
      }
    }
  });

  it('submits to the stores as drafts on the internal track, and builds only from a commit', () => {
    expect(eas.cli.requireCommit).toBe(true);
    expect(eas.submit.staging.android).toEqual({ track: 'internal', releaseStatus: 'draft' });
    expect(eas.submit.production.android).toEqual({ track: 'internal', releaseStatus: 'draft' });
  });
});
