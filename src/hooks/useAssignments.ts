import { useState, useEffect, useCallback } from 'react';
import {
  getOperatorAssignmentsByDate,
  onOperatorAssignmentsSnapshot,
} from '../repositories/assignmentRepository';
import type { Assignment } from '../repositories/types';

interface UseAssignmentsReturn {
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAssignments(
  operatorId: string | null,
  date: string,
  live: boolean = false,
): UseAssignmentsReturn {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!operatorId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getOperatorAssignmentsByDate(operatorId, date);
      setAssignments(data);
    } catch (err) {
      console.error('[useAssignments] Fetch error:', err);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [operatorId, date]);

  useEffect(() => {
    if (!operatorId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    if (live) {
      setLoading(true);
      const unsubscribe = onOperatorAssignmentsSnapshot(
        operatorId,
        date,
        (data) => {
          setAssignments(data);
          setLoading(false);
        },
        (err) => {
          console.error('[useAssignments] Snapshot error:', err);
          setError('Failed to load assignments');
          setLoading(false);
        },
      );
      return () => unsubscribe();
    } else {
      fetch();
    }
  }, [operatorId, date, live, fetch]);

  return { assignments, loading, error, refresh: fetch };
}
