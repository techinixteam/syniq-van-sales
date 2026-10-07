import type { MeRole } from '@/api/auth.api';

/**
 * The words a role badge shows. Arabic UI → `nameAr`, anything else → `nameEn`; a blank name falls
 * through to the other language and finally to the code, so the badge always carries a readable
 * string. Pure, so the shape `/auth/me` actually sends is pinned by a spec rather than by a device.
 */
export const roleLabel = (role: MeRole, language: string): string => {
  const ar = role.nameAr?.trim() ?? '';
  const en = role.nameEn?.trim() ?? '';
  const preferred = language.startsWith('ar') ? ar || en : en || ar;
  return preferred || role.code;
};
