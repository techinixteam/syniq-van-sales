import { ApiError } from '@/api/apiClient';
import { isRequestInProgress, keyAfterSend, keyForSend } from '@/utils/draft-idempotency';

/**
 * S-INV-MBX F2 / R9 — a multi-leg move is sent under a per-draft Idempotency-Key. Replaying the
 * SAME key is what stops a re-tap after a lost answer from moving the stock twice; minting a new one
 * after any real answer is what stops a stored refusal from being replayed forever.
 */
describe('draft idempotency key', () => {
  let n = 0;
  const mint = () => `k${++n}`;
  beforeEach(() => {
    n = 0;
  });

  it('mints a key on the first send of a body', () => {
    expect(keyForSend(null, '{"lines":[1]}', mint)).toEqual({ key: 'k1', body: '{"lines":[1]}' });
  });

  it('reuses the held key for the IDENTICAL body', () => {
    const held = { key: 'k9', body: '{"lines":[1]}' };
    expect(keyForSend(held, '{"lines":[1]}', mint)).toBe(held);
  });

  it('mints a new key once the body changed (a leg was edited)', () => {
    expect(keyForSend({ key: 'k9', body: '{"lines":[1]}' }, '{"lines":[2]}', mint)).toEqual({ key: 'k1', body: '{"lines":[2]}' });
  });

  it('keeps the key only when the send ended with NO HTTP response', () => {
    const sent = { key: 'k1', body: 'b' };
    expect(keyAfterSend(sent, { ok: false, error: new Error('The server took too long to answer.') })).toBe(sent);
    expect(keyAfterSend(sent, { ok: false, error: new TypeError('Network request failed') })).toBe(sent);
  });

  it('clears the key on success and on ANY HTTP answer — 4xx or 5xx', () => {
    const sent = { key: 'k1', body: 'b' };
    expect(keyAfterSend(sent, { ok: true })).toBeNull();
    expect(keyAfterSend(sent, { ok: false, error: new ApiError('Refused', 422, 'BIN_TRANSFER_OVER') })).toBeNull();
    expect(keyAfterSend(sent, { ok: false, error: new ApiError('Boom', 500, 'HTTP_500') })).toBeNull();
    expect(keyAfterSend(sent, { ok: false, error: new ApiError('Reused', 409, 'IDEMPOTENCY_KEY_REUSED') })).toBeNull();
  });

  /**
   * Amendment — a 409 REQUEST_IN_PROGRESS is thrown before the middleware wraps res.json, so it is
   * never stored, and the first request's outcome IS stored when it finishes: the same key replays it.
   */
  it('KEEPS the key on a 409 REQUEST_IN_PROGRESS — the first send is still running', () => {
    const sent = { key: 'k1', body: 'b' };
    const inProgress = new ApiError('A request with this Idempotency-Key is already in progress.', 409, 'REQUEST_IN_PROGRESS');
    expect(keyAfterSend(sent, { ok: false, error: inProgress })).toBe(sent);
    expect(isRequestInProgress(inProgress)).toBe(true);
    expect(isRequestInProgress(new ApiError('Reused', 409, 'IDEMPOTENCY_KEY_REUSED'))).toBe(false);
    expect(isRequestInProgress(new Error('timeout'))).toBe(false);
  });
});
