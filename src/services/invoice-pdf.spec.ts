/**
 * The invoice PDF download: one refresh on a 401, a reprint asks for a reason, and an error body is
 * never left in the cache where it would be opened as a PDF.
 */
const mockFiles: Record<string, string> = {};
const mockResponses: Array<{ status: number; body: string }> = [];
const mockFetchCalls: Array<{ url: string; headers: Record<string, string> }> = [];

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: { CacheDir: '/cache' },
      exists: jest.fn(async (p: string) => p in mockFiles),
      isDir: jest.fn(async () => true),
      mkdir: jest.fn(async () => {}),
      unlink: jest.fn(async (p: string) => {
        delete mockFiles[p];
      }),
      readFile: jest.fn(async (p: string) => mockFiles[p] ?? ''),
      mv: jest.fn(async (from: string, to: string) => {
        mockFiles[to] = mockFiles[from]!;
        delete mockFiles[from];
      }),
    },
    config: jest.fn(({ path }: { path: string }) => ({
      fetch: jest.fn(async (_method: string, url: string, headers: Record<string, string>) => {
        mockFetchCalls.push({ url, headers });
        const r = mockResponses.shift()!;
        mockFiles[path] = r.body;
        return { info: () => ({ status: r.status }), path: () => path };
      }),
    })),
    android: { actionViewIntent: jest.fn(async () => true) },
  },
}));
jest.mock('@/config/env', () => ({ ENV: { API_BASE_URL: 'http://api.test', API_TIMEOUT: 5000 } }));
jest.mock('@/api/apiClient', () => {
  const actual = jest.requireActual('@/api/apiClient');
  return {
    ...actual,
    getStoredToken: jest.fn(async () => 'old-token'),
    refreshAccessToken: jest.fn(async () => 'new-token'),
  };
});

import { cachedInvoicePdf, downloadInvoicePdf, pdfFileName, ReprintReasonRequired } from '@/services/invoice-pdf';
import { refreshAccessToken } from '@/api/apiClient';

const input = { invoiceId: 'inv-1', companyId: 'co-1', docNumber: 'ARI-2026-00001' };

beforeEach(() => {
  for (const k of Object.keys(mockFiles)) delete mockFiles[k];
  mockResponses.length = 0;
  mockFetchCalls.length = 0;
  (refreshAccessToken as jest.Mock).mockClear();
});

it('downloads the first print into the cache, under the invoice number', async () => {
  mockResponses.push({ status: 200, body: '%PDF-1.7' });
  const path = await downloadInvoicePdf(input);
  expect(path).toBe('/cache/invoices/ARI-2026-00001.pdf');
  expect(mockFetchCalls[0]!.url).toBe('http://api.test/finance/ar-invoices/inv-1/print.pdf?companyId=co-1');
  expect(mockFetchCalls[0]!.headers.Authorization).toBe('Bearer old-token');
  await expect(cachedInvoicePdf('ARI-2026-00001')).resolves.toBe(path);
});

it('refreshes ONCE on a 401 — through the shared single-flight refresh — and retries', async () => {
  mockResponses.push({ status: 401, body: '{}' }, { status: 200, body: '%PDF-1.7' });
  await downloadInvoicePdf(input);
  expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  expect(mockFetchCalls[1]!.headers.Authorization).toBe('Bearer new-token');
});

it('a reprint without a reason is ReprintReasonRequired — and leaves nothing in the cache', async () => {
  mockResponses.push({ status: 422, body: JSON.stringify({ code: 'UNPROCESSABLE_ENTITY', detail: 'printed before' }) });
  await expect(downloadInvoicePdf(input)).rejects.toBeInstanceOf(ReprintReasonRequired);
  await expect(cachedInvoicePdf('ARI-2026-00001')).resolves.toBeNull();
});

it('a reprint WITH a reason sends it; a refusal keeps the server’s code', async () => {
  mockResponses.push({ status: 403, body: JSON.stringify({ code: 'FORBIDDEN', detail: 'needs Document Reprint' }) });
  await expect(downloadInvoicePdf({ ...input, reason: 'customer lost it' })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  expect(mockFetchCalls[0]!.url).toContain('reason=customer%20lost%20it');
  await expect(cachedInvoicePdf('ARI-2026-00001')).resolves.toBeNull();
});

it('never leaves a .part behind, and a refusal leaves no file at all', async () => {
  mockResponses.push({ status: 200, body: '%PDF-1.7' });
  await downloadInvoicePdf(input);
  expect(Object.keys(mockFiles)).toEqual(['/cache/invoices/ARI-2026-00001.pdf']);
});

it('⭐ two taps while the first download runs share ONE download (a second would be a REPRINT)', async () => {
  mockResponses.push({ status: 200, body: '%PDF-1.7' });
  const [a, b] = await Promise.all([downloadInvoicePdf(input), downloadInvoicePdf(input)]);
  expect(a).toBe(b);
  expect(mockFetchCalls).toHaveLength(1);
});

it('names the file safely for the share sheet', () => {
  expect(pdfFileName('ARI-2026-00001')).toBe('ARI-2026-00001.pdf');
  expect(pdfFileName('ARI/2026 01')).toBe('ARI_2026_01.pdf');
});
