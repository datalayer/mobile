/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

const { BUNDLE_BUDGET, sizesOf, overBudget } = require('../../scripts/bundle-size.js');

function exportWith(files: Record<string, number>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-size-'));
  for (const [name, bytes] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.alloc(bytes));
  }
  return dir;
}

describe('the bundle-size budget (M-051)', () => {
  it('measures each platform, the bundle apart from its assets, source maps and metadata left out', () => {
    const dir = exportWith({
      'ios/_expo/static/js/ios/entry-a.hbc': 1000,
      'ios/_expo/static/js/ios/entry-a.hbc.map': 5000,
      'ios/assets/icon.png': 200,
      'ios/metadata.json': 50,
      'android/_expo/static/js/android/entry-b.hbc': 1200,
      'android/assets/icon.png': 300
    });
    const sizes = sizesOf(dir);
    expect(sizes).toEqual(
      expect.arrayContaining([
        { platform: 'ios', bundles: 1, bundle: 1000, assets: 200 },
        { platform: 'android', bundles: 1, bundle: 1200, assets: 300 }
      ])
    );
    expect(overBudget(sizes)).toEqual([]);
  });

  it('refuses a bundle above the budget, and an export without a Hermes bundle', () => {
    const sizes = [
      { platform: 'ios', bundles: 1, bundle: BUNDLE_BUDGET + 1, assets: 0 },
      { platform: 'android', bundles: 0, bundle: 0, assets: 0 }
    ];
    expect(overBudget(sizes)).toEqual([
      `ios: ${BUNDLE_BUDGET + 1} bytes of Hermes bytecode, above the ${BUNDLE_BUDGET} budget`,
      'android: no Hermes bundle (.hbc) in the export'
    ]);
  });

  it('keeps the budget above the Phase 1 measurement (2.9 MB on Android)', () => {
    expect(BUNDLE_BUDGET).toBeGreaterThan(2900000);
  });
});
