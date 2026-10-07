import { apiClient } from '@/api/apiClient';

/**
 * ⭐ THE ONLY WAY THIS APP LEARNS ITS COMPANY ID. `GET /auth/me` returns `homeSite` with
 * `{id, code, nameEn, nameAr, siteType}` and NO `companyId`, yet every route the rep uses is
 * COMPANY-scoped and names one (`?companyId=` / `body.companyId`). `GET /sites/{id}` carries it, and
 * `site.display` is one of VAN_SALES_REP's grants for exactly this reason.
 */
export interface Site {
  id: string;
  companyId: string;
  regionId: string | null;
  code: string;
  nameEn: string;
  nameAr: string;
  /** STORE | DC | B2B | OFFICE … */
  siteType: string;
  timezone: string;
  currency: string | null;
}

export const getSiteApi = (id: string) => apiClient.get<Site>(`/sites/${id}`);
