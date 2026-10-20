/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('the mobile release runbook', () => {
  it('keeps identifiers, account ownership, costs and credential custody explicit', () => {
    const prerequisites = read('docs/release-prerequisites.md');
    for (const required of [
      'ai.datalayer.mobile',
      'ai.datalayer.mobile.dev',
      'ai.datalayer.mobile.preview',
      'Apple Developer Program',
      'Google Play Console',
      'EXPO_TOKEN',
      'primary and recovery'
    ]) {
      expect(prerequisites).toContain(required);
    }
    expect(prerequisites).toContain('Never committed');
  });

  it('documents the complete promotion, recovery and evidence path', () => {
    const readme = read('README.md');
    for (const required of [
      '### Environments and credentials',
      '### What is needed to publish',
      '### Release-owner checklist',
      '### Halt, rollback and recovery',
      'Transporter',
      'Play Console',
      'minimum-supported-version',
      'artifact checksums',
      'second person',
      'Apple Developer Program',
      'App Store Connect',
      'Play App Signing',
      'Data safety',
      'works from Linux',
      'physical iOS and Android phones'
    ]) {
      expect(readme).toContain(required);
    }
  });

  it('releases only a commit whose Check passed, with a pinned EAS CLI and the resolved lockfile kept', () => {
    const release = read('.github/workflows/release.yaml');
    expect(release).toContain('--workflow check.yaml --commit "$GITHUB_SHA"');
    expect(release.indexOf("The tagged commit's Check passed")).toBeLessThan(release.indexOf('eas build'));
    expect(release).toMatch(/eas-version: \d+\.\d+\.\d+\n/);
    expect(release).toContain('name: release-lockfile');
    expect(read('.gitignore').split('\n')).toContain('package-lock.json');
    const readme = read('README.md');
    expect(readme).not.toContain('committed lockfile');
    expect(readme).toContain('does not block merging');
  });

  it('releases Android only, to the internal track, with the Play key from a secret written outside the checkout', () => {
    const release = read('.github/workflows/release.yaml');
    const commands = release.split('\n').filter(line => !line.trim().startsWith('#'));
    const eas = commands.filter(line => /\beas (build|submit)\b/.test(line));
    expect(eas.length).toBe(2);
    for (const line of eas) {
      expect(line).toContain('--platform android');
      expect(line).toContain('--non-interactive');
    }
    expect(eas[0]).toContain('--freeze-credentials');
    expect(commands.join('\n')).not.toMatch(/--platform (ios|all)\b/);
    expect(release).toContain('secrets.DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT }}');
    expect(release).toContain('$RUNNER_TEMP/play-service-account.json');
    expect(release).toContain('DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT_KEY_PATH=$key');
    expect(release.indexOf('The release secrets are set')).toBeLessThan(release.indexOf('actions/checkout'));
    expect(release).toContain('GITHUB_STEP_SUMMARY');
    const readme = read('README.md');
    for (const required of ['### Releasing', 'DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT', 'internal testing', '**iOS is off.**']) {
      expect(readme).toContain(required);
    }
    expect(read('docs/release-prerequisites.md')).toContain('DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT');
  });
});
