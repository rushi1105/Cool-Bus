import { useState, useEffect, useRef } from 'react';
import { getRoutesByOperator, onRoutesSnapshot } from '../repositories/routeRepository';
import type { Route } from '../repositories/types';

interface UseRoutesReturn {
  routes: Route[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRoutes(operatorId: string | null, live: boolean = false): UseRoutesReturn {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Route[]>([]);

  const fetchRoutes = async () => {
    if (!operatorId) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getRoutesByOperator(operatorId);
      cacheRef.current = data;
      setRoutes(data);
    } catch (err) {
      console.error('[useRoutes] Fetch error:', err);
      setError('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!operatorId) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    if (live) {
      setLoading(true);
      const unsubscribe = onRoutesSnapshot(
        operatorId,
        (data) => {
          cacheRef.current = data;
          setRoutes(data);
          setLoading(false);
        },
        (err) => {
          console.error('[useRoutes] Snapshot error:', err);
          setError('Failed to load routes');
          setLoading(false);
        },
      );
      return () => unsubscribe();
    } else {
      fetchRoutes();
    }
  }, [operatorId, live]);

  return { routes, loading, error, refresh: fetchRoutes };
}
