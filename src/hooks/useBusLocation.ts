/**
 * useBusLocation Hook
 *
 * Tracks real-time bus location via Firestore onSnapshot on /buses/{busId}.
 * Provides animated coordinate via standard RN Animated API and ETA calculation.
 */

import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { onBusSnapshot } from '../repositories/fleetRepository';
import type { Bus } from '../repositories/types';
import { calculateETA } from '../services/location';

interface UseBusLocationReturn {
  bus: Bus | null;
  coordinate: { latitude: number; longitude: number };
  isActive: boolean;
  speed: number;
  eta: number | null;
  loading: boolean;
  error: string | null;
}

export function useBusLocation(
  busId: string | null,
  stopLocation?: { latitude: number; longitude: number } | null,
): UseBusLocationReturn {
  const [bus, setBus] = useState<Bus | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coordinate, setCoordinate] = useState({ latitude: 0, longitude: 0 });

  const latAnim = useRef(new Animated.Value(0)).current;
  const lngAnim = useRef(new Animated.Value(0)).current;
  const isFirstUpdate = useRef(true);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Listeners to sync Animated values → state
  useEffect(() => {
    const latSub = latAnim.addListener(({ value }) => {
      setCoordinate((prev) => ({ ...prev, latitude: value }));
    });
    const lngSub = lngAnim.addListener(({ value }) => {
      setCoordinate((prev) => ({ ...prev, longitude: value }));
    });
    return () => {
      latAnim.removeListener(latSub);
      lngAnim.removeListener(lngSub);
    };
  }, [latAnim, lngAnim]);

  useEffect(() => {
    if (!busId) {
      setBus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onBusSnapshot(
      busId,
      (data) => {
        if (!data) {
          setBus(null);
          setIsActive(false);
          setLoading(false);
          return;
        }

        setBus(data);
        setIsActive(data.isActive);
        setSpeed(data.speed ?? 0);

        const lat = data.currentLocation?.latitude ?? 0;
        const lng = data.currentLocation?.longitude ?? 0;

        animRef.current?.stop();

        if (isFirstUpdate.current) {
          latAnim.setValue(lat);
          lngAnim.setValue(lng);
          setCoordinate({ latitude: lat, longitude: lng });
          isFirstUpdate.current = false;
        } else {
          animRef.current = Animated.parallel([
            Animated.timing(latAnim, {
              toValue: lat,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(lngAnim, {
              toValue: lng,
              duration: 1000,
              useNativeDriver: false,
            }),
          ]);
          animRef.current.start();
        }

        if (stopLocation && data.isActive) {
          const etaMin = calculateETA(
            lat,
            lng,
            stopLocation.latitude,
            stopLocation.longitude,
          );
          setEta(etaMin);
        } else {
          setEta(null);
        }

        setLoading(false);
      },
      (err) => {
        console.error('[useBusLocation] Snapshot error:', err);
        setError('Failed to track bus location');
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
      animRef.current?.stop();
      isFirstUpdate.current = true;
    };
  }, [busId, stopLocation?.latitude, stopLocation?.longitude, latAnim, lngAnim]);

  return {
    bus,
    coordinate,
    isActive,
    speed,
    eta,
    loading,
    error,
  };
}

export default useBusLocation;
