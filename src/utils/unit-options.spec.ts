import { defaultUnit, ratioLabel, unitBarcodes, unitLabelFor, unitOptions } from './unit-options';
import type { PackagingProfile } from '@/api/article.api';

const level = (uomCode: string, num: string, den: string, isBase = false, gtins: string[] = []) => ({ uomCode, ratioToBaseNum: num, ratioToBaseDen: den, isBase, gtins });
const ladder: PackagingProfile = { base: 'EA', levels: [level('EA', '1', '1', true), level('PACK', '6', '1'), level('CASE', '12', '1')] };
/** The same ladder as it comes off a real article: each packaging level carries its own GTIN. */
const scanned: PackagingProfile = {
  base: 'EA',
  levels: [
    level('EA', '1', '1', true, ['6281234567890']),
    level('PACK', '6', '1', false, []),
    level('CASE', '12', '1', false, ['16281234567897', '6299000112233']),
  ],
};

describe('ratioLabel', () => {
  it('says "base unit" for the base, and the count of base units for a pack', () => {
    expect(ratioLabel(level('EA', '1', '1', true), 'EA', 'base unit')).toBe('base unit');
    expect(ratioLabel(level('CASE', '12', '1'), 'EA', 'base unit')).toBe('12 EA');
  });

  it('keeps a rational ratio as a fraction — never 0.3333', () => {
    expect(ratioLabel(level('TH', '1', '3'), 'EA', 'base unit')).toBe('1/3 EA');
  });
});

describe('unitBarcodes', () => {
  it('is the barcode that identifies the level', () => {
    expect(unitBarcodes(level('EA', '1', '1', true, ['6281234567890']))).toEqual(['6281234567890']);
  });

  it('lists EVERY barcode in full — a re-labelled case is scanned by whichever code is on it', () => {
    expect(unitBarcodes(level('CASE', '12', '1', false, ['16281234567897', '6299000112233', '5012345678900']))).toEqual([
      '16281234567897',
      '6299000112233',
      '5012345678900',
    ]);
  });

  it('is empty for a level nobody has barcoded — the screen must say so, never show a blank', () => {
    expect(unitBarcodes(level('PACK', '6', '1'))).toEqual([]);
  });
});

describe('unitOptions', () => {
  it('offers the ladder in order with the ratio as the detail line', () => {
    expect(unitOptions(ladder, 'base unit', 'no barcode')).toEqual([
      { key: 'EA', label: 'EA', detail: 'base unit', codes: ['no barcode'] },
      { key: 'PACK', label: 'PACK', detail: '6 EA', codes: ['no barcode'] },
      { key: 'CASE', label: 'CASE', detail: '12 EA', codes: ['no barcode'] },
    ]);
  });

  it('shows EACH unit ALL of its OWN barcodes — whichever is on the carton is the one scanned', () => {
    expect(unitOptions(scanned, 'base unit', 'no barcode')).toEqual([
      { key: 'EA', label: 'EA', detail: 'base unit', codes: ['6281234567890'] },
      { key: 'PACK', label: 'PACK', detail: '6 EA', codes: ['no barcode'] },
      { key: 'CASE', label: 'CASE', detail: '12 EA', codes: ['16281234567897', '6299000112233'] },
    ]);
  });

  it('offers nothing for an article with no units', () => {
    expect(unitOptions({ base: null, levels: [] }, 'base unit', 'no barcode')).toEqual([]);
  });
});

describe('defaultUnit', () => {
  it('starts in the unit the scanned barcode denominates when the article has it', () => {
    expect(defaultUnit(ladder, 'CASE')).toBe('CASE');
  });

  it('falls back to the base when the scanned unit is unknown or absent', () => {
    expect(defaultUnit(ladder, 'CTN')).toBe('EA');
    expect(defaultUnit(ladder, undefined)).toBe('EA');
  });

  it('is null for an article with no units — the line cannot be received, and the screen must say so', () => {
    expect(defaultUnit({ base: null, levels: [] }, 'EA')).toBeNull();
  });
});

describe('unitLabelFor', () => {
  const labelled: PackagingProfile = {
    base: 'EA',
    levels: [
      { uomCode: 'EA', ratioToBaseNum: '1', ratioToBaseDen: '1', isBase: true, gtins: [], uomLabel: null },
      { uomCode: 'BOX', ratioToBaseNum: '24', ratioToBaseDen: '1', isBase: false, gtins: [], uomLabel: 'BOX (24 EA)' },
      { uomCode: 'CAR', ratioToBaseNum: '288', ratioToBaseDen: '1', isBase: false, gtins: [], uomLabel: 'CAR (12 BOX)' },
    ],
  };

  it('gives the chosen level its composed label', () => {
    // A receiving line reading "3 CAR" does not tell a receiver over a pallet what they counted.
    expect(unitLabelFor(labelled, 'CAR')).toBe('CAR (12 BOX)');
  });

  it('is null for the base unit — nothing to count it against', () => {
    expect(unitLabelFor(labelled, 'EA')).toBeNull();
  });

  it('is null for a unit that is not on the ladder', () => {
    expect(unitLabelFor(labelled, 'PLT')).toBeNull();
  });

  it('is null when nothing is chosen yet', () => {
    expect(unitLabelFor(labelled, null)).toBeNull();
  });

  it('is null on a ladder from a server that sends no labels', () => {
    // Every article until someone configures packaging — the line keeps showing the bare code.
    expect(unitLabelFor(ladder, 'CASE')).toBeNull();
  });
});
