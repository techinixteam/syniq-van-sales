import { resolveCompany } from '@/contexts/van-session';
import type { PermissionSet } from '@/authz/permission-store';

const g = (scopeType: PermissionSet[number]['scopeType'], scopeId: string | null, permission = 'van_sale.create') => ({
  permission,
  scopeType,
  scopeId,
});
const home = (id: string | null) => jest.fn(async () => id);

describe('resolveCompany — the company is the rep’s own grant', () => {
  it('a rep at COMPANY scope: that company, with no extra read', async () => {
    const read = home('co-2');
    await expect(resolveCompany([g('COMPANY', 'co-1')], read)).resolves.toEqual({ kind: 'ok', companyId: 'co-1' });
    expect(read).not.toHaveBeenCalled();
  });

  it('no van_sale.create at all is noAccess, whatever else is held', async () => {
    await expect(resolveCompany([g('COMPANY', 'co-1', 'sales_quotation.create')], home('co-1'))).resolves.toEqual({ kind: 'noAccess' });
  });

  it('a SITE- or REGION-scoped grant never counts — those are refused on every COMPANY route', async () => {
    await expect(resolveCompany([g('SITE', 'site-400'), g('REGION', 'r-1')], home('co-1'))).resolves.toEqual({ kind: 'noCompany' });
  });

  it('several companies: the home branch’s company breaks the tie, only if it is one of them', async () => {
    const two = [g('COMPANY', 'co-1'), g('COMPANY', 'co-2')];
    await expect(resolveCompany(two, home('co-2'))).resolves.toEqual({ kind: 'ok', companyId: 'co-2' });
    await expect(resolveCompany(two, home('co-9'))).resolves.toEqual({ kind: 'noCompany' });
    await expect(resolveCompany(two, home(null))).resolves.toEqual({ kind: 'noCompany' });
  });

  it('a GLOBAL grant (an administrator) works in the home branch’s company', async () => {
    await expect(resolveCompany([g('GLOBAL', null)], home('co-1'))).resolves.toEqual({ kind: 'ok', companyId: 'co-1' });
    await expect(resolveCompany([g('GLOBAL', null)], home(null))).resolves.toEqual({ kind: 'noCompany' });
  });

  it('a failed home-branch read is "no tie-breaker", not a crash', async () => {
    const boom = jest.fn(async () => {
      throw new Error('403');
    });
    await expect(resolveCompany([g('GLOBAL', null), g('COMPANY', 'co-1')], boom)).resolves.toEqual({ kind: 'ok', companyId: 'co-1' });
  });
});
