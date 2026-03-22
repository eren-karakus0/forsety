"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthGuard } from "./use-auth-guard";

interface UseDashboardDataResult<T> {
  data: T;
  loading: boolean;
  error: boolean;
  reload: () => void;
  isAuthenticated: boolean;
}

/**
 * Generic hook for dashboard pages that fetch data on auth.
 * Handles loading, error, reload, cancellation, and guest state.
 */
export function useDashboardData<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  deps: unknown[] = []
): UseDashboardDataResult<T> {
  const { isAuthenticated } = useAuthGuard();
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    let cancelled = false;

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, ...deps]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  return { data, loading, error, reload: load, isAuthenticated };
}
