import { useState, useEffect } from 'react';
import {
  onActiveTripByAssignmentSnapshot,
  onActiveTripSnapshot,
  onOperatorTripsSnapshot,
  getTripsByOperatorAndStatus,
} from '../repositories/tripRepository';
import type { Trip } from '../repositories/types';

interface UseTripsReturn {
  trip: Trip | null;
  loading: boolean;
  error: string | null;
}

interface UseTripsListReturn {
  trips: Trip[];
  loading: boolean;
  error: string | null;
}

interface TripsOptions {
  status?: string;
}

export function useTripsByAssignment(assignmentId: string | null): UseTripsReturn {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onActiveTripByAssignmentSnapshot(
      assignmentId,
      (data) => {
        setTrip(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useTrips] Snapshot error:', err);
        setError('Failed to load trip');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [assignmentId]);

  return { trip, loading, error };
}

export function useTripsByBus(busId: string | null): UseTripsReturn {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onActiveTripSnapshot(
      busId,
      (data) => {
        setTrip(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useTripsByBus] Snapshot error:', err);
        setError('Failed to load trip');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [busId]);

  return { trip, loading, error };
}

export function useTrips(
  operatorId: string | null,
  options?: TripsOptions,
): UseTripsListReturn {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operatorId) {
      setTrips([]);
      setLoading(false);
      return;
    }

    if (options?.status) {
      setLoading(true);
      getTripsByOperatorAndStatus(operatorId, options.status)
        .then((data) => setTrips(data))
        .catch(() => setError('Failed to load trips'))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      setError(null);
      const unsubscribe = onOperatorTripsSnapshot(
        operatorId,
        (data) => {
          setTrips(data);
          setLoading(false);
        },
        (err) => {
          setError('Failed to load trips');
          setLoading(false);
        },
      );
      return () => unsubscribe();
    }
  }, [operatorId, options?.status]);

  return { trips, loading, error };
}
