import React, { useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useFleet } from '../../hooks/useFleet';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import type { Bus } from '../../repositories/types';

interface FleetMapProps {
  navigation: any;
}

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export const FleetMap: React.FC<FleetMapProps> = ({ navigation }) => {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId || null;
  const { buses, loading, error } = useFleet(operatorId);
  const { latitude: currentLat, longitude: currentLng } = useCurrentLocation();
  const mapRef = useRef<MapView>(null);

  const activeBuses = useMemo(() => buses.filter((b) => b.isActive), [buses]);
  const inactiveBuses = useMemo(() => buses.filter((b) => !b.isActive), [buses]);

  const initialRegion = useMemo<Region>(() => {
    if (activeBuses.length > 0) {
      const latSum = activeBuses.reduce((s, b) => s + (b.currentLocation?.latitude || 0), 0);
      const lngSum = activeBuses.reduce((s, b) => s + (b.currentLocation?.longitude || 0), 0);
      const count = activeBuses.filter((b) => b.currentLocation).length;
      if (count > 0) {
        return {
          latitude: latSum / count,
          longitude: lngSum / count,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
      }
    }
    
    if (currentLat && currentLng) {
      return {
        latitude: currentLat,
        longitude: currentLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    return DEFAULT_REGION;
  }, [activeBuses, currentLat, currentLng]);

  const handleFocusBus = useCallback((bus: Bus) => {
    if (bus.currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: bus.currentLocation.latitude,
          longitude: bus.currentLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500,
      );
    }
  }, []);

  const renderBusMarker = useCallback((bus: Bus) => {
    if (!bus.currentLocation) return null;

    return (
      <Marker
        key={bus.id}
        coordinate={{
          latitude: bus.currentLocation.latitude,
          longitude: bus.currentLocation.longitude,
        }}
        title={bus.busNumber}
        description={bus.plateNumber || ''}
        pinColor={bus.isActive ? '#4CAF50' : '#9E9E9E'}
        onCalloutPress={() => handleFocusBus(bus)}
      >
        <Callout>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>{bus.busNumber}</Text>
            {bus.plateNumber ? (
              <Text style={styles.calloutSub}>{bus.plateNumber}</Text>
            ) : null}
            <Text style={styles.calloutStatus}>
              {bus.isActive ? '● Active' : '○ Inactive'}
            </Text>
          </View>
        </Callout>
      </Marker>
    );
  }, [handleFocusBus]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading fleet map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => {}}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
          showsCompass
        >
          {activeBuses.map(renderBusMarker)}
          {inactiveBuses.map(renderBusMarker)}
        </MapView>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bSheetHandle} />
        <View style={styles.bSheetHeader}>
          <Text style={styles.bSheetTitle}>
            Fleet ({buses.length})
          </Text>
          <View style={styles.bSheetActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('BusManager', { operatorId })}
            >
              <Text style={styles.actionBtnText}>Manage Buses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('RouteEditor', { operatorId })}
            >
              <Text style={styles.actionBtnText}>New Route</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Active ({activeBuses.length})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9E9E9E' }]} />
            <Text style={styles.legendText}>Inactive ({inactiveBuses.length})</Text>
          </View>
        </View>

        {/* Bus List */}
        <View style={styles.busList}>
          {buses.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No buses in fleet. Add one to see it on the map.</Text>
            </View>
          ) : (
            buses.map((bus) => (
              <TouchableOpacity
                key={bus.id}
                style={styles.busRow}
                onPress={() => handleFocusBus(bus)}
                activeOpacity={0.7}
              >
                <View style={[styles.busDot, { backgroundColor: bus.isActive ? '#4CAF50' : '#9E9E9E' }]} />
                <Text style={styles.busRowText}>{bus.busNumber}</Text>
                {bus.currentLocation ? (
                  <Text style={styles.busRowSpeed}>
                    {bus.speed ? `${Math.round(bus.speed)} km/h` : 'Idle'}
                  </Text>
                ) : (
                  <Text style={styles.busRowNoLoc}>No location</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  callout: {
    padding: 4,
    minWidth: 120,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.dark,
  },
  calloutSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  calloutStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: 320,
    elevation: 12,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  bSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  bSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
  },
  bSheetActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primaryFaded,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  busList: {
    maxHeight: 160,
  },
  busRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  busDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  busRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  busRowSpeed: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  busRowNoLoc: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  emptyRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default FleetMap;
