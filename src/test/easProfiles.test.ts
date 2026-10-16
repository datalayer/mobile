/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import eas from '../../eas.json';

type Profile = { channel?: string; environment?: string; extends?: string };

const profiles = eas.build as Record<string, Profile>;

describe('the EAS profiles (M-053)', () => {
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
