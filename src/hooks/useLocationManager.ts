/**
 * useLocationManager — Reactive location state hook
 *
 * Wraps the LocationManager service to provide reactive state for
 * all map-consuming screens. Resolves the initial region on mount
 * using the priority chain: officeLocation → GPS → India fallback.
 *
 * Usage:
 *   const { initialRegion, currentLocation, permissionStatus, requestPermission } = useLocationManager();
 *   <MapView initialRegion={initialRegion} ... />
 */

import { useState, useEffect, useCallback } from 'react';
import {
  resolveInitialRegion,
  getPermissionStatus,
  requestPermission as requestLocationPermission,
  getCurrentPosition,
  distanceBetween,
  etaTo,
  nearestStop,
  type MapRegion,
  type Coordinate,
  type PermissionStatus,
  type NearestStopResult,
} from '../services/location/LocationManager';
import { INDIA_FALLBACK, DEFAULT_DELTAS } from '../constants/location';
import type { OfficeLocation, RouteStop } from '../repositories/types';

interface UseLocationManagerOptions {
  /** Operator's office location for priority-based region resolution */
  officeLocation?: OfficeLocation | null;
}

interface UseLocationManagerReturn {
  /** Resolved initial region for the map (ready once loading is false) */
  initialRegion: MapRegion;
  /** Current GPS position (null until first position is obtained) */
  currentLocation: Coordinate | null;
  /** Current permission status */
  permissionStatus: PermissionStatus;
  /** True while the initial region is being resolved */
  loading: boolean;
  /** True while the user is manually interacting with the map */
  userInteracting: boolean;
  /** Set user interaction state (call from MapView onPanDrag / onTouchStart) */
  setUserInteracting: (value: boolean) => void;
  /** Request location permission */
  requestPermission: () => Promise<PermissionStatus>;
  /** Haversine distance between two coordinates (meters) */
  distanceBetween: (c1: Coordinate, c2: Coordinate) => number;
  /** ETA to a destination */
  etaTo: (from: Coordinate, destination: Coordinate, speedKmh?: number) => string;
  /** Find nearest stop from a list */
  nearestStop: (from: Coordinate, stops: RouteStop[]) => NearestStopResult | null;
}

export function useLocationManager(
  options?: UseLocationManagerOptions,
): UseLocationManagerReturn {
  const [initialRegion, setInitialRegion] = useState<MapRegion>({
    ...INDIA_FALLBACK,
    ...DEFAULT_DELTAS,
  });
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [loading, setLoading] = useState(true);
  const [userInteracting, setUserInteracting] = useState(false);

  // Resolve initial region on mount or when officeLocation changes
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const status = await getPermissionStatus();
        if (mounted) setPermissionStatus(status);

        const region = await resolveInitialRegion(options?.officeLocation);
        if (mounted) setInitialRegion(region);

        // Also get current position if permission is granted
        if (status === 'granted') {
          const pos = await getCurrentPosition();
          if (mounted && pos) setCurrentLocation(pos);
        }
      } catch (err) {
        console.error('[useLocationManager] Init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [options?.officeLocation?.latitude, options?.officeLocation?.longitude]);

  const handleRequestPermission = useCallback(async (): Promise<PermissionStatus> => {
    const status = await requestLocationPermission();
    setPermissionStatus(status);

    if (status === 'granted') {
      const pos = await getCurrentPosition();
      if (pos) setCurrentLocation(pos);
    }

    return status;
  }, []);

  return {
    initialRegion,
    currentLocation,
    permissionStatus,
    loading,
    userInteracting,
    setUserInteracting,
    requestPermission: handleRequestPermission,
    distanceBetween,
    etaTo,
    nearestStop,
  };
}
