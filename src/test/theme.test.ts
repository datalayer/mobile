/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { fontFamilyOf, lengthOf, nativeThemeOf, portableThemeOf, resolveToken, themeVariants } from '../theme/primer';
import { DEFAULT_PREFERENCE, preferenceOf, resolveMode } from '../theme/ThemeProvider';

describe('Primer Addons tokens on a phone', () => {
  it('resolves every theme in both modes to native colours', () => {
    for (const variant of themeVariants) {
      for (const mode of ['light', 'dark'] as const) {
        const theme = nativeThemeOf(portableThemeOf(variant), mode);
        for (const [name, value] of Object.entries(theme.colors)) {
          expect(`${variant} ${mode} ${name} ${value}`).toMatch(/ (#[0-9a-fA-F]{3,8}|rgba?\(.*|hsla?\(.*)$/);
        }
        expect(theme.radius.control).toBeGreaterThan(0);
        expect(theme.seedColor).toBe(theme.colors.accentEmphasis);
      }
    }
  });

  it('reads the LOOP theme as the web does: white canvas, pill controls, Inter', () => {
    const loop = nativeThemeOf(portableThemeOf('loop'), 'light');
    expect(loop.colors.background).toBe('#FFFFFF');
    expect(loop.colors.accentEmphasis).toBe('#7ADBB8');
    expect(loop.radius.control).toBe(999);
    expect(loop.radius.card).toBe(20);
    expect(loop.fontFamily).toBe('Inter');
    expect(nativeThemeOf(portableThemeOf('datalayer'), 'dark').fontFamily).toBeUndefined();
  });

  it('follows var() references and their fallbacks', () => {
    const tokens = { '--a': 'var(--b)', '--b': 'var(--c, 1px)', '--d': 'var(--d)' } as const;
    expect(resolveToken(tokens, '--a')).toBe('1px');
    expect(resolveToken(tokens, '--d')).toBe('');
    expect(resolveToken(tokens, '--missing')).toBe('');
  });

  it('reads lengths and font stacks', () => {
    expect(lengthOf('20px', 0)).toBe(20);
    expect(lengthOf('0.5rem', 0)).toBe(8);
    expect(lengthOf('auto', 6)).toBe(6);
    expect(fontFamilyOf('"Inter Variable", system-ui')).toBe('Inter');
    expect(fontFamilyOf('Georgia, serif')).toBeUndefined();
  });
});

describe('the theme preference', () => {
  it('is LOOP following the system by default, and survives a bad value', () => {
    expect(preferenceOf(null)).toEqual(DEFAULT_PREFERENCE);
    expect(preferenceOf('{"variant":"nope","colorMode":"sideways"}')).toEqual(DEFAULT_PREFERENCE);
    expect(preferenceOf('not json')).toEqual(DEFAULT_PREFERENCE);
    expect(preferenceOf('{"variant":"matrix","colorMode":"dark"}')).toEqual({ variant: 'matrix', colorMode: 'dark' });
  });

  it('resolves auto from the system, then from the theme', () => {
    const auto = { variant: 'loop', colorMode: 'auto' } as const;
    expect(resolveMode(auto, 'dark', 'auto')).toBe('dark');
    expect(resolveMode(auto, null, 'dark')).toBe('dark');
    expect(resolveMode(auto, null, 'auto')).toBe('light');
    expect(resolveMode({ variant: 'loop', colorMode: 'light' }, 'dark', 'dark')).toBe('light');
  });
});
