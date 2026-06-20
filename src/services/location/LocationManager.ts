/**
 * LocationManager — Core location service
 *
 * Provides a unified abstraction for all location concerns:
 * - Initial map region resolution (officeLocation → GPS → India fallback)
 * - GPS permission handling
 * - Current position retrieval
 * - Haversine distance
 * - ETA estimation
 * - Nearest stop detection
 * - Speed and bearing from GPS sensor
 *
 * All map-consuming screens should use `useLocationManager()` instead of
 * importing expo-location or hardcoding coordinates.
 */

import * as ExpoLocation from 'expo-location';
import {
  INDIA_FALLBACK,
  DEFAULT_DELTAS,
  TIGHT_DELTAS,
} from '../../constants/location';
import type { OfficeLocation, RouteStop } from '../../repositories/types';

// ─── Types ────────────────────────────────────────────────────────────

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface LocationState {
  /** Resolved initial region for map centering */
  initialRegion: MapRegion;
  /** Current GPS coordinate (null if unavailable) */
  currentLocation: Coordinate | null;
  /** GPS permission status */
  permissionStatus: PermissionStatus;
  /** Current speed in km/h from GPS sensor */
  speed: number;
  /** Current bearing/heading in degrees from GPS sensor */
  bearing: number;
}

// ─── Region Resolution ────────────────────────────────────────────────

/**
 * Resolve the initial map region using the priority chain:
 * 1. Operator's officeLocation (if available)
 * 2. Device GPS position (if permission granted)
 * 3. India geographic center fallback
 */
export async function resolveInitialRegion(
  officeLocation?: OfficeLocation | null,
): Promise<MapRegion> {
  // Priority 1: Operator office location
  if (officeLocation?.latitude && officeLocation?.longitude) {
    return {
      latitude: officeLocation.latitude,
      longitude: officeLocation.longitude,
      ...DEFAULT_DELTAS,
    };
  }

  // Priority 2: Device GPS
  try {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        ...TIGHT_DELTAS,
      };
    }
  } catch (err) {
    console.warn('[LocationManager] GPS fallback failed:', err);
  }

  // Priority 3: India fallback
  return {
    ...INDIA_FALLBACK,
    ...DEFAULT_DELTAS,
  };
}

// ─── GPS Permissions ──────────────────────────────────────────────────

/**
 * Get current foreground permission status without requesting.
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  try {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Request foreground location permission.
 */
export async function requestPermission(): Promise<PermissionStatus> {
  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status === 'granted') return 'granted';
    return 'denied';
  } catch {
    return 'denied';
  }
}

// ─── Current Position ─────────────────────────────────────────────────

/**
 * Get current GPS position once.
 */
export async function getCurrentPosition(): Promise<Coordinate | null> {
  try {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (err) {
    console.error('[LocationManager] getCurrentPosition error:', err);
    return null;
  }
}

// ─── Distance Utilities ───────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two coordinates in meters.
 */
export function distanceBetween(
  c1: Coordinate,
  c2: Coordinate,
): number {
  const dLat = toRad(c2.latitude - c1.latitude);
  const dLng = toRad(c2.longitude - c1.longitude);
  const lat1 = toRad(c1.latitude);
  const lat2 = toRad(c2.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// ─── ETA ──────────────────────────────────────────────────────────────

const AVG_CITY_SPEED_KMH = 20;

/**
 * Estimate driving ETA to a destination based on current speed or average city speed.
 * Returns a human-readable string (e.g., "5 min", "1h 20m").
 */
export function etaTo(
  from: Coordinate,
  destination: Coordinate,
  currentSpeedKmh?: number,
): string {
  const distanceKm = distanceBetween(from, destination) / 1000;
  const speed = (currentSpeedKmh && currentSpeedKmh > 0)
    ? currentSpeedKmh
    : AVG_CITY_SPEED_KMH;
  const totalMinutes = Math.max(1, Math.round((distanceKm / speed) * 60));

  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins}m`;
}

// ─── Nearest Stop ─────────────────────────────────────────────────────

export interface NearestStopResult {
  stop: RouteStop;
  distanceMeters: number;
  index: number;
}

/**
 * Find the closest stop from a list of stops to a given coordinate.
 * Returns null if the stops list is empty.
 */
export function nearestStop(
  from: Coordinate,
  stops: RouteStop[],
): NearestStopResult | null {
  if (stops.length === 0) return null;

  let minDistance = Infinity;
  let minIndex = 0;

  stops.forEach((stop, index) => {
    const d = distanceBetween(from, {
      latitude: stop.latitude,
      longitude: stop.longitude,
    });
    if (d < minDistance) {
      minDistance = d;
      minIndex = index;
    }
  });

  return {
    stop: stops[minIndex],
    distanceMeters: minDistance,
    index: minIndex,
  };
}
