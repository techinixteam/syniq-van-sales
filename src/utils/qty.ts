/**
 * Quantity arithmetic — exact, integer, and the only place in this app that adds two quantities.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * NO FLOAT EVER TOUCHES A QUANTITY.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Every quantity on the wire is a `Decimal(18,4)` rendered as a STRING (Prisma's `Decimal.toJSON`).
 * `Number("0.1") + Number("0.2")` is `0.30000000000000004`, and a count screen that sums forty
 * scanned lines that way reports a variance the ledger will not agree with. So quantities are
 * carried here as a scaled bigint (qty × 10⁴) exactly as the server does, and converted back to a
 * fixed-4dp string at the boundary.
 *
 * `toScaled` / `fromScaled` are a deliberate line-for-line mirror of
 * `syniq-server/src/modules/inventory/shared/logic/qty-scale.ts`, including its half-away-from-zero
 * rounding on a 5th decimal. Keep them identical: the two rounding the same input differently is a
 * variance nobody can reproduce.
 */

export const QTY_SCALE = 10_000n; // 4 dp
export const QTY_DP = 4;

/** True when `s` is a syntactically valid decimal quantity. Rejects "", "1.2.3", "abc", "1e3". */
export function isQty(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s.trim());
}

/**
 * Parse a decimal string to a scaled bigint (× 10⁴).
 *
 * ⚠ THROWS on anything non-numeric. Callers that take operator input must validate with `isQty`
 * first — a scan field cannot be allowed to crash a screen because a wedge scanner injected a
 * stray character.
 */
export function toScaled(qty: string): bigint {
  const s = qty.trim();
  if (!isQty(s)) throw new Error(`Invalid quantity: "${qty}"`);
  const negative = s.startsWith('-');
  const [intPart = '0', fracRaw = ''] = s.replace(/^-/, '').split('.');
  const fracPadded = fracRaw.padEnd(QTY_DP, '0');
  let scaled = BigInt(intPart) * QTY_SCALE + BigInt(fracPadded.slice(0, QTY_DP));
  if (fracPadded.length > QTY_DP && fracPadded.charCodeAt(QTY_DP) >= 53 /* '5' */) scaled += 1n;
  return negative ? -scaled : scaled;
}

/** Format a scaled bigint back to a fixed 4-dp string. `125000n` → `"12.5000"`. */
export function fromScaled(scaled: bigint): string {
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  return `${negative ? '-' : ''}${(abs / QTY_SCALE).toString()}.${(abs % QTY_SCALE)
    .toString()
    .padStart(QTY_DP, '0')}`;
}

/** `toScaled` that answers 0 instead of throwing. For rendering a value that may be absent. */
export function toScaledSafe(qty: string | null | undefined): bigint {
  if (qty == null || !isQty(qty)) return 0n;
  return toScaled(qty);
}

export const addQty = (a: string, b: string): string => fromScaled(toScaled(a) + toScaled(b));
export const subQty = (a: string, b: string): string => fromScaled(toScaled(a) - toScaled(b));

/** Sum a column. Empty ⇒ `"0.0000"`, never `""` or `NaN`. */
export const sumQty = (values: readonly string[]): string =>
  fromScaled(values.reduce<bigint>((acc, v) => acc + toScaledSafe(v), 0n));

export const cmpQty = (a: string, b: string): -1 | 0 | 1 => {
  const [x, y] = [toScaled(a), toScaled(b)];
  return x < y ? -1 : x > y ? 1 : 0;
};

export const isZeroQty = (a: string | null | undefined): boolean => toScaledSafe(a) === 0n;

/**
 * Display form: trailing zeros trimmed, but never the integer part. `"12.5000"` → `"12.5"`,
 * `"3.0000"` → `"3"`, `"0.0000"` → `"0"`.
 *
 * ⚠ FOR DISPLAY ONLY. Never send this to the server — `Decimal(18,4)` accepts it, but a value
 * that has been through a display formatter and back is a value nobody can prove was not edited.
 * Send the string that came off `fromScaled`.
 */
export function formatQty(qty: string | null | undefined): string {
  if (qty == null || !isQty(qty)) return '—';
  const fixed = fromScaled(toScaled(qty));
  const [int, frac = ''] = fixed.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return trimmed ? `${int}.${trimmed}` : (int as string);
}

/**
 * Signed display form, for a variance column where the SIGN is the message.
 * `"-2"` → `"−2"` (U+2212, the real minus). `"3"` → `"+3"`. `"0"` → `"0"`.
 */
export function formatVariance(qty: string | null | undefined): string {
  const scaled = toScaledSafe(qty);
  if (scaled === 0n) return '0';
  const body = formatQty(fromScaled(scaled < 0n ? -scaled : scaled));
  return `${scaled < 0n ? '\u2212' : '+'}${body}`;
}
