import { actionBarCompact, scanCaptionShown } from './compact-rules';

/**
 * What the compact layout takes away from a line-entry screen, as rules rather than as JSX, so
 * the decision is readable and testable without a device.
 */
describe('scanCaptionShown', () => {
  it('shows "Scanner ready" on a regular screen', () => {
    expect(scanCaptionShown('regular', true)).toBe(true);
  });

  it('drops "Scanner ready" on a compact screen — the trigger button already says it', () => {
    expect(scanCaptionShown('compact', true)).toBe(false);
  });

  it('keeps "Keyboard only" on a compact screen: an operator hunting for a trigger needs that line', () => {
    expect(scanCaptionShown('compact', false)).toBe(true);
    expect(scanCaptionShown('regular', false)).toBe(true);
  });
});

describe('actionBarCompact', () => {
  it('follows the layout when the screen does not say', () => {
    expect(actionBarCompact(undefined, 'regular')).toBe(false);
    expect(actionBarCompact(undefined, 'compact')).toBe(true);
  });

  it('lets a screen ask for the one-row bar on any layout', () => {
    expect(actionBarCompact(true, 'regular')).toBe(true);
  });

  it('lets a screen keep the stacked bar even on a compact screen', () => {
    expect(actionBarCompact(false, 'compact')).toBe(false);
  });
});
