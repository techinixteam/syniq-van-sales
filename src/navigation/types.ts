/**
 * Route params. The two stacks: Login before a session, Main after it (inside VanProvider).
 */
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;

  NewInvoice: undefined;
  /** Shown once, right after a sale posts. The numbers are the server's answer, carried over. */
  InvoiceDone: {
    invoiceId: string;
    docNumber: string;
    customerName: string;
    grossHalalas: string | null;
    currency: string;
  };
  Invoices: undefined;
  InvoiceDetail: { invoiceId: string; docNumber?: string };

  NewQuotation: undefined;
  Quotations: undefined;
  QuotationDetail: { quotationId: string; code?: string };

  VanStock: undefined;
  DcStock: undefined;
};
