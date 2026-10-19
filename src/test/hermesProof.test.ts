/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { proofLines } from '../../scripts/hermes-proof/proof';

// The checks the Hermes proof runs in CI's Hermes VM, held under Node first.
describe('the Hermes proof of the shared portable entries', () => {
  it.each(proofLines().map(line => [line.name, line]))('%s holds', (_name, line) => {
    expect(line.detail).not.toBe('');
    expect(line).toMatchObject({ held: true });
  });
});
