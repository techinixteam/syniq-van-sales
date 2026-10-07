/**
 * Turning a failure into a sentence a van rep can act on, standing in front of a customer.
 *
 * ⚠ BRANCH ON THE SERVER'S `code`, NEVER ITS MESSAGE. The sentence comes from the `errors` bundle
 * (`err.<CODE>`); a code the bundle does not carry falls back to the server's own `detail`, because
 * a specific sentence in English ("Van VAN-0003 holds 2 of 6281000123 Water 330ml; 6 was asked for")
 * beats a translated "Something went wrong".
 *
 * The TRANSLATED set is the bundle's own key list — one list, so a code can never be "claimed" here
 * and missing there (the Operations app kept two lists and pinned them with a spec).
 */

import { ApiError, SessionExpiredError } from '@/api/apiClient';
import { errors } from '@/i18n/bundles/errors';

const TRANSLATED: ReadonlySet<string> = new Set(Object.keys(errors.en.err));

/**
 * Codes whose server `detail` carries the SPECIFICS (which article, how many) — shown under the
 * translated sentence instead of being replaced by it.
 */
const WITH_DETAIL: ReadonlySet<string> = new Set([
  'O2C_VAN_INSUFFICIENT_STOCK',
  'O2C_LINE_NOT_PRICED',
  'O2C_UOM_NOT_CONVERTIBLE',
  'O2C_ORDER_BLOCKED',
  'PRICE_UOM_NOT_ON_ARTICLE',
  'BATCH_INSUFFICIENT',
]);

/** The two codes a credit refusal arrives under. Their reasons are translated one by one. */
const CREDIT_CODES: ReadonlySet<string> = new Set(['AR_CREDIT_BLOCKED', 'O2C_CREDIT_BLOCKED']);

const KNOWN_REASONS: ReadonlySet<string> = new Set(Object.keys(errors.en.creditReason));

export interface ErrorPresentation {
  /** An i18n key to show, or null to show `detail` as-is. */
  key: string | null;
  /** The server's own sentence. */
  detail?: string;
  /** Shown under the translated sentence when the server's detail carries specifics. */
  showDetail?: boolean;
  code?: string;
  forbidden: boolean;
  /** Credit-control reasons (`creditReason.<CODE>` keys), when the refusal was a credit block. */
  reasonKeys?: string[];
}

/**
 * The reasons credit control gave. ⚠ TWO SHAPES on the wire: `O2C_CREDIT_BLOCKED` carries them as
 * `errors.reasonCodes`, while `AR_CREDIT_BLOCKED` (thrown inside the posting transaction) has them
 * dropped by the server's error filter and only NAMED in the detail ("Refused by credit control:
 * AR_NOT_ON_ACCOUNT"). Both are read.
 */
export function creditReasonCodes(e: ApiError): string[] {
  const body = e.body as { errors?: { reasonCodes?: unknown } } | null | undefined;
  const listed = Array.isArray(body?.errors?.reasonCodes)
    ? (body!.errors!.reasonCodes as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  const named = e.message.match(/\bAR_[A-Z_]+\b/g) ?? [];
  return [...new Set([...listed, ...named])];
}

export function presentError(e: unknown): ErrorPresentation {
  if (e instanceof ApiError) {
    const reasons = CREDIT_CODES.has(e.code) ? creditReasonCodes(e) : [];
    return {
      key: TRANSLATED.has(e.code) ? `err.${e.code}` : null,
      detail: e.message,
      showDetail: WITH_DETAIL.has(e.code),
      code: e.code,
      forbidden: e.isForbidden,
      reasonKeys: reasons.filter((r) => KNOWN_REASONS.has(r)).map((r) => `creditReason.${r}`),
    };
  }
  if (e instanceof SessionExpiredError) return { key: 'error.sessionExpired', forbidden: false };
  if (e instanceof Error) {
    if (e.message.includes('session has expired')) return { key: 'error.sessionExpired', forbidden: false };
    if (e.message.includes('took too long')) return { key: 'error.timeout', forbidden: false };
    return { key: 'error.offline', forbidden: false };
  }
  return { key: 'error.generic', forbidden: false };
}

/** The whole message as one string — the translated sentence, its specifics, and any credit reasons. */
export function errorMessage(e: unknown, t: (key: string) => string): string {
  const p = presentError(e);
  if (!p.key) return p.detail && p.detail.trim() ? p.detail : t('error.generic');
  const parts = [t(p.key)];
  if (p.reasonKeys && p.reasonKeys.length > 0) parts.push(...p.reasonKeys.map((k) => `• ${t(k)}`));
  else if (p.showDetail && p.detail && p.detail.trim()) parts.push(p.detail);
  return parts.join('\n');
}

/** True when the server answered that a request with this key is STILL RUNNING (never stored). */
export const isRequestInProgress = (e: unknown): boolean =>
  e instanceof ApiError && e.status === 409 && e.code === 'REQUEST_IN_PROGRESS';
