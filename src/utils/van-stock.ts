import type { VanStockLine } from '@/api/van-sale.api';
import { fromScaled, toScaled } from '@/utils/qty';

export interface VanStockRow {
  articleId: string;
  articleNumber: string | null;
  name: string;
  uom: string | null;
  /** Base units, batches and stock statuses summed. Fixed 4 dp. */
  qty: string;
}

/**
 * The van's stock as the rep reads it: ONE row per article (its batches summed — a rep sells the
 * article, not the batch), zero rows dropped, filtered by name / number, sorted by name.
 */
export function vanStockRows(lines: readonly VanStockLine[], filter: string, arabic: boolean): VanStockRow[] {
  const byArticle = new Map<string, VanStockRow & { scaled: bigint }>();
  for (const l of lines) {
    if (!/^-?\d+(\.\d+)?$/.test(l.qtyOnHand)) continue;
    const name = (arabic ? l.nameAr || l.nameEn : l.nameEn || l.nameAr) ?? l.articleNumber ?? l.articleId;
    const row = byArticle.get(l.articleId) ?? {
      articleId: l.articleId,
      articleNumber: l.articleNumber,
      name,
      uom: l.baseUomCode,
      qty: '0',
      scaled: 0n,
    };
    row.scaled += toScaled(l.qtyOnHand);
    byArticle.set(l.articleId, row);
  }
  const needle = filter.trim().toLowerCase();
  return [...byArticle.values()]
    .filter((r) => r.scaled !== 0n)
    .filter((r) => !needle || r.name.toLowerCase().includes(needle) || (r.articleNumber ?? '').includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ scaled, ...r }) => ({ ...r, qty: fromScaled(scaled) }));
}
