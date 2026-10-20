/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { SPACE } from '../theme/tokens';

/** A sheet's content inset: the drag handle above it, the theme's spacing on the other sides. */
export const SHEET_PADDING = { top: SPACE.sm, right: SPACE.lg, bottom: SPACE.lg, left: SPACE.lg } as const;
