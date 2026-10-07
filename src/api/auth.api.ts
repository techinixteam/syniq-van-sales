import { apiClient } from '@/api/apiClient';
import type { ScopeType } from '@/authz/scope';

/**
 * Auth API. Shapes are hand-written from the server rather than generated — the same choice
 * syniq-web makes (see the workspace AGENTS.md: "every call is `apiFetch<T>` with a hand-written
 * `T`"). Read `contracts/openapi/auth.json` and the controller before changing one.
 */

// ── Login ───────────────────────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  /** Access-token lifetime in SECONDS. */
  expiresIn: number;
  userId: string;
  mfaRequired: boolean;
  /**
   * Returned because this client sends `X-Syniq-Client: native` on every request (see
   * `apiClient.ts`). Without that header the server delivers the refresh token as an httpOnly
   * cookie and nothing else, which is the browser SPA's posture and is deliberately kept.
   *
   * ⚠ STILL OPTIONAL, and it must stay optional: an installed handheld outlives a server deploy, so
   * a build in a warehouse may be talking to a server from before the header existed. Absent, the
   * session falls back to the OkHttp cookie jar exactly as it used to.
   */
  refreshToken?: string;
}

export const loginApi = (identifier: string, password: string) =>
  apiClient.post<LoginResponse>('/auth/login', { identifier, password });

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  userId: string;
  refreshToken?: string;
}

export const logoutApi = () => apiClient.post<void>('/auth/logout', {});

export const changePasswordApi = (currentPassword: string, newPassword: string) =>
  apiClient.post<void>('/auth/password', { currentPassword, newPassword });

// ── /auth/me ────────────────────────────────────────────────────────────────────────────────────

export interface PermissionGrantDto {
  permission: string;
  scopeType: ScopeType;
  scopeId: string | null;
}

/** `null` for a site-less (corporate) user — which is a real case, not an error. */
export interface HomeSite {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  siteType: string;
}

/**
 * One role the caller holds, deduped across scopes by the server — display only. ⚠ An OBJECT, not
 * a code string: the first cut typed this as `string[]` and the Profile screen fed each one to
 * `<Badge label>`, which crashed the screen with "Objects are not valid as a React child" for
 * every user holding a role. Never gate anything on this; authorization reads `permissions`.
 */
export interface MeRole {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface MeResponse {
  user: {
    id: string;
    username: string;
    email: string | null;
    employeeId: string | null;
    name: { en: string; ar: string } | null;
    status: string;
  };
  permVersion: number;
  roles: MeRole[];
  permissions: PermissionGrantDto[];
  homeSite: HomeSite | null;
  siteCapabilities: Record<string, boolean>;
}

/**
 * The single call that decides what this user may see. Everything the launchpad gates on comes
 * from here — the permission set, the roles, and the branch the app acts at.
 */
export const getMeApi = () => apiClient.get<MeResponse>('/auth/me');
