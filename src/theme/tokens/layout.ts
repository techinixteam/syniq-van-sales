import { spacing, type Spacing } from './spacing';

/**
 * Layout class — hand-authored, decided by SCREEN HEIGHT and nothing else.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⭐ TWO HANDHELDS, ONE APK. The TC15 is a 6.5" phone-shaped device (1600×720, ~800 dp tall);
 * the MC2200 is a 4" keypad device (800×480, ~533 dp tall). Every screen here was laid out at
 * TC15 proportions, and on the MC2200 the fixed chrome of a line-entry screen — header, document
 * strip, scan field, action bar — ate the whole height before the first row of the sheet.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `compact` is the answer. It shrinks the LAYOUT tokens — paddings, section gaps, control heights,
 * the launchpad tile — and nothing else:
 *
 *   · The 48-point touch floor stays. The MC2200 is still used in gloves in an aisle, and the
 *     floor was never about screen size (see `spacing.touchTarget`).
 *   · Typography stays. The 16-point body is a reading-distance ruling (`typography.ts`), and a
 *     smaller screen is held exactly as far away.
 *   · The 4-point base scale (`xs`…`xxxl`) stays, so a screen's own gaps keep their rhythm.
 *
 * ⚠ HEIGHT, NOT MODEL. A list of model names is wrong the day the client buys a third device.
 * The threshold sits between the two screens we know (533 and 800 dp) with room either side for
 * whatever density Zebra sets on a given firmware.
 *
 * ⚠ SCREEN height, not WINDOW height. The window is `adjustResize` (AndroidManifest), so the
 * window shrinks whenever the soft keyboard opens — reading it would flip a TC15 to compact every
 * time an operator tapped a field. `ThemeContext` reads `Dimensions.get('screen')`.
 */
export type LayoutClass = 'regular' | 'compact';

/** Screens shorter than this many dp are compact. */
export const COMPACT_BELOW_DP = 640;

export function layoutClassFor(screenHeightDp: number): LayoutClass {
  // An unmeasured screen (0, NaN) is REGULAR: shrinking a layout nobody measured is the one
  // failure that would reach the TC15 fleet. A short screen we failed to detect merely scrolls.
  if (!(screenHeightDp > 0)) return 'regular';
  return screenHeightDp < COMPACT_BELOW_DP ? 'compact' : 'regular';
}

/**
 * The compact spacing: the house scale with the layout tokens tightened.
 *
 * Control heights land ON the touch floor rather than above it — an input of 48 is still a
 * generous target because it is wide, and the scan field's trigger button is sized square to
 * `inputHeight`, so anything under 48 here would breach the floor there.
 */
const compactSpacing: Spacing = {
  ...spacing,
  screenPadding: 12,
  cardPadding: 12,
  sectionGap: 16,
  inputHeight: 48,
  inputPaddingHorizontal: 12,
  buttonHeight: 48,
  buttonPaddingVertical: 8,
  tileMinHeight: 84,
};

export function spacingFor(layout: LayoutClass): Spacing {
  return layout === 'compact' ? compactSpacing : spacing;
}
