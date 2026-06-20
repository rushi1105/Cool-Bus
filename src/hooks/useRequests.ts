import { useState, useEffect } from 'react';
import {
  onRequestsByOperatorSnapshot,
  onRequestsByParentSnapshot,
  getRequestsByOperator,
} from '../repositories/requestRepository';
import type { StopChangeRequest } from '../repositories/types';

interface UseRequestsReturn {
  requests: StopChangeRequest[];
  pendingCount: number;
  loading: boolean;
  error: string | null;
}

export function useRequests(
  operatorId: string | null,
  parentId?: string | null,
): UseRequestsReturn {
  const [requests, setRequests] = useState<StopChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parentId) {
      setLoading(true);
      setError(null);
      const unsubscribe = onRequestsByParentSnapshot(
        parentId,
        (data) => {
          setRequests(data);
          setLoading(false);
        },
        (err) => {
          setError('Failed to load requests');
          setLoading(false);
        },
      );
      return () => unsubscribe();
    }

    if (operatorId) {
      setLoading(true);
      setError(null);
      const unsubscribe = onRequestsByOperatorSnapshot(
        operatorId,
        (data) => {
          setRequests(data);
          setLoading(false);
        },
        (err) => {
          setError('Failed to load requests');
          setLoading(false);
        },
      );
      return () => unsubscribe();
    }

    setRequests([]);
    setLoading(false);
    return;
  }, [operatorId, parentId]);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return { requests, pendingCount, loading, error };
}
