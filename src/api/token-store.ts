import * as Keychain from 'react-native-keychain';

/**
 * The session's two tokens — kept in the ANDROID KEYSTORE through react-native-keychain, never in
 * AsyncStorage.
 *
 * ⚠ WHY NOT ASYNCSTORAGE, which the Operations app uses: AsyncStorage is a plain SQLite file in the
 * app's data directory. A van rep's phone leaves the building every day, is personal as often as
 * not, and its refresh token is a working credential that can POST TAX INVOICES. The keystore
 * encrypts the value with a hardware-backed key (AES-GCM, no user-auth prompt), so a copied data
 * directory is useless off the device.
 *
 * A MEMORY CACHE sits in front of it because `apiClient` reads the access token on EVERY request,
 * and a keystore read is a native decrypt. `undefined` = not read yet; `null` = read, and absent.
 *
 * A keystore failure is not a crash: a failed read is "no session" (the user signs in again) and a
 * failed write keeps the value in memory for the life of the process.
 */

const ACCESS = 'com.syniq.vansales.accessToken';
const REFRESH = 'com.syniq.vansales.refreshToken';
const USERNAME = 'syniq';

const cache: Record<string, string | null | undefined> = {};

async function read(service: string): Promise<string | null> {
  const held = cache[service];
  if (held !== undefined) return held;
  try {
    const found = await Keychain.getGenericPassword({ service });
    cache[service] = found ? found.password : null;
  } catch {
    cache[service] = null;
  }
  return cache[service] ?? null;
}

async function write(service: string, value: string): Promise<void> {
  cache[service] = value;
  try {
    await Keychain.setGenericPassword(USERNAME, value, { service });
  } catch {
    // Kept in memory: this session works, and the next cold start asks for a sign-in.
  }
}

async function clear(service: string): Promise<void> {
  cache[service] = null;
  try {
    await Keychain.resetGenericPassword({ service });
  } catch {
    // Nothing to do — the memory copy is already gone, which is what signs the user out.
  }
}

export const getStoredToken = () => read(ACCESS);
export const setStoredToken = (token: string) => write(ACCESS, token);
export const clearStoredToken = () => clear(ACCESS);

export const getStoredRefreshToken = () => read(REFRESH);
export const setStoredRefreshToken = (token: string) => write(REFRESH, token);
export const clearStoredRefreshToken = () => clear(REFRESH);

/** Tests only: forget the memory cache so the next read goes to the (mocked) keystore. */
export const __resetTokenCacheForTests = () => {
  delete cache[ACCESS];
  delete cache[REFRESH];
};
