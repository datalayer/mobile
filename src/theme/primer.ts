/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Primer Addons' themes on a phone. The nine themes are read from
 * `@datalayer/primer-addons/lib/theme/portable` (no Primer React, no DOM) as
 * CSS-variable maps; this module resolves them into the handful of native
 * values the app draws with, so a token changed for the web changes here too.
 */

import {
  type CssVariableMap,
  type PortableTheme,
  type ThemeVariant,
  exportPortableTheme,
  themeVariants as primerThemeVariants,
} from '@datalayer/primer-addons/lib/theme/portable';

export type { ThemeVariant };

/**
 * The themes a phone offers: every Primer Addons theme but `vscode`, whose
 * tokens are VS Code's own `--vscode-*` variables and CSS `color-mix()`,
 * which exist only inside the editor. A preference stored as `vscode` falls
 * back to the default (`isThemeVariant`).
 */
export const themeVariants: ThemeVariant[] = primerThemeVariants.filter((variant) => variant !== 'vscode');

export type ResolvedMode = 'light' | 'dark';

/** The native theme: Primer's functional tokens, resolved. */
export type NativeTheme = {
  variant: ThemeVariant;
  mode: ResolvedMode;
  label: string;
  colors: {
    background: string;
    surface: string;
    inset: string;
    text: string;
    muted: string;
    onEmphasis: string;
    border: string;
    hairline: string;
    accent: string;
    accentEmphasis: string;
    accentMuted: string;
    danger: string;
    dangerEmphasis: string;
    success: string;
    attention: string;
    buttonPrimaryBackground: string;
    buttonPrimaryText: string;
    focus: string;
  };
  radius: { control: number; card: number };
  /** Inter when the theme asks for it, otherwise the system face. */
  fontFamily: string | undefined;
  /** The accent Expo UI's `Host` tints native controls with. */
  seedColor: string;
};

const VAR = /^var\((--[^,)]+)(?:,\s*([^)]+))?\)$/;

/** A token's value with `var(--name, fallback)` followed, at most a few hops. */
export function resolveToken(tokens: CssVariableMap, name: string, depth = 0): string {
  const raw = tokens[name as `--${string}`];
  if (raw === undefined) {
    return '';
  }
  const ref = VAR.exec(raw.trim());
  if (!ref) {
    return raw.trim();
  }
  if (depth > 4) {
    return (ref[2] ?? '').trim();
  }
  return resolveToken(tokens, ref[1]!, depth + 1) || (ref[2] ?? '').trim();
}

/** `20px` -> 20; `999px` (a pill) -> 999; `0.5rem` -> 8. */
export function lengthOf(value: string, fallback: number): number {
  const match = /^(-?\d*\.?\d+)(px|rem)?$/.exec(value.trim());
  if (!match) {
    return fallback;
  }
  const n = Number(match[1]);
  return match[2] === 'rem' ? n * 16 : n;
}

const first = (tokens: CssVariableMap, names: string[], fallback: string): string => {
  for (const name of names) {
    const value = resolveToken(tokens, name);
    if (value) {
      return value;
    }
  }
  return fallback;
};

/** Inter is bundled; any other face in a stack falls back to the system's. */
export const fontFamilyOf = (stack: string): string | undefined =>
  /\bInter\b/.test(stack) ? 'Inter' : undefined;

/**
 * The name a theme is shown with in Settings. The app's default theme is the
 * shared 'loop' variant, shown with the app's own name.
 */
const THEME_LABELS: Partial<Record<string, string>> = { loop: 'Agents' };
export const themeLabelOf = (theme: { id: string; label: string }): string => THEME_LABELS[theme.id] ?? theme.label;

export function nativeThemeOf(theme: PortableTheme, mode: ResolvedMode): NativeTheme {
  const t = theme.modes[mode];
  const color = (names: string | string[], fallback: string) =>
    first(t, Array.isArray(names) ? names : [names], fallback);
  const text = color('--fgColor-default', mode === 'dark' ? '#FFFFFF' : '#1D1D1F');
  const background = color('--bgColor-default', mode === 'dark' ? '#000000' : '#FFFFFF');
  const accentEmphasis = color('--bgColor-accent-emphasis', '#16A085');
  return {
    variant: theme.id,
    mode,
    label: themeLabelOf(theme),
    colors: {
      background,
      surface: color(['--bgColor-muted', '--bgColor-default'], background),
      inset: color(['--bgColor-inset', '--bgColor-default'], background),
      text,
      muted: color('--fgColor-muted', text),
      onEmphasis: color('--fgColor-onEmphasis', '#FFFFFF'),
      border: color('--borderColor-default', mode === 'dark' ? '#30363D' : '#D0D7DE'),
      hairline: color(['--theme-hairline-color', '--borderColor-muted', '--borderColor-default'], '#D0D7DE'),
      accent: color('--fgColor-accent', accentEmphasis),
      accentEmphasis,
      accentMuted: color('--bgColor-accent-muted', background),
      danger: color('--fgColor-danger', '#CF222E'),
      dangerEmphasis: color('--bgColor-danger-emphasis', '#CF222E'),
      success: color('--fgColor-success', accentEmphasis),
      attention: color('--fgColor-attention', '#9A6700'),
      buttonPrimaryBackground: color('--button-primary-bgColor-rest', accentEmphasis),
      buttonPrimaryText: color('--button-primary-fgColor-rest', '#FFFFFF'),
      focus: color(['--focus-outlineColor', '--fgColor-accent'], accentEmphasis)
    },
    radius: {
      control: lengthOf(color(['--theme-radius-control', '--borderRadius-medium'], '6px'), 6),
      card: lengthOf(color(['--theme-radius-card', '--borderRadius-large'], '12px'), 12)
    },
    fontFamily: fontFamilyOf(color('--fontStack-sansSerif', '')),
    seedColor: accentEmphasis
  };
}

const portable = new Map<ThemeVariant, PortableTheme>();

export function portableThemeOf(variant: ThemeVariant): PortableTheme {
  let theme = portable.get(variant);
  if (!theme) {
    theme = exportPortableTheme(variant);
    portable.set(variant, theme);
  }
  return theme;
}

export const isThemeVariant = (value: unknown): value is ThemeVariant =>
  typeof value === 'string' && (themeVariants as string[]).includes(value);
