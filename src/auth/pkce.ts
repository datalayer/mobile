/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { CryptoDigestAlgorithm, CryptoEncoding, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { pkceOf } from './oauth';

/** A fresh PKCE pair from the platform's secure random source; the verifier never leaves the phone. */
export function newPkce(): Promise<{ verifier: string; challenge: string }> {
  return pkceOf(getRandomBytes(64), input =>
    digestStringAsync(CryptoDigestAlgorithm.SHA256, input, { encoding: CryptoEncoding.BASE64 })
  );
}
