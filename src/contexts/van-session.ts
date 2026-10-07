import type { PermissionSet } from '@/authz/permission-store';

/**
 * WHICH COMPANY the rep works in — decided from their grants, PURE so the rule is pinned.
 *
 * `/auth/me` names no company, and every route this app calls is COMPANY-scoped. The rep's own
 * `van_sale.create` grant is held AT a company (VAN_SALES_REP is assigned at COMPANY scope), so its
 * `scopeId` IS the answer — with no extra read and no dependence on `site.display`.
 *
 *   · no `van_sale.create` at all                → noAccess (this is not a van-sales login)
 *   · exactly one COMPANY grant                  → that company
 *   · several COMPANY grants                     → the home branch's company, if it is one of them
 *   · a GLOBAL grant (an administrator testing)  → the home branch's company
 *   · anything else (SITE / REGION only, or no home branch to break a tie) → noCompany
 *
 * A SITE- or REGION-scoped grant is refused on every COMPANY-scoped route, so it never counts.
 */
export type CompanyResolution =
  | { kind: 'ok'; companyId: string }
  | { kind: 'noAccess' }
  | { kind: 'noCompany' };

export const VAN_SALE_PERMISSION = 'van_sale.create';

export async function resolveCompany(
  grants: PermissionSet,
  homeCompany: () => Promise<string | null>,
): Promise<CompanyResolution> {
  const held = grants.filter((g) => g.permission === VAN_SALE_PERMISSION);
  if (held.length === 0) return { kind: 'noAccess' };

  const companies = [
    ...new Set(held.filter((g) => g.scopeType === 'COMPANY' && g.scopeId).map((g) => g.scopeId as string)),
  ];
  const global = held.some((g) => g.scopeType === 'GLOBAL');

  if (companies.length === 1 && !global) return { kind: 'ok', companyId: companies[0]! };
  if (companies.length === 0 && !global) return { kind: 'noCompany' };

  // Several companies, or a GLOBAL grant: the home branch decides.
  let home: string | null = null;
  try {
    home = await homeCompany();
  } catch {
    home = null;
  }
  if (home && (global || companies.includes(home))) return { kind: 'ok', companyId: home };
  if (companies.length === 1) return { kind: 'ok', companyId: companies[0]! };
  return { kind: 'noCompany' };
}
