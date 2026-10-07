import { spacing } from '@/theme/tokens/spacing';

/**
 * The launchpad grid's geometry, as numbers a test can check against a screen width.
 *
 * Two tiles per row, always. The grid is `flexWrap`, so "two per row" is not a setting — it is
 * the arithmetic of tile width + column gap against the grid's width, and it must hold on the
 * narrowest grid in the fleet.
 *
 * ⭐ THE COLUMN GAP IS ZERO, AND THE GUTTER COMES FROM `space-between`. A fixed flex gap is
 * added ON TOP of two percentage widths, so on a grid under 300 dp (the MC2200's is 296) two
 * 48% tiles plus 12 dp overflowed by a sixth of a point and the second tile wrapped — every tile
 * alone on its row. With the gap at zero the two tiles sum to 96% whatever the width, and the
 * row's leftover 4% is the gutter: 11.8 dp on the MC2200, 13.1 on the TC15. A lone last tile
 * sits at the start of its row, as it always did.
 */
export const launchpadGrid = {
  /** Each tile's width, as a percentage of the grid. */
  tileWidthPct: 48,
  /** The horizontal gap flexbox inserts BETWEEN tiles, in dp. Zero — see the docblock. */
  columnGap: 0,
  /** The vertical gap between rows, in dp. */
  rowGap: spacing.md,
} as const;

/** Do two tiles and the gap between them fit across a grid this wide? */
export function fitsTwoAcross(gridWidthDp: number): boolean {
  const tiles = 2 * (gridWidthDp * launchpadGrid.tileWidthPct) / 100;
  return tiles + launchpadGrid.columnGap <= gridWidthDp;
}
