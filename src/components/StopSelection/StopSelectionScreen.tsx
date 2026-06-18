import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import Colors from '../../constants/colors';
import { useStopsForOperator, StopCandidate } from '../../hooks/useStopsForOperator';
import { StopBottomSheet } from './StopBottomSheet';
import { requestLocationPermissions, getCurrentLocation } from '../../services/location';
import { fuzzyMatch } from '../../utils/stopUtils';
import Config from '../../constants/config';

interface StopSelectionScreenProps {
  navigation: any;
  route: any;
}

const DEFAULT_REGION: Region = {
  latitude: 19.1873,
  longitude: 73.1927,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const StopSelectionScreen: React.FC<StopSelectionScreenProps> = ({ navigation, route }) => {
  const { operatorId } = route.params || {};

  const {
    stops,
    loading: stopsLoading,
    error: stopsError,
    groupedByDedup,
    operatorMap,
    computeDistances,
    refetch,
  } = useStopsForOperator(operatorId);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedStop, setSelectedStop] = useState<StopCandidate | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualSearchText, setManualSearchText] = useState('');
  const [manualSearching, setManualSearching] = useState(false);
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const granted = await requestLocationPermissions();
      if (!granted) {
        setPermissionDenied(true);
        setLocationLoading(false);
        return;
      }

      const loc = await getCurrentLocation();
      if (loc) {
        setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: loc.latitude,
              longitude: loc.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            500
          );
        }
      } else {
        setLocationError('Could not get your location. Please enable GPS or search manually.');
      }
    } catch (err) {
      console.error('[StopSelection] Location error:', err);
      setLocationError('Failed to get location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const rankedStops = useMemo(() => {
    return computeDistances(userLocation);
  }, [computeDistances, userLocation]);

  const dedupGroups = useMemo(() => {
    if (!userLocation) return groupedByDedup;
    const ranked = new Map<string, StopCandidate[]>();
    for (const stop of rankedStops) {
      const group = groupedByDedup.get(
        `${stop.name}|${stop.landmark || ''}|${stop.latitude.toFixed(5)}|${stop.longitude.toFixed(5)}`
      );
      if (group) {
        const key = `${stop.name}|${stop.landmark || ''}|${stop.latitude.toFixed(5)}|${stop.longitude.toFixed(5)}`;
        if (!ranked.has(key)) {
          ranked.set(key, group);
        }
      } else {
        const key = `${stop.name}|${stop.landmark || ''}|${stop.latitude.toFixed(5)}|${stop.longitude.toFixed(5)}`;
        if (!ranked.has(key)) {
          ranked.set(key, [stop]);
        }
      }
    }
    return ranked;
  }, [rankedStops, groupedByDedup]);

  const deduplicatedDisplayStops = useMemo((): StopCandidate[] => {
    const seen = new Set<string>();
    const result: StopCandidate[] = [];
    for (const stop of rankedStops) {
      const key = `${stop.name}|${stop.landmark || ''}|${stop.latitude.toFixed(5)}|${stop.longitude.toFixed(5)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(stop);
      }
    }
    return result;
  }, [rankedStops]);

  const filteredStops = useMemo(() => {
    if (!searchText.trim()) return deduplicatedDisplayStops;
    const q = searchText.toLowerCase();
    return deduplicatedDisplayStops.filter(
      s =>
        fuzzyMatch(s.name, q) ||
        (s.landmark && fuzzyMatch(s.landmark, q)) ||
        fuzzyMatch(s.routeName, q) ||
        fuzzyMatch(s.operatorName, q)
    );
  }, [deduplicatedDisplayStops, searchText]);

  const getOperatorsForStop = useCallback((stop: StopCandidate) => {
    const key = `${stop.name}|${stop.landmark || ''}|${stop.latitude.toFixed(5)}|${stop.longitude.toFixed(5)}`;
    const group = dedupGroups.get(key);
    if (!group) return [{ operatorId: stop.operatorId, operatorName: stop.operatorName, routeId: stop.routeId, routeName: stop.routeName }];
    return group.map(s => ({
      operatorId: s.operatorId,
      operatorName: s.operatorName,
      routeId: s.routeId,
      routeName: s.routeName,
    }));
  }, [dedupGroups]);

  const isRecommended = useCallback((stop: StopCandidate) => {
    if (deduplicatedDisplayStops.length === 0) return false;
    return stop.stopId === deduplicatedDisplayStops[0].stopId &&
           stop.routeId === deduplicatedDisplayStops[0].routeId;
  }, [deduplicatedDisplayStops]);

  const handleManualLocationSearch = async () => {
    if (!manualSearchText.trim()) return;
    setManualSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(manualSearchText)}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        setUserLocation({ latitude: loc.lat, longitude: loc.lng });
        setShowManualLocation(false);
        setManualSearchText('');
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: loc.lat,
              longitude: loc.lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            500
          );
        }
      } else {
        Alert.alert('Location Not Found', 'Could not find that location. Try a different search.');
      }
    } catch (err) {
      console.error('[StopSelection] Geocode error:', err);
      Alert.alert('Search Failed', 'Could not search for location. Check your connection.');
    } finally {
      setManualSearching(false);
    }
  };

  const recenterToUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    }
  };

  const autoFitStops = () => {
    if (!mapRef.current || filteredStops.length === 0) return;
    const coords = filteredStops.map(s => ({
      latitude: s.latitude,
      longitude: s.longitude,
    }));
    if (userLocation) {
      coords.push({ latitude: userLocation.latitude, longitude: userLocation.longitude });
    }
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
      animated: true,
    });
  };

  const handleMarkerPress = (stop: StopCandidate) => {
    setSelectedStop(stop);
    setSelectedOperatorId(null);
    setSheetVisible(true);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: stop.latitude,
          longitude: stop.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300
      );
    }
  };

  const handleSelectOperator = (opId: string) => {
    setSelectedOperatorId(opId);
  };

  const handleConfirmStop = async (stop: StopCandidate, opId: string) => {
    setConfirming(true);
    try {
      const targetOp = getOperatorsForStop(stop).find(o => o.operatorId === opId) || getOperatorsForStop(stop)[0];
      navigation.navigate('OTPVerify', {
        role: 'parent',
        phone: route.params.phone,
        registrationData: {
          ...route.params.registrationData,
          routeId: targetOp.routeId,
          stopId: stop.stopId,
          stopName: stop.name,
          stopLatitude: stop.latitude,
          stopLongitude: stop.longitude,
        },
      });
    } catch (err) {
      console.error('[StopSelection] Confirm error:', err);
      Alert.alert('Error', 'Failed to confirm stop. Please try again.');
      setConfirming(false);
    }
  };

  const handleDismissSheet = () => {
    setSheetVisible(false);
    setSelectedStop(null);
    setSelectedOperatorId(null);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  if (permissionDenied) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.permissionTitle}>Location Access Needed</Text>
        <Text style={styles.permissionText}>
          We need your location to find nearby pickup stops. You can also search for your area manually.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={initLocation}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            setPermissionDenied(false);
            setShowManualLocation(true);
          }}
        >
          <Text style={styles.skipButtonText}>Enter Location Manually</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skipButton, { marginTop: 8 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (stopsError) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorTitle}>Could not load stops</Text>
        <Text style={styles.errorText}>{stopsError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Manual Location Input */}
      {showManualLocation && (
        <View style={styles.manualLocationContainer}>
          <Text style={styles.manualLocationTitle}>Enter your location</Text>
          <Text style={styles.manualLocationHint}>
            Search your area, landmark, or address
          </Text>
          <View style={styles.manualSearchRow}>
            <TextInput
              style={styles.manualSearchInput}
              value={manualSearchText}
              onChangeText={setManualSearchText}
              placeholder="e.g. Badlapur Station, Shivaji Chowk"
              placeholderTextColor={Colors.textTertiary}
              onSubmitEditing={handleManualLocationSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.manualSearchButton}
              onPress={handleManualLocationSearch}
              disabled={manualSearching || !manualSearchText.trim()}
            >
              {manualSearching ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.manualSearchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.useGpsButton}
            onPress={() => {
              setShowManualLocation(false);
              initLocation();
            }}
          >
            <Text style={styles.useGpsButtonText}>Use GPS Instead</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={!showManualLocation && !permissionDenied}
        showsMyLocationButton={false}
        zoomControlEnabled={false}
        onMapReady={autoFitStops}
      >
        {filteredStops.map(stop => (
          <Marker
            key={`${stop.operatorId}-${stop.routeId}-${stop.stopId}`}
            coordinate={{
              latitude: stop.latitude,
              longitude: stop.longitude,
            }}
            title={stop.name}
            description={
              selectedStop?.stopId === stop.stopId && selectedStop?.routeId === stop.routeId
                ? 'Selected'
                : `${stop.distanceMeters}m`
            }
            onPress={() => handleMarkerPress(stop)}
            pinColor={
              selectedStop?.stopId === stop.stopId && selectedStop?.routeId === stop.routeId
                ? Colors.success
                : isRecommended(stop)
                ? Colors.primary
                : Colors.mapStop
            }
          />
        ))}
      </MapView>

      {/* Loading overlay */}
      {(stopsLoading || locationLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {locationLoading ? 'Getting your location...' : 'Finding nearby stops...'}
          </Text>
        </View>
      )}

      {/* Location error banner */}
      {locationError && !locationLoading && !showManualLocation && (
        <View style={styles.locationErrorBanner}>
          <Text style={styles.locationErrorText}>{locationError}</Text>
          <TouchableOpacity onPress={() => setShowManualLocation(true)}>
            <Text style={styles.retryLink}>Search Manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleSearchChange}
          placeholder="Search stops, landmark, or area..."
          placeholderTextColor={Colors.textTertiary}
        />
        {searchText.trim().length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Current location button */}
      {!showManualLocation && (
        <TouchableOpacity style={styles.locationButton} onPress={recenterToUser} activeOpacity={0.8}>
          <Text style={styles.locationButtonIcon}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Manual location button */}
      {!showManualLocation && (
        <TouchableOpacity
          style={styles.manualLocationButton}
          onPress={() => setShowManualLocation(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.manualLocationButtonIcon}>✏️</Text>
        </TouchableOpacity>
      )}

      {/* Fit to stops button */}
      {filteredStops.length > 0 && (
        <TouchableOpacity style={styles.fitButton} onPress={autoFitStops} activeOpacity={0.8}>
          <Text style={styles.fitButtonIcon}>🔲</Text>
        </TouchableOpacity>
      )}

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Bottom sheet */}
      <StopBottomSheet
        stop={selectedStop}
        operators={selectedStop ? getOperatorsForStop(selectedStop) : []}
        visible={sheetVisible}
        loading={confirming}
        isRecommended={selectedStop ? isRecommended(selectedStop) : false}
        onSelectOperator={handleSelectOperator}
        onConfirm={handleConfirmStop}
        onDismiss={handleDismissSheet}
        selectedOperatorId={selectedOperatorId}
      />

      {/* Empty state */}
      {!stopsLoading && filteredStops.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>
            {searchText.trim()
              ? 'No stops match your search.'
              : 'No stops found near your location.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  locationErrorBanner: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: Colors.warningFaded,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  locationErrorText: {
    fontSize: 13,
    color: Colors.dark,
    fontWeight: '500',
    flex: 1,
  },
  retryLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
    marginLeft: 8,
  },
  searchBar: {
    position: 'absolute',
    top: 48,
    left: 60,
    right: 16,
    height: 44,
    backgroundColor: Colors.white,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  clearSearch: {
    fontSize: 16,
    color: Colors.textSecondary,
    paddingLeft: 8,
  },
  locationButton: {
    position: 'absolute',
    bottom: 180,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  locationButtonIcon: {
    fontSize: 20,
  },
  manualLocationButton: {
    position: 'absolute',
    bottom: 232,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  manualLocationButtonIcon: {
    fontSize: 18,
  },
  fitButton: {
    position: 'absolute',
    bottom: 284,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  fitButtonIcon: {
    fontSize: 18,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 20,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    elevation: 4,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 16,
    zIndex: 10,
  },
  emptyText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  manualLocationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  manualLocationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 4,
  },
  manualLocationHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  manualSearchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualSearchInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manualSearchButton: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualSearchButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  useGpsButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  useGpsButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
