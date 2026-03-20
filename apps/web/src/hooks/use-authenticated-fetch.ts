"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthGuard } from "./use-auth-guard";

export function useAuthenticatedFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { isAuthenticated } = useAuthGuard();

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const result = await fetcher();
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
