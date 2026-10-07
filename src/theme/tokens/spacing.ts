/**
 * Spacing — a 4px grid, hand-authored.
 *
 * Not generated from syniq-web: Tailwind's spacing scale is a utility ramp (`p-1`…`p-96`), not a
 * named set, so there is nothing there to mirror. The values below follow loadindo-vendor's
 * proven grid with the control sizes raised — see `typography.ts` for why.
 */
export const spacing = {
  unit: 4,

  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 8,

  /**
   * ⚠ 48 is a floor, not a preference. This app is used one-handed, at arm's length, often in
   * gloves, by someone holding a carton with the other hand. Anything smaller than 48×48 is a
   * mis-tap in a warehouse aisle, and a mis-tap here posts a document.
   */
  touchTarget: 48,

  inputHeight: 52,
  inputPaddingHorizontal: 14,

  buttonHeight: 56,
  buttonPaddingVertical: 12,
  buttonPaddingHorizontal: 16,

  chipHeight: 40,
  chipPaddingHorizontal: 10,

  /** The launchpad tile — two per row on a 4–5" handheld. */
  tileMinHeight: 104,
} as const;

/**
 * The SHAPE of the spacing, with every value widened to `number`: `spacing` itself is `as const`,
 * and a compact variant (`layout.ts`) must be able to carry a different figure under each key.
 */
export type Spacing = { readonly [K in keyof typeof spacing]: number };

/** `getSpacing(3)` → 12. For the rare value the named scale does not carry. */
export const getSpacing = (multiplier: number): number => spacing.unit * multiplier;
