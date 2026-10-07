import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPackagingProfileApi, type ArticleSearchHit, type PackagingProfile } from '@/api/article.api';
import type { CustomerHit } from '@/api/customer.api';
import { pricePreviewApi, type PreviewedLine, type PricePreview } from '@/api/o2c.api';
import { getVanStockApi, type MyVan } from '@/api/van-sale.api';
import {
  addArticle,
  isBasketReady,
  isSendableQty,
  overVanStock,
  removeLine,
  toWireLines,
  updateLine,
  vanQtyByArticle,
  type DraftLine,
} from '@/utils/sale-draft';

let keySeq = 0;
const mintKey = () => `line-${Date.now().toString(36)}-${++keySeq}`;

/**
 * The state of a document being built — the customer, the basket, the units each article can be
 * sold in, the van's stock, and the SERVER's priced preview of it all.
 *
 * ⭐ THE PREVIEW IS ALWAYS TAGGED WITH THE BASKET IT PRICED. Lines change faster than a phone
 * network answers; a preview for yesterday's basket shown against today's would put the wrong price
 * on the wrong line. `fresh` is true only when the last answer was for exactly the lines on screen,
 * and nothing may be POSTED unless it is.
 */
export function useSaleDraft(input: { companyId: string; van: MyVan; withVanStock: boolean }) {
  const { companyId, van, withVanStock } = input;

  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [profiles, setProfiles] = useState<Map<string, PackagingProfile>>(new Map());
  const [vanStock, setVanStock] = useState<Map<string, bigint> | null>(null);
  const [preview, setPreview] = useState<{ forKey: string; result: PricePreview } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const requested = useRef(new Set<string>());

  // ── The van's stock, once — a HINT beside each line; the server checks for real when posting.
  const loadVanStock = useCallback(() => {
    if (!withVanStock) return;
    getVanStockApi(van.id, van.siteId)
      .then((s) => setVanStock(vanQtyByArticle(s.lines)))
      .catch(() => setVanStock(null));
  }, [withVanStock, van.id, van.siteId]);
  useEffect(loadVanStock, [loadVanStock]);

  // ── The units each article can be sold in, fetched once per article.
  useEffect(() => {
    for (const articleId of new Set(lines.map((l) => l.articleId))) {
      if (requested.current.has(articleId)) continue;
      requested.current.add(articleId);
      getPackagingProfileApi(articleId)
        .then((p) => {
          setProfiles((prev) => new Map(prev).set(articleId, p));
          // A line added with no sales unit takes the base unit once the ladder is known.
          const fallback = p.base ?? p.levels[0]?.uomCode ?? null;
          if (fallback) {
            setLines((prev) => prev.map((l) => (l.articleId === articleId && l.uomCode == null ? { ...l, uomCode: fallback } : l)));
          }
        })
        .catch(() => requested.current.delete(articleId));
    }
  }, [lines]);

  // ── The priced preview, debounced, for exactly the lines on screen.
  const wire = useMemo(() => toWireLines(lines), [lines]);
  const wireKey = useMemo(() => `${customer?.id ?? ''}|${JSON.stringify(wire)}`, [customer?.id, wire]);
  const [previewNonce, setPreviewNonce] = useState(0);

  useEffect(() => {
    if (!customer) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      setPreviewing(true);
      pricePreviewApi({
        companyId,
        customerId: customer.id,
        deliveringSiteId: van.siteId,
        lines: wire.length > 0 ? wire : undefined,
      })
        .then((result) => {
          if (cancelled) return;
          setPreview({ forKey: wireKey, result });
          setPreviewError(null);
        })
        .catch((e: unknown) => {
          if (!cancelled) setPreviewError(e);
        })
        .finally(() => {
          if (!cancelled) setPreviewing(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // `wire` is captured through `wireKey`; listing both would re-run on identity alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, van.siteId, wireKey, previewNonce]);

  const fresh = preview != null && preview.forKey === wireKey && !previewing;
  const result = fresh ? preview.result : null;

  /** Preview line N is wire line N — mapped back onto the draft lines that were sent. */
  const pricedByKey = useMemo(() => {
    const map = new Map<string, PreviewedLine>();
    if (!result?.lines) return map;
    const sent = lines.filter((l) => l.uomCode != null && isSendableQty(l.qty));
    sent.forEach((l, i) => {
      const p = result.lines!.find((x) => x.lineNo === i + 1);
      if (p) map.set(l.key, p);
    });
    return map;
  }, [lines, result]);

  const overStock = useMemo(
    () => (withVanStock && vanStock ? overVanStock(lines, vanStock, profiles) : new Set<string>()),
    [withVanStock, vanStock, lines, profiles],
  );

  /** Ready to POST: a customer, a sendable basket, a FRESH preview with prices and no refusal. */
  const ready =
    customer != null &&
    isBasketReady(lines) &&
    result != null &&
    result.problems.length === 0 &&
    result.totals != null &&
    (result.lines?.length ?? 0) === lines.length;

  return {
    customer,
    setCustomer,
    lines,
    profiles,
    vanStock,
    overStock,
    preview: result,
    previewing: previewing || (customer != null && preview?.forKey !== wireKey && previewError == null),
    previewError,
    retryPreview: () => setPreviewNonce((n) => n + 1),
    reloadVanStock: loadVanStock,
    pricedByKey,
    wire,
    ready,
    add: (hit: ArticleSearchHit) => setLines((prev) => addArticle(prev, hit, mintKey)),
    update: (key: string, patch: Partial<Pick<DraftLine, 'qty' | 'uomCode'>>) => setLines((prev) => updateLine(prev, key, patch)),
    remove: (key: string) => setLines((prev) => removeLine(prev, key)),
    reset: () => {
      setLines([]);
      setPreview(null);
    },
  };
}

export type SaleDraft = ReturnType<typeof useSaleDraft>;
