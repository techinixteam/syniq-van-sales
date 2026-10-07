/**
 * Money — halalas in, SAR out, and no float in between.
 *
 * Every money field on this estate is an integral number of halalas carried as a STRING (the
 * server patches `BigInt.prototype.toJSON` in `main.ts`, so a bigint arrives as `"2150"`, not as a
 * number). 100 halalas = 1 SAR.
 *
 * ⚠ `Number("9007199254740993")` is not 9007199254740993. Money is parsed with `BigInt`, never
 * `Number` — the halalas total of a DC's stock genuinely exceeds 2⁵³ in a way a shelf price does
 * not, and a formatter that is right for one and wrong for the other is worse than one rule.
 */

const HALALAS_PER_SAR = 100n;

/** True when `s` is an integral halalas string. Rejects "12.5" — halalas have no fraction. */
export const isHalalas = (s: string): boolean => /^-?\d+$/.test(s.trim());

export function toHalalas(s: string | null | undefined): bigint | null {
  if (s == null) return null;
  const t = s.trim();
  return isHalalas(t) ? BigInt(t) : null;
}

/**
 * `numerator / denominator`, rounded HALF AWAY FROM ZERO, exactly in bigint.
 *
 * A line-for-line mirror of `syniq-server/src/common/base/money.ts` — money on this estate rounds
 * half-up and never half-even (that is the quantities rule, and mixing them is a variance nobody
 * can reproduce). `roundHalfUp(5n, 2n) === 3n`; `roundHalfUp(-5n, 2n) === -3n`.
 *
 * ⚠ THE ONLY DIVISION ALLOWED TO TOUCH MONEY IN THIS APP. Anything that reaches for `/` on a
 * `Number` has already lost the argument — see the header of this file.
 */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('roundHalfUp: division by zero');
  let num = numerator;
  let den = denominator;
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const negative = num < 0n;
  const abs = negative ? -num : num;
  const quotient = abs / den;
  // remainder/den >= 1/2 ⟺ 2·remainder >= den
  const rounded = 2n * (abs % den) >= den ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

/**
 * `"2150"` → `"21.50"`. Always two decimals: a shelf price that renders as `21.5` reads as a
 * different number to someone comparing it against a printed label.
 */
export function formatHalalas(s: string | null | undefined): string {
  const v = toHalalas(s);
  if (v == null) return '—';
  const negative = v < 0n;
  const abs = negative ? -v : v;
  const major = (abs / HALALAS_PER_SAR).toString();
  const minor = (abs % HALALAS_PER_SAR).toString().padStart(2, '0');
  return `${negative ? '\u2212' : ''}${groupThousands(major)}.${minor}`;
}

/** `"2150"` → `"SAR 21.50"`. The currency is a parameter because a document carries its own. */
export const formatMoney = (s: string | null | undefined, currency = 'SAR'): string =>
  s == null || toHalalas(s) == null ? '—' : `${currency} ${formatHalalas(s)}`;

/**
 * Thousands separators, on the STRING, digit by digit.
 *
 * ⚠ NOT `toLocaleString`. Under an Arabic locale that renders Arabic-Indic digits (`١٢٣٤`), and
 * this estate's rule — web, printed documents and this app alike — is that numerals stay Western
 * so a figure on screen can be compared by eye with the label in the operator's hand.
 */
function groupThousands(digits: string): string {
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return out;
}
