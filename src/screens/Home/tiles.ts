import type { PermissionCode } from '@/authz/permission-types';
import type { MainStackParamList } from '@/navigation/types';

/**
 * The Home tiles, as DATA — so a spec can pin that every tile is gated on a real permission, opens a
 * real route, and has words in both languages.
 *
 * ⚠ GATED ON HOLDING THE PERMISSION AT ANY SCOPE (`useHoldsPermission` semantics). The rep holds
 * everything at COMPANY scope; a gate that asked for GLOBAL would hide every tile from every rep.
 * The server re-checks the scope on every call regardless.
 *
 * Each permission is the one the screen's FIRST call is gated on, so a tile is never shown for a
 * screen that would open on a 403.
 */
export interface HomeTile {
  key: string;
  route: keyof MainStackParamList;
  permission: PermissionCode;
  /** i18n key; `${labelKey}Hint` is the description line. */
  labelKey: string;
}

export interface HomeSection {
  key: string;
  titleKey: string;
  tiles: HomeTile[];
}

export const HOME_SECTIONS: readonly HomeSection[] = [
  {
    key: 'sell',
    titleKey: 'home.sell',
    tiles: [
      { key: 'new-invoice', route: 'NewInvoice', permission: 'van_sale.create', labelKey: 'home.newInvoice' },
      { key: 'invoices', route: 'Invoices', permission: 'ar_invoice.display', labelKey: 'home.invoices' },
      { key: 'new-quotation', route: 'NewQuotation', permission: 'sales_quotation.create', labelKey: 'home.newQuotation' },
      { key: 'quotations', route: 'Quotations', permission: 'sales_quotation.display', labelKey: 'home.quotations' },
    ],
  },
  {
    key: 'stock',
    titleKey: 'home.stock',
    tiles: [
      { key: 'van-stock', route: 'VanStock', permission: 'van.display', labelKey: 'home.vanStock' },
      { key: 'dc-stock', route: 'DcStock', permission: 'transfer_request.display', labelKey: 'home.dcStock' },
    ],
  },
];
