import type { MeResponse } from '@/api/auth.api';
import { roleLabel } from '@/screens/Profile/profile-roles';

/**
 * `/auth/me` answers `roles` as OBJECTS — `{ id, code, nameEn, nameAr }`, the same projection the
 * web reads (see `auth.service.ts#activeRoles`). The first ProfileScreen typed them as `string[]`
 * and handed each one straight to `<Badge label>`, which React refused at render time:
 *
 *   "Objects are not valid as a React child (found: object with keys {id, code, nameEn, nameAr})"
 *
 * That took down the whole Profile screen — theme, language, sign-out and password with it — for
 * every user who holds at least one role, i.e. everyone. These specs pin the shape and the label
 * rule so the type can never drift back to a string.
 */

// What the server actually sends. Written as a literal against the DTO so a change to either side
// fails the typecheck, not the device.
const server: MeResponse['roles'] = [
  { id: 'r-1', code: 'STORE_MANAGER', nameEn: 'Store Manager', nameAr: 'مدير المتجر' },
  { id: 'r-2', code: 'WAREHOUSE_CLERK', nameEn: 'Warehouse Clerk', nameAr: '' },
];

describe('roleLabel', () => {
  it('shows the English name for an English UI', () => {
    expect(roleLabel(server[0], 'en')).toBe('Store Manager');
  });

  it('shows the Arabic name for an Arabic UI', () => {
    expect(roleLabel(server[0], 'ar')).toBe('مدير المتجر');
  });

  it('falls back to the English name when the Arabic one is blank', () => {
    expect(roleLabel(server[1], 'ar')).toBe('Warehouse Clerk');
  });

  it('falls back to the code when both names are blank', () => {
    expect(roleLabel({ id: 'r-3', code: 'AUDITOR', nameEn: '', nameAr: '' }, 'en')).toBe('AUDITOR');
  });

  it('always answers a string — the only thing a Badge can render', () => {
    for (const role of server) {
      for (const lng of ['en', 'ar', 'en-GB']) {
        expect(typeof roleLabel(role, lng)).toBe('string');
      }
    }
  });
});
