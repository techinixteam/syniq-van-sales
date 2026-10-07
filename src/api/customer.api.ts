import { apiClient } from '@/api/apiClient';

/**
 * B2B customers — finding the one at the counter, and what credit control thinks of them.
 */

/** One hit of `GET /b2b-customers/search`. */
export interface CustomerHit {
  id: string;
  customerNumber: string | null;
  primaryName: string;
  /** ORGANIZATION | PERSON (a sole-trader baqala is a PERSON). */
  kind: string;
}

/**
 * `GET /b2b-customers/search?companyId&q&limit` (`b2b_customer.display`, COMPANY).
 *
 * ⚠ NOT A LIST AND NOT PAGED — a server-side typeahead with a 2-character floor enforced on BOTH
 * sides. The customer book is planned for millions of rows; a "load them all" picker would never
 * finish on a phone.
 */
export const searchCustomersApi = (companyId: string, q: string, limit = 20) =>
  apiClient.get<CustomerHit[]>('/b2b-customers/search', { query: { companyId, q, limit } });

/**
 * `GET /finance/ar/credit/exposure?companyId&customerId` (`ar_credit_exposure.display`, COMPANY).
 *
 * ⚠ A CACHE, possibly a tick stale — the server says so in `note`. The real decision is taken when
 * the invoice posts, under a lock. This is what the rep sees BEFORE building a basket the customer
 * cannot be invoiced for.
 */
export type CreditExposure =
  | { computed: false; companyId: string; customerId: string; note: string }
  | {
      computed: true;
      companyId: string;
      customerId: string;
      limitBaseHalalas: string;
      receivablesBaseHalalas: string;
      exposureBaseHalalas: string;
      availableBaseHalalas: string;
      overdueBaseHalalas: string;
      oldestDueDate: string | null;
      status: string;
      computedAt: string;
      note: string;
    };

export const getCreditExposureApi = (companyId: string, customerId: string) =>
  apiClient.get<CreditExposure>('/finance/ar/credit/exposure', { query: { companyId, customerId } });
