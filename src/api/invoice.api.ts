import { apiClient } from '@/api/apiClient';
import type { OffsetPage } from '@/api/types';

/**
 * The AR invoices a van sale produces — read and printed under `ar_invoice.display` at COMPANY.
 *
 * The app lists ITS VAN'S invoices (`vanId`), newest first. The grant itself reads the company's
 * whole book — the filter is a convenience, not a fence.
 */

/** The buyer as invoiced — snapshotted on the document, which is why a list can name them. */
export interface BuyerParty {
  registrationName?: string;
  vatNumber?: string | null;
}

export interface InvoiceRow {
  id: string;
  /** ARI-2026-00001. */
  docNumber: string;
  kind: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  status: 'DRAFT' | 'POSTED' | 'PAID' | 'REVERSED' | string;
  creditStatus: string;
  customerId: string;
  vanId: string | null;
  currency: string;
  netHalalas: string;
  taxHalalas: string;
  grossHalalas: string;
  /** YYYY-MM-DD (an ISO timestamp of a DATE column — read the first 10 characters). */
  invoiceDate: string;
  reference: string | null;
  customerRef: string | null;
  buyerPartySnapshot: BuyerParty | null;
}

/** `GET /finance/ar-invoices?companyId&vanId&page&pageSize`. */
export const listVanInvoicesApi = (companyId: string, vanId: string, page = 1, pageSize = 25) =>
  apiClient.get<OffsetPage<InvoiceRow>>('/finance/ar-invoices', {
    query: { companyId, vanId, page, pageSize },
  });

export interface InvoiceLine {
  id: string;
  lineNo: number;
  articleId: string | null;
  description: string;
  qty: string;
  uomCode: string;
  unitPriceHalalas: string;
  netHalalas: string;
  taxRateBps: number;
  taxAmountHalalas: string;
}

export interface InvoiceDetail extends InvoiceRow {
  lines: InvoiceLine[];
  /** "Has this been paid?" — the open items travel with the invoice. One per instalment. */
  openItems: Array<{
    id: string;
    instalmentNo: number;
    dueDate: string | null;
    amountTxnHalalas: string;
    openAmountTxnHalalas: string;
    /** OPEN | PARTIAL | CLEARED … */
    status: string;
  }>;
  eInvoice: { id: string; status: string; invoiceNumber: string | null } | null;
}

/** `GET /finance/ar-invoices/:id?companyId`. */
export const getInvoiceApi = (id: string, companyId: string) =>
  apiClient.get<InvoiceDetail>(`/finance/ar-invoices/${id}`, { query: { companyId } });

/** The print route — downloaded as bytes by `services/invoice-pdf.ts`, never through `apiClient`. */
export const invoicePdfPath = (id: string) => `/finance/ar-invoices/${id}/print.pdf`;
