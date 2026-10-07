import { useSyncExternalStore } from 'react';
import type { ScopeType } from '@/authz/scope';

/**
 * The caller's permission set, held outside React.
 *
 * A direct port of `syniq-web/src/shared/lib/authz/permission-store.ts`, and it stays a
 * module-level store for the same reason it is one there: `apiClient` must be able to clear it on
 * a forced logout without importing a context, and the route guards read it synchronously before
 * any component has rendered.
 *
 * ⚠ `null` means NOT YET LOADED and is not the same fact as "holds nothing". Every reader below
 * fails closed on `null`, which is why `AuthContext` must not render the app until `/auth/me` has
 * resolved — otherwise the launchpad paints empty for one frame and a user learns they have no
 * permissions.
 */

export interface PermissionGrant {
  permission: string;
  scopeType: ScopeType;
  scopeId: string | null;
}

export type PermissionSet = PermissionGrant[];

let state: PermissionSet | null = null;
const listeners = new Set<() => void>();

export function setPermissionSet(s: PermissionSet | null): void {
  state = s;
  listeners.forEach((l) => l());
}

export function getPermissionSet(): PermissionSet | null {
  return state;
}

export function usePermissionSet(): PermissionSet | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
