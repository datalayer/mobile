/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from 'node:fs';
import path from 'node:path';
import { MIN_TOUCH } from '../theme/tokens';

const source = (relative: string) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

describe('the source-level accessibility baseline (M-050a)', () => {
  it('uses an Android-safe minimum target and never caps Dynamic Type', () => {
    expect(MIN_TOUCH).toBeGreaterThanOrEqual(48);
    const primitives = source('components/primitives.tsx');
    expect(primitives).toContain('allowFontScaling');
    expect(primitives).not.toContain('maxFontSizeMultiplier');
    expect(primitives).not.toContain('numberOfLines=');
  });

  it('keeps forms visible around the keyboard and announces decision changes', () => {
    expect(source('components/primitives.tsx')).toContain('automaticallyAdjustKeyboardInsets');
    const approval = fs.readFileSync(path.resolve(__dirname, '../../app/(app)/approvals/[approvalId].tsx'), 'utf8');
    expect(approval).toContain('announceForAccessibility');
    expect(approval).toContain('accessibilityLiveRegion="assertive"');
  });
});
