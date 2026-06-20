import { haversineDistance } from './distance';

export interface RouteProgress {
  totalStops: number;
  visitedStops: number;
  remainingStops: number;
  nextStopIndex: number | null;
  distanceToNextStop: number;
}

export function calculateRouteProgress(
  currentLocation: { latitude: number; longitude: number },
  stops: Array<{ latitude: number; longitude: number }>,
  visitedIndices: number[],
): RouteProgress {
  const totalStops = stops.length;
  const visitedStops = visitedIndices.length;
  const remainingStops = totalStops - visitedStops;

  let nextStopIndex: number | null = null;
  let distanceToNextStop = 0;

  for (let i = 0; i < stops.length; i++) {
    if (!visitedIndices.includes(i)) {
      nextStopIndex = i;
      distanceToNextStop = haversineDistance(currentLocation, stops[i]);
      break;
    }
  }

  return {
    totalStops,
    visitedStops,
    remainingStops,
    nextStopIndex,
    distanceToNextStop,
  };
}

export function interpolatePoints(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  segments: number,
): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    });
  }
  return points;
}
