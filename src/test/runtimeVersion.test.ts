/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { runtimeVersionOf } from '../config/runtimeVersion';

describe('the runtime version Settings shows', () => {
  it('is the one the build resolved', () => {
    expect(runtimeVersionOf('0.0.2', { policy: 'appVersion' })).toBe('0.0.2');
  });

  it('never prints a policy object as [object Object]', () => {
    expect(runtimeVersionOf(null, { policy: 'appVersion' })).toBe('appVersion policy');
    expect(runtimeVersionOf(undefined, '1.2.3')).toBe('1.2.3');
    expect(runtimeVersionOf(undefined, undefined)).toBe('unknown');
  });
});
