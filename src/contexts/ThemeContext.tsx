import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dimensions, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTheme, layoutClassFor } from '@/theme';
import type { LayoutClass, Theme, ThemeMode } from '@/theme/types';

const MODE_KEY = '@Syniq:themeMode';

/** `'system'` follows the device; the other two pin it. Matches syniq-web's three-state toggle. */
export type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * `compact` on a short screen (the 4" MC2200), `regular` on the TC15 — see `tokens/layout.ts`.
 *
 * ⚠ `Dimensions.get('screen')`, NOT `useWindowDimensions`. The window is `adjustResize`, so the
 * WINDOW shrinks by the keyboard's height whenever a field is tapped; reading it would flip a
 * TC15 into the compact layout mid-entry and back again on every submit. The screen does not
 * move. The change listener is for rotation and a docked display, neither of which this app
 * expects, but a subscription costs nothing and a stale answer would cost a layout.
 */
function useLayoutClass(): LayoutClass {
  const [layout, setLayout] = useState<LayoutClass>(() =>
    layoutClassFor(Dimensions.get('screen').height),
  );
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ screen }) =>
      setLayout(layoutClassFor(screen.height)),
    );
    return () => sub.remove();
  }, []);
  return layout;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const layout = useLayoutClass();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
      })
      .catch(() => {
        // A theme preference is not worth failing a launch over. Fall through to 'system'.
      });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(MODE_KEY, p).catch(() => {});
  }, []);

  const mode: ThemeMode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: createTheme(mode, layout), mode, preference, setPreference }),
    [mode, layout, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx.theme;
}

export function useThemeControls(): Omit<ThemeContextValue, 'theme'> {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeControls must be used inside <ThemeProvider>');
  const { theme: _theme, ...rest } = ctx;
  return rest;
}
