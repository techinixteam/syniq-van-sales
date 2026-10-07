import { HOME_SECTIONS } from '@/screens/Home/tiles';
import { PERMISSION_CODES } from '@/authz/permissions.generated';
import { BUNDLES } from '@/i18n/bundles';

/**
 * The tile map — the three ways it can silently hide or break a tile.
 */
const lookup = (bundle: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), bundle);

const merged = (lang: 'en' | 'ar') =>
  Object.values(BUNDLES).reduce<Record<string, unknown>>((acc, b) => ({ ...acc, ...(b as Record<'en' | 'ar', object>)[lang] }), {});

describe('Home tiles', () => {
  const tiles = HOME_SECTIONS.flatMap((s) => s.tiles);

  it('gates every tile on a permission the server catalog actually mints', () => {
    const known = new Set<string>(PERMISSION_CODES);
    expect(tiles.filter((t) => !known.has(t.permission)).map((t) => t.key)).toEqual([]);
  });

  it('gives every tile and section words — and a hint — in English and Arabic', () => {
    for (const lang of ['en', 'ar'] as const) {
      const b = merged(lang);
      const missing = [
        ...HOME_SECTIONS.map((s) => s.titleKey),
        ...tiles.map((t) => t.labelKey),
        ...tiles.map((t) => `${t.labelKey}Hint`),
      ].filter((k) => typeof lookup(b, k) !== 'string');
      expect({ lang, missing }).toEqual({ lang, missing: [] });
    }
  });

  it('keys are unique', () => {
    const keys = tiles.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('the sale tile is gated on the rep’s own capability, never on ar_invoice.approve', () => {
    expect(tiles.find((t) => t.key === 'new-invoice')?.permission).toBe('van_sale.create');
    expect(tiles.some((t) => (t.permission as string) === 'ar_invoice.approve')).toBe(false);
  });
});
