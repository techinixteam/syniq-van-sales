import type { ArticleSearchHit, PackagingProfile } from '@/api/article.api';
import type { PreviewLineInput } from '@/api/o2c.api';
import type { VanStockLine } from '@/api/van-sale.api';
import { QTY_SCALE, fromScaled, toScaled } from '@/utils/qty';

/**
 * The basket behind New invoice and New quotation — PURE, so every rule here is a sentence a spec
 * can pin, and no screen can drift from another.
 *
 * ⚠ NO MONEY IS COMPUTED HERE. Every price, tax and total comes from `POST /o2c/price-preview`,
 * worked out by the code that will post the document. This file only shapes WHAT is being sold.
 */

export interface DraftLine {
  /** A local identity for React and for "which line is this problem about". Never sent. */
  key: string;
  articleId: string;
  articleNumber: string;
  name: string;
  barcode: string | null;
  /** As typed. Validated by `isSendableQty` before anything is sent. */
  qty: string;
  /** Null until the article's units are known and none could be chosen — the line cannot be sent. */
  uomCode: string | null;
}

/** The server's own rule (`van-sale.dto.ts`): a decimal with up to 4 places, ABOVE zero. */
export function isSendableQty(qty: string): boolean {
  const s = qty.trim();
  return /^\d+(\.\d{1,4})?$/.test(s) && /[1-9]/.test(s);
}

/**
 * Add a searched article to the basket. The SAME article in the SAME unit bumps that line by one
 * rather than adding a twin — two lines of one item read as a mistake on a tax invoice, and the
 * server would check both against the same van stock anyway.
 */
export function addArticle(lines: readonly DraftLine[], hit: ArticleSearchHit, mintKey: () => string): DraftLine[] {
  const unit = hit.salesUomCode;
  const twin = lines.find((l) => l.articleId === hit.id && l.uomCode === unit && unit != null);
  if (twin && isSendableQty(twin.qty)) {
    return lines.map((l) => (l === twin ? { ...l, qty: trimQty(fromScaled(toScaled(l.qty) + QTY_SCALE)) } : l));
  }
  return [
    ...lines,
    {
      key: mintKey(),
      articleId: hit.id,
      articleNumber: hit.articleNumber,
      name: hit.primaryName,
      barcode: hit.barcode,
      qty: '1',
      uomCode: unit,
    },
  ];
}

export const updateLine = (lines: readonly DraftLine[], key: string, patch: Partial<Pick<DraftLine, 'qty' | 'uomCode'>>) =>
  lines.map((l) => (l.key === key ? { ...l, ...patch } : l));

export const removeLine = (lines: readonly DraftLine[], key: string) => lines.filter((l) => l.key !== key);

/** Every line can be sent: a unit, and a quantity above zero. An empty basket is not ready. */
export function isBasketReady(lines: readonly DraftLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.uomCode != null && isSendableQty(l.qty));
}

/**
 * The lines as the server takes them — in the basket's order, which IS the invoice's line order.
 * The quantity is normalised ("2." is not sent; "2.50" goes as "2.5") but never re-valued.
 */
export function toWireLines(lines: readonly DraftLine[]): PreviewLineInput[] {
  return lines
    .filter((l) => l.uomCode != null && isSendableQty(l.qty))
    .map((l) => ({ articleId: l.articleId, qty: trimQty(l.qty.trim()), uomCode: l.uomCode! }));
}

/** "2.5000" → "2.5", "3.0" → "3". Server-safe (no exponent, ≤ 4 dp, no sign). */
export function trimQty(qty: string): string {
  if (!qty.includes('.')) return qty.replace(/^0+(?=\d)/, '');
  const [int, frac] = qty.split('.');
  const f = (frac ?? '').replace(/0+$/, '');
  const i = (int ?? '0').replace(/^0+(?=\d)/, '') || '0';
  return f ? `${i}.${f}` : i;
}

// ── The van's stock, as a HINT ─────────────────────────────────────────────────────────────────────

/** What the van holds per article, in the BASE unit, summed over batches and stock statuses. */
export function vanQtyByArticle(stock: readonly VanStockLine[]): Map<string, bigint> {
  const out = new Map<string, bigint>();
  for (const s of stock) {
    if (!/^-?\d+(\.\d+)?$/.test(s.qtyOnHand)) continue;
    out.set(s.articleId, (out.get(s.articleId) ?? 0n) + toScaled(s.qtyOnHand));
  }
  return out;
}

/**
 * A line's quantity in the BASE unit, scaled ×10⁴ — exact rational arithmetic, rounded UP so a hint
 * never under-states what the line takes off the van. Null when the unit is not on the article's
 * ladder (the hint is then simply not shown; the server still checks).
 */
export function lineBaseScaled(qty: string, uomCode: string | null, profile: PackagingProfile | undefined): bigint | null {
  if (!uomCode || !profile || !isSendableQty(qty)) return null;
  const level = profile.levels.find((l) => l.uomCode === uomCode);
  if (!level) return null;
  const num = BigInt(level.ratioToBaseNum);
  const den = BigInt(level.ratioToBaseDen);
  if (den <= 0n) return null;
  const product = toScaled(qty) * num;
  return product % den === 0n ? product / den : product / den + 1n;
}

/**
 * The articles whose lines, together, ask for more than the van holds — in base units, summed over
 * every line of the article (two lines of one item must not each pass against the same units; the
 * server sums the same way). Lines whose unit cannot be converted are left out of the sum rather
 * than guessed at.
 */
export function overVanStock(
  lines: readonly DraftLine[],
  van: ReadonlyMap<string, bigint>,
  profiles: ReadonlyMap<string, PackagingProfile>,
): Set<string> {
  const need = new Map<string, bigint>();
  for (const l of lines) {
    const base = lineBaseScaled(l.qty, l.uomCode, profiles.get(l.articleId));
    if (base == null) continue;
    need.set(l.articleId, (need.get(l.articleId) ?? 0n) + base);
  }
  const over = new Set<string>();
  for (const [articleId, n] of need) if (n > (van.get(articleId) ?? 0n)) over.add(articleId);
  return over;
}
