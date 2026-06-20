/**
 * GeocodingService — Google Geocoding API abstraction
 *
 * Provides text-to-coordinate search and reverse geocoding.
 * Used by useStopSearch for stop creation and by LocationManager for
 * reverse geocode functionality.
 *
 * The provider is abstracted behind an interface so future providers
 * (Mapbox, OSM/Nominatim, offline) can be swapped without changing consumers.
 */

import Constants from 'expo-constants';
import { GEOCODING } from '../../constants/location';
import type { PlaceResult } from '../../repositories/types';

// ─── API Key ──────────────────────────────────────────────────────────

function getApiKey(): string {
  const key =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    '';
  if (!key) {
    console.warn('[GeocodingService] Google Maps API key not found');
  }
  return key;
}

// ─── Search Places ────────────────────────────────────────────────────

/**
 * Search for places matching a text query.
 * Returns geocoded results with name, address, and coordinates.
 */
export async function searchPlaces(queryText: string): Promise<PlaceResult[]> {
  if (!queryText.trim()) return [];

  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      address: queryText,
      key: apiKey,
      region: GEOCODING.region,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    return data.results
      .slice(0, GEOCODING.maxResults)
      .map((result: any) => ({
        name: result.formatted_address?.split(',')[0] || queryText,
        address: result.formatted_address || '',
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      }));
  } catch (err) {
    console.error('[GeocodingService] searchPlaces error:', err);
    return [];
  }
}

// ─── Reverse Geocode ──────────────────────────────────────────────────

/**
 * Reverse geocode coordinates to a human-readable address string.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return '';

  try {
    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key: apiKey,
      language: 'en',
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return '';
    }

    return data.results[0].formatted_address || '';
  } catch (err) {
    console.error('[GeocodingService] reverseGeocode error:', err);
    return '';
  }
}
