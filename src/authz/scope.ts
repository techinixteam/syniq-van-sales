export type ScopeType = 'GLOBAL' | 'COMPANY' | 'REGION' | 'SITE' | 'MERCH_NODE';

export interface Scope {
  scopeType: ScopeType;
  scopeId: string | null;
}

const RANK: Record<Exclude<ScopeType, 'MERCH_NODE'>, number> = {
  GLOBAL: 0,
  COMPANY: 1,
  REGION: 2,
  SITE: 3,
};

/**
 * UX-only mirror of the server's "at or above" rule. **The server guard is the real gate** — this
 * decides what to SHOW. `ancestorsOf` resolves a target's ancestor ids from the org tree; the app
 * passes `() => []`, so a broader-covers-narrower grant resolves at the held scope's own level and
 * GLOBAL covers everything.
 *
 * Ported verbatim from `syniq-web/src/shared/lib/authz/scope.ts`. Keep it verbatim: the two
 * clients disagreeing about who can see what is a support ticket nobody can reproduce.
 *
 * MERCH_NODE is a separate axis, not a rung on the org ladder — a merchandise-hierarchy grant
 * neither covers nor is covered by a site grant, so it answers false in both directions rather
 * than being ranked.
 */
export function scopeCovers(
  held: Scope,
  target: Scope,
  ancestorsOf: (id: string) => string[],
): boolean {
  if (held.scopeType === 'GLOBAL') return true;
  if (held.scopeType === 'MERCH_NODE' || target.scopeType === 'MERCH_NODE') return false;
  if (held.scopeType === target.scopeType) return held.scopeId === target.scopeId;
  if (RANK[held.scopeType] < RANK[target.scopeType]) {
    return (
      target.scopeId != null &&
      held.scopeId != null &&
      ancestorsOf(target.scopeId).includes(held.scopeId)
    );
  }
  return false;
}
