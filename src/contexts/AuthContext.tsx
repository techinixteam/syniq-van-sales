import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_EVENTS,
  clearStoredRefreshToken,
  clearStoredToken,
  getStoredToken,
  offAPIEvent,
  onAPIEvent,
  setStoredRefreshToken,
  setStoredToken,
} from '@/api/apiClient';
import { getMeApi, loginApi, logoutApi, type MeResponse } from '@/api/auth.api';
import { setPermissionSet } from '@/authz/permission-store';

const ME_KEY = '@Syniq:me';

interface AuthContextValue {
  /** The full `/auth/me` payload — user, roles, homeSite, siteCapabilities. */
  me: MeResponse | null;
  isAuthenticated: boolean;
  /**
   * False until the stored session has been restored AND `/auth/me` has answered.
   *
   * ⚠ THE ROUTER MUST NOT RENDER THE APP UNTIL THIS IS TRUE. The permission store fails closed on
   * `null`, so a launchpad rendered one frame early paints EMPTY and teaches the user they have no
   * permissions. See the docblock on `permission-store.ts`.
   */
  ready: boolean;
  /** True while a login call is in flight. */
  isSigningIn: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch `/auth/me`. Call after anything that could change the caller's grants. */
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Read by the ON_UNAUTHORIZED listener, which is registered once and must see current state.
  const meRef = useRef<MeResponse | null>(null);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  /** Publish into the module-level store the authz hooks read, and mirror to state. */
  const applyMe = useCallback((next: MeResponse | null) => {
    setMe(next);
    setPermissionSet(next ? next.permissions : null);
    if (next) AsyncStorage.setItem(ME_KEY, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(ME_KEY).catch(() => {});
  }, []);

  const clearSession = useCallback(async () => {
    applyMe(null);
    await Promise.all([clearStoredToken(), clearStoredRefreshToken()]);
  }, [applyMe]);

  // ── Boot: restore the session ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await getStoredToken();
        if (!token) return;

        // Paint from the cached payload first so a warm start does not flash the login screen,
        // then correct it from the server below. The cache is a render hint ONLY — it is never
        // trusted for a permission decision beyond the moment `/auth/me` answers.
        const cached = await AsyncStorage.getItem(ME_KEY);
        if (cached && !cancelled) {
          try {
            applyMe(JSON.parse(cached) as MeResponse);
          } catch {
            await AsyncStorage.removeItem(ME_KEY);
          }
        }

        const fresh = await getMeApi();
        if (!cancelled) applyMe(fresh);
      } catch {
        // Either the token is dead (apiClient already emitted ON_UNAUTHORIZED and the listener
        // below cleared the session) or the network is down on a cold start. Both land the user on
        // the login screen, which is the honest answer for an online-only app.
        if (!cancelled) await clearSession();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyMe, clearSession]);

  // ── Forced logout ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onUnauthorized = () => {
      if (!meRef.current) return; // already signed out; do not thrash state
      void clearSession();
    };
    onAPIEvent(API_EVENTS.ON_UNAUTHORIZED, onUnauthorized);
    return () => offAPIEvent(API_EVENTS.ON_UNAUTHORIZED, onUnauthorized);
  }, [clearSession]);

  // ── Actions ───────────────────────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (identifier: string, password: string) => {
      setIsSigningIn(true);
      try {
        const res = await loginApi(identifier, password);
        await setStoredToken(res.accessToken);

        // ⚠ `refreshToken` IS NOT SENT TODAY. `auth.controller.ts` returns only
        // {accessToken, expiresIn, userId, mfaRequired} and delivers the refresh token solely as
        // an httpOnly cookie, which on Android rides in OkHttp's cookie jar. The line below is not
        // dead code: `POST /auth/refresh` already accepts `{refreshToken}` in the body
        // (auth.controller.ts:103), so the day the server also RETURNS one, sessions survive a
        // cookie-jar reset with no further change here. Until then, see the plan's §2.2 gap.
        if (res.refreshToken) await setStoredRefreshToken(res.refreshToken);

        applyMe(await getMeApi());
      } finally {
        setIsSigningIn(false);
      }
    },
    [applyMe],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // A failed logout call must never strand the user in a signed-in shell. Clear locally
      // regardless — the server's refresh token expires on its own.
    }
    await clearSession();
  }, [clearSession]);

  const refreshMe = useCallback(async () => {
    applyMe(await getMeApi());
  }, [applyMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      me,
      isAuthenticated: !!me,
      ready,
      isSigningIn,
      login,
      logout,
      refreshMe,
    }),
    [me, ready, isSigningIn, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
