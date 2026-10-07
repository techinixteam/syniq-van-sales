import { fitsTwoAcross, launchpadGrid } from './launchpad-grid';

/**
 * ⭐ 2026-10-06, on a real MC2200: every launchpad tile sat alone on its row. The screen is 320 dp
 * wide; minus the 12 dp compact gutters the grid is 296 dp; two 48% tiles plus a 12 dp flex gap
 * come to 296.16 dp — over by a sixth of a point, and flexbox wraps the second tile. The TC15's
 * 328 dp grid had 1.1 dp to spare, which is why nobody saw it there.
 */
describe('launchpad grid — two tiles per row on every device', () => {
  it('fits two across the MC2200 grid (320 dp screen, compact gutters)', () => {
    expect(fitsTwoAcross(320 - 2 * 12)).toBe(true);
  });

  it('fits two across a 320 dp screen even under the regular gutters', () => {
    expect(fitsTwoAcross(320 - 2 * 16)).toBe(true);
  });

  it('fits two across the TC15 grid (360 dp screen, regular gutters)', () => {
    expect(fitsTwoAcross(360 - 2 * 16)).toBe(true);
  });

  it('never lets a tile take more than half the grid', () => {
    expect(launchpadGrid.tileWidthPct).toBeLessThanOrEqual(50);
  });
});
