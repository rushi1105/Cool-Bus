/**
 * useStopSearch — Debounced stop search + "Served By" hook
 *
 * Provides autocomplete search for stop creation in RouteEditor.
 * When a search result is selected, computes which existing routes
 * already serve a nearby stop ("Served By" chips).
 *
 * Uses GeocodingService for geocoding and routeRepository for
 * proximity matching.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchPlaces } from '../services/geocoding/GeocodingService';
import { getRoutesByOperator } from '../repositories/routeRepository';
import { distanceBetween } from '../services/location/LocationManager';
import { GEOCODING, STOP_PROXIMITY } from '../constants/location';
import type { PlaceResult, Route } from '../repositories/types';

// ─── Types ────────────────────────────────────────────────────────────

export interface ServedByInfo {
  routeId: string;
  routeName: string;
  stopName: string;
}

interface UseStopSearchReturn {
  /** Search query string (controlled) */
  query: string;
  /** Update the search query */
  setQuery: (text: string) => void;
  /** Search results */
  results: PlaceResult[];
  /** True while search is in progress */
  searching: boolean;
  /** Routes that serve a stop near the selected result */
  servedBy: ServedByInfo[];
  /** Check which routes serve a specific coordinate */
  checkServedBy: (latitude: number, longitude: number) => void;
  /** Clear search state */
  clear: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useStopSearch(operatorId: string | null): UseStopSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [servedBy, setServedBy] = useState<ServedByInfo[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routesCacheRef = useRef<Route[]>([]);

  // Pre-fetch routes for proximity matching
  useEffect(() => {
    if (!operatorId) return;
    getRoutesByOperator(operatorId)
      .then((routes) => {
        routesCacheRef.current = routes;
      })
      .catch((err) => {
        console.error('[useStopSearch] Routes prefetch error:', err);
      });
  }, [operatorId]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(query);
        setResults(places);
      } catch (err) {
        console.error('[useStopSearch] Search error:', err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, GEOCODING.debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const checkServedBy = useCallback(
    (latitude: number, longitude: number) => {
      const matches: ServedByInfo[] = [];
      const routes = routesCacheRef.current;

      for (const route of routes) {
        for (const stop of route.stops) {
          const distance = distanceBetween(
            { latitude, longitude },
            { latitude: stop.latitude, longitude: stop.longitude },
          );
          if (distance <= STOP_PROXIMITY.servedByRadiusMeters) {
            matches.push({
              routeId: route.id,
              routeName: route.name,
              stopName: stop.name,
            });
            break; // One match per route is sufficient
          }
        }
      }

      setServedBy(matches);
    },
    [],
  );

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setServedBy([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    searching,
    servedBy,
    checkServedBy,
    clear,
  };
}
