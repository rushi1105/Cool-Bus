/**
 * Location Service — Real GPS Tracking
 *
 * Uses expo-location for real GPS tracking and writes
 * location updates to Firestore /buses/{busId}.
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { updateBus } from '../repositories/fleetRepository';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
}

/**
 * Request foreground location permissions.
 * Returns true if granted, false otherwise.
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return false;

    // Background tracking is only requested/required on Android for the MVP scope
    if (Platform.OS === 'android') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      return bgStatus === 'granted';
    }

    return true;
  } catch (err) {
    console.error('[Location] Permission error:', err);
    return false;
  }
}

/**
 * Request background location permissions (Android).
 * Drivers lock their screens so background access is required.
 */
export async function requestBackgroundLocationPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.error('[Location] Background permission error:', err);
    return false;
  }
}

/**
 * Check if background location permission has already been granted.
 */
export async function checkBackgroundLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.error('[Location] Check background permission error:', err);
    return false;
  }
}

/**
 * Start GPS tracking. Writes each location update to Firestore /buses/{busId}.
 * Returns the LocationSubscription (call .remove() to stop).
 */
export async function startTracking(
  busId: string,
  driverId: string,
  onLocationUpdate?: (location: {
    latitude: number;
    longitude: number;
    speed: number;
  }) => void,
): Promise<Location.LocationSubscription> {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 10,
      timeInterval: 5000,
    },
    async (location) => {
      const coords: LocationCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading ?? 0,
        speed: Math.max(0, (location.coords.speed ?? 0) * 3.6), // m/s → km/h
        accuracy: location.coords.accuracy ?? 0,
      };

      try {
        await updateBus(busId, {
          currentLocation: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
          speed: coords.speed || 0,
          isActive: true,
        });
      } catch (err) {
        console.error('[Location] Firestore write error:', err);
      }

      // Notify caller
      if (onLocationUpdate) {
        onLocationUpdate({
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: coords.speed || 0,
        });
      }
    },
  );

  return subscription;
}

/**
 * Stop GPS tracking. Removes the subscription and marks bus inactive.
 */
export async function stopTracking(
  subscription: Location.LocationSubscription,
  busId: string,
): Promise<void> {
  subscription.remove();

  try {
    await updateBus(busId, { isActive: false });
  } catch (err) {
    console.error('[Location] Stop tracking Firestore error:', err);
  }
}

/**
 * Calculate ETA in minutes using Haversine distance.
 * Assumes 20 km/h average city speed.
 */
export function calculateETA(
  busLat: number,
  busLng: number,
  stopLat: number,
  stopLng: number,
): number {
  const distanceKm = getDistance(
    { latitude: busLat, longitude: busLng },
    { latitude: stopLat, longitude: stopLng },
  ) / 1000;

  const avgSpeedKmh = 20;
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

/**
 * Haversine distance between two points in meters.
 */
export function getDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const R = 6371e3; // Earth radius in meters
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get current position once.
 */
export async function getCurrentLocation(): Promise<LocationCoords | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      heading: location.coords.heading ?? 0,
      speed: Math.max(0, (location.coords.speed ?? 0) * 3.6),
      accuracy: location.coords.accuracy ?? 0,
    };
  } catch (err) {
    console.error('[Location] getCurrentLocation error:', err);
    return null;
  }
}

export default {
  requestLocationPermissions,
  requestBackgroundLocationPermissions,
  checkBackgroundLocationPermission,
  startTracking,
  stopTracking,
  calculateETA,
  getDistance,
  getCurrentLocation,
};
