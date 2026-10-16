/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/* The bundle's entry for the Hermes proof (M-002): prints under the Hermes CLI, ends on a sentence CI reads. */

import { runProof } from './proof';

const say = (globalThis as { print?: (line: string) => void }).print;
if (!say) {
  throw new Error('No print: this entry runs under the Hermes CLI.');
}
say(runProof(say) ? 'HERMES PROOF HELD' : 'HERMES PROOF FAILED');
