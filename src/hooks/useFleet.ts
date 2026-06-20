import { useState, useEffect } from 'react';
import { onBusesSnapshot } from '../repositories/fleetRepository';
import type { Bus } from '../repositories/types';

interface UseFleetReturn {
  buses: Bus[];
  loading: boolean;
  error: string | null;
}

export function useFleet(operatorId: string | null): UseFleetReturn {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operatorId) {
      setBuses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onBusesSnapshot(
      operatorId,
      (data) => {
        setBuses(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useFleet] Snapshot error:', err);
        setError('Failed to load fleet');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [operatorId]);

  return { buses, loading, error };
}
