import { getDistance } from '../services/location';
import Config from '../constants/config';

export interface DedupKey {
  name: string;
  landmark: string;
  clusterLat: number;
  clusterLng: number;
}

export function buildDedupKey(
  name: string,
  landmark: string | undefined,
  latitude: number,
  longitude: number,
): string {
  const radius = Config.stopSelection.dedupRadiusMeters;
  const latRounded = Math.round(latitude / (radius / 111320)) * (radius / 111320);
  const lngRounded = Math.round(longitude / (radius / 111320 * Math.cos(latitude * Math.PI / 180))) * (radius / 111320 * Math.cos(latitude * Math.PI / 180));
  return `${name}|${landmark || ''}|${latRounded.toFixed(6)}|${lngRounded.toFixed(6)}`;
}

export function areCoordsWithinRadius(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  radiusMeters: number,
): boolean {
  return getDistance({ latitude: lat1, longitude: lng1 }, { latitude: lat2, longitude: lng2 }) <= radiusMeters;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatWalkingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hr = Math.floor(minutes / 60);
  const min = minutes % 60;
  return min > 0 ? `${hr} hr ${min} min` : `${hr} hr`;
}

export function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (t.includes(q)) return true;
  return q.split(/\s+/).every(word => t.includes(word));
}
