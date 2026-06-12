import { useCallback, useEffect, useRef, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs an async fetcher on mount (and when `deps` change), exposing
 * loading / error / data plus a manual `reload`. Guards against state
 * updates after unmount.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (mounted.current) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (mounted.current)
          setState({ data: null, loading: false, error: e instanceof Error ? e.message : String(e) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
