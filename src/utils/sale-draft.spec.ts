import type { ArticleSearchHit, PackagingProfile } from '@/api/article.api';
import {
  addArticle,
  isBasketReady,
  isSendableQty,
  lineBaseScaled,
  overVanStock,
  removeLine,
  toWireLines,
  trimQty,
  updateLine,
  vanQtyByArticle,
  type DraftLine,
} from '@/utils/sale-draft';

const hit = (over: Partial<ArticleSearchHit> = {}): ArticleSearchHit => ({
  id: 'a1',
  articleNumber: '1001000001',
  primaryName: 'Water 330ml',
  articleType: 'TRADING',
  status: 'ACTIVE',
  barcode: '6281000000017',
  salesUomCode: 'CS',
  score: 1,
  ...over,
});

let n = 0;
const mint = () => `k${++n}`;

const profile = (levels: Array<[string, string, string, boolean]>): PackagingProfile => ({
  base: levels.find((l) => l[3])?.[0] ?? null,
  levels: levels.map(([uomCode, num, den, isBase]) => ({ uomCode, ratioToBaseNum: num, ratioToBaseDen: den, isBase, gtins: [] })),
});
const WATER = profile([
  ['EA', '1', '1', true],
  ['CS', '24', '1', false],
]);

describe('isSendableQty — the server’s own rule', () => {
  it.each(['1', '2.5', '0.0001', '12.5000', '007'])('accepts %s', (q) => expect(isSendableQty(q)).toBe(true));
  it.each(['0', '0.0000', '', '-1', '1.23456', '1e3', 'abc', '1.', '.5'])('refuses %s', (q) =>
    expect(isSendableQty(q)).toBe(false),
  );
});

describe('the basket', () => {
  it('adds an article in its SALES unit, qty 1', () => {
    const lines = addArticle([], hit(), mint);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ articleId: 'a1', qty: '1', uomCode: 'CS', name: 'Water 330ml' });
  });

  it('the same article in the same unit bumps the line instead of adding a twin', () => {
    const once = addArticle([], hit(), mint);
    const twice = addArticle(once, hit(), mint);
    expect(twice).toHaveLength(1);
    expect(twice[0]!.qty).toBe('2');
  });

  it('a line in ANOTHER unit is a different line', () => {
    const once = addArticle([], hit(), mint);
    const other = updateLine(once, once[0]!.key, { uomCode: 'EA' });
    expect(addArticle(other, hit(), mint)).toHaveLength(2);
  });

  it('an article with no sales unit is added WITHOUT one — and the basket is not ready until it gets one', () => {
    const lines = addArticle([], hit({ salesUomCode: null }), mint);
    expect(lines[0]!.uomCode).toBeNull();
    expect(isBasketReady(lines)).toBe(false);
    expect(isBasketReady(updateLine(lines, lines[0]!.key, { uomCode: 'EA' }))).toBe(true);
  });

  it('an empty basket, or a zero / garbled quantity, is not ready', () => {
    expect(isBasketReady([])).toBe(false);
    const lines = addArticle([], hit(), mint);
    expect(isBasketReady(updateLine(lines, lines[0]!.key, { qty: '0' }))).toBe(false);
    expect(isBasketReady(updateLine(lines, lines[0]!.key, { qty: '2.' }))).toBe(false);
    expect(isBasketReady(removeLine(lines, lines[0]!.key))).toBe(false);
  });

  it('sends the lines in basket order, quantities normalised, nothing else', () => {
    let lines = addArticle([], hit(), mint);
    lines = addArticle(lines, hit({ id: 'a2', salesUomCode: 'EA' }), mint);
    lines = updateLine(lines, lines[0]!.key, { qty: '2.50' });
    expect(toWireLines(lines)).toEqual([
      { articleId: 'a1', qty: '2.5', uomCode: 'CS' },
      { articleId: 'a2', qty: '1', uomCode: 'EA' },
    ]);
  });

  it('trimQty never changes the value', () => {
    expect(trimQty('2.5000')).toBe('2.5');
    expect(trimQty('3.0')).toBe('3');
    expect(trimQty('0010')).toBe('10');
    expect(trimQty('0.25')).toBe('0.25');
  });
});

describe('the van-stock hint', () => {
  const stock = [
    { articleId: 'a1', articleNumber: null, nameEn: null, nameAr: null, baseUomCode: 'EA', batchId: 'b1', stockStatusCode: 'UNRESTRICTED', qtyOnHand: '30.0000' },
    { articleId: 'a1', articleNumber: null, nameEn: null, nameAr: null, baseUomCode: 'EA', batchId: 'b2', stockStatusCode: 'UNRESTRICTED', qtyOnHand: '18.0000' },
  ];

  it('sums the van’s batches per article, in base units', () => {
    expect(vanQtyByArticle(stock).get('a1')).toBe(480000n); // 48 EA × 10⁴
  });

  it('converts a line to base units exactly — 2 CS of 24 is 48 EA', () => {
    expect(lineBaseScaled('2', 'CS', WATER)).toBe(480000n);
    expect(lineBaseScaled('2', 'BOX', WATER)).toBeNull(); // not on the ladder: no guess
    expect(lineBaseScaled('2', 'CS', undefined)).toBeNull();
  });

  it('rounds a fractional conversion UP, so the hint never under-states', () => {
    const third = profile([
      ['KG', '1', '1', true],
      ['G', '1', '3', false],
    ]);
    expect(lineBaseScaled('1', 'G', third)).toBe(3334n);
  });

  it('flags an article only when ALL its lines together exceed the van', () => {
    const profiles = new Map([['a1', WATER]]);
    const van = vanQtyByArticle(stock);
    let lines: DraftLine[] = addArticle([], hit(), mint);
    lines = updateLine(lines, lines[0]!.key, { qty: '2' }); // 48 EA — exactly what the van holds
    expect(overVanStock(lines, van, profiles).size).toBe(0);
    lines = addArticle(updateLine(lines, lines[0]!.key, { uomCode: 'CS' }), hit({ salesUomCode: 'EA' }), mint);
    expect([...overVanStock(lines, van, profiles)]).toEqual(['a1']); // 48 + 1 EA
  });

  it('an article the van does not carry at all is over by definition', () => {
    const lines = addArticle([], hit({ id: 'zz' }), mint);
    expect([...overVanStock(lines, new Map(), new Map([['zz', WATER]]))]).toEqual(['zz']);
  });
});
