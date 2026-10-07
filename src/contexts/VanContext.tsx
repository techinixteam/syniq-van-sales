import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSiteApi } from '@/api/org.api';
import { getMyVansApi, type MySalesperson, type MyVan } from '@/api/van-sale.api';
import { usePermissionSet } from '@/authz/permission-store';
import { useAuth } from '@/contexts/AuthContext';
import { resolveCompany, type CompanyResolution } from '@/contexts/van-session';

/**
 * THE REP'S WORKING STATE — the company every route names, and the van every sale leaves from.
 *
 * Everything the rep does is COMPANY-scoped on the server, and `/auth/me` names no company. The
 * company is therefore read from the rep's own `van_sale.create` grant (its scope IS a company),
 * with the home branch's company as the tie-breaker — see `van-session.ts`. The van comes from
 * `GET /o2c/van-sales/my-vans`, which only ever answers the caller's own.
 *
 * ⚠ EVERY "CANNOT START" STATE IS NAMED, because each has a different person who fixes it:
 *   noAccess       the role lacks van sales                       → whoever assigns roles
 *   notB2b         the home branch is not a B2B branch            → HR (the employee's branch)
 *   noCompany      no company could be worked out                 → whoever assigns roles
 *   noSalesperson  the login is linked to no active salesperson   → the sales manager
 *   noVan          a salesperson, but no van assigned             → the sales manager
 * A single "something is wrong" screen would send all five to the same desk.
 */

export type VanSessionStatus =
  | 'loading'
  | 'noAccess'
  | 'notB2b'
  | 'noCompany'
  | 'noSalesperson'
  | 'noVan'
  | 'error'
  | 'ready';

interface VanContextValue {
  status: VanSessionStatus;
  /** The company every request names. Null until resolved — NEVER send "" instead. */
  companyId: string | null;
  /** The van sales leave from. Non-null exactly when `status === 'ready'`. */
  van: MyVan | null;
  vans: MyVan[];
  salespeople: MySalesperson[];
  error: unknown;
  reload: () => void;
  selectVan: (vanId: string) => void;
}

const SELECTED_VAN_KEY = '@SyniqVanSales:vanId';

const VanContext = createContext<VanContextValue | null>(null);

export const VanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me } = useAuth();
  const grants = usePermissionSet();

  const [status, setStatus] = useState<VanSessionStatus>('loading');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [vans, setVans] = useState<MyVan[]>([]);
  const [salespeople, setSalespeople] = useState<MySalesperson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!me || !grants) return;
      setStatus('loading');
      setError(null);
      try {
        // The home branch's company is only needed to break a tie, or for a GLOBAL grant.
        const homeCompany = async () => (me.homeSite ? (await getSiteApi(me.homeSite.id)).companyId : null);
        const resolved: CompanyResolution = await resolveCompany(grants, homeCompany);
        if (cancelled) return;
        if (resolved.kind !== 'ok') {
          setCompanyId(null);
          setStatus(resolved.kind);
          return;
        }
        if (me.siteCapabilities?.sellsB2b === false) {
          setCompanyId(resolved.companyId);
          setStatus('notB2b');
          return;
        }
        const mine = await getMyVansApi(resolved.companyId);
        const stored = await AsyncStorage.getItem(SELECTED_VAN_KEY).catch(() => null);
        if (cancelled) return;
        setCompanyId(resolved.companyId);
        setSalespeople(mine.salespeople);
        setVans(mine.vans);
        setSelectedId(stored && mine.vans.some((v) => v.id === stored) ? stored : null);
        setStatus(mine.salespeople.length === 0 ? 'noSalesperson' : mine.vans.length === 0 ? 'noVan' : 'ready');
      } catch (e) {
        if (cancelled) return;
        setError(e);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, grants, nonce]);

  /** The chosen van; else the first ACTIVE one; else the first. One van per rep is the norm. */
  const van = useMemo<MyVan | null>(() => {
    if (status !== 'ready') return null;
    return vans.find((v) => v.id === selectedId) ?? vans.find((v) => v.status === 'ACTIVE') ?? vans[0] ?? null;
  }, [status, vans, selectedId]);

  const selectVan = useCallback((vanId: string) => {
    setSelectedId(vanId);
    AsyncStorage.setItem(SELECTED_VAN_KEY, vanId).catch(() => {});
  }, []);

  const value = useMemo<VanContextValue>(
    () => ({ status, companyId, van, vans, salespeople, error, reload, selectVan }),
    [status, companyId, van, vans, salespeople, error, reload, selectVan],
  );

  return <VanContext.Provider value={value}>{children}</VanContext.Provider>;
};

export function useVan(): VanContextValue {
  const ctx = useContext(VanContext);
  if (!ctx) throw new Error('useVan must be used inside <VanProvider>');
  return ctx;
}

/** For screens that only render once the session is ready (the navigator guarantees it). */
export function useReadyVan(): { companyId: string; van: MyVan } {
  const { companyId, van } = useVan();
  if (!companyId || !van) throw new Error('useReadyVan used before the van session is ready');
  return { companyId, van };
}
