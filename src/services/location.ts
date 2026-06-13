/**
 * Location Service — Mock
 *
 * Simulates expo-location for tracking bus position.
 */

export interface LocationCoords {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
}

let watchId: ReturnType<typeof setInterval> | null = null;

// Simulated route around Bangalore center
const simulatedRoute: Array<{ latitude: number; longitude: number }> = [
  { latitude: 12.9650, longitude: 77.5900 },
  { latitude: 12.9670, longitude: 77.5915 },
  { latitude: 12.9690, longitude: 77.5930 },
  { latitude: 12.9710, longitude: 77.5945 },
  { latitude: 12.9730, longitude: 77.5960 },
  { latitude: 12.9750, longitude: 77.5980 },
  { latitude: 12.9770, longitude: 77.5990 },
  { latitude: 12.9790, longitude: 77.6005 },
  { latitude: 12.9810, longitude: 77.6020 },
  { latitude: 12.9830, longitude: 77.6035 },
];

let routeIndex = 0;

export const locationService = {
  /**
   * Request location permissions
   */
  requestPermissions: async (): Promise<boolean> => {
    // Mock: always granted
    return true;
  },

  /**
   * Get current location
   */
  getCurrentLocation: async (): Promise<LocationCoords> => {
    const point = simulatedRoute[routeIndex % simulatedRoute.length];
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      heading: 45 + Math.random() * 10,
      speed: 20 + Math.random() * 20,
      accuracy: 5 + Math.random() * 10,
    };
  },

  /**
   * Start watching location (simulates movement)
   */
  startWatching: (
    callback: (coords: LocationCoords) => void,
    intervalMs: number = 5000,
  ): void => {
    if (watchId) locationService.stopWatching();

    routeIndex = 0;
    watchId = setInterval(() => {
      const point = simulatedRoute[routeIndex % simulatedRoute.length];
      const coords: LocationCoords = {
        latitude: point.latitude + (Math.random() - 0.5) * 0.0005,
        longitude: point.longitude + (Math.random() - 0.5) * 0.0005,
        heading: 30 + Math.random() * 60,
        speed: 15 + Math.random() * 30,
        accuracy: 5 + Math.random() * 10,
      };
      callback(coords);
      routeIndex++;
    }, intervalMs);
  },

  /**
   * Stop watching location
   */
  stopWatching: (): void => {
    if (watchId) {
      clearInterval(watchId);
      watchId = null;
    }
  },

  /**
   * Calculate distance between two points (Haversine formula)
   */
  getDistance: (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ): number => {
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
  },

  /**
   * Estimate ETA in minutes given distance (meters) and speed (km/h)
   */
  estimateETA: (distanceMeters: number, speedKmh: number): number => {
    if (speedKmh <= 0) return 0;
    return Math.round((distanceMeters / 1000 / speedKmh) * 60);
  },
};

export default locationService;
