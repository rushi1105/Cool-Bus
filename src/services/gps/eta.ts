import { haversineDistance } from './distance';

const AVG_WALKING_SPEED_MS = 1.4;
const AVG_DRIVING_SPEED_MS = 8.3;

export function estimateDrivingTime(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const dist = haversineDistance(from, to);
  return dist / AVG_DRIVING_SPEED_MS;
}

export function estimateWalkingTime(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const dist = haversineDistance(from, to);
  return dist / AVG_WALKING_SPEED_MS;
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}
