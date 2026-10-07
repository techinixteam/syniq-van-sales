import { apiClient } from '@/api/apiClient';
import type { OffsetPage, SiteRef } from '@/api/types';

/**
 * The rep's own door — `/o2c/van-sales` (syniq-server `van-sale.controller.ts`) — and the van's
 * stock tab (`/o2c/vans/:id/stock`).
 *
 * Every route here is COMPANY-scoped (`?companyId=` / `body.companyId`), and the SERVER proves the
 * row is the caller's own: the van's rep for a sale, the quotation's creator for a read. Nothing on
 * this side is trusted for that — the app only asks.
 */

// ── My vans ──────────────────────────────────────────────────────────────────────────────────────

export interface MyVan {
  id: string;
  /** VAN-0001 — the fleet number printed on the invoice. */
  code: string;
  nameEn: string;
  nameAr: string;
  plateNo: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  salespersonId: string;
  /** The branch the van lives under — what pricing and the stock read are keyed on. */
  siteId: string;
  site: SiteRef | null;
}

export interface MySalesperson {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

/**
 * `GET /o2c/van-sales/my-vans?companyId` (`van_sale.create`).
 *
 * TWO EMPTY LISTS ARE TWO DIFFERENT ANSWERS: no salesperson means the rep's login is not linked to
 * one (a sales-manager fix); a salesperson with no van means no van is assigned to them yet.
 */
export const getMyVansApi = (companyId: string) =>
  apiClient.get<{ salespeople: MySalesperson[]; vans: MyVan[] }>('/o2c/van-sales/my-vans', {
    query: { companyId },
  });

// ── The sale ─────────────────────────────────────────────────────────────────────────────────────

export interface VanSaleLine {
  articleId: string;
  /** Decimal string, up to 4 places, above zero. */
  qty: string;
  uomCode: string;
}

export interface CreateVanSaleBody {
  companyId: string;
  customerId: string;
  vanId: string;
  shipToAddressId?: string;
  /** The customer's own reference (their PO number). */
  customerRef?: string;
  lines: VanSaleLine[];
}

/** What the server answers for a posted sale (`DirectInvoiceResult`). */
export interface VanSaleResult {
  invoiceId: string;
  /** The gapless tax-invoice number — ARI-2026-00001. */
  docNumber: string;
  journalId: string;
  lineCount: number;
  movementIds: string[];
  deliveringSiteId: string;
  shipToAddressId: string | null;
  vanId: string | null;
}

/**
 * `POST /o2c/van-sales` (`van_sale.create`). Posts a TAX INVOICE: a gapless number, a receivable,
 * stock issued off the van, ZATCA queued.
 *
 * ⚠ ALWAYS SENT UNDER THE DRAFT'S OWN Idempotency-Key (`utils/draft-idempotency.ts`), never a fresh
 * one per tap: the route REQUIRES the header, and a re-tap after a lost answer must replay the
 * first answer instead of selling the van's stock twice.
 */
export const createVanSaleApi = (body: CreateVanSaleBody, idempotencyKey: string) =>
  apiClient.post<VanSaleResult>('/o2c/van-sales', body, { idempotencyKey });

// ── The van's stock ──────────────────────────────────────────────────────────────────────────────

export interface VanStockLine {
  articleId: string;
  articleNumber: string | null;
  nameEn: string | null;
  nameAr: string | null;
  baseUomCode: string | null;
  batchId: string | null;
  stockStatusCode: string;
  /** In the BASE unit. Decimal string. */
  qtyOnHand: string;
  // The route also carries the branch-average cost and value. This app never shows them — a rep
  // sells at the customer's price, and the cost of the van is the branch's business.
}

export interface VanStock {
  vanId: string;
  code: string;
  lines: VanStockLine[];
  totals: { articleCount: number };
}

/** `GET /o2c/vans/:id/stock?siteId` (`van.display`, SITE-scoped off the van's branch). */
export const getVanStockApi = (vanId: string, siteId: string) =>
  apiClient.get<VanStock>(`/o2c/vans/${vanId}/stock`, { query: { siteId } });

// ── My quotations ────────────────────────────────────────────────────────────────────────────────

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

export interface MyQuotationRow {
  id: string;
  code: string;
  customerId: string;
  customerName: string | null;
  status: QuotationStatus;
  /** The stored status folded through expiry — what to believe. */
  effectiveStatus: QuotationStatus;
  /** ISO timestamps of DATE columns — read the first 10 characters. */
  validFrom: string;
  validTo: string;
  currency: string;
  netHalalas: string;
  taxHalalas: string;
  grossHalalas: string;
  customerRef: string | null;
  createdAt: string;
}

/** `GET /o2c/van-sales/quotations?companyId&status&page&pageSize` — the caller's own, newest first. */
export const getMyQuotationsApi = (companyId: string, page = 1, pageSize = 20, status?: QuotationStatus) =>
  apiClient.get<OffsetPage<MyQuotationRow>>('/o2c/van-sales/quotations', {
    query: { companyId, page, pageSize, status },
  });

export interface MyQuotationLine {
  id: string;
  lineNo: number;
  articleId: string;
  articleNumber: string | null;
  articleNameEn: string | null;
  articleNameAr: string | null;
  qty: string;
  uomCode: string;
  /** ⚠ PER `pricePerQty` units. `netHalalas` is the line total — never multiply this yourself. */
  unitPriceHalalas: string;
  pricePerQty: string;
  discountHalalas: string;
  netHalalas: string;
  taxRateBps: number;
  taxAmountHalalas: string;
}

export interface MyQuotation {
  id: string;
  code: string;
  companyId: string;
  customerId: string;
  customerName: string | null;
  status: QuotationStatus;
  effectiveStatus: QuotationStatus;
  validFrom: string;
  validTo: string;
  currency: string;
  paymentTermsCode: string | null;
  netHalalas: string;
  taxHalalas: string;
  grossHalalas: string;
  customerRef: string | null;
  notes: string | null;
  createdAt: string;
  lines: MyQuotationLine[];
}

/** `GET /o2c/van-sales/quotations/:id?companyId` — the caller's own only; anyone else's is a 404. */
export const getMyQuotationApi = (id: string, companyId: string) =>
  apiClient.get<MyQuotation>(`/o2c/van-sales/quotations/${id}`, { query: { companyId } });
