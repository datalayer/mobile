/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import appConfig, { EAS_PROJECT_ID } from '../../app.config';
import eas from '../../eas.json';

type Profile = {
  channel?: string;
  environment?: string;
  extends?: string;
  autoIncrement?: boolean;
  env?: Record<string, string>;
};

const profiles = eas.build as Record<string, Profile>;

describe('the EAS profiles', () => {
  it('gives no profile an update channel: v1 updates only through the stores', () => {
    for (const [name, profile] of Object.entries(profiles)) {
      expect(`${name} ${profile.channel ?? 'none'}`).toBe(`${name} none`);
    }
  });

  it("builds staging on Expo's built-in preview environment, and each other profile on its own", () => {
    expect(profiles.development?.environment).toBe('development');
    expect(profiles.preview?.environment).toBe('preview');
    expect(profiles.staging?.environment).toBe('preview');
    expect(profiles.production?.environment).toBe('production');
  });

  it('installs with npm install on EAS in every profile, as CI does: no lockfile is committed', () => {
    const resolvedEnv = (name: string): Record<string, string> => {
      const profile = profiles[name];
      return { ...(profile?.extends ? resolvedEnv(profile.extends) : {}), ...(profile?.env ?? {}) };
    };
    for (const name of Object.keys(profiles)) {
      const env = resolvedEnv(name);
      expect(`${name} ${env.EAS_FALLBACK_PACKAGE_MANAGER} ${env.EAS_NO_FROZEN_LOCKFILE}`).toBe(`${name} npm 1`);
    }
  });

  it('numbers store builds remotely, each above the last', () => {
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(profiles.staging?.autoIncrement).toBe(true);
    expect(profiles.production?.autoIncrement).toBe(true);
  });
});

describe('the Expo project and the app it builds', () => {
  const production = appConfig({ config: {} } as never);

  it('names the app Datalayer, keeping the identifiers already registered', () => {
    expect(production.name).toBe('Datalayer');
    expect(production.slug).toBe('datalayer');
    expect(production.ios?.bundleIdentifier).toBe('ai.datalayer.mobile');
    expect(production.android?.package).toBe('ai.datalayer.mobile');
  });

  it('belongs to the datalayer Expo project of the datalayer account', () => {
    expect(production.owner).toBe('datalayer');
    expect(EAS_PROJECT_ID).toBe('69d637cd-7535-40f7-8f38-f0eefeae2008');
    expect(EAS_PROJECT_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect((production.extra as { eas: { projectId: string } }).eas.projectId).toBe(EAS_PROJECT_ID);
  });

  it('turns over-the-air updates off for every build profile', () => {
    const saved = process.env.EAS_BUILD_PROFILE;
    try {
      for (const profile of Object.keys(profiles)) {
        process.env.EAS_BUILD_PROFILE = profile;
        expect(appConfig({ config: {} } as never).updates).toEqual({ enabled: false });
      }
    } finally {
      if (saved === undefined) {
        delete process.env.EAS_BUILD_PROFILE;
      } else {
        process.env.EAS_BUILD_PROFILE = saved;
      }
    }
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

  it('names the App Store Connect app and Apple team for submission, as placeholders until they are known', () => {
    for (const ios of [eas.submit.staging.ios, eas.submit.production.ios]) {
      expect(ios.ascAppId).toMatch(/^(ASC_APP_ID_PLACEHOLDER|\d+)$/);
      expect(ios.appleTeamId).toMatch(/^(APPLE_TEAM_ID_PLACEHOLDER|[A-Z0-9]{10})$/);
    }
  });
});
