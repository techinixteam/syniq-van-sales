import { apiClient } from '@/api/apiClient';
import type { OffsetPage, SiteRef } from '@/api/types';

/**
 * What the distribution centre holds — QUANTITIES ONLY (`/inventory/dc-stock`).
 *
 * Gated `transfer_request.display` at ANY scope; the server answers a 404 for any site that is not a
 * DC, so the door shows the DC and nothing else. No money, no batches.
 */

/** `GET /inventory/dc-stock/sites` — the DCs the caller may ask about. Usually exactly one. */
export const getDcSitesApi = () => apiClient.get<SiteRef[]>('/inventory/dc-stock/sites');

/** "243 EA" read as "10 CS · 3 EA" — composed ONCE, on the server. */
export interface QtyInPacks {
  /** The base-unit figure, trimmed ("243", "25.5"). */
  base: string;
  breakdown: Array<{ uomCode: string; qty: string }>;
}

export interface DcStockRow {
  siteId: string;
  articleId: string;
  article: { id: string; articleNumber: string; primaryName: string; barcode: string | null } | null;
  baseUomCode: string | null;
  available: QtyInPacks;
  onHand: QtyInPacks;
}

/** `GET /inventory/dc-stock?site&q&page&pageSize` — zeros hidden, searched by name / number / barcode. */
export const getDcStockApi = (site: string, q: string | undefined, page = 1, pageSize = 50) =>
  apiClient.get<OffsetPage<DcStockRow>>('/inventory/dc-stock', { query: { site, q, page, pageSize } });
