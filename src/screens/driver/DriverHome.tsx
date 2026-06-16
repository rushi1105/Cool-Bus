/**
 * DriverHome Screen
 *
 * Ola/Uber inspired full-screen map with 5 floating layers.
 * Slide-to-start trip via PanResponder, real-time Firestore location updates,
 * stop markers with gray-out visited states, and emergency SOS button.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
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
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import {
  requestLocationPermissions,
  startTracking,
  stopTracking,
  getDistance,
  type LocationCoords,
} from '../../services/location';
import { useAuth } from '../../hooks/useAuth';
import Colors from '../../constants/colors';

export const DriverHome: React.FC = () => {
  const { user, profile } = useAuth();
  const mapRef = useRef<MapView>(null);

  // States
  const [tripActive, setTripActive] = useState(false);
  const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
  const [tripId, setTripId] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [stops, setStops] = useState<any[]>([]);
  const [visitedStops, setVisitedStops] = useState<number[]>([]);
  const [busStudents, setBusStudents] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const thumbX = useRef(new Animated.Value(0)).current;

  // Refs for tracking callback to avoid stale closures
  const stopsRef = useRef<any[]>([]);
  const busStudentsRef = useRef<any[]>([]);
  const visitedStopsRef = useRef<number[]>([]);

  // PanResponder to manage the slide-to-start thumb using trackWidth state
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, trackWidth - 56));
        thumbX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= trackWidth * 0.75) {
          Animated.spring(thumbX, {
            toValue: trackWidth - 56,
            useNativeDriver: false,
          }).start(async () => {
            await startTrip();
          });
        } else {
          Animated.spring(thumbX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      }
    });
  }, [trackWidth, profile, user]);

  // Get current location on mount (no Bangalore hardcoding)
  useEffect(() => {
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    }).then(position => {
      setInitialRegion({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading ?? 0,
        speed: 0,
        accuracy: position.coords.accuracy ?? 0,
      });
    }).catch(err => {
      console.error('[DriverHome] getCurrentPositionAsync error:', err);
      // Fallback region (MH05 area)
      setInitialRegion({
        latitude: 19.1873,
        longitude: 73.1927,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    });
  }, []);

  // Trip Elapsed Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (tripActive && tripStartTime) {
      interval = setInterval(() => {
        const diff = Date.now() - tripStartTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tripActive, tripStartTime]);

  // Proximity Alert Checker
  const checkProximity = (latitude: number, longitude: number) => {
    const busId = profile?.busId;
    if (!busId) return;

    setVisitedStops((currentVisited) => {
      let updatedVisited = [...currentVisited];
      let hasChanges = false;

      stopsRef.current.forEach((stop) => {
        const stopOrder = stop.order;
        if (typeof stopOrder !== 'number') return;
        if (updatedVisited.includes(stopOrder)) return;

        const stopLat = stop.latitude ?? stop.lat;
        const stopLng = stop.longitude ?? stop.lng;
        if (!stopLat || !stopLng) return;

        const distance = getDistance(
          { latitude, longitude },
          { latitude: stopLat, longitude: stopLng }
        );

        if (distance < 50) {
          updatedVisited.push(stopOrder);
          hasChanges = true;

          // Notify parents assigned to this bus and this stop using the cached list
          busStudentsRef.current.forEach((student) => {
            if (
              student.stopLocation &&
              (student.stopLocation.label === stop.name ||
                getDistance(student.stopLocation, { latitude: stopLat, longitude: stopLng }) < 100)
            ) {
              addDoc(collection(db, 'notifications'), {
                userId: student.parentId,
                type: 'info',
                message: `Bus has arrived at ${stop.name}`,
                timestamp: serverTimestamp(),
                read: false,
                createdAt: serverTimestamp(),
              }).catch((err) => console.error('Error creating notification:', err));
            }
          });

          // Show toast/alert
          Alert.alert('Stop Reached', `Arrived at ${stop.name}`);
        }
      });

      if (hasChanges) {
        // Write to Firestore /buses/{busId}
        updateDoc(doc(db, 'buses', busId), {
          visitedStops: updatedVisited,
        }).catch((e) => console.error('Error updating visitedStops on bus:', e));

        // Sync the ref
        visitedStopsRef.current = updatedVisited;

        // All stops visited check
        if (updatedVisited.length === stopsRef.current.length) {
          console.log('All stops visited');
          updateDoc(doc(db, 'buses', busId), {
            allStopsVisited: true,
          }).catch((e) => console.error('Error updating allStopsVisited on bus:', e));
        }

        return updatedVisited;
      }
      return currentVisited;
    });
  };

  // Start Trip Logic (Detailed error checking and alerts)
  const startTrip = async () => {
    try {
      // Step 1: Check permissions
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please enable location access in Settings to start a trip.'
        );
        // Reset slider
        Animated.spring(thumbX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        return;
      }

      // Step 2: Get busId from profile
      const busId = profile?.busId;
      if (!busId) {
        Alert.alert(
          'Error',
          'No bus assigned to your account. Please contact your operator.'
        );
        Animated.spring(thumbX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        return;
      }

      // Step 3: Load stops from bus doc FIRST
      const busDoc = await getDoc(doc(db, 'buses', busId));
      let stopsList: any[] = [];
      if (busDoc.exists()) {
        const busData = busDoc.data();
        stopsList = (busData.stops || []).sort((a: any, b: any) => a.order - b.order);
        setStops(stopsList);
        stopsRef.current = stopsList;
      }
      setVisitedStops([]);
      visitedStopsRef.current = [];

      // Step 4: Load students linked to this bus once
      const studentQ = query(collection(db, 'students'), where('busId', '==', busId));
      const studentSnap = await getDocs(studentQ);
      const studentsList = studentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBusStudents(studentsList);
      busStudentsRef.current = studentsList;

      // Step 5: Start GPS tracking with callback
      const subscription = await startTracking(
        busId,
        user?.uid || '',
        (location) => {
          // Update local map position
          setCurrentLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            heading: 0,
            speed: location.speed,
            accuracy: 0,
          });

          // Run proximity check against all stops
          checkProximity(location.latitude, location.longitude);
        }
      );
      if (!subscription) {
        Alert.alert('Error', 'Failed to start GPS tracking.');
        Animated.spring(thumbX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        return;
      }
      setLocationSubscription(subscription);

      // Step 6: Create trip in Firestore
      const tripRef = await addDoc(collection(db, 'trips'), {
        busId,
        driverId: user?.uid || '',
        operatorId: profile?.operatorId || '',
        startTime: serverTimestamp(),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setTripId(tripRef.id);

      // Step 7: Update bus doc
      await updateDoc(doc(db, 'buses', busId), {
        isActive: true,
        visitedStops: [],
        allStopsVisited: false,
        lastUpdated: serverTimestamp(),
      });

      setTripActive(true);
      setTripStartTime(new Date());

      // Step 8: Notify parents assigned to this bus (using the studentsList preloaded in Step 4)
      const parentIds = [...new Set(studentsList.map((s: any) => s.parentId))];
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

    } catch (error: any) {
      console.error('startTrip error:', error);
      Alert.alert('Error', 'Failed to start trip: ' + error.message);
      Animated.spring(thumbX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  // End Trip Logic
  const endTrip = async () => {
    const busId = profile?.busId || `bus-${user?.uid}`;

    try {
      if (locationSubscription) {
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
      setStops([]);
      setVisitedStops([]);
      setBusStudents([]);
      thumbX.setValue(0);

      stopsRef.current = [];
      visitedStopsRef.current = [];
      busStudentsRef.current = [];

      await updateDoc(doc(db, 'buses', busId), {
        visitedStops: [],
        allStopsVisited: false,
      });
    } catch (err) {
      console.error('[DriverHome] endTrip error:', err);
    }
  };

  // SOS Emergency Alert Trigger
  const handleSOS = () => {
    Alert.alert('Send SOS Alert?', 'This will notify your operator immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          const busId = profile?.busId || `bus-${user?.uid}`;
          try {
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
            Alert.alert('SOS Transmitted', 'Your operator has been notified.');
          } catch (err) {
            console.error('[DriverHome] SOS error:', err);
            Alert.alert('Error', 'Failed to send SOS. Please try again.');
          }
        },
      },
    ]);
  };

  if (!initialRegion) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* LAYER 1 — MapView (base, fills entire screen) */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        followsUserLocation={true}
        mapType="standard"
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Stops markers */}
        {tripActive &&
          stops.map((stop, index) => {
            const stopId = stop.id || stop.name || index.toString();
            const isVisited = visitedStops.includes(stop.order);
            const isNext = stops.find((s) => !visitedStops.includes(s.order))?.name === stop.name;
            const stopLat = stop.latitude ?? stop.lat;
            const stopLng = stop.longitude ?? stop.lng;

            if (!stopLat || !stopLng) return null;

            return (
              <Marker
                key={stopId}
                coordinate={{
                  latitude: stopLat,
                  longitude: stopLng,
                }}
                title={stop.name}
                description={isVisited ? 'Visited ✓' : isNext ? 'Next Stop' : ''}
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

      {/* LAYER 2 — Header pill (floating, top of screen) */}
      <View style={styles.headerPill}>
        <Text style={styles.headerPillText}>
          {profile?.name || 'Driver'} • {profile?.busNumber || 'Bus'}
        </Text>
      </View>

      {/* LAYER 3 — Trip timer (floating top-left to avoid logout overlap) */}
      {tripActive && (
        <View style={styles.timerPill}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{elapsedTime}</Text>
        </View>
      )}

      {/* Logout button (Floating top-right) */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: () => {
                  signOut(auth);
                },
              },
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* LAYER 4 — SOS button (floating bottom-right, shifted above tab bar) */}
      <TouchableOpacity
        style={styles.sosButton}
        onPress={handleSOS}
        activeOpacity={0.85}
      >
        <Text style={styles.sosText}>!</Text>
      </TouchableOpacity>

      {/* LAYER 5 — Trip control card (floating bottom, shifted to bottom: 96) */}
      <View style={styles.tripControlCard}>
        {!tripActive ? (
          <View style={styles.sliderWrapper}>
            <Text style={styles.sliderLabel}>Slide to start trip</Text>
            <View
              style={styles.sliderTrack}
              onLayout={(e) => {
                setTrackWidth(e.nativeEvent.layout.width);
              }}
              pointerEvents={trackWidth === 0 ? 'none' : 'auto'}
            >
              <Animated.View
                style={[
                  styles.sliderThumb,
                  {
                    transform: [{ translateX: thumbX }],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <Text style={styles.sliderThumbIcon}>→</Text>
              </Animated.View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.endTripButton}
            onPress={() => {
              Alert.alert('End trip?', 'Are you sure you want to end the trip?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End Trip', style: 'destructive', onPress: endTrip },
              ]);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.endTripText}>End Trip</Text>
          </TouchableOpacity>
        )}
      </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
  headerPill: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  headerPillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  timerPill: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  logoutButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 999,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sosButton: {
    position: 'absolute',
    bottom: 176,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 10,
  },
  sosText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tripControlCard: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 10,
  },
  sliderWrapper: {
    width: '100%',
  },
  sliderLabel: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  sliderTrack: {
    backgroundColor: '#2A2A2A',
    height: 60,
    borderRadius: 30,
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  sliderThumb: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sliderThumbIcon: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  endTripButton: {
    backgroundColor: '#EF4444',
    borderRadius: 30,
    paddingVertical: 18,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endTripText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  stopMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 3,
  },
  stopMarkerVisited: {
    backgroundColor: '#888888',
  },
  stopMarkerNext: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
  },
  stopMarkerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default DriverHome;
