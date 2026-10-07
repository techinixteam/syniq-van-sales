import { apiClient } from '@/api/apiClient';

/**
 * Articles — finding one to sell, and the units it may be sold in.
 *
 * Shapes are HAND-WRITTEN from the server (`modules/article/*`, `modules/uom/uom.resolver.ts`), not
 * generated — the same choice syniq-web makes. The controller and its service ARE the contract.
 *
 * ⚠ UNLIKE THE OPERATIONS APP, THIS ONE SEARCHES BY NAME. A warehouse handheld resolves by barcode
 * only, because the carton is in the clerk's hand. A van rep is taking an order across a counter —
 * "two cases of the 330ml water" — and needs the same typeahead syniq-web's order lines use
 * (`GET /articles/search`). A typed or wedge-scanned barcode goes through the same box: the server's
 * search matches a whole GTIN and an article-number prefix before it tries names.
 */

/** One hit of `GET /articles/search` (`ArticleSearchHit` on the server). */
export interface ArticleSearchHit {
  id: string;
  /** The 10-digit business number (merch group + sequence). */
  articleNumber: string;
  primaryName: string;
  articleType: string;
  status: string;
  /** The primary GTIN, else the lowest. Null when unbarcoded. */
  barcode: string | null;
  /** The SALES-role unit, falling back to the base. Null when the article has no UoM set up. */
  salesUomCode: string | null;
  score: number;
}

/**
 * `GET /articles/search?q&limit` — `article.display`, any scope. A 2-character floor on this side,
 * as on the web: a 1-character term matches most of the master.
 *
 * ⚠ ON THE DEV DATABASE A NAME SEARCH CAN FAIL (500): its restore lost the `pg_trgm` extension the
 * name match uses. Number and barcode searches do not need it. Production has it.
 */
export const searchArticlesApi = (q: string, limit = 20) =>
  apiClient.get<ArticleSearchHit[]>('/articles/search', { query: { q, limit } });

/** The EA→PACK→CASE ladder, DERIVED from `article_uom`. Ascending by pack size. */
export interface PackagingLevel {
  uomCode: string;
  /** The ratio to the base unit as an EXACT RATIONAL — a case of twelve is `"12" / "1"`. */
  ratioToBaseNum: string;
  ratioToBaseDen: string;
  /** What this level HOLDS — "CS (12 EA)". Null for the base. Optional: an older server omits it. */
  uomLabel?: string | null;
  isBase: boolean;
  gtins: string[];
}

export interface PackagingProfile {
  /** The base unit's code, or null when the article has no UoM set up at all. */
  base: string | null;
  levels: PackagingLevel[];
}

/** `GET /articles/{id}/packaging-profile` — the units a line may be sold in. `article.display`. */
export const getPackagingProfileApi = (id: string) =>
  apiClient.get<PackagingProfile>(`/articles/${id}/packaging-profile`);
