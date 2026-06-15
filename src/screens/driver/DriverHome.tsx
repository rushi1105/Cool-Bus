/**
 * DriverHome Screen — Phase 2
 *
 * Ola-style full-screen map with floating overlays.
 * Slide-to-start trip, stop markers, auto-trip-end, SOS.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, type Student } from '../../services/firebase';
import {
  requestLocationPermissions,
  requestBackgroundLocationPermissions,
  startTracking,
  stopTracking,
  getDistance,
  type LocationCoords,
} from '../../services/location';
import { useAuth } from '../../hooks/useAuth';
import Colors from '../../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 64;
const THUMB_SIZE = 56;
const SLIDER_TRACK = SLIDER_WIDTH - THUMB_SIZE - 8;
const STOP_PROXIMITY_METERS = 50;

interface DriverHomeProps {
  navigation: any;
}

export const DriverHome: React.FC<DriverHomeProps> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const mapRef = useRef<MapView>(null);

  // Trip state
  const [tripActive, setTripActive] = useState(false);
  const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
  const [tripId, setTripId] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [visitedStops, setVisitedStops] = useState<string[]>([]);
  const [stops, setStops] = useState<Student[]>([]);

  // Location state
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Auto-end overlay
  const [showAutoEnd, setShowAutoEnd] = useState(false);
  const [autoEndCountdown, setAutoEndCountdown] = useState(30);
  const autoEndTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Arrived toast
  const [arrivedStop, setArrivedStop] = useState<string | null>(null);

  // Slider animation
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const x = Math.max(0, Math.min(gestureState.dx, SLIDER_TRACK));
        translateX.setValue(x);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SLIDER_TRACK * 0.75) {
          Animated.spring(translateX, {
            toValue: SLIDER_TRACK,
            useNativeDriver: true,
          }).start(() => {
            handleStartTrip();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ─── Init: Get current location ────────────────────────────────
  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermissions();
      if (granted) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coords: LocationCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          heading: loc.coords.heading ?? 0,
          speed: 0,
          accuracy: loc.coords.accuracy ?? 0,
        };
        setCurrentLocation(coords);
        setInitialRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
      setIsLoading(false);
    })();
  }, []);

  // ─── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (tripActive && tripStartTime) {
      interval = setInterval(() => {
        const diff = Date.now() - tripStartTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tripActive, tripStartTime]);

  // ─── Auto-end countdown ────────────────────────────────────────
  useEffect(() => {
    if (showAutoEnd) {
      setAutoEndCountdown(30);
      autoEndTimerRef.current = setInterval(() => {
        setAutoEndCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(autoEndTimerRef.current!);
            handleEndTrip();
            setShowAutoEnd(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (autoEndTimerRef.current) clearInterval(autoEndTimerRef.current);
    };
  }, [showAutoEnd]);

  // ─── Arrived toast auto-dismiss ────────────────────────────────
  useEffect(() => {
    if (arrivedStop) {
      const timer = setTimeout(() => setArrivedStop(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [arrivedStop]);

  // ─── Fetch stops for current bus ───────────────────────────────
  const fetchStops = useCallback(async () => {
    if (!profile?.busNumber) return;
    try {
      // Find the bus document by busNumber to get busId
      const busQ = query(
        collection(db, 'buses'),
        where('busNumber', '==', profile.busNumber),
      );
      const busSnap = await getDocs(busQ);
      if (busSnap.empty) return;

      const busId = busSnap.docs[0].id;

      // Find students assigned to this bus
      const studentQ = query(
        collection(db, 'students'),
        where('busId', '==', busId),
      );
      const studentSnap = await getDocs(studentQ);
      const studentStops = studentSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Student[];

      // Sort by stopOrder (if exists), otherwise by name
      studentStops.sort((a, b) => (a.stopOrder ?? 999) - (b.stopOrder ?? 999));
      setStops(studentStops);
    } catch (err) {
      console.error('[DriverHome] fetchStops error:', err);
    }
  }, [profile?.busNumber]);

  // ─── Check stop proximity on location update ──────────────────
  const checkStopProximity = useCallback(
    (coords: LocationCoords) => {
      stops.forEach((stop) => {
        if (visitedStops.includes(stop.id)) return;

        const distance = getDistance(
          { latitude: coords.latitude, longitude: coords.longitude },
          {
            latitude: stop.stopLocation.latitude,
            longitude: stop.stopLocation.longitude,
          },
        );

        if (distance < STOP_PROXIMITY_METERS) {
          // Mark as visited
          setVisitedStops((prev) => [...prev, stop.id]);
          setArrivedStop(stop.stopLocation.label || stop.name);

          // Write notification for parent
          addDoc(collection(db, 'notifications'), {
            userId: stop.parentId,
            type: 'info',
            message: `Bus has arrived at ${stop.stopLocation.label || stop.name}`,
            timestamp: serverTimestamp(),
            read: false,
            createdAt: serverTimestamp(),
          }).catch((err) =>
            console.error('[DriverHome] notification write error:', err),
          );

          // Check if all stops visited
          const newVisited = [...visitedStops, stop.id];
          if (newVisited.length === stops.length && stops.length > 0) {
            setShowAutoEnd(true);
          }
        }
      });
    },
    [stops, visitedStops],
  );

  // ─── Start Trip ────────────────────────────────────────────────
  const handleStartTrip = async () => {
    if (!user || !profile) return;

    const granted = await requestLocationPermissions();
    if (!granted) {
      Alert.alert(
        'Location Required',
        'Please enable location permissions in your device settings to start a trip.',
        [{ text: 'OK' }],
      );
      return;
    }

    const bgGranted = await requestBackgroundLocationPermissions();
    if (!bgGranted) {
      Alert.alert(
        'Background Location Required',
        "Background location is required for trip tracking. Please enable 'Allow all the time' in Android settings.",
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      // Find busId
      const busQ = query(
        collection(db, 'buses'),
        where('busNumber', '==', profile.busNumber),
      );
      const busSnap = await getDocs(busQ);
      const busId = busSnap.empty ? `bus-${user.uid}` : busSnap.docs[0].id;

      // Fetch stops
      await fetchStops();

      // Start GPS tracking
      const sub = await startTracking(busId, user.uid, (coords) => {
        setCurrentLocation(coords);
        checkStopProximity(coords);
      });
      setLocationSubscription(sub);

      // Create trip in Firestore
      const tripRef = await addDoc(collection(db, 'trips'), {
        busId,
        driverId: user.uid,
        startTime: serverTimestamp(),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setTripId(tripRef.id);

      // Notify parents on this bus
      const studentQ = query(
        collection(db, 'students'),
        where('busId', '==', busId),
      );
      const studentSnap = await getDocs(studentQ);
      const parentIds = [...new Set(studentSnap.docs.map((d) => d.data().parentId))];
      for (const parentId of parentIds) {
        addDoc(collection(db, 'notifications'), {
          userId: parentId,
          type: 'info',
          message: "Your child's bus has started",
          timestamp: serverTimestamp(),
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      setTripActive(true);
      setTripStartTime(new Date());
      setVisitedStops([]);
    } catch (err: any) {
      console.error('[DriverHome] startTrip error:', err);
      Alert.alert('Error', 'Failed to start trip. Please try again.');
    }
  };

  // ─── End Trip ──────────────────────────────────────────────────
  const handleEndTrip = async () => {
    try {
      if (locationSubscription) {
        const busQ = query(
          collection(db, 'buses'),
          where('busNumber', '==', profile?.busNumber),
        );
        const busSnap = await getDocs(busQ);
        const busId = busSnap.empty ? '' : busSnap.docs[0].id;

        await stopTracking(locationSubscription, busId);
        setLocationSubscription(null);
      }

      if (tripId) {
        await updateDoc(doc(db, 'trips', tripId), {
          endTime: serverTimestamp(),
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
      }

      setTripActive(false);
      setTripStartTime(null);
      setTripId('');
      setElapsedTime('00:00:00');
      setVisitedStops([]);
      setStops([]);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('[DriverHome] endTrip error:', err);
    }
  };

  // ─── SOS ───────────────────────────────────────────────────────
  const handleSOS = () => {
    Alert.alert('Send SOS to operator?', 'This will alert your operator immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          try {
            const busQ = query(
              collection(db, 'buses'),
              where('busNumber', '==', profile?.busNumber),
            );
            const busSnap = await getDocs(busQ);
            const busId = busSnap.empty ? '' : busSnap.docs[0].id;

            await addDoc(collection(db, 'alerts'), {
              driverId: user?.uid,
              busId,
              timestamp: serverTimestamp(),
              location: currentLocation
                ? {
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }
                : null,
              status: 'active',
              createdAt: serverTimestamp(),
            });
            Alert.alert('SOS Sent', 'Your operator has been alerted.');
          } catch (err) {
            console.error('[DriverHome] SOS error:', err);
            Alert.alert('Error', 'Failed to send SOS. Please try again.');
          }
        },
      },
    ]);
  };

  // ─── Slider gesture handled by PanResponder ───────────────────

  // ─── Next stop helper ──────────────────────────────────────────
  const getNextStop = () => {
    return stops.find((s) => !visitedStops.includes(s.id));
  };

  // ─── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Full-screen Map ────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        followsUserLocation={tripActive}
        mapType="standard"
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Stop markers */}
        {tripActive &&
          stops.map((stop) => {
            const isVisited = visitedStops.includes(stop.id);
            const isNext = getNextStop()?.id === stop.id;
            return (
              <Marker
                key={stop.id}
                coordinate={{
                  latitude: stop.stopLocation.latitude,
                  longitude: stop.stopLocation.longitude,
                }}
                title={stop.stopLocation.label || stop.name}
                description={isVisited ? 'Visited ✓' : isNext ? 'Next stop' : ''}
              >
                <View
                  style={[
                    styles.stopMarker,
                    isVisited && styles.stopMarkerVisited,
                    isNext && styles.stopMarkerNext,
                  ]}
                >
                  <Text style={styles.stopMarkerText}>
                    {isVisited ? '✓' : isNext ? '●' : '○'}
                  </Text>
                </View>
              </Marker>
            );
          })}
      </MapView>

      {/* ── Floating Header Pill ───────────────────────────── */}
      <View style={styles.headerPill}>
        <Text style={styles.headerPillText}>
          {profile?.name ?? 'Driver'} • {profile?.busNumber ?? 'Bus'}
        </Text>
      </View>

      {/* ── Trip Timer (when active) ───────────────────────── */}
      {tripActive && (
        <View style={styles.timerPill}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{elapsedTime}</Text>
        </View>
      )}

      {/* ── Stats bar (when active) ────────────────────────── */}
      {tripActive && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(currentLocation?.speed ?? 0)}
            </Text>
            <Text style={styles.statLabel}>km/h</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stops.length - visitedStops.length}
            </Text>
            <Text style={styles.statLabel}>Stops left</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{visitedStops.length}</Text>
            <Text style={styles.statLabel}>Visited</Text>
          </View>
        </View>
      )}

      {/* ── Arrived Toast ──────────────────────────────────── */}
      {arrivedStop && (
        <View style={styles.arrivedToast}>
          <Text style={styles.arrivedIcon}>📍</Text>
          <Text style={styles.arrivedText}>Arrived at {arrivedStop}</Text>
        </View>
      )}

      {/* ── SOS Button ─────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.sosButton}
        onPress={handleSOS}
        activeOpacity={0.8}
      >
        <Text style={styles.sosIcon}>!</Text>
      </TouchableOpacity>

      {/* ── Start Trip Slider (when not active) ────────────── */}
      {!tripActive && (
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <Animated.View
              style={[
                styles.sliderThumb,
                {
                  transform: [{ translateX }],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <Text style={styles.sliderThumbIcon}>→</Text>
            </Animated.View>
            <Text style={styles.sliderLabel}>Slide to start trip</Text>
          </View>
        </View>
      )}

      {/* ── End Trip Button (when active) ──────────────────── */}
      {tripActive && !showAutoEnd && (
        <TouchableOpacity
          style={styles.endTripButton}
          onPress={() => {
            Alert.alert('End Trip?', 'Are you sure you want to end this trip?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'End Trip', style: 'destructive', onPress: handleEndTrip },
            ]);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.endTripText}>End Trip</Text>
        </TouchableOpacity>
      )}

      {/* ── Auto-End Overlay ───────────────────────────────── */}
      {showAutoEnd && (
        <View style={styles.autoEndOverlay}>
          <View style={styles.autoEndCard}>
            <Text style={styles.autoEndEmoji}>🎉</Text>
            <Text style={styles.autoEndTitle}>Trip Complete!</Text>
            <Text style={styles.autoEndSubtitle}>
              Auto-ending in {autoEndCountdown} seconds...
            </Text>
            <View style={styles.autoEndProgress}>
              <View
                style={[
                  styles.autoEndProgressFill,
                  { width: `${((30 - autoEndCountdown) / 30) * 100}%` },
                ]}
              />
            </View>
            <TouchableOpacity
              style={styles.autoEndCancel}
              onPress={() => {
                setShowAutoEnd(false);
                if (autoEndTimerRef.current) {
                  clearInterval(autoEndTimerRef.current);
                }
              }}
            >
              <Text style={styles.autoEndCancelText}>Cancel auto-end</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Header pill
  headerPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  headerPillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Timer
  timerPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Stats bar
  statsBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 96,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    flexDirection: 'row',
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  // Stop markers
  stopMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  stopMarkerVisited: {
    backgroundColor: Colors.textTertiary,
  },
  stopMarkerNext: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
  },
  stopMarkerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Arrived toast
  arrivedToast: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrivedIcon: {
    fontSize: 18,
  },
  arrivedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // SOS button
  sosButton: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sosIcon: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },

  // Slider
  sliderContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 32,
    right: 32,
  },
  sliderTrack: {
    height: 68,
    backgroundColor: '#000',
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sliderThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 10,
  },
  sliderThumbIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
  },
  sliderLabel: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // End trip
  endTripButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 32,
    right: 32,
    height: 56,
    backgroundColor: Colors.error,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  endTripText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Auto-end overlay
  autoEndOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  autoEndCard: {
    width: SCREEN_WIDTH - 64,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  autoEndEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  autoEndTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  autoEndSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  autoEndProgress: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  autoEndProgressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  autoEndCancel: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  autoEndCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

export default DriverHome;
