import { spacing } from './spacing';
import { typography } from './typography';
import { layoutClassFor, spacingFor, COMPACT_BELOW_DP } from './layout';
import { createTheme } from '../index';

/**
 * The layout class is decided by SCREEN HEIGHT, never by a model name: the MC2200 (4", 800×480,
 * ~533 dp tall) is compact; the TC15 (6.5", 1600×720, ~800 dp tall) is regular; and the next
 * short handheld the client buys is compact without anyone editing a list.
 */
describe('layoutClassFor', () => {
  it('calls a 4-inch MC2200-class screen compact', () => {
    expect(layoutClassFor(533)).toBe('compact');
  });

  it('calls a 6.5-inch TC15-class screen regular', () => {
    expect(layoutClassFor(800)).toBe('regular');
  });

  it('is compact strictly below the threshold and regular at it', () => {
    expect(layoutClassFor(COMPACT_BELOW_DP - 1)).toBe('compact');
    expect(layoutClassFor(COMPACT_BELOW_DP)).toBe('regular');
  });

  it('treats an unknown height as regular rather than shrinking a screen it has not measured', () => {
    expect(layoutClassFor(0)).toBe('regular');
    expect(layoutClassFor(Number.NaN)).toBe('regular');
  });
});

describe('spacingFor', () => {
  it('hands back the house spacing unchanged for a regular screen', () => {
    expect(spacingFor('regular')).toBe(spacing);
  });

  it('shrinks the layout tokens on a compact screen', () => {
    const c = spacingFor('compact');
    expect(c.screenPadding).toBeLessThan(spacing.screenPadding);
    expect(c.cardPadding).toBeLessThan(spacing.cardPadding);
    expect(c.sectionGap).toBeLessThan(spacing.sectionGap);
    expect(c.inputHeight).toBeLessThan(spacing.inputHeight);
    expect(c.buttonHeight).toBeLessThan(spacing.buttonHeight);
    expect(c.tileMinHeight).toBeLessThan(spacing.tileMinHeight);
  });

  it('never makes any token larger than the regular one', () => {
    const c = spacingFor('compact');
    for (const key of Object.keys(spacing) as Array<keyof typeof spacing>) {
      expect(c[key]).toBeLessThanOrEqual(spacing[key]);
    }
  });

  it('keeps the 48-point touch floor: no control drops below it', () => {
    const c = spacingFor('compact');
    expect(c.touchTarget).toBe(spacing.touchTarget);
    expect(c.inputHeight).toBeGreaterThanOrEqual(c.touchTarget);
    expect(c.buttonHeight).toBeGreaterThanOrEqual(c.touchTarget);
  });

  it('leaves the 4-point base scale alone so screen-level gaps keep their rhythm', () => {
    const c = spacingFor('compact');
    for (const key of ['unit', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'] as const) {
      expect(c[key]).toBe(spacing[key]);
    }
  });
});

describe('createTheme with a layout', () => {
  it('defaults to the regular layout', () => {
    const t = createTheme('light');
    expect(t.layout).toBe('regular');
    expect(t.spacing).toBe(spacing);
  });

  it('carries the compact spacing and says so', () => {
    const t = createTheme('dark', 'compact');
    expect(t.layout).toBe('compact');
    expect(t.spacing.screenPadding).toBe(spacingFor('compact').screenPadding);
    expect(t.isDarkMode).toBe(true);
  });

  it('never touches typography: the 16-point body is a ruling, not a layout token', () => {
    expect(createTheme('light', 'compact').typography).toBe(typography);
  });
});
