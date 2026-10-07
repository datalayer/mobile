/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** The current theme's colours, radii and font, for components that only draw. */

import { type NativeTheme, useTheme } from './ThemeProvider';

export { MIN_TOUCH, SPACE } from './ThemeProvider';

export type Colors = NativeTheme['colors'];

export function useColors(): Colors {
  return useTheme().theme.colors;
}

export function useNativeTheme(): NativeTheme {
  return useTheme().theme;
}
