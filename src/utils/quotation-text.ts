import type { MyQuotation } from '@/api/van-sale.api';
import { formatMoney } from '@/utils/money';
import { formatQty } from '@/utils/qty';

/**
 * A quotation as a plain-text message — what the rep pastes into WhatsApp for the customer.
 *
 * ⚠ THERE IS NO QUOTATION PDF (the server registers the doc type but ships no adapter), and a quote
 * is an OFFER, not a tax document — so plain text, built from the SERVER's figures only: the line
 * nets, the VAT and the total exactly as `GET /o2c/van-sales/quotations/:id` returned them.
 *
 * Labels arrive through `t` so the message follows the app's language; numbers stay Western (the
 * same rule as the printed documents), so a figure reads the same to the rep and to the office.
 */
export function quotationText(q: MyQuotation, t: (key: string, vars?: Record<string, unknown>) => string, arabic: boolean): string {
  const name = (en: string | null, ar: string | null) => (arabic ? ar || en : en || ar) ?? '';
  const out: string[] = [];
  out.push(`${t('quote.share.title')} ${q.code}`);
  if (q.customerName) out.push(`${t('quote.share.customer')}: ${q.customerName}`);
  out.push(`${t('quote.share.valid')}: ${q.validFrom.slice(0, 10)} → ${q.validTo.slice(0, 10)}`);
  if (q.customerRef) out.push(`${t('quote.share.yourRef')}: ${q.customerRef}`);
  out.push('');
  for (const l of q.lines) {
    const label = [l.articleNumber, name(l.articleNameEn, l.articleNameAr)].filter(Boolean).join(' ');
    out.push(`${l.lineNo}. ${label}`);
    out.push(`   ${formatQty(l.qty)} ${l.uomCode} — ${formatMoney(l.netHalalas, q.currency)}`);
  }
  out.push('');
  out.push(`${t('quote.share.net')}: ${formatMoney(q.netHalalas, q.currency)}`);
  out.push(`${t('quote.share.vat')}: ${formatMoney(q.taxHalalas, q.currency)}`);
  out.push(`${t('quote.share.total')}: ${formatMoney(q.grossHalalas, q.currency)}`);
  if (q.notes) {
    out.push('');
    out.push(q.notes);
  }
  return out.join('\n');
}
