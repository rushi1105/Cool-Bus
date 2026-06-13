/**
 * useBusLocation Hook
 *
 * Tracks real-time bus location with simulated movement.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import locationService, { LocationCoords } from '../services/location';
import { Bus, mockBuses } from '../services/firebase';

interface UseBusLocationReturn {
  location: LocationCoords | null;
  isTracking: boolean;
  speed: number;
  heading: number;
  eta: number | null;
  startTracking: () => void;
  stopTracking: () => void;
  bus: Bus | null;
}

export function useBusLocation(busId: string = 'bus-1'): UseBusLocationReturn {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);

  useEffect(() => {
    const found = mockBuses.find((b) => b.id === busId) ?? null;
    setBus(found);
    if (found) {
      setLocation({
        latitude: found.currentLocation.latitude,
        longitude: found.currentLocation.longitude,
        heading: 0,
        speed: found.speed,
        accuracy: 10,
      });
      setSpeed(found.speed);
    }
  }, [busId]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
    locationService.startWatching((coords) => {
      setLocation(coords);
      setSpeed(Math.round(coords.speed));
      setHeading(Math.round(coords.heading));

      // Calculate mock ETA to a fixed stop
      const stopLocation = { latitude: 12.9750, longitude: 77.5980 };
      const distance = locationService.getDistance(
        { latitude: coords.latitude, longitude: coords.longitude },
        stopLocation,
      );
      const etaMin = locationService.estimateETA(distance, coords.speed);
      setEta(etaMin);
    }, 3000);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    locationService.stopWatching();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      locationService.stopWatching();
    };
  }, []);

  return {
    location,
    isTracking,
    speed,
    heading,
    eta,
    startTracking,
    stopTracking,
    bus,
  };
}

export default useBusLocation;
