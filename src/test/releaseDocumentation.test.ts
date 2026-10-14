/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('the mobile release runbook (M-007 and M-059)', () => {
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
      '### Release-owner checklist',
      '### Halt, rollback and recovery',
      'Transporter',
      'Play Console',
      'minimum-supported-version',
      'artifact checksums',
      'second person'
    ]) {
      expect(readme).toContain(required);
    }
  });
});
