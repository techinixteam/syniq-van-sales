import type { LayoutClass } from '@/theme';

/**
 * What the compact layout (`theme.layout === 'compact'`, the 4" MC2200 class) takes away from a
 * line-entry screen. Rules, not JSX, so each one is a sentence somebody can read and a case a
 * test can pin. See `theme/tokens/layout.ts` for how the class is decided.
 */

/**
 * The caption under the scan field ("Scanner ready" / "Keyboard only").
 *
 * On a compact screen the "ready" line goes: the blue trigger button beside the field already
 * says a scanner is present, and the line costs a row of the sheet. "Keyboard only" STAYS on
 * every layout — on a wedge-mode handheld it is the one thing that tells an operator to stop
 * hunting for a trigger that does not exist.
 */
export function scanCaptionShown(layout: LayoutClass, available: boolean): boolean {
  return !(layout === 'compact' && available);
}

/**
 * Whether the action bar renders as ONE ROW (summary beside the button) or as a stack.
 *
 * A screen that says so wins either way; one that does not follows the layout, so every pinned
 * bar in the app halves its height on the MC2200 without each screen being edited.
 */
export function actionBarCompact(prop: boolean | undefined, layout: LayoutClass): boolean {
  return prop ?? layout === 'compact';
}
