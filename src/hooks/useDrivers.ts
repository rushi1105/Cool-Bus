import { useState, useEffect } from 'react';
import { onDriversSnapshot } from '../repositories/userRepository';
import type { User } from '../repositories/types';

interface UseDriversReturn {
  drivers: User[];
  loading: boolean;
  error: string | null;
}

export function useDrivers(operatorId: string | null): UseDriversReturn {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operatorId) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onDriversSnapshot(
      operatorId,
      (data) => {
        setDrivers(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useDrivers] Snapshot error:', err);
        setError('Failed to load drivers');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [operatorId]);

  return { drivers, loading, error };
}
