import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { getBus, updateBus } from '../../repositories/fleetRepository';
import { getStudentsByBus } from '../../repositories/studentRepository';
import { getRoute } from '../../repositories/routeRepository';
import { getDriverById } from '../../repositories/userRepository';
import { fetchOperator } from '../../repositories/operatorRepository';
import {
  startTrip as createTripRecord,
  endTrip as completeTrip,
  addRoutePoints,
} from '../../repositories/tripRepository';
import { addNotification } from '../../repositories/notificationRepository';
import { createAlert } from '../../repositories/alertRepository';
import { getOperatorAssignmentsByDate } from '../../repositories/assignmentRepository';
import {
  requestLocationPermissions,
  startGpsTracking,
  getCurrentPosition,
  addToOfflineQueue,
  flushOfflineQueue,
  clearOfflineQueue,
  type GpsPoint,
  type LocationCoords,
} from '../../services/gps/location';
import { haversineDistance } from '../../services/gps/distance';
import { useAuth } from '../../hooks/useAuth';
import { useLocationManager } from '../../hooks/useLocationManager';
import { useTabBarSafeBottom } from '../../hooks/useTabBarSafeBottom';
import Colors from '../../constants/colors';
import type { Assignment, Route as RouteType, OfficeLocation } from '../../repositories/types';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const DriverHome: React.FC = () => {
  const { user, profile } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null | undefined>(undefined);
  useEffect(() => {
    if (profile?.operatorId) {
      fetchOperator(profile.operatorId)
        .then(op => setOfficeLocation(op?.officeLocation || null))
        .catch(() => setOfficeLocation(null));
    }
  }, [profile?.operatorId]);

  const { initialRegion, currentLocation: hookLocation, loading: locationLoading } = useLocationManager({
    officeLocation,
  });
  const { bottomOffset } = useTabBarSafeBottom();

  const [tripActive, setTripActive] = useState(false);
  const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
  const [tripId, setTripId] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [stops, setStops] = useState<any[]>([]);
  const [visitedStops, setVisitedStops] = useState<number[]>([]);
  const [busStudents, setBusStudents] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [routeData, setRouteData] = useState<RouteType | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);

  const thumbX = useRef(new Animated.Value(0)).current;
  const stopsRef = useRef<any[]>([]);
  const busStudentsRef = useRef<any[]>([]);
  const visitedStopsRef = useRef<number[]>([]);
  const routePointsRef = useRef<GpsPoint[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load today's assignment on mount
  useEffect(() => {
    const loadAssignment = async () => {
      if (!profile?.operatorId || !user?.uid) {
        setLoadingAssignment(false);
        return;
      }
      try {
        const asgns = await getOperatorAssignmentsByDate(profile.operatorId, todayString());
        const myAsgn = asgns.find(
          (a) => a.driverId === user.uid && (a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS'),
        );
        setAssignment(myAsgn || null);

        if (myAsgn) {
          const route = await getRoute(myAsgn.routeId);
          setRouteData(route || null);
        }
      } catch (err) {
        console.error('[DriverHome] Load assignment error:', err);
      } finally {
        setLoadingAssignment(false);
      }
    };
    loadAssignment();
  }, [profile?.operatorId, user?.uid]);

  // Resume from active trip if assignment is IN_PROGRESS
  useEffect(() => {
    if (!assignment || assignment.status !== 'IN_PROGRESS' || !profile?.busId) return;

    const busId = profile.busId;
    const loadActiveState = async () => {
      const busData = await getBus(busId);
      if (!busData) return;

      const route = routeData;
      if (route) {
        const sorted = route.stops.map((s, i) => ({ ...s, order: i }));
        setStops(sorted);
        stopsRef.current = sorted;
      }

      setTripId(assignment.id);
      setTripActive(true);
      setTripStartTime(new Date());

      const students = await getStudentsByBus(busId);
      setBusStudents(students);
      busStudentsRef.current = students;
    };
    loadActiveState();
  }, [assignment, routeData, profile?.busId]);

  // Seed currentLocation from hook if GPS is available
  useEffect(() => {
    if (hookLocation && !currentLocation) {
      setCurrentLocation({
        latitude: hookLocation.latitude,
        longitude: hookLocation.longitude,
        heading: 0,
        speed: 0,
        accuracy: 0,
      });
    }
  }, [hookLocation]);

  // Trip timer
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

  // Flush route points to Firestore every 30s
  useEffect(() => {
    if (!tripActive || !tripId) return;
    flushTimerRef.current = setInterval(async () => {
      const points = routePointsRef.current;
      if (points.length === 0) return;
      routePointsRef.current = [];
      try {
        await addRoutePoints(
          tripId,
          points.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            timestamp: p.timestamp,
            speed: p.speed,
          })),
        );
      } catch {
        routePointsRef.current = [...points, ...routePointsRef.current];
      }
    }, 30000);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [tripActive, tripId]);

  // Flush offline queue periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      await flushOfflineQueue(async (points) => {
        if (tripId) {
          await addRoutePoints(
            tripId,
            points.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
              timestamp: p.timestamp,
              speed: p.speed,
            })),
          );
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tripId]);

  const checkProximity = useCallback(
    (latitude: number, longitude: number) => {
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

          const distance = haversineDistance(
            { latitude, longitude },
            { latitude: stopLat, longitude: stopLng },
          );

          if (distance < 50) {
            updatedVisited.push(stopOrder);
            hasChanges = true;

            busStudentsRef.current.forEach((student) => {
              if (
                student.stopLocation &&
                (student.stopLocation.label === stop.name ||
                  haversineDistance(student.stopLocation, {
                    latitude: stopLat,
                    longitude: stopLng,
                  }) < 100)
              ) {
                addNotification({
                  userId: student.parentId,
                  type: 'info',
                  title: 'Bus Arrived',
                  message: `Bus has arrived at ${stop.name}`,
                  read: false,
                }).catch(() => {});
              }
            });

            Alert.alert('Stop Reached', `Arrived at ${stop.name}`);
          }
        });

        if (hasChanges) {
          updateBus(busId, { visitedStops: updatedVisited }).catch(() => {});
          visitedStopsRef.current = updatedVisited;

          if (updatedVisited.length === stopsRef.current.length) {
            updateBus(busId, { allStopsVisited: true }).catch(() => {});
          }

          return updatedVisited;
        }
        return currentVisited;
      });
    },
    [profile?.busId],
  );

  const startTrip = useCallback(async () => {
    try {
      if (!assignment) {
        Alert.alert('No Assignment', 'You have no scheduled assignment for today.');
        Animated.spring(thumbX, { toValue: 0, useNativeDriver: false }).start();
        return;
      }

      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Enable location access to start a trip.');
        Animated.spring(thumbX, { toValue: 0, useNativeDriver: false }).start();
        return;
      }

      const busId = profile?.busId;
      if (!busId) {
        Alert.alert('Error', 'No bus assigned. Contact your operator.');
        Animated.spring(thumbX, { toValue: 0, useNativeDriver: false }).start();
        return;
      }

      const route = routeData;
      if (!route) {
        Alert.alert('Error', 'Route not found. Contact your operator.');
        Animated.spring(thumbX, { toValue: 0, useNativeDriver: false }).start();
        return;
      }

      const stopsList = route.stops.map((s, i) => ({ ...s, order: i }));
      setStops(stopsList);
      stopsRef.current = stopsList;
      setVisitedStops([]);
      visitedStopsRef.current = [];
      routePointsRef.current = [];
      await clearOfflineQueue();

      const studentsList = await getStudentsByBus(busId);
      setBusStudents(studentsList);
      busStudentsRef.current = studentsList;

      const busData = await getBus(busId);
      const driverData = await getDriverById(user?.uid || '');
      const operatorData = await fetchOperator(profile?.operatorId || '');

      const tripIdResult = await createTripRecord({
        assignmentId: assignment.id,
        busId,
        driverId: user?.uid || '',
        operatorId: profile?.operatorId || '',
        routeId: route.id,
        routeSnapshot: {
          id: route.id,
          data: route as unknown as Record<string, unknown>,
        },
        driverSnapshot: {
          id: user?.uid || '',
          data: (driverData || {}) as Record<string, unknown>,
        },
        busSnapshot: {
          id: busId,
          data: (busData || {}) as Record<string, unknown>,
        },
        operatorSnapshot: {
          id: profile?.operatorId || '',
          data: (operatorData || {}) as Record<string, unknown>,
        },
      });

      setTripId(tripIdResult);

      // Shim: write legacy fields
      await updateBus(busId, {
        isActive: true,
        driverId: user?.uid || '',
        visitedStops: [],
        allStopsVisited: false,
      });

      const subscription = startGpsTracking(
        (point) => {
          setCurrentLocation({
            latitude: point.latitude,
            longitude: point.longitude,
            heading: point.heading,
            speed: point.speed,
            accuracy: point.accuracy,
          });

          // Shim: keep currentLocation on bus
          updateBus(busId, {
            currentLocation: { latitude: point.latitude, longitude: point.longitude },
            speed: point.speed,
          }).catch(() => {});

          checkProximity(point.latitude, point.longitude);

          // Add to route points and offline queue
          routePointsRef.current.push(point);
          addToOfflineQueue(point);
        },
        () => {},
      );
      setLocationSubscription(subscription);

      setTripActive(true);
      setTripStartTime(new Date());

      // Notify parents
      const parentIds = [...new Set(studentsList.map((s: any) => s.parentId))];
      for (const parentId of parentIds) {
        addNotification({
          userId: parentId,
          type: 'info',
          title: 'Trip Started',
          message: "Your child's bus has started",
          read: false,
        }).catch(() => {});
      }
    } catch (error: any) {
      console.error('startTrip error:', error);
      Alert.alert('Error', 'Failed to start trip: ' + (error?.message || 'Unknown'));
      Animated.spring(thumbX, { toValue: 0, useNativeDriver: false }).start();
    }
  }, [assignment, routeData, profile, user, checkProximity]);

  const endTrip = useCallback(async () => {
    const busId = profile?.busId || `bus-${user?.uid}`;

    try {
      if (locationSubscription) {
        await locationSubscription.remove();
        setLocationSubscription(null);
      }

      // Flush remaining route points
      const remainingPoints = routePointsRef.current;
      routePointsRef.current = [];

      if (tripId) {
        await completeTrip(
          tripId,
          remainingPoints.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            timestamp: p.timestamp,
            speed: p.speed,
          })),
        );
      }

      // Flush offline queue
      await flushOfflineQueue(async (points) => {
        if (tripId) {
          await addRoutePoints(
            tripId,
            points.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
              timestamp: p.timestamp,
              speed: p.speed,
            })),
          );
        }
      });

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

      // Shim: update bus
      await updateBus(busId, {
        isActive: false,
        visitedStops: [],
        allStopsVisited: false,
      });
    } catch (err) {
      console.error('[DriverHome] endTrip error:', err);
    }
  }, [tripId, locationSubscription, profile?.busId, user?.uid]);

  const handleSOS = useCallback(() => {
    Alert.alert('Send SOS Alert?', 'This will notify your operator immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          try {
            await createAlert({
              driverId: user?.uid,
              busId: profile?.busId || '',
              location: currentLocation
                ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
                : null,
              status: 'active',
            });
            Alert.alert('SOS Transmitted', 'Your operator has been notified.');
          } catch {
            Alert.alert('Error', 'Failed to send SOS.');
          }
        },
      },
    ]);
  }, [currentLocation, profile?.busId, user?.uid]);

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
            if (tripActive) {
              await endTrip();
            } else {
              await startTrip();
            }
          });
        } else {
          Animated.spring(thumbX, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    });
  }, [trackWidth, tripActive, startTrip, endTrip]);

  if (loadingAssignment || locationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>
          {locationLoading ? 'Getting your location...' : 'Loading schedule...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
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
                coordinate={{ latitude: stopLat, longitude: stopLng }}
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

      <View style={styles.headerPill}>
        <Text style={styles.headerPillText}>
          {profile?.name || 'Driver'} • {profile?.busNumber || 'Bus'}
        </Text>
      </View>

      {tripActive && (
        <View style={styles.timerPill}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{elapsedTime}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', onPress: () => signOut(auth) },
          ]);
        }}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* SOS Button */}
      <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
        <Text style={styles.sosButtonText}>SOS</Text>
      </TouchableOpacity>

      {/* Stop Count Pill */}
      {tripActive && stops.length > 0 && (
        <View style={styles.stopCountPill}>
          <Text style={styles.stopCountText}>
            {visitedStops.length}/{stops.length} stops
          </Text>
        </View>
      )}

      {/* Assignment warning */}
      {!tripActive && !assignment && (
        <View style={styles.noAssignmentBanner}>
          <Text style={styles.noAssignmentText}>
            No scheduled trip for today. Contact your operator.
          </Text>
        </View>
      )}

      {/* Bottom Slide-to-Start / End */}
      <View
        style={[styles.slideContainer, { bottom: bottomOffset }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.slideTrack}>
          <View style={styles.slideTrackInner}>
            <Text style={styles.slideTrackText}>
              {tripActive ? 'Slide to end trip' : 'Slide to start trip'}
            </Text>
          </View>
          <Animated.View
            style={[
              styles.slideThumb,
              { transform: [{ translateX: thumbX }] },
            ]}
            {...panResponder.panHandlers}
          >
            <Text style={styles.slideThumbText}>
              {tripActive ? '⏹' : '▶'}
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  stopMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopMarkerVisited: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  stopMarkerNext: {
    borderColor: '#FF9800',
    borderWidth: 4,
  },
  stopMarkerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#333',
  },
  headerPill: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  headerPillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  timerPill: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  logoutButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sosButton: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  stopCountPill: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  stopCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  noAssignmentBanner: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,152,0,0.9)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
  },
  noAssignmentText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  slideContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  slideTrack: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideTrackInner: {
    alignItems: 'center',
  },
  slideTrackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.6,
  },
  slideThumb: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  slideThumbText: {
    fontSize: 20,
    color: '#fff',
  },
});

export default DriverHome;
