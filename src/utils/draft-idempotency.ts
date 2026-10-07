/**
 * S-INV-MBX F2 (spec §2 / R9) — the Idempotency-Key a multi-leg bin move is sent under, per DRAFT.
 *
 * The server's IdempotencyMiddleware only dedupes a replay of the SAME key. A fresh key per tap meant a
 * re-tap after a lost answer (timeout, dead wifi) moved the stock a second time whenever the first POST
 * had in fact committed. So the screen holds the key it last sent, with the body it was sent for:
 *
 *   · REUSED only for the IDENTICAL body, and only after a send that got NO HTTP response — the
 *     server either finished (the replay returns its stored answer) or never saw it (runs once);
 *   · DROPPED on success and on ANY other HTTP answer, 2xx/4xx/5xx — the transaction finished or
 *     rolled back, and a stored refusal must never be replayed forever;
 *   · KEPT on a 409 REQUEST_IN_PROGRESS (ruling, amends F2): the middleware throws it before it wraps
 *     res.json, so it is never stored, and the first send's outcome IS stored when it finishes — the
 *     next tap with the same key replays it. A stuck claim (server crash mid-move) is escaped by
 *     editing a leg, which changes the body and so the key;
 *   · a changed body (a leg edited) never reuses it — a new body is a new intent and gets a new key.
 *
 * The web twin is `syniq-web/src/modules/inventory/components/draft-idempotency.ts` (no cross-repo import).
 */
export interface DraftKey {
  key: string;
  /** The serialised request body this key was minted for. */
  body: string;
}

/** The key to send `body` under: the held one if it was minted for exactly this body, else a new one. */
export function keyForSend(held: DraftKey | null, body: string, mint: () => string): DraftKey {
  return held && held.body === body ? held : { key: mint(), body };
}

/** An error carrying an HTTP status is an answer from the server; anything else (timeout, network) is not. */
const answeredByServer = (error: unknown): boolean =>
  typeof (error as { status?: unknown } | null)?.status === 'number';

/** The server is still running the first send under this key (409, never stored by the middleware). */
export const isRequestInProgress = (error: unknown): boolean => {
  const e = error as { status?: unknown; code?: unknown } | null;
  return e?.status === 409 && e.code === 'REQUEST_IN_PROGRESS';
};

/** What to hold after the send settled: the key survives no HTTP response, or a 409 REQUEST_IN_PROGRESS. */
export function keyAfterSend(sent: DraftKey, result: { ok: true } | { ok: false; error: unknown }): DraftKey | null {
  return !result.ok && (!answeredByServer(result.error) || isRequestInProgress(result.error)) ? sent : null;
}
