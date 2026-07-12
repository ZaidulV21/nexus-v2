import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

/** Minimal, dependency-free data-fetching hook: loading/error/data state +
 *  refetch, used by every module's list/detail page instead of hand-rolled
 *  useEffect+useState boilerplate. `deps` re-runs the fetch when changed
 *  (e.g. page number, filters). */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    isError: false,
    error: null,
  });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, isError: false, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, isError: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : 'Something went wrong';
          setState({ data: null, isLoading: false, isError: true, error: message });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);

  return { ...state, refetch: run };
}
