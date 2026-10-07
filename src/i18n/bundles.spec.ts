import { BUNDLES } from '@/i18n/bundles';

/**
 * The i18n rules this app cannot enforce with types alone. `ar: typeof en` already makes a MISSING
 * Arabic key a compile error; these are the failures it cannot see.
 *
 * ⭐ THE BUNDLE LIST IS READ FROM `bundles/index.ts`, not retyped here — the Operations app listed
 * its bundles twice and its spec quietly stopped checking the eleventh one.
 */

describe('namespace ownership', () => {
  /**
   * ⚠ THE SILENT ONE. The bundles are spread into a single flat `translation` resource, and in a
   * spread a repeated top-level key WINS rather than conflicting.
   */
  it('gives every top-level namespace to exactly one bundle', () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const [name, bundle] of Object.entries(BUNDLES)) {
      for (const namespace of Object.keys(bundle.en)) {
        const existing = owner.get(namespace);
        if (existing) clashes.push(`"${namespace}" is in both ${existing} and ${name}`);
        else owner.set(namespace, name);
      }
    }
    expect(clashes).toEqual([]);
  });
});

describe('Arabic parity', () => {
  /** `''` satisfies `string`, so a blank caption passes the type check — it is caught here. */
  it('has no blank strings in either language', () => {
    const blanks: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (typeof node === 'string') {
        if (node.trim() === '') blanks.push(path);
        return;
      }
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
      }
    };
    for (const [name, bundle] of Object.entries(BUNDLES)) {
      walk(bundle.en, `${name}.en`);
      walk(bundle.ar, `${name}.ar`);
    }
    expect(blanks).toEqual([]);
  });

  /**
   * A translation byte-identical to the English is usually an untranslated placeholder. The few
   * legitimate ones are listed, which turns a silent gap into a decision somebody made.
   */
  it('keeps the list of deliberately-identical strings short and explicit', () => {
    const identical: string[] = [];
    const walk = (en: unknown, ar: unknown, path: string) => {
      if (typeof en === 'string' && typeof ar === 'string') {
        if (en === ar) identical.push(path);
        return;
      }
      if (en && ar && typeof en === 'object' && typeof ar === 'object') {
        for (const [k, v] of Object.entries(en)) walk(v, (ar as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      }
    };
    for (const [name, bundle] of Object.entries(BUNDLES)) walk(bundle.en, bundle.ar, name);

    expect(identical.sort()).toEqual([
      // The language switcher shows each language in ITS OWN script, in both locales.
      'profile.profile.arabic',
      'profile.profile.english',
    ]);
  });
});

describe('interpolation', () => {
  /** A `{{count}}` in English and none in Arabic renders a sentence with a hole in it. */
  it('uses the same interpolation variables in both languages', () => {
    const mismatches: string[] = [];
    const vars = (s: string) => (s.match(/\{\{(\w+)\}\}/g) ?? []).sort().join(',');
    const walk = (en: unknown, ar: unknown, path: string) => {
      if (typeof en === 'string' && typeof ar === 'string') {
        if (vars(en) !== vars(ar)) mismatches.push(`${path}: "${vars(en)}" vs "${vars(ar)}"`);
        return;
      }
      if (en && ar && typeof en === 'object' && typeof ar === 'object') {
        for (const [k, v] of Object.entries(en)) walk(v, (ar as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      }
    };
    for (const [name, bundle] of Object.entries(BUNDLES)) walk(bundle.en, bundle.ar, name);
    expect(mismatches).toEqual([]);
  });
});
