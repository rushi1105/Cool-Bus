import { useState, useEffect, useCallback } from 'react';
import {
  getFeesByOperator,
  getFeesByOperatorAndStatus,
  onOperatorFeesSnapshot,
} from '../repositories/feeRepository';
import type { Fee } from '../repositories/types';

interface UseFeesReturn {
  fees: Fee[];
  unpaidCount: number;
  paidCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFees(
  operatorId: string | null,
  live: boolean = false,
): UseFeesReturn {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!operatorId) {
      setFees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getFeesByOperator(operatorId);
      setFees(data);
    } catch (err) {
      setError('Failed to load fees');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    if (!operatorId) {
      setFees([]);
      setLoading(false);
      return;
    }

    if (live) {
      setLoading(true);
      const unsubscribe = onOperatorFeesSnapshot(
        operatorId,
        (data) => {
          setFees(data);
          setLoading(false);
        },
        (err) => {
          setError('Failed to load fees');
          setLoading(false);
        },
      );
      return () => unsubscribe();
    } else {
      fetch();
    }
  }, [operatorId, live, fetch]);

  const unpaidCount = fees.filter((f) => f.status === 'UNPAID').length;
  const paidCount = fees.filter((f) => f.status === 'PAID').length;

  return { fees, unpaidCount, paidCount, loading, error, refresh: fetch };
}
