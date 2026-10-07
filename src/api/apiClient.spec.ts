/**
 * The Idempotency-Key the client puts on the wire, and the ONE refresh every 401 waits on.
 *
 * A caller may pass its own key (a van-sale draft replays it after a lost answer); it wins over
 * `idempotent: true`'s fresh one. The server's IdempotencyMiddleware runs BEFORE the JWT guard and
 * stores the 401 under the key, so the post-refresh resend must carry a NEW key — or it is answered
 * with the stored 401. The 401 proves the first request never reached a handler.
 */
jest.mock('react-native-keychain', () => {
  const store: Record<string, string> = {
    'com.syniq.vansales.accessToken': 'old-token',
    'com.syniq.vansales.refreshToken': 'refresh-1',
  };
  return {
    getGenericPassword: jest.fn(async ({ service }: { service: string }) =>
      store[service] ? { username: 'syniq', password: store[service], service } : false,
    ),
    setGenericPassword: jest.fn(async (_u: string, password: string, { service }: { service: string }) => {
      store[service] = password;
      return { service, storage: 'AES_GCM_NO_AUTH' };
    }),
    resetGenericPassword: jest.fn(async ({ service }: { service: string }) => {
      delete store[service];
      return true;
    }),
  };
});
jest.mock('@/config/env', () => ({ ENV: { API_BASE_URL: 'http://api.test', API_TIMEOUT: 5000 } }));

import { API_EVENTS, apiClient, offAPIEvent, onAPIEvent } from '@/api/apiClient';
import { __resetTokenCacheForTests, setStoredRefreshToken, setStoredToken } from '@/api/token-store';

const res = (status: number, body: unknown = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
const fetchMock = jest.fn();
(globalThis as { fetch: unknown }).fetch = fetchMock;

/** The Idempotency-Key header of the n-th fetch call. */
const keyOf = (call: number): string | undefined =>
  (fetchMock.mock.calls[call]?.[1]?.headers as Record<string, string> | undefined)?.['Idempotency-Key'];

beforeEach(async () => {
  fetchMock.mockReset();
  __resetTokenCacheForTests();
  await setStoredToken('old-token');
  await setStoredRefreshToken('refresh-1');
});

describe('apiClient — Idempotency-Key', () => {
  it('sends an explicit idempotencyKey verbatim, over idempotent: true', async () => {
    fetchMock.mockResolvedValueOnce(res(200, { id: 't1' }));
    await apiClient.post('/o2c/van-sales', { lines: [] }, { idempotent: true, idempotencyKey: 'draft-key-1' });
    expect(keyOf(0)).toBe('draft-key-1');
  });

  it('idempotent: true alone mints a fresh key per call', async () => {
    fetchMock.mockResolvedValue(res(200, {}));
    await apiClient.post('/x', {}, { idempotent: true });
    await apiClient.post('/x', {}, { idempotent: true });
    expect(keyOf(0)).toEqual(expect.any(String));
    expect(keyOf(0)).not.toBe(keyOf(1));
  });

  it('the resend after a token refresh carries a NEW key and the NEW token', async () => {
    fetchMock
      .mockResolvedValueOnce(res(401, { code: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(res(200, { accessToken: 'new-token', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(res(200, { id: 't1' }));
    await expect(apiClient.post('/x', {}, { idempotent: true })).resolves.toEqual({ id: 't1' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://api.test/auth/refresh');
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ refreshToken: 'refresh-1' });
    expect(keyOf(2)).toEqual(expect.any(String));
    expect(keyOf(2)).not.toBe(keyOf(0));
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>).Authorization).toBe('Bearer new-token');
  });

  it("holds for a caller's explicit key too — and the resend key is derived, so a retried draft converges", async () => {
    const once = () =>
      fetchMock
        .mockResolvedValueOnce(res(401, { code: 'UNAUTHORIZED' }))
        .mockResolvedValueOnce(res(200, { accessToken: 'new-token' }))
        .mockResolvedValueOnce(res(200, { id: 't1' }));
    once();
    await apiClient.post('/x', {}, { idempotent: true, idempotencyKey: 'draft-key-1' });
    once();
    await apiClient.post('/x', {}, { idempotent: true, idempotencyKey: 'draft-key-1' });
    expect(keyOf(0)).toBe('draft-key-1');
    expect(keyOf(2)).not.toBe('draft-key-1');
    // Same draft, same 401 ⇒ the same resend key: a lost resend answer is replayed, never re-run.
    expect(keyOf(5)).toBe(keyOf(2));
  });
});

describe('apiClient — one refresh for everyone', () => {
  it('two requests that both meet a 401 share ONE refresh (refresh tokens rotate and are single-use)', async () => {
    fetchMock.mockImplementation(async (url: string, init: { headers?: Record<string, string> }) => {
      if (url.endsWith('/auth/refresh')) return res(200, { accessToken: 'new-token', refreshToken: 'refresh-2' });
      return init.headers?.Authorization === 'Bearer new-token' ? res(200, { ok: url }) : res(401, {});
    });
    const [a, b] = await Promise.all([apiClient.get('/a'), apiClient.get('/b')]);
    expect(a).toEqual({ ok: 'http://api.test/a' });
    expect(b).toEqual({ ok: 'http://api.test/b' });
    const refreshes = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));
    expect(refreshes).toHaveLength(1);
  });

  it('a refused refresh ends the session once — ON_UNAUTHORIZED — and the caller sees an expiry, not a 401', async () => {
    const onUnauthorized = jest.fn();
    onAPIEvent(API_EVENTS.ON_UNAUTHORIZED, onUnauthorized);
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/auth/refresh') ? res(401, {}) : res(401, {})));
    await expect(apiClient.get('/a')).rejects.toThrow(/session has expired/);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    offAPIEvent(API_EVENTS.ON_UNAUTHORIZED, onUnauthorized);
  });

  it('a refresh that gets NO answer is a network failure, not a sign-out', async () => {
    const onUnauthorized = jest.fn();
    onAPIEvent(API_EVENTS.ON_UNAUTHORIZED, onUnauthorized);
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/refresh')) throw new TypeError('Network request failed');
      return res(401, {});
    });
    await expect(apiClient.get('/a')).rejects.toThrow('Network request failed');
    expect(onUnauthorized).not.toHaveBeenCalled();
    offAPIEvent(API_EVENTS.ON_UNAUTHORIZED, onUnauthorized);
  });

  it('a failed resend after a good refresh is the server’s answer (a 409 stays a 409)', async () => {
    fetchMock
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(res(200, { accessToken: 'new-token' }))
      .mockResolvedValueOnce(res(409, { code: 'REQUEST_IN_PROGRESS', detail: 'in progress' }));
    await expect(apiClient.post('/x', {}, { idempotent: true })).rejects.toMatchObject({ status: 409, code: 'REQUEST_IN_PROGRESS' });
  });
});
