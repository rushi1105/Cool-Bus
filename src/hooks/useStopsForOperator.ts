import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getDistance } from '../services/location';
import { buildDedupKey } from '../utils/stopUtils';
import Config from '../constants/config';

export interface OperatorInfo {
  operatorId: string;
  operatorName: string;
}

export interface StopCandidate {
  stopId: string;
  routeId: string;
  routeName: string;
  operatorId: string;
  operatorName: string;
  name: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  address?: string;
  distanceMeters: number;
  walkingMinutes: number;
}

interface RouteStop {
  id?: string;
  order?: number;
  name: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  address?: string;
}

interface RouteData {
  name?: string;
  operatorId?: string;
  stops?: RouteStop[];
}

interface OperatorData {
  name?: string;
  code?: string;
}

export function useStopsForOperator(operatorId?: string) {
  const [stops, setStops] = useState<StopCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorMap, setOperatorMap] = useState<Record<string, string>>({});

  const fetchStops = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const operatorNames: Record<string, string> = {};

      const routesQuery = operatorId
        ? query(collection(db, 'routes'), where('operatorId', '==', operatorId))
        : query(collection(db, 'routes'), where('isActive', '==', true));

      const routesSnap = await getDocs(routesQuery);

      const operatorIds = new Set<string>();
      const allStops: StopCandidate[] = [];

      routesSnap.docs.forEach(doc => {
        const routeData = doc.data() as RouteData;
        const routeId = doc.id;
        const routeName = routeData.name || 'Unnamed Route';
        const opId = routeData.operatorId || operatorId || '';

        if (opId) operatorIds.add(opId);
        if (!routeData.stops || !Array.isArray(routeData.stops)) return;

        routeData.stops.forEach((stop: RouteStop) => {
          allStops.push({
            stopId: stop.id || `${routeId}-${stop.order || 0}`,
            routeId,
            routeName,
            operatorId: opId,
            operatorName: '',
            name: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            landmark: stop.landmark,
            address: stop.address,
            distanceMeters: 0,
            walkingMinutes: 0,
          });
        });
      });

      if (operatorIds.size > 0) {
        const opSnapshot = await getDocs(collection(db, 'operators'));
        opSnapshot.docs.forEach(d => {
          const data = d.data() as OperatorData;
          operatorNames[d.id] = data.name || d.id;
        });
      }

      setOperatorMap(operatorNames);

      const enriched = allStops.map(s => ({
        ...s,
        operatorName: operatorNames[s.operatorId] || s.operatorId,
      }));

      setStops(enriched);
    } catch (err) {
      console.error('[useStopsForOperator] Error:', err);
      setError('Failed to load stops. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  const deduplicatedStops = useMemo((): StopCandidate[] => {
    const seen = new Set<string>();
    const result: StopCandidate[] = [];

    for (const stop of stops) {
      const key = buildDedupKey(stop.name, stop.landmark, stop.latitude, stop.longitude);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(stop);
      }
    }

    return result;
  }, [stops]);

  const computeDistances = useCallback(
    (userLocation: { latitude: number; longitude: number } | null): StopCandidate[] => {
      if (!userLocation || stops.length === 0) return stops;

      return stops
        .map(stop => {
          const distance = getDistance(userLocation, {
            latitude: stop.latitude,
            longitude: stop.longitude,
          });
          const walkingMinutes = Math.max(
            1,
            Math.round((distance / Config.stopSelection.walkingSpeedMetersPerMin) * Config.stopSelection.urbanFudgeFactor)
          );
          return { ...stop, distanceMeters: Math.round(distance), walkingMinutes };
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    },
    [stops]
  );

  const computeDeduplicatedDistances = useCallback(
    (userLocation: { latitude: number; longitude: number } | null): StopCandidate[] => {
      if (!userLocation || deduplicatedStops.length === 0) return deduplicatedStops;

      return deduplicatedStops
        .map(stop => {
          const distance = getDistance(userLocation, {
            latitude: stop.latitude,
            longitude: stop.longitude,
          });
          const walkingMinutes = Math.max(
            1,
            Math.round(
              (distance / Config.stopSelection.walkingSpeedMetersPerMin) *
                Config.stopSelection.urbanFudgeFactor
            )
          );
          return { ...stop, distanceMeters: Math.round(distance), walkingMinutes };
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    },
    [deduplicatedStops]
  );

  const groupedByDedup = useMemo((): Map<string, StopCandidate[]> => {
    const groups = new Map<string, StopCandidate[]>();

    for (const stop of stops) {
      const key = buildDedupKey(stop.name, stop.landmark, stop.latitude, stop.longitude);
      const existing = groups.get(key) || [];
      existing.push(stop);
      groups.set(key, existing);
    }

    return groups;
  }, [stops]);

  return {
    stops,
    deduplicatedStops,
    groupedByDedup,
    operatorMap,
    loading,
    error,
    refetch: fetchStops,
    computeDistances,
    computeDeduplicatedDistances,
  };
}
