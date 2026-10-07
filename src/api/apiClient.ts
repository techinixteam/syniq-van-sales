/**
 * API client — a thin fetch wrapper over the hosted SYNIQ API.
 *
 * Ported from syniq-opr-app (itself from `loadindo-vendor`), whose refresh queue and error taxonomy
 * were hardened against real production failures. What differs here:
 *
 *   1. Tokens live in the Android keystore (`token-store.ts`), not AsyncStorage.
 *   2. The refresh is ONE single-flight function, `refreshAccessToken`, shared by JSON requests and
 *      by the invoice-PDF download (`services/invoice-pdf.ts`). The server's refresh tokens ROTATE
 *      and are single-use, so two refreshes racing each other would sign the rep out — every path
 *      that can meet a 401 must wait on the same refresh.
 *
 * Errors read SYNIQ's problem envelope `{ code, detail }`. The app is ONLINE-ONLY: there is no
 * cache, no outbox and no retry queue. A failed call is a visible, retryable failure — never a
 * silent success.
 */

import { ENV } from '@/config/env';
import {
  clearStoredRefreshToken,
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredRefreshToken,
  setStoredToken,
} from '@/api/token-store';

export {
  clearStoredRefreshToken,
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredRefreshToken,
  setStoredToken,
};

// ── Event emitter ───────────────────────────────────────────────────────────────────────────────
//
// Exists so the client can tell the app "you are logged out" / "the network is gone" without
// importing AuthContext or NetworkStatusContext — which would be a cycle, since both import this.

export const API_EVENTS = {
  ON_UNAUTHORIZED: 'ON_UNAUTHORIZED',
  /** fetch itself rejected — no connection, DNS failure, TLS error. */
  ON_NETWORK_ERROR: 'ON_NETWORK_ERROR',
  /** AbortController fired after ENV.API_TIMEOUT. */
  ON_TIMEOUT: 'ON_TIMEOUT',
  /** The server answered 5xx. */
  ON_SERVER_ERROR: 'ON_SERVER_ERROR',
} as const;

export interface APIErrorPayload {
  path: string;
  status?: number;
}

type EventCallback = (payload?: APIErrorPayload) => void;
const listeners: Record<string, EventCallback[]> = {};

export const onAPIEvent = (event: string, callback: EventCallback) => {
  (listeners[event] ||= []).push(callback);
};
export const offAPIEvent = (event: string, callback: EventCallback) => {
  listeners[event] = (listeners[event] || []).filter((cb) => cb !== callback);
};
export const emitAPIEvent = (event: string, payload?: APIErrorPayload) => {
  listeners[event]?.forEach((cb) => cb(payload));
};

// ── Typed error ─────────────────────────────────────────────────────────────────────────────────

/**
 * An error built from an actual HTTP response, carrying the status and the server's
 * machine-readable `code`.
 *
 * ⚠ BRANCH ON `code`, NEVER ON THE MESSAGE. The server distinguishes `O2C_VAN_INSUFFICIENT_STOCK`
 * from `AR_CREDIT_BLOCKED` from `SCOPE_DENIED`, and a screen that told them apart by sniffing
 * English would break the day someone improved the wording — or the moment the rep's locale is
 * Arabic.
 *
 * Only thrown where a response was genuinely received. Timeouts, network failures and refresh
 * failures stay plain `Error`s, and that distinction is load-bearing (`utils/draft-idempotency.ts`
 * keeps a draft's key only when NO response came back).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body?: unknown;

  constructor(message: string, status: number, code: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
    // Without this, `instanceof` breaks when TS downlevels.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get statusCode(): number {
    return this.status;
  }

  /** The caller lacks the permission, or holds it at the wrong scope. */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** SYNIQ's error envelope is `{ code, detail }` (see syniq-web/src/shared/lib/api/client.ts). */
export const toApiError = (json: unknown, status: number, fallback: string): ApiError => {
  const obj = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) ?? {};
  const detail = typeof obj.detail === 'string' ? obj.detail : undefined;
  const message = typeof obj.message === 'string' ? obj.message : undefined;
  const code = typeof obj.code === 'string' ? obj.code : `HTTP_${status}`;
  return new ApiError(detail ?? message ?? fallback, status, code, json);
};

// ── Request options ─────────────────────────────────────────────────────────────────────────────

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Send a fresh `Idempotency-Key`. Set on every POST that CREATES or POSTS a document. A van sale
   * passes its own draft key instead (`idempotencyKey`), so a re-tap after a lost answer replays
   * the first answer rather than selling the van's stock twice.
   */
  idempotent?: boolean;
  /** Send THIS `Idempotency-Key` instead of a fresh one (it wins over `idempotent`). */
  idempotencyKey?: string;
}

export const buildQuery = (query: RequestOptions['query']): string => {
  if (!query) return '';
  const pairs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
};

/**
 * RN has `crypto.randomUUID` only behind a polyfill, so this is a v4-shaped random string built
 * from Math.random. It is an idempotency key, not a security token — it needs to be unique per
 * user action, not unguessable.
 */
export const newIdempotencyKey = (): string =>
  // The bitwise operators below are the v4 shape itself — `| 0` truncates and `(r & 0x3) | 0x8`
  // pins the variant nibble to 8–b.
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/**
 * The key a request is RESENT under after a token refresh.
 *
 * The server's IdempotencyMiddleware runs BEFORE the JWT guard and stores every answer, the 401
 * included, so resending the same key is answered with that stored 401. The 401 proves the first
 * send never reached a handler, so a new key is safe. It is DERIVED, not random: a draft that
 * re-sends its own key after a lost resend answer gets the same stored 401, refreshes, and resends
 * under the same derived key — replaying the resend's outcome instead of running it a second time.
 */
const resendKey = (key: string): string => `${key}-r`;

/**
 * A 401 here means the credential was rejected — not that a session expired. Surfacing the
 * server's own message and leaving the stored tokens alone is the difference between "wrong
 * password" and an unexplained sign-out.
 */
const PRE_AUTH_PATHS = ['/auth/login'];

// ── The refresh — ONE in flight, shared by everything ──────────────────────────────────────────

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
    this.name = 'SessionExpiredError';
    Object.setPrototypeOf(this, SessionExpiredError.prototype);
  }
}

let refreshing: Promise<string> | null = null;

/**
 * Trade the stored refresh token for a new access token. Concurrent callers share ONE call: the
 * server rotates refresh tokens and each is single-use, so a second refresh racing the first would
 * present a token the first has just retired — and sign the rep out mid-sale.
 *
 * Rejects with `SessionExpiredError` (and announces ON_UNAUTHORIZED) when there is nothing to
 * refresh with or the server refuses; the session is over and AuthContext clears it.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) throw new SessionExpiredError();
      let res: Response;
      try {
        res = await fetch(`${ENV.API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          // ⚠ `X-Syniq-Client` HERE TOO: a refresh ROTATES the token, so without it the server
          // sets a new cookie and returns no body token, leaving this client holding a value the
          // server has just retired.
          headers: { 'Content-Type': 'application/json', 'X-Syniq-Client': 'native' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (err) {
        // No answer at all — the network, not the session. Do NOT sign out over a dead tunnel.
        emitAPIEvent(API_EVENTS.ON_NETWORK_ERROR, { path: '/auth/refresh' });
        throw err;
      }
      if (!res.ok) throw new SessionExpiredError();
      const refreshed = (await res.json()) as { accessToken: string; refreshToken?: string };
      await setStoredToken(refreshed.accessToken);
      if (refreshed.refreshToken) await setStoredRefreshToken(refreshed.refreshToken);
      return refreshed.accessToken;
    })()
      .catch((err: unknown) => {
        if (err instanceof SessionExpiredError) emitAPIEvent(API_EVENTS.ON_UNAUTHORIZED);
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// ── Core request ────────────────────────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, idempotent, idempotencyKey, ...init } = options;
  const url = `${ENV.API_BASE_URL}${path}${buildQuery(query)}`;
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // ⭐ THE HEADER THAT ASKS FOR A REFRESH TOKEN WE CAN ACTUALLY HOLD. Without it `/auth/login`
    // and `/auth/refresh` deliver the refresh token ONLY as an httpOnly cookie; with it the server
    // also returns `refreshToken` in the body, which `token-store.ts` keeps in the keystore.
    'X-Syniq-Client': 'native',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const key = idempotencyKey ?? (idempotent ? newIdempotencyKey() : undefined);
  if (key) headers['Idempotency-Key'] = key;
  /** Headers for the post-refresh resend: the new token, and a NEW key (see `resendKey`). */
  const resendHeaders = (freshToken: string): Record<string, string> => ({
    ...headers,
    Authorization: `Bearer ${freshToken}`,
    ...(key ? { 'Idempotency-Key': resendKey(key) } : {}),
  });

  const serialised = body !== undefined ? JSON.stringify(body) : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENV.API_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers, body: serialised, signal: controller.signal });
  } catch (err: unknown) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      emitAPIEvent(API_EVENTS.ON_TIMEOUT, { path });
      throw new Error('The server took too long to answer. Check the connection and try again.');
    }
    emitAPIEvent(API_EVENTS.ON_NETWORK_ERROR, { path });
    throw err;
  }
  clearTimeout(timeout);

  // ── 401 ───────────────────────────────────────────────────────────────────────────────────────

  if (response.status === 401) {
    if (PRE_AUTH_PATHS.includes(path)) {
      const json = await response.json().catch(() => ({}));
      throw toApiError(json, 401, 'Wrong username or password.');
    }
    if (path === '/auth/refresh') {
      emitAPIEvent(API_EVENTS.ON_UNAUTHORIZED);
      throw new SessionExpiredError();
    }

    const fresh = await refreshAccessToken();
    const retryRes = await fetch(url, { ...init, headers: resendHeaders(fresh), body: serialised });
    if (retryRes.status === 204) return undefined as T;
    const retryText = await retryRes.text();
    const retryJson = retryText ? safeJson(retryText) : null;
    // ⚠ Without this check a failed retry — say a 409 landing just after a token refresh — would
    // be handed back to the caller AS A SUCCESS PAYLOAD (a real defect in the app this is ported from).
    if (!retryRes.ok) {
      if (retryRes.status >= 500) {
        emitAPIEvent(API_EVENTS.ON_SERVER_ERROR, { path, status: retryRes.status });
      }
      throw toApiError(retryJson, retryRes.status, 'Something went wrong.');
    }
    return retryJson as T;
  }

  // ── Everything else ───────────────────────────────────────────────────────────────────────────

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const json = text ? safeJson(text) : null;

  if (!response.ok) {
    if (response.status >= 500) {
      emitAPIEvent(API_EVENTS.ON_SERVER_ERROR, { path, status: response.status });
    }
    throw toApiError(json, response.status, 'Something went wrong.');
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ── Exported client ─────────────────────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T>(path: string, opts?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
