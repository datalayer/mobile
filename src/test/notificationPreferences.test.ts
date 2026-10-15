/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Per-application notification preferences and quiet hours (MOBILE M-043):
 * read strictly from the device, sent with the installation, said in words.
 */

import {
  categoriesOfApp, DEFAULT_PUSH_PREFERENCE, pushPreferenceOf, QUIET_TIMES, quietHoursOf, quietWords, withAppCategories
} from '../push/routes';

const QUIET = { start: '22:00', end: '07:00', tz: 'Europe/Brussels' };

describe('the notification preference, per application and with quiet hours (M-043)', () => {
  it('reads quiet hours, the approvals switch and each application strictly', () => {
    const kept = pushPreferenceOf(JSON.stringify({
      enabled: true,
      categories: ['approvals'],
      quietHours: QUIET,
      approvalsInQuiet: false,
      appCategories: { 'app-1': ['failures', 'spam'], 'app-2': [], '': ['approvals'], 'app-3': 'all' }
    }));
    expect(kept).toEqual({
      enabled: true,
      categories: ['approvals'],
      quietHours: QUIET,
      approvalsInQuiet: false,
      appCategories: { 'app-1': ['failures'], 'app-2': [] }
    });
    // Approvals pass quiet hours unless said otherwise (MOBILE §13).
    expect(pushPreferenceOf(JSON.stringify({ enabled: true })).approvalsInQuiet).toBe(true);
    for (const wrong of [{ ...QUIET, end: '22:00' }, { ...QUIET, start: '7:00' }, { ...QUIET, tz: '' }, 'night', null]) {
      expect(quietHoursOf(wrong)).toBeNull();
    }
    expect(QUIET_TIMES).toHaveLength(24);
    expect(QUIET_TIMES[22]).toEqual({ label: '22:00', value: '22:00' });
  });

  it('tells an application otherwise, nothing at all included, and back as every other', () => {
    const base = { ...DEFAULT_PUSH_PREFERENCE, enabled: true };
    expect(categoriesOfApp(base, 'app-1')).toEqual(base.categories);
    const silent = withAppCategories(base, 'app-1', []);
    expect(categoriesOfApp(silent, 'app-1')).toEqual([]);
    expect(categoriesOfApp(silent, 'app-2')).toEqual(base.categories);
    const approvals = withAppCategories(silent, 'app-1', ['approvals']);
    expect(approvals.appCategories).toEqual({ 'app-1': ['approvals'] });
    expect(withAppCategories(approvals, 'app-1', null).appCategories).toEqual({});
  });

  it('says what quiet hours do', () => {
    const base = { ...DEFAULT_PUSH_PREFERENCE, enabled: true };
    expect(quietWords(base)).toMatch(/^Off/);
    expect(quietWords({ ...base, quietHours: QUIET })).toBe(
      'From 22:00 to 07:00, only approvals are sent; the rest waits until 07:00. Nothing waits in the app.'
    );
    expect(quietWords({ ...base, quietHours: QUIET, approvalsInQuiet: false })).toMatch(/nothing is sent/);
  });
});
