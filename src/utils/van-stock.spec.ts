import type { VanStockLine } from '@/api/van-sale.api';
import { vanStockRows } from '@/utils/van-stock';

const line = (over: Partial<VanStockLine>): VanStockLine => ({
  articleId: 'a1',
  articleNumber: '1001000001',
  nameEn: 'Water 330ml',
  nameAr: 'ماء',
  baseUomCode: 'EA',
  batchId: null,
  stockStatusCode: 'UNRESTRICTED',
  qtyOnHand: '1.0000',
  ...over,
});

describe('vanStockRows', () => {
  it('sums an article’s batches into one row, exactly', () => {
    const rows = vanStockRows([line({ batchId: 'b1', qtyOnHand: '0.1000' }), line({ batchId: 'b2', qtyOnHand: '0.2000' })], '', false);
    expect(rows).toEqual([{ articleId: 'a1', articleNumber: '1001000001', name: 'Water 330ml', uom: 'EA', qty: '0.3000' }]);
  });

  it('drops an article whose batches net to zero', () => {
    expect(vanStockRows([line({ qtyOnHand: '2' }), line({ qtyOnHand: '-2' })], '', false)).toEqual([]);
  });

  it('filters by name or number, and names in Arabic for an Arabic rep', () => {
    const lines = [line({}), line({ articleId: 'a2', articleNumber: '2002000002', nameEn: 'Juice', nameAr: 'عصير' })];
    expect(vanStockRows(lines, 'jui', false).map((r) => r.articleId)).toEqual(['a2']);
    expect(vanStockRows(lines, '2002', false).map((r) => r.articleId)).toEqual(['a2']);
    expect(vanStockRows(lines, '', true).map((r) => r.name)).toEqual(['عصير', 'ماء']);
  });
});
