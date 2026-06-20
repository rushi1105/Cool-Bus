/**
 * Location Constants
 *
 * Centralized location configuration for all map-consuming screens.
 * Eliminates hardcoded coordinates scattered across the codebase.
 */

/** Default fallback: geographic center of India */
export const INDIA_FALLBACK = {
  latitude: 20.5937,
  longitude: 78.9629,
} as const;

/** Default map deltas for initial region */
export const DEFAULT_DELTAS = {
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
} as const;

/** Tighter deltas for zoomed-in views (e.g., single stop or GPS position) */
export const TIGHT_DELTAS = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
} as const;

/** Wide deltas for city-level overviews */
export const WIDE_DELTAS = {
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
} as const;

/** Recenter configuration */
export const RECENTER = {
  /** Minimum movement (meters) to trigger an auto-recenter while tracking */
  movementThresholdMeters: 50,
  /** Delay (ms) after user interaction before auto-recenter resumes */
  userInteractionCooldownMs: 10_000,
} as const;

/** Geocoding configuration */
export const GEOCODING = {
  /** Debounce delay for search queries (ms) */
  debounceMs: 400,
  /** Bias search results toward this region */
  region: 'IN',
  /** Maximum number of results to return */
  maxResults: 5,
} as const;

/** Stop proximity configuration */
export const STOP_PROXIMITY = {
  /** Radius (meters) to consider two stops as "nearby" for "Served By" */
  servedByRadiusMeters: 200,
} as const;
