/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Support } from './minimumVersion';

/**
 * The development web preview (`make dev-web`) is no shipped build: it has no
 * app version for the kill switch (M-056) to hold, which governs the iOS and
 * Android builds only.
 */
export function useSupport(): { support: Support | null; retry: () => void } {
  return { support: { kind: 'supported', minimum: '' }, retry: () => undefined };
}
