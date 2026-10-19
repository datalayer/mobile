/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The chosen theme and colour mode, as on the web's Settings: one of the nine
 * Primer Addons themes, light, dark or the system's. Kept on the device.
 */

import { deviceStore } from '../storage/deviceStore';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  type NativeTheme,
  type ResolvedMode,
  type ThemeVariant,
  isThemeVariant,
  nativeThemeOf,
  portableThemeOf
} from './primer';

export type { NativeTheme, ResolvedMode, ThemeVariant };

export type ColorMode = 'light' | 'dark' | 'auto';

export type ThemePreference = { variant: ThemeVariant; colorMode: ColorMode };

export const DEFAULT_PREFERENCE: ThemePreference = { variant: 'loop', colorMode: 'auto' };

const KEY = 'datalayer.theme';

export function preferenceOf(raw: string | null | undefined): ThemePreference {
  if (!raw) {
    return DEFAULT_PREFERENCE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ThemePreference>;
    return {
      variant: isThemeVariant(parsed.variant) ? parsed.variant : DEFAULT_PREFERENCE.variant,
      colorMode:
        parsed.colorMode === 'light' || parsed.colorMode === 'dark' || parsed.colorMode === 'auto'
          ? parsed.colorMode
          : DEFAULT_PREFERENCE.colorMode
    };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export const preferenceStore = {
  read: async (): Promise<ThemePreference> => preferenceOf(await deviceStore.get(KEY).catch(() => null)),
  write: (preference: ThemePreference): Promise<void> => deviceStore.set(KEY, JSON.stringify(preference))
};

export type PreferenceStore = typeof preferenceStore;

/** The mode a preference resolves to under a system scheme; a theme's own default decides `auto` when the system says nothing. */
export function resolveMode(
  preference: ThemePreference,
  system: ResolvedMode | null | undefined,
  themeDefault: ColorMode
): ResolvedMode {
  if (preference.colorMode !== 'auto') {
    return preference.colorMode;
  }
  if (system) {
    return system;
  }
  return themeDefault === 'dark' ? 'dark' : 'light';
}

type ThemeContextValue = {
  theme: NativeTheme;
  preference: ThemePreference;
  setPreference: (next: Partial<ThemePreference>) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children, store = preferenceStore }: { children: ReactNode; store?: PreferenceStore }) {
  const system = useColorScheme();
  const [preference, setStored] = useState<ThemePreference>(DEFAULT_PREFERENCE);

  useEffect(() => {
    let cancelled = false;
    store.read().then(kept => {
      if (!cancelled) setStored(kept);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const setPreference = useCallback(
    (next: Partial<ThemePreference>) => {
      setStored(current => {
        const merged = { ...current, ...next };
        void store.write(merged);
        return merged;
      });
    },
    [store]
  );

  const theme = useMemo(() => {
    const portable = portableThemeOf(preference.variant);
    const systemMode = system === 'light' || system === 'dark' ? system : null;
    return nativeThemeOf(portable, resolveMode(preference, systemMode, portable.defaultColorMode));
  }, [preference, system]);

  const value = useMemo(() => ({ theme, preference, setPreference }), [theme, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme is used outside ThemeProvider.');
  }
  return value;
}

export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** The smallest touch target, in points. */
export const MIN_TOUCH = 48;
