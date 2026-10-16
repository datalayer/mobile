/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { MINIMUM_VERSION_PATH, SUPPORT_WORDS, checkSupport, compareVersions, supportOf } from '../release/minimumVersion';

const answer = (status: number, body: unknown): typeof fetch =>
  (async () => ({ status, json: async () => body })) as unknown as typeof fetch;

describe('the minimum-version kill switch (M-056)', () => {
  it('compares versions number by number', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('0.0.1', '0.1.0')).toBe(-1);
    expect(() => compareVersions('1.2', '1.2.0')).toThrow(/1\.2\.3/);
  });

  it('lets a build at or above its platform minimum go on, and stops one below', () => {
    const body = { success: true, minimum: { ios: '1.2.0', android: '1.1.0' } };
    expect(supportOf(200, body, 'ios', '1.2.0')).toEqual({ kind: 'supported', minimum: '1.2.0' });
    expect(supportOf(200, body, 'android', '1.1.4')).toEqual({ kind: 'supported', minimum: '1.1.0' });
    expect(supportOf(200, body, 'ios', '1.1.9')).toEqual({ kind: 'update', minimum: '1.2.0', current: '1.1.9' });
    expect(SUPPORT_WORDS.update('1.2.0', '1.1.9')).toContain('Install version 1.2.0 or later');
  });

  it('fails closed: an answer it cannot read is never taken as supported', () => {
    expect(supportOf(503, { success: false }, 'ios', '1.0.0').kind).toBe('unknown');
    expect(supportOf(200, { minimum: { ios: '1.0.0' } }, 'android', '1.0.0').kind).toBe('unknown');
    expect(supportOf(200, { minimum: { ios: 'latest' } }, 'ios', '1.0.0').kind).toBe('unknown');
    expect(supportOf(200, undefined, 'ios', '1.0.0').kind).toBe('unknown');
    expect(supportOf(200, { minimum: { ios: '1.0.0' } }, 'ios', null).kind).toBe('unknown');
  });

  it('asks IAM on the control plane, and a network failure is unknown', async () => {
    const asked: string[] = [];
    const fetcher = (async (url: string) => {
      asked.push(url);
      return { status: 200, json: async () => ({ minimum: { ios: '0.0.1', android: '0.0.1' } }) };
    }) as unknown as typeof fetch;
    await expect(checkSupport('https://prod1.datalayer.run', 'android', '0.0.1', fetcher)).resolves.toEqual({ kind: 'supported', minimum: '0.0.1' });
    expect(asked).toEqual([`https://prod1.datalayer.run${MINIMUM_VERSION_PATH}`]);
    const offline = (async () => {
      throw new Error('Network request failed');
    }) as unknown as typeof fetch;
    await expect(checkSupport('https://prod1.datalayer.run', 'ios', '0.0.1', offline)).resolves.toEqual({ kind: 'unknown', why: 'Network request failed' });
    await expect(checkSupport('https://prod1.datalayer.run', 'ios', '0.0.1', answer(404, {}))).resolves.toMatchObject({ kind: 'unknown' });
  });
});
