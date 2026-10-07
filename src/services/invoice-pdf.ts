import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { ENV } from '@/config/env';
import { buildQuery, getStoredToken, refreshAccessToken, toApiError } from '@/api/apiClient';
import { invoicePdfPath } from '@/api/invoice.api';

/**
 * The tax invoice as a PDF — the server's own rendering (`GET /finance/ar-invoices/:id/print.pdf`),
 * downloaded into the app's PRIVATE cache, then opened in the phone's PDF viewer or handed to the
 * share sheet (WhatsApp, email, a Bluetooth printer's app).
 *
 * ── THE PRINT LOG IS THE SERVER'S, AND IT COUNTS ───────────────────────────────────────────────
 *
 * Every download is a PRINT on the server: the first is the original, every later one is a
 * REPRINT, stamped as such, refused (422) without a stated reason, and refused (403) without
 * `document_reprint.create`. So this module keeps what it downloaded: a file already in the cache
 * for this invoice is opened again rather than printed again. Re-sharing the copy the customer
 * already has is not a new print; asking the server for another one is.
 *
 * ── WHY NOT `apiClient` ────────────────────────────────────────────────────────────────────────
 *
 * The answer is bytes, not JSON, and react-native-blob-util streams it straight to a file. It
 * still rides the same session rules: one refresh on a 401, through `refreshAccessToken` — the
 * single-flight refresh every JSON call waits on, because the server's refresh tokens rotate.
 */

const DIR = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/invoices`;

/** A filename the share sheet shows the customer — the invoice number, nothing a filesystem dislikes. */
export const pdfFileName = (docNumber: string) => `${docNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;

const pathFor = (docNumber: string) => `${DIR}/${pdfFileName(docNumber)}`;

/** Thrown when the server wants a reason for a REPRINT — the screen asks the rep and tries again. */
export class ReprintReasonRequired extends Error {
  constructor() {
    super('This invoice has been printed before. State a reason for the reprint.');
    this.name = 'ReprintReasonRequired';
    Object.setPrototypeOf(this, ReprintReasonRequired.prototype);
  }
}

/** The copy this phone already holds, if it holds one. */
export async function cachedInvoicePdf(docNumber: string): Promise<string | null> {
  const path = pathFor(docNumber);
  return (await ReactNativeBlobUtil.fs.exists(path)) ? path : null;
}

async function removeQuietly(path: string): Promise<void> {
  try {
    if (await ReactNativeBlobUtil.fs.exists(path)) await ReactNativeBlobUtil.fs.unlink(path);
  } catch {
    // A leftover file in the cache is harmless — Android clears it under pressure.
  }
}

/**
 * ONE download per invoice at a time. The result screen prefetches the original in the background;
 * a tap on View before it lands must WAIT for it, not start a second download — which the server
 * would count as a REPRINT and refuse without a reason, right after the sale.
 */
const inflight = new Map<string, Promise<string>>();

/**
 * Download the invoice PDF — a PRINT on the server (see the header). Answers the local file path.
 *
 * Without `reason` this is expected to be the first print; the server's 422 for an earlier print
 * comes back as `ReprintReasonRequired`. Any other refusal is an `ApiError` with the server's code.
 */
export function downloadInvoicePdf(input: {
  invoiceId: string;
  companyId: string;
  docNumber: string;
  reason?: string;
}): Promise<string> {
  const key = `${input.invoiceId}|${input.reason ?? ''}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = download(input).finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

async function download(input: { invoiceId: string; companyId: string; docNumber: string; reason?: string }): Promise<string> {
  const path = pathFor(input.docNumber);
  // Written to `.part` and renamed only once complete, so `cachedInvoicePdf` can never hand a
  // half-downloaded file to a viewer or to the customer.
  const part = `${path}.part`;
  if (!(await ReactNativeBlobUtil.fs.isDir(DIR))) await ReactNativeBlobUtil.fs.mkdir(DIR);
  const url = `${ENV.API_BASE_URL}${invoicePdfPath(input.invoiceId)}${buildQuery({
    companyId: input.companyId,
    reason: input.reason,
  })}`;

  const attempt = async (token: string | null) =>
    ReactNativeBlobUtil.config({ path: part, overwrite: true, timeout: ENV.API_TIMEOUT }).fetch('GET', url, {
      'X-Syniq-Client': 'native',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

  let res = await attempt(await getStoredToken());
  if (res.info().status === 401) {
    await removeQuietly(part);
    res = await attempt(await refreshAccessToken());
  }

  const status = res.info().status;
  if (status >= 200 && status < 300) {
    await removeQuietly(path);
    await ReactNativeBlobUtil.fs.mv(part, path);
    return path;
  }

  // A refusal: blob-util wrote the problem JSON into the file. Read it, then remove it.
  let body: unknown = null;
  try {
    body = JSON.parse(await ReactNativeBlobUtil.fs.readFile(part, 'utf8'));
  } catch {
    body = null;
  }
  await removeQuietly(part);
  if (status === 422 && !input.reason) throw new ReprintReasonRequired();
  throw toApiError(body, status, 'The invoice could not be printed.');
}

/** Open the PDF in the phone's viewer. `NO_VIEWER` when nothing installed can show a PDF. */
export async function openPdf(path: string): Promise<'OPENED' | 'NO_VIEWER'> {
  try {
    await ReactNativeBlobUtil.android.actionViewIntent(path, 'application/pdf');
    return 'OPENED';
  } catch (e) {
    if ((e as { code?: string }).code === 'ENOAPP' || /No app installed/i.test(String((e as Error).message))) {
      return 'NO_VIEWER';
    }
    throw e;
  }
}

/** Hand the PDF to the share sheet. A dismissed sheet is not an error. */
export async function sharePdf(path: string, docNumber: string, title: string): Promise<void> {
  await Share.open({
    url: `file://${path}`,
    type: 'application/pdf',
    filename: pdfFileName(docNumber),
    title,
    failOnCancel: false,
  });
}

