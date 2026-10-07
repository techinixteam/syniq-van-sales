import type { ColorPalette } from './tokens/colors.light';
import type { Spacing } from './tokens/spacing';
import type { typography } from './tokens/typography';
import type { shadows } from './tokens/shadows';
import type { radius } from './tokens/radius';
import type { LayoutClass } from './tokens/layout';

export type ThemeMode = 'light' | 'dark';
export type { LayoutClass };

/** What every `useTheme()` consumer receives. */
export interface Theme {
  colors: ColorPalette;
  spacing: Spacing;
  typography: typeof typography;
  shadows: typeof shadows;
  radius: typeof radius;
  isDarkMode: boolean;
  /** `compact` on a short screen (the 4" MC2200); `regular` otherwise. See `tokens/layout.ts`. */
  layout: LayoutClass;
}
