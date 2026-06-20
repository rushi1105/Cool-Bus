import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRoutesByOperator, getActiveRoutes } from '../repositories/routeRepository';
import { fetchOperatorNames } from '../repositories/operatorRepository';
import { getDistance } from '../services/location';
import { buildDedupKey } from '../utils/stopUtils';
import Config from '../constants/config';
import type { Route, RouteStop } from '../repositories/types';

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

export function useStopsForOperator(operatorId?: string) {
  const [stops, setStops] = useState<StopCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorMap, setOperatorMap] = useState<Record<string, string>>({});

  const fetchStops = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const routes = operatorId
        ? await getRoutesByOperator(operatorId)
        : await getActiveRoutes();

      const operatorIds = new Set<string>();
      const allStops: StopCandidate[] = [];

      routes.forEach((route) => {
        const routeName = route.name || 'Unnamed Route';
        const opId = route.operatorId || operatorId || '';

        if (opId) operatorIds.add(opId);
        if (!route.stops || !Array.isArray(route.stops)) return;

        route.stops.forEach((stop: RouteStop) => {
          allStops.push({
            stopId: stop.id || `${route.id}-0`,
            routeId: route.id,
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

      const operatorNames = operatorIds.size > 0
        ? await fetchOperatorNames()
        : {};
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
