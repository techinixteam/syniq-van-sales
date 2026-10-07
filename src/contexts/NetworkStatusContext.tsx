import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { API_EVENTS, offAPIEvent, onAPIEvent, type APIErrorPayload } from '@/api/apiClient';

/**
 * Connectivity, tracked two ways:
 *   1. Proactively via NetInfo, so the offline banner appears BEFORE a call is attempted.
 *   2. Reactively from apiClient events — server 5xx and timeout.
 *
 * ⚠ THIS APP IS ONLINE-ONLY (decision O3). That makes this context load-bearing rather than
 * decorative: there is no queue to absorb a dead zone, so a user in a chiller must be TOLD the
 * scan did not happen. A silent no-op that a user reads as "scanned" is the failure mode that
 * loses a stock count.
 *
 * Precedence: offline > serverDown > timeout. Only one banner shows at a time.
 */

export type TransientErrorState = 'serverDown' | 'timeout' | null;

interface NetworkStatusContextValue {
  isOffline: boolean;
  transientError: TransientErrorState;
  dismiss: () => void;
  retry: () => Promise<void>;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [transientError, setTransientError] = useState<TransientErrorState>(null);

  // Debounced offline transition. Warehouse wifi roams between access points constantly, and an
  // undebounced NetInfo flaps a full-screen banner on every handover. Going offline waits 1.5s;
  // coming back is instant, because a user waiting to scan should never wait on us.
  useEffect(() => {
    let offlineTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      if (offline) {
        if (offlineTimer) return;
        offlineTimer = setTimeout(() => {
          offlineTimer = null;
          setIsOffline(true);
        }, 1500);
      } else {
        if (offlineTimer) {
          clearTimeout(offlineTimer);
          offlineTimer = null;
        }
        setIsOffline(false);
      }
    });

    return () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onServerError = (_p?: APIErrorPayload) => setTransientError('serverDown');
    const onTimeout = (_p?: APIErrorPayload) => setTransientError('timeout');

    onAPIEvent(API_EVENTS.ON_SERVER_ERROR, onServerError);
    onAPIEvent(API_EVENTS.ON_TIMEOUT, onTimeout);
    return () => {
      offAPIEvent(API_EVENTS.ON_SERVER_ERROR, onServerError);
      offAPIEvent(API_EVENTS.ON_TIMEOUT, onTimeout);
    };
  }, []);

  const dismiss = useCallback(() => setTransientError(null), []);

  const retry = useCallback(async () => {
    setTransientError(null);
    const state = await NetInfo.fetch();
    setIsOffline(state.isConnected === false || state.isInternetReachable === false);
  }, []);

  const value = useMemo(
    () => ({ isOffline, transientError, dismiss, retry }),
    [isOffline, transientError, dismiss, retry],
  );

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>;
};

export function useNetworkStatus(): NetworkStatusContextValue {
  const ctx = useContext(NetworkStatusContext);
  if (!ctx) throw new Error('useNetworkStatus must be used inside <NetworkStatusProvider>');
  return ctx;
}
