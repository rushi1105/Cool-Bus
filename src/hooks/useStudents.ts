import { useState, useEffect, useCallback } from 'react';
import { onStudentsByOperatorSnapshot } from '../repositories/studentRepository';
import type { Student } from '../repositories/types';

interface UseStudentsReturn {
  students: Student[];
  loading: boolean;
  error: string | null;
}

export function useStudents(operatorId: string | null): UseStudentsReturn {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operatorId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onStudentsByOperatorSnapshot(
      operatorId,
      (data) => {
        setStudents(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load students');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [operatorId]);

  return { students, loading, error };
}
