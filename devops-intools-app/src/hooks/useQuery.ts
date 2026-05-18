import { useCallback, useEffect, useRef, useState } from "react";

interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

export function useQuery<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[]
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    loading: fetcher !== null,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    if (!fetcherRef.current) {
      setState({ data: undefined, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef.current()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) =>
        setState({ data: undefined, loading: false, error: String(err instanceof Error ? err.message : err) })
      );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
