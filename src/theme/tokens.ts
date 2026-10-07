/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useColorScheme } from 'react-native';

// Placeholder values until Core's native boundary exports the LOOP tokens (M-012).
const LIGHT = {
  background: '#FFFFFF',
  surface: '#F6F8FA',
  text: '#1F2328',
  muted: '#59636E',
  border: '#D1D9E0',
  accent: '#1F6FB0',
  onAccent: '#FFFFFF',
  danger: '#CF222E'
};

const DARK: typeof LIGHT = {
  background: '#0D1117',
  surface: '#151B23',
  text: '#F0F6FC',
  muted: '#9198A1',
  border: '#3D444D',
  accent: '#8CCBF9',
  onAccent: '#0D1117',
  danger: '#FF7B72'
};

export type Colors = typeof LIGHT;

export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** The smallest touch target, in points (MOBILE.md M-050). */
export const MIN_TOUCH = 48;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}
