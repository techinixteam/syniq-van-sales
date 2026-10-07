import type { MyQuotation } from '@/api/van-sale.api';
import { quotationText } from '@/utils/quotation-text';

const t = (key: string) => key.replace('quote.share.', '');

const q: MyQuotation = {
  id: 'q1',
  code: 'SQ-2026-00012',
  companyId: 'c1',
  customerId: 'cu1',
  customerName: 'Al Noor Grocery',
  status: 'DRAFT',
  effectiveStatus: 'DRAFT',
  validFrom: '2026-10-07T00:00:00.000Z',
  validTo: '2026-10-21T00:00:00.000Z',
  currency: 'SAR',
  paymentTermsCode: 'NET30',
  netHalalas: '25000',
  taxHalalas: '3750',
  grossHalalas: '28750',
  customerRef: 'PO-77',
  notes: null,
  createdAt: '2026-10-07T09:00:00.000Z',
  lines: [
    {
      id: 'l1',
      lineNo: 1,
      articleId: 'a1',
      articleNumber: '1001000001',
      articleNameEn: 'Water 330ml',
      articleNameAr: 'ماء ٣٣٠مل',
      qty: '2.0000',
      uomCode: 'CS',
      unitPriceHalalas: '12500',
      pricePerQty: '1',
      discountHalalas: '0',
      netHalalas: '25000',
      taxRateBps: 1500,
      taxAmountHalalas: '3750',
    },
  ],
};

describe('quotationText', () => {
  it('carries the server’s figures verbatim — line net, VAT, total — and nothing computed here', () => {
    const text = quotationText(q, t, false);
    expect(text).toBe(
      [
        'title SQ-2026-00012',
        'customer: Al Noor Grocery',
        'valid: 2026-10-07 → 2026-10-21',
        'yourRef: PO-77',
        '',
        '1. 1001000001 Water 330ml',
        '   2 CS — SAR 250.00',
        '',
        'net: SAR 250.00',
        'vat: SAR 37.50',
        'total: SAR 287.50',
      ].join('\n'),
    );
  });

  it('names the article in Arabic for an Arabic rep, falling back to English when untranslated', () => {
    expect(quotationText(q, t, true)).toContain('1. 1001000001 ماء ٣٣٠مل');
    const untranslated = { ...q, lines: [{ ...q.lines[0]!, articleNameAr: null }] };
    expect(quotationText(untranslated, t, true)).toContain('1. 1001000001 Water 330ml');
  });
});
