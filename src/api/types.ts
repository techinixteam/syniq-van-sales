/**
 * The two list envelopes the server speaks, and nothing else.
 *
 * `BaseRepository.paginate` (syniq-server/src/common/pagination/cursor-page.ts) answers a KEYSET
 * page by default and an OFFSET page the moment the caller sends `page`. Both carry `items`, so a
 * screen that only maps rows can ignore the difference — but a screen that shows "1–25 of 480"
 * cannot, and picking the wrong one is a silently empty footer rather than a type error.
 *
 * ⚠ THIS APP ASKS FOR OFFSET EVERYWHERE. A handheld list is a worklist a user pages through and
 * comes back to; a keyset cursor cannot answer "how many are left", which is the one number a
 * receiving clerk actually wants. Every `*.api.ts` list here therefore sends `page`.
 */

export interface OffsetPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

/** The offset query every list in this app sends. */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  q?: string;
}

/** An empty page, for the "not loaded yet" render. Avoids a null check in every list screen. */
export const emptyPage = <T>(): OffsetPage<T> => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  pageCount: 1,
});

/**
 * A site as every document header names it.
 *
 * Resolved SERVER-SIDE and carried WITH the document (see `InventoryReadService.grRefs`): a
 * warehouse role holds `goods_receipt.display` but usually not `site.display`, so a client-side
 * lookup would 403 for exactly the people who read receipts. Nullable because a soft-deleted
 * counterparty must not fail the read of a document that still names it.
 */
export interface SiteRef {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}
