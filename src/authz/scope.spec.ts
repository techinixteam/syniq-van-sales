import { scopeCovers, type Scope } from '@/authz/scope';

const none = () => [];
const s = (scopeType: Scope['scopeType'], scopeId: string | null = null): Scope => ({
  scopeType,
  scopeId,
});

describe('scopeCovers — the UX mirror of the server "at or above" rule', () => {
  it('GLOBAL covers everything, including a merch node', () => {
    expect(scopeCovers(s('GLOBAL'), s('SITE', '208'), none)).toBe(true);
    expect(scopeCovers(s('GLOBAL'), s('COMPANY', 'GRH-KSA'), none)).toBe(true);
    expect(scopeCovers(s('GLOBAL'), s('MERCH_NODE', '4711'), none)).toBe(true);
  });

  it('an exact same-type grant covers only its own id', () => {
    expect(scopeCovers(s('SITE', '208'), s('SITE', '208'), none)).toBe(true);
    expect(scopeCovers(s('SITE', '208'), s('SITE', '300'), none)).toBe(false);
  });

  it('a narrower grant never covers a broader target', () => {
    // A site-scoped clerk does not hold the company.
    expect(scopeCovers(s('SITE', '208'), s('COMPANY', 'GRH-KSA'), none)).toBe(false);
    expect(scopeCovers(s('REGION', 'W'), s('COMPANY', 'GRH-KSA'), none)).toBe(false);
  });

  it('a broader grant covers a narrower target only through resolved ancestry', () => {
    // Without an org tree the client cannot prove ancestry, so it answers false — deliberately.
    // The server knows better and is the real gate.
    expect(scopeCovers(s('COMPANY', 'GRH-KSA'), s('SITE', '208'), none)).toBe(false);
    expect(
      scopeCovers(s('COMPANY', 'GRH-KSA'), s('SITE', '208'), () => ['GRH-KSA']),
    ).toBe(true);
  });

  it('MERCH_NODE is a separate axis — it neither covers nor is covered by the org ladder', () => {
    expect(scopeCovers(s('MERCH_NODE', '4711'), s('SITE', '208'), none)).toBe(false);
    expect(scopeCovers(s('SITE', '208'), s('MERCH_NODE', '4711'), none)).toBe(false);
    // Not even itself — the ladder comparison is unreachable for this type by design.
    expect(scopeCovers(s('MERCH_NODE', '4711'), s('MERCH_NODE', '4711'), none)).toBe(false);
  });

  it('a null id never matches another null id across the ladder', () => {
    expect(scopeCovers(s('COMPANY', null), s('SITE', '208'), () => [])).toBe(false);
  });
});

/**
 * The regression this file exists for (plan §5.2): a SITE-scoped user is the normal case in this
 * app, and gating a tile on a GLOBAL target hides every tile they legitimately hold.
 */
describe('the GLOBAL-default trap', () => {
  it('a SITE grant does NOT cover the GLOBAL target that usePermission defaults to', () => {
    expect(scopeCovers(s('SITE', '208'), s('GLOBAL'), none)).toBe(false);
  });
});
