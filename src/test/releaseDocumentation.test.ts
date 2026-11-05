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
    expect(release.indexOf("The tagged commit's Check passed")).toBeLessThan(release.indexOf('eas build --platform'));
    expect(release).toMatch(/eas-version: \d+\.\d+\.\d+\n/);
    // e2e-ios is still off in check.yaml (the Simulator sign-in), so a release does not rest on it.
    expect(release).toContain('RELEASE_JOBS: check doctor manifests hermes e2e-account e2e-android');
    expect(release).not.toMatch(/RELEASE_JOBS:.*e2e-ios/);
    expect(read('.github/workflows/check.yaml')).toMatch(/e2e-ios:\n    needs: e2e-account\n    if: false &&/);
    expect(release).toContain('name: release-lockfile');
    expect(read('.gitignore').split('\n')).toContain('package-lock.json');
    const readme = read('README.md');
    expect(readme).not.toContain('committed lockfile');
    expect(readme).toContain('does not block merging');
  });

  it('releases both stores, Android to the internal track with the Play key from a secret written outside the checkout, iOS to App Store Connect', () => {
    const release = read('.github/workflows/release.yaml');
    const commands = release.split('\n').filter(line => !line.trim().startsWith('#'));
    const eas = commands.filter(line => /\beas (build|submit)\b/.test(line));
    expect(eas.map(line => line.trim().split(' ').slice(0, 4).join(' '))).toEqual([
      'eas build --platform android',
      'eas build --platform ios',
      'eas submit --platform android',
      'eas submit --platform ios'
    ]);
    for (const line of eas) {
      expect(line).toContain('--profile production');
      expect(line).toContain('--non-interactive');
      expect(line).toContain('--wait');
    }
    for (const build of eas.slice(0, 2)) {
      expect(build).toContain('--freeze-credentials');
    }
    expect(commands.join('\n')).not.toMatch(/--platform all\b/);
    // Both are built before either is submitted; the iOS submit takes the iOS build's id.
    expect(release.indexOf('eas build --platform ios')).toBeLessThan(release.indexOf('eas submit --platform android'));
    expect(eas[3]).toContain('--id "$IOS_BUILD_ID"');
    // Ids missing from submit.production.ios stop the release before anything is built, never silently.
    expect(release.indexOf('The App Store Connect ids are in eas.json')).toBeLessThan(release.indexOf('eas build --platform'));
    expect(release).toContain('not the App Store Connect app id');
    expect(release).toContain('secrets.DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT }}');
    expect(release).toContain('$RUNNER_TEMP/play-service-account.json');
    expect(release).toContain('DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT_KEY_PATH=$key');
    expect(release.indexOf('The release secrets are set')).toBeLessThan(release.indexOf('actions/checkout'));
    expect(release).toContain('GITHUB_STEP_SUMMARY');
    const readme = read('README.md');
    for (const required of ['### Releasing', 'DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT', 'internal testing', '**iOS is on (5 November 2026).**', 'eas build:version:set --platform ios']) {
      expect(readme).toContain(required);
    }
    expect(readme).not.toContain('iOS is off');
    const prerequisites = read('docs/release-prerequisites.md');
    expect(prerequisites).toContain('DATALAYER_MOBILE_PLAY_SERVICE_ACCOUNT');
    expect(prerequisites).toContain('**Apple App Store**: on since 5 November 2026');
    // Apple guideline 4.8: iOS offers the Datalayer account only, so it does not apply.
    const listing = read('docs/store-listing.md');
    expect(listing).toContain('| Sign-in (Guideline 4.8) | **Does not apply (decided 5 November 2026).**');
    expect(listing).not.toContain('iOS stays off');
  });
});
