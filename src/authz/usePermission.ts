import { useMemo } from 'react';
import { usePermissionSet } from '@/authz/permission-store';
import { scopeCovers, type Scope } from '@/authz/scope';
import type { Activity, AuthObject } from '@/authz/permission-types';

/**
 * Does the caller hold this permission AT `at` (default GLOBAL)?
 *
 * Ancestry is approximated as empty client-side (the server is authoritative), so GLOBAL grants
 * and exact-scope grants resolve, and a broader-covers-narrower grant shows at the held scope's
 * own level.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⚠ DO NOT GATE A TILE OR A NAV ROW ON THIS. USE `useHoldsPermission` BELOW.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `at` defaults to GLOBAL, and almost nobody who uses this app holds anything at GLOBAL — a
 * receiving clerk is SITE-scoped to DC 300, a supervisor to store 208. Gate the launchpad on this
 * hook and **every one of them opens the app to an empty screen**, with no error and nothing to
 * report but "the app doesn't work".
 *
 * This is not hypothetical. It shipped in syniq-web's finance wave, where finance roles saw no
 * buttons because `<Can>` was missing `anyScope`, and it will be worse here because on the web the
 * site-scoped user is the exception and here they are the entire population.
 *
 * Use this hook only where a SPECIFIC scope is genuinely the question — "may this user post a
 * receipt at THIS site" — and pass `at` explicitly when you do.
 */
export function usePermission(activity: Activity, object: AuthObject, at?: Scope): boolean {
  const set = usePermissionSet();
  return useMemo(() => {
    if (!set) return false;
    const code = `${object}.${activity}`;
    const target: Scope = at ?? { scopeType: 'GLOBAL', scopeId: null };
    return set.some(
      (p) =>
        p.permission === code &&
        scopeCovers({ scopeType: p.scopeType, scopeId: p.scopeId }, target, () => []),
    );
    // ⚠ The scope is depended on BY VALUE, not by object identity. Callers pass `at` as an inline
    // literal — `{ scopeType: 'SITE', scopeId: site.id }` — which is a fresh object on every
    // render, so depending on `at` itself would recompute this on every render and defeat the memo
    // entirely. The two fields ARE the whole of `Scope`, so listing them is exhaustive in fact even
    // though the rule cannot see it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, activity, object, at?.scopeType, at?.scopeId]);
}

/**
 * Does the caller hold this permission at ANY scope?
 *
 * **This is the hook the launchpad, the nav and every route guard use.** It matches the server's
 * own route-guard semantics (`requirePermission` / `requireAnyPermission` in syniq-web check
 * membership, not coverage), so what the app offers and what the API will serve agree.
 *
 * The scope question is not skipped, only deferred: the server re-checks it against the acting
 * site on every call, and the screen surfaces that refusal. Showing a tile the user turns out not
 * to hold at their site is a recoverable annoyance; hiding every tile they DO hold is not.
 */
export function useHoldsPermission(activity: Activity, object: AuthObject): boolean {
  const set = usePermissionSet();
  const code = `${object}.${activity}`;
  return useMemo(() => !!set?.some((p) => p.permission === code), [set, code]);
}

/** True when the caller holds ANY of the given permissions at ANY scope. For shared surfaces. */
export function useHoldsAny(pairs: Array<[Activity, AuthObject]>): boolean {
  const set = usePermissionSet();
  const codes = pairs.map(([activity, object]) => `${object}.${activity}`).join(',');
  return useMemo(() => {
    const wanted = codes.split(',');
    return !!set?.some((p) => wanted.includes(p.permission));
  }, [set, codes]);
}
