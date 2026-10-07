import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Load-once-and-reload, for an app with no cache.
 *
 * The plan rules out React Query and Redux (§2.4) and decision O3 rules out any cache at all, so
 * this is the whole data layer: a promise, three pieces of state, and a `reload`. Roughly forty
 * lines rather than a dependency, and every screen behaves the same way as a result.
 *
 * ⚠ THE STALE-RESPONSE GUARD IS LOAD-BEARING, not a tidy-up. A warehouse user scans, gets bored,
 * scans again, and the first response can land after the second. Without the sequence check the
 * screen shows the PREVIOUS article's stock under the CURRENT article's name — which is exactly
 * the sort of quiet wrong answer that gets stock booked against the wrong item. Each run takes a
 * ticket and only the newest may write.
 */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  /** Re-run the loader. Safe to call from a pull-to-refresh or a retry button. */
  reload: () => void;
  /** Overwrite locally, e.g. after a POST returned the updated document. Skips a round trip. */
  setData: (next: T | null) => void;
}

/**
 * @param loader  Memoise it. This re-runs whenever its identity changes, which is the intended
 *                dependency mechanism — an inline arrow re-fetches on every render.
 * @param enabled `false` holds the loader back (a screen waiting for an acting site, say) without
 *                the caller needing a second code path.
 */
export function useAsync<T>(loader: () => Promise<T>, enabled = true): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  const seq = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const ticket = ++seq.current;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!mounted.current || ticket !== seq.current) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!mounted.current || ticket !== seq.current) return;
        // The previous data is deliberately KEPT. A failed refresh over branch wifi should not
        // blank a list the user is reading — the error banner says the refresh failed, and what is
        // on screen is still what the server last said.
        setError(e);
      })
      .finally(() => {
        if (mounted.current && ticket === seq.current) setLoading(false);
      });
  }, [loader, enabled]);

  useEffect(run, [run]);

  return { data, loading, error, reload: run, setData };
}

/**
 * `useAsync`, re-run every time the screen regains focus.
 *
 * For a WORKLIST. A clerk who receives a delivery and taps back must not see the order they just
 * closed still sitting in the list — there is no cache to invalidate, so the list simply re-reads.
 *
 * ⚠ NOT for a detail screen holding unsaved entry. Refetching under a half-keyed count sheet would
 * throw the operator's work away; those screens use plain `useAsync` and reload explicitly.
 */
export function useFocusAsync<T>(loader: () => Promise<T>, enabled = true): AsyncState<T> {
  const state = useAsync(loader, enabled);
  const { reload } = state;
  const first = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // The initial mount already loaded via useAsync; re-running here would double every screen's
      // first read.
      if (first.current) {
        first.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  return state;
}
