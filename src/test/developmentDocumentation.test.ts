/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('the simulator-only development loop', () => {
  it('selects Android on Linux and iOS on macOS without requiring a phone', () => {
    const makefile = read('Makefile');
    expect(makefile).toContain('dev-simulator: .env');
    expect(makefile).toContain('Linux)');
    expect(makefile).toContain('dev-android');
    expect(makefile).toContain('Darwin)');
    expect(makefile).toContain('dev-ios');
    expect(makefile).toMatch(/\.PHONY:.*dev-simulator/);
  });

  it('documents setup, platform selection, the fast loop and device-only limits', () => {
    const readme = read('README.md');
    for (const words of [
      '#### Simulator-only development, without a phone',
      'make dev-simulator',
      'Android Emulator',
      'iOS Simulator',
      'make start',
      'No Expo, Apple or Google account',
      'APNs/FCM delivery'
    ]) {
      expect(readme).toContain(words);
    }
  });
});
