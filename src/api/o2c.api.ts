import { apiClient } from '@/api/apiClient';

/**
 * The two Order-to-Cash doors this app shares with syniq-web's sell forms: the PRICE PREVIEW every
 * new document is built from, and the quotation create.
 */

// ── Price preview ────────────────────────────────────────────────────────────────────────────────

export interface PreviewLineInput {
  articleId: string;
  qty: string;
  uomCode: string;
}

export interface PricePreviewBody {
  companyId: string;
  customerId: string;
  /** ⭐ ALWAYS the van's branch here: a van sale is priced, and stock-checked, at the branch the van lives under. */
  deliveringSiteId?: string;
  lines?: PreviewLineInput[];
}

/** A refusal, as data. `[]` means the document could be raised as described. */
export interface DeterminationProblem {
  code: string;
  message: string;
  field?: 'customerId' | 'deliveringSiteId' | 'priceListCode';
}

export interface ShipToOption {
  id: string;
  addressType: string;
  isDefault: boolean;
  label: string;
}

export interface PreviewedLine {
  lineNo: number;
  articleId: string;
  /** ⚠ PER `perQty` PRICING UNITS. Never derive a line total from it — `netHalalas` is the total. */
  unitPriceHalalas: string;
  perQty: number;
  netHalalas: string;
  taxClassId: string | null;
  taxClassCode: string | null;
  taxClassName: string | null;
  taxRateBps: number;
  taxAmountHalalas: string;
  grossHalalas: string;
}

export interface PricePreview {
  determination: {
    deliveringSiteId: string | null;
    priceListCode: string | null;
    shipToAddresses: ShipToOption[];
    currency: string | null;
    paymentTermsCode: string | null;
    deliveryBlock: boolean;
    billingBlock: boolean;
  };
  problems: DeterminationProblem[];
  /** Null when no lines were sent. */
  lines: PreviewedLine[] | null;
  totals: { netHalalas: string; taxHalalas: string; grossHalalas: string } | null;
}

/**
 * `POST /o2c/price-preview` — WRITES NOTHING. Gated `sales_order.display` at COMPANY: that grant is
 * on VAN_SALES_REP precisely so this works.
 *
 * The figures come from the code that will post the document: the customer's book, the article's
 * tax class. There is no honest client-side mirror, so the app shows nothing it did not get here.
 */
export const pricePreviewApi = (body: PricePreviewBody) =>
  apiClient.post<PricePreview>('/o2c/price-preview', body);

// ── Quotation create ─────────────────────────────────────────────────────────────────────────────

export interface CreateQuotationBody {
  companyId: string;
  customerId: string;
  /** The branch the quote is priced for — the van's branch. */
  deliveringSiteId?: string;
  /** YYYY-MM-DD. */
  validFrom: string;
  validTo: string;
  customerRef?: string;
  notes?: string;
  lines: PreviewLineInput[];
}

/**
 * `POST /o2c/quotations` (`sales_quotation.create`, COMPANY). Raised as DRAFT and priced from the
 * customer's book; sending, accepting and converting it are the office's (those routes are
 * GLOBAL-only today). Not idempotency-guarded on the server — one tap, one quotation, the button
 * locks while it is in flight.
 */
export const createQuotationApi = (body: CreateQuotationBody) =>
  apiClient.post<{ id: string; code: string }>('/o2c/quotations', body);
