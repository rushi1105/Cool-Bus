import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const OFFLINE_QUEUE_KEY = 'gps_offline_queue';
const MAX_QUEUE_SIZE = 500;

export interface LocationCoords {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number;
  heading: number;
  accuracy: number;
}

export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      return bgStatus === 'granted';
    }
    return true;
  } catch {
    return false;
  }
}

export async function getCurrentPosition(): Promise<LocationCoords | null> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      heading: position.coords.heading ?? 0,
      speed: position.coords.speed ?? 0,
      accuracy: position.coords.accuracy ?? 0,
    };
  } catch {
    return null;
  }
}

export function startGpsTracking(
  onLocation: (point: GpsPoint) => void,
  onError?: (err: Error) => void,
): Location.LocationSubscription {
  const subscription = Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      timeInterval: 5000,
    },
    (loc) => {
      onLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp,
        speed: loc.coords.speed ?? 0,
        heading: loc.coords.heading ?? 0,
        accuracy: loc.coords.accuracy ?? 0,
      });
    },
  ).catch((err) => {
    onError?.(err);
    return null as unknown as Location.LocationSubscription;
  });

  return subscription as unknown as Location.LocationSubscription;
}

// ─── Offline Queue ─────────────────────────────────────────────

export async function addToOfflineQueue(point: GpsPoint): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: GpsPoint[] = raw ? JSON.parse(raw) : [];
    queue.push(point);
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.splice(0, queue.length - MAX_QUEUE_SIZE);
    }
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Silently fail — queue is best-effort
  }
}

export async function flushOfflineQueue(
  flushFn: (points: GpsPoint[]) => Promise<void>,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue: GpsPoint[] = JSON.parse(raw);
    if (queue.length === 0) return;

    await flushFn(queue);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
  } catch {
    // Will retry on next flush attempt
  }
}

export async function getOfflineQueueSize(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return 0;
    return JSON.parse(raw).length;
  } catch {
    return 0;
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
  } catch {
    // Silent
  }
}
