import {
  addQty,
  cmpQty,
  formatQty,
  formatVariance,
  fromScaled,
  isQty,
  subQty,
  sumQty,
  toScaled,
  toScaledSafe,
} from '@/utils/qty';

/**
 * The quantity engine, tested for the ONE property that matters: exactness.
 *
 * These are not arithmetic-is-hard tests. Every case here is a value that floating point gets
 * visibly wrong, and each one would surface downstream as a count variance nobody can reproduce —
 * which is the most expensive kind of bug this app can have, because the ledger and the operator
 * would disagree and neither could show their working.
 */

describe('toScaled / fromScaled', () => {
  it('round-trips a plain integer', () => {
    expect(fromScaled(toScaled('12'))).toBe('12.0000');
  });

  it('round-trips four decimals exactly', () => {
    expect(fromScaled(toScaled('12.3456'))).toBe('12.3456');
  });

  it('pads a short fraction rather than truncating it', () => {
    expect(toScaled('0.5')).toBe(5000n);
    expect(fromScaled(5000n)).toBe('0.5000');
  });

  // The server's rule, mirrored verbatim: half-away-from-zero on a 5th decimal.
  it('rounds a 5th decimal half away from zero', () => {
    expect(toScaled('0.00005')).toBe(1n);
    expect(toScaled('0.00004')).toBe(0n);
    expect(toScaled('-0.00005')).toBe(-1n);
  });

  it('handles negatives', () => {
    expect(fromScaled(toScaled('-3.25'))).toBe('-3.2500');
  });

  it('throws on anything that is not a decimal', () => {
    expect(() => toScaled('abc')).toThrow();
    expect(() => toScaled('')).toThrow();
    expect(() => toScaled('1.2.3')).toThrow();
    // Scientific notation is a valid JS number and NOT a valid Decimal(18,4) — refused.
    expect(() => toScaled('1e3')).toThrow();
  });
});

describe('isQty', () => {
  it.each([
    ['0', true],
    ['12', true],
    ['12.5', true],
    ['-1', true],
    [' 3 ', true],
    ['', false],
    ['.', false],
    ['1.', false],
    ['abc', false],
    ['1e3', false],
  ])('isQty(%p) === %p', (input, expected) => {
    expect(isQty(input)).toBe(expected);
  });
});

describe('exact arithmetic', () => {
  /**
   * ⭐ THE WHOLE REASON THIS MODULE EXISTS. `0.1 + 0.2` is `0.30000000000000004` in every
   * JavaScript engine. A count sheet that sums forty scanned weights that way reports a variance
   * the ledger will not agree with.
   */
  it('adds 0.1 + 0.2 to exactly 0.3', () => {
    expect(addQty('0.1', '0.2')).toBe('0.3000');
    expect(Number('0.1') + Number('0.2')).not.toBe(0.3); // the defect being avoided
  });

  it('subtracts without drift', () => {
    expect(subQty('1', '0.9')).toBe('0.1000');
  });

  it('sums a column exactly', () => {
    expect(sumQty(['0.1', '0.2', '0.3', '0.4'])).toBe('1.0000');
  });

  it('sums an empty column to zero, not to NaN or an empty string', () => {
    expect(sumQty([])).toBe('0.0000');
  });

  it('skips unparseable entries in a sum rather than throwing', () => {
    // A half-typed field ("1.") must not crash the running total under the operator's thumb.
    expect(sumQty(['1', '', '1.', '2'])).toBe('3.0000');
  });

  it('compares without float promotion', () => {
    expect(cmpQty('0.3', '0.1')).toBe(1);
    expect(cmpQty('0.1', '0.3')).toBe(-1);
    expect(cmpQty('0.30', '0.3')).toBe(0);
  });

  it('toScaledSafe answers 0 for absent or malformed input', () => {
    expect(toScaledSafe(null)).toBe(0n);
    expect(toScaledSafe(undefined)).toBe(0n);
    expect(toScaledSafe('nope')).toBe(0n);
    expect(toScaledSafe('2.5')).toBe(25000n);
  });
});

describe('display formatting', () => {
  it('trims trailing zeros but never the integer part', () => {
    expect(formatQty('12.5000')).toBe('12.5');
    expect(formatQty('3.0000')).toBe('3');
    expect(formatQty('0.0000')).toBe('0');
    expect(formatQty('0.0500')).toBe('0.05');
  });

  it('renders an absent quantity as an em dash, not as zero', () => {
    // "no figure" and "zero" are different facts on a count sheet.
    expect(formatQty(null)).toBe('—');
    expect(formatQty(undefined)).toBe('—');
    expect(formatQty('nonsense')).toBe('—');
  });

  it('signs a variance, using a real minus sign', () => {
    expect(formatVariance('3')).toBe('+3');
    expect(formatVariance('-2.5')).toBe('−2.5');
    expect(formatVariance('0')).toBe('0');
    expect(formatVariance(null)).toBe('0');
  });
});
