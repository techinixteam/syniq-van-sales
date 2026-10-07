/**
 * Theme assembly.
 *
 * The palette and radii come from `tokens/` and are GENERATED from syniq-web (see
 * `scripts/sync-tokens.mjs`). Spacing, typography and shadows are hand-authored — the generator's
 * docblock explains which and why.
 */

import { lightColors } from './tokens/colors.light';
import { darkColors } from './tokens/colors.dark';
import { spacing, getSpacing } from './tokens/spacing';
import { spacingFor, type LayoutClass } from './tokens/layout';
import { typography, textStyles } from './tokens/typography';
import { shadows } from './tokens/shadows';
import { radius } from './tokens/radius';
import type { Theme, ThemeMode } from './types';

export const createTheme = (mode: ThemeMode, layout: LayoutClass = 'regular'): Theme => ({
  colors: mode === 'dark' ? darkColors : lightColors,
  // The one axis that varies by DEVICE rather than by preference — see `tokens/layout.ts`.
  spacing: spacingFor(layout),
  typography,
  shadows,
  radius,
  isDarkMode: mode === 'dark',
  layout,
});

/** Light. Used for the initial render before the stored preference is read. */
export const defaultTheme = createTheme('light');

export { spacing, getSpacing, typography, textStyles, shadows, radius };
export { layoutClassFor, spacingFor, COMPACT_BELOW_DP } from './tokens/layout';
export { lightColors, darkColors };

export type { Theme, ThemeMode };
export type { LayoutClass } from './tokens/layout';
export type { ColorPalette } from './tokens/colors.light';

/** Layout helpers with no theme dependency. */
export const commonStyles = {
  flex1: { flex: 1 },
  row: { flexDirection: 'row' as const },
  rowCenter: { flexDirection: 'row' as const, alignItems: 'center' as const },
  spaceBetween: { justifyContent: 'space-between' as const },
  center: { alignItems: 'center' as const, justifyContent: 'center' as const },
  fullWidth: { width: '100%' as const },
} as const;

export default defaultTheme;
