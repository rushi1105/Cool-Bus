/**
 * ParentHome Screen
 *
 * Ola/Uber inspired real-time tracking map with 5 layers.
 * Center on child stop, animated bus marker, ETA pill calculation,
 * bottom card with driver call button, next stop display, and paywall if fees unpaid.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import MapView, { Marker, AnimatedRegion, PROVIDER_GOOGLE } from 'react-native-maps';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { onStudentsSnapshot } from '../../repositories/studentRepository';
import { getRoute } from '../../repositories/routeRepository';
import { onParentFeesSnapshot } from '../../repositories/feeRepository';
import { onAssignmentsSnapshot } from '../../repositories/assignmentRepository';
import { getUserByUid, getUserProfile } from '../../repositories/authRepository';
import { onBusSnapshot, fetchBusesByRoute } from '../../repositories/fleetRepository';
import { onActiveTripByAssignmentSnapshot } from '../../repositories/tripRepository';
import { useAuth } from '../../hooks/useAuth';
import { calculateETA, getDistance } from '../../services/location';
import Colors from '../../constants/colors';

interface ParentHomeProps {
  navigation: any;
}

export const ParentHome: React.FC<ParentHomeProps> = ({ navigation }) => {
  const { user } = useAuth();

  // States
  const [student, setStudent] = useState<any>(null);
  const [feeStatus, setFeeStatus] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [busLocation, setBusLocation] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  const mapRef = useRef<MapView>(null);

  // AnimatedRegion for smooth bus coordinate changes
  const markerCoord = useRef(
    new AnimatedRegion({
      latitude: 19.1873,
      longitude: 73.1927,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

  // On mount: Fetch student, fee status, and set initial coordinates
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);

    const timerFinishedRef = { current: false };
    const studentFoundRef = { current: false };

    // Start 3-second timer on mount
    const timerId = setTimeout(() => {
      timerFinishedRef.current = true;
      if (!studentFoundRef.current) {
        setIsLoading(false);
      }
    }, 3000);

    // 1. Listen to /students in real time
    let unsubscribeFees: (() => void) | null = null;

    const unsubscribeStudents = onStudentsSnapshot(user.uid, (students) => {
      if (students.length === 0) {
        studentFoundRef.current = false;
        setStudent(null);
        setFeeStatus(null);
        if (timerFinishedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      studentFoundRef.current = true;
      const studentDoc = students[0];
      const studentData = studentDoc as any;
      setStudent(studentData);

      // Fetch static route info
      if (studentData.routeId) {
        getRoute(studentData.routeId).then(route => {
          if (route) {
            const rData = route as any;
            setRouteInfo(rData);

            // Find the student's stop
            const stop = rData.stops?.find((s: any) => s.id === studentData.stopId);
            if (stop) {
              const stopLat = stop.latitude ?? stop.lat;
              const stopLng = stop.longitude ?? stop.lng;
              if (stopLat && stopLng) {
                studentData.stopLocation = { latitude: stopLat, longitude: stopLng, label: stop.name };
                
                markerCoord.setValue({
                  latitude: stopLat,
                  longitude: stopLng,
                  latitudeDelta: 0,
                  longitudeDelta: 0,
                });
                setInitialRegion({
                  latitude: stopLat,
                  longitude: stopLng,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                });
              }
            } else {
               // Fallback
               setInitialRegion({
                latitude: 19.1873,
                longitude: 73.1927,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              });
            }
          }
        }).catch((err) => console.error('[ParentHome] getRoute error:', err));
      } else {
        // Fallback
        setInitialRegion({
          latitude: 19.1873,
          longitude: 73.1927,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }

      // 2. Query /fees where parentId == uid and studentId == student.id limit 1 in real time
      if (unsubscribeFees) unsubscribeFees();

      unsubscribeFees = onParentFeesSnapshot(user.uid, (fees) => {
        const fee = fees.find(f => f.studentId === studentDoc.id);
        const fStatus = fee?.status || 'TRIAL';
        setFeeStatus(fStatus);
        setIsLoading(false);
      }, (err) => {
        console.error('[ParentHome] Fee stream error:', err);
        setIsLoading(false);
      });

    }, (err) => {
      console.error('[ParentHome] Student stream error:', err);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(timerId);
      unsubscribeStudents();
      if (unsubscribeFees) {
        unsubscribeFees();
      }
    };
  }, [user?.uid]);

  // Subscribe to assignment, then bus location
  useEffect(() => {
    if (!student?.routeId || feeStatus === 'UNPAID') return;

    const today = new Date().toISOString().split('T')[0];
    let assignmentBusId: string | null = null;
    let assignmentDriverId: string | null = null;
    let assignmentId: string | null = null;

    const unsubscribeAssignment = onAssignmentsSnapshot(student.routeId, today, (assignments) => {
      if (assignments.length > 0) {
        const asgn = assignments[0] as any;
        assignmentId = asgn.id || null;
        assignmentBusId = asgn.busId || null;
        assignmentDriverId = asgn.driverId || null;

        // Resolve driver from assignment
        if (assignmentDriverId) {
          getUserProfile(assignmentDriverId).then((userData) => {
            setDriver(userData);
          }).catch(err => {
            console.error('[ParentHome] Fetch driver error:', err);
          });
        } else {
          setDriver(null);
        }

        // Subscribe to active trip for this assignment
        if (unsubscribeTrip) unsubscribeTrip();
        if (assignmentId) {
          unsubscribeTrip = onActiveTripByAssignmentSnapshot(assignmentId, (trip) => {
            if (trip) {
              setBusLocation((prev: any) => ({
                ...prev,
                tripRoutePoints: trip.routePoints,
                tripStatus: trip.status,
              }));
            }
          }, (err) => {
            console.error('[ParentHome] Trip stream error:', err);
          });
        }
      } else {
        // Fallback: use bus with matching defaultRouteId
        fetchBusesByRoute(student.routeId).then(buses => {
          if (buses.length > 0) {
            const busData = buses[0] as any;
            assignmentBusId = busData.id;
            // Resolve driver from bus.driverId as fallback
            if (busData.driverId) {
              getUserByUid(busData.driverId).then((dSnap) => {
                setDriver(dSnap ?? null);
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    }, (err) => {
      console.error('[ParentHome] Assignment stream error:', err);
      // Fallback to bus query
      fetchBusesByRoute(student.routeId).then(buses => {
        if (buses.length > 0) {
          const busData = buses[0] as any;
          assignmentBusId = busData.id;
        }
      }).catch(() => {});
    });

    // Subscribe to bus location once we have the busId
    let unsubscribeBus: (() => void) | null = null;
    let unsubscribeTrip: (() => void) | null = null;

    const waitForBusId = setInterval(() => {
      if (assignmentBusId) {
        clearInterval(waitForBusId);

        unsubscribeBus = onBusSnapshot(assignmentBusId, (bus) => {
          if (!bus) {
            setBusLocation(null);
            setIsActive(false);
            setEtaMinutes(null);
            return;
          }

          const busData = bus as any;
          const lat = busData.currentLocation?.latitude;
          const lng = busData.currentLocation?.longitude;

          if (!lat || !lng) return;

          setBusLocation({
            ...busData,
            currentLocation: { latitude: lat, longitude: lng },
          });

          setIsActive(busData.isActive === true);

          if (busData.isActive && student?.stopLocation) {
            const eta = calculateETA(
              lat,
              lng,
              student.stopLocation.latitude,
              student.stopLocation.longitude
            );
            setEtaMinutes(eta);
          }

          if (busData.isActive) {
            markerCoord.timing({
              latitude: lat,
              longitude: lng,
              duration: 1000,
              useNativeDriver: false,
            } as any).start();
          }
        }, (err) => {
          console.error('[ParentHome] Bus stream error:', err);
        });
      }
    }, 500);

    return () => {
      unsubscribeAssignment();
      if (unsubscribeBus) unsubscribeBus();
      if (unsubscribeTrip) unsubscribeTrip();
      clearInterval(waitForBusId);
    };
  }, [student?.routeId, feeStatus, student?.stopLocation]);

  const fitMapToRoute = () => {
    if (!mapRef.current || !student?.stopLocation) return;
    const coords: any[] = [];
    
    // Add student stop location
    coords.push({
      latitude: student.stopLocation.latitude,
      longitude: student.stopLocation.longitude,
    });

    // Add current bus location if active and available
    if (isActive && busLocation?.currentLocation) {
      coords.push({
        latitude: busLocation.currentLocation.latitude,
        longitude: busLocation.currentLocation.longitude,
      });
    }

    // Add route stops from routeInfo
    if (routeInfo?.stops && routeInfo.stops.length > 0) {
      routeInfo.stops.forEach((s: any) => {
        const sLat = s.latitude ?? s.lat;
        const sLng = s.longitude ?? s.lng;
        if (sLat && sLng) {
          coords.push({ latitude: sLat, longitude: sLng });
        }
      });
    }

    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 120, right: 60, bottom: 260, left: 60 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (busLocation && mapRef.current) {
      const timer = setTimeout(() => {
        fitMapToRoute();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    busLocation?.currentLocation?.latitude,
    busLocation?.currentLocation?.longitude,
    isActive,
    routeInfo?.stops?.length,
  ]);

  if (isLoading || (student && feeStatus === null)) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Syncing tracking details...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        
        {/* Floating Logout button inside empty state screen */}
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

        <Text style={styles.noStudentText}>No child registered yet</Text>
        <TouchableOpacity
          style={styles.addChildButton}
          onPress={() => navigation.navigate('AddChild')}
          activeOpacity={0.85}
        >
          <Text style={styles.addChildButtonText}>Add Child</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!student.routeId || !student.stopId) {
    return (
      <View style={[styles.container, styles.center, { paddingHorizontal: 24 }]}>
        <StatusBar barStyle="dark-content" />
        
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

        <View style={styles.warningIconContainer}>
          <Text style={styles.warningEmoji}>🚌</Text>
        </View>
        <Text style={styles.unlinkedTitle}>Child Not Linked to a Route</Text>
        <Text style={styles.unlinkedSubtitle}>Your child is not linked to a route yet. Please contact your operator to assign a route and stop.</Text>
        <TouchableOpacity
          style={styles.addChildButton}
          onPress={() => {}} // User suggested opening dialer, but operator number is dynamic. No-op for now.
          activeOpacity={0.85}
        >
          <Text style={styles.addChildButtonText}>Contact Operator</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Floating Logout button */}
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

      {/* LAYER 1 — MapView base (fills screen, centers on stop) */}
      {initialRegion && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          zoomControlEnabled={false}
          onMapReady={fitMapToRoute}
        >
        {/* LAYER 2 — Bus marker (only visible if active) */}
        {isActive && busLocation?.currentLocation && (
          <Marker.Animated
            coordinate={markerCoord as any}
            title={busLocation.busNumber}
            description={`Speed: ${busLocation.speed || 0} km/h`}
          >
            <View style={styles.busMarker}>
              <Text style={styles.busMarkerText}>🚌</Text>
            </View>
          </Marker.Animated>
        )}

        {/* Route stop markers from routeInfo */}
        {routeInfo?.stops &&
          routeInfo.stops.map((stop: any, index: number) => {
            const stopId = stop.id || stop.name || index.toString();
            // In absence of assignment, we don't have visited state
            const visitedList = busLocation?.visitedStops || [];
            const isVisited = isActive && visitedList.includes(stop.order);
            const isNext = isActive && routeInfo.stops.find((s: any) => !visitedList.includes(s.order))?.name === stop.name;
            const stopLat = stop.latitude ?? stop.lat;
            const stopLng = stop.longitude ?? stop.lng;

            if (!stopLat || !stopLng) return null;

            const isStudentStop = stop.id === student.stopId || (student.stopLocation && (
              student.stopLocation.label === stop.name ||
              getDistance(student.stopLocation, { latitude: stopLat, longitude: stopLng }) < 100
            ));

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
                    isStudentStop && styles.stopMarkerStudent,
                  ]}
                >
                  <Text style={styles.stopMarkerText}>
                    {isVisited ? '✓' : isNext ? '●' : '○'}
                  </Text>
                </View>
              </Marker>
            );
          })}

        {/* Student Stop fallback marker (renders only if the student stop is not in the route stops) */}
        {student.stopLocation && (() => {
          const stopsList = routeInfo?.stops || [];
          const isStopInList = stopsList.some((stop: any) => {
            const stopLat = stop.latitude ?? stop.lat;
            const stopLng = stop.longitude ?? stop.lng;
            return stopLat && stopLng && (
              student.stopLocation.label === stop.name ||
              getDistance(student.stopLocation, { latitude: stopLat, longitude: stopLng }) < 100
            );
          });

          if (isStopInList) return null;

          return (
            <Marker
              coordinate={{
                latitude: student.stopLocation.latitude,
                longitude: student.stopLocation.longitude,
              }}
              title={student.stopLocation.label || `${student.name}'s Stop`}
            >
              <View style={[styles.stopMarker, styles.stopMarkerStudent]}>
                <Text style={styles.stopMarkerText}>○</Text>
              </View>
            </Marker>
          );
        })()}
      </MapView>
      )}

      {/* LAYER 4 — ETA pill (floating top-center) */}
      {feeStatus !== 'UNPAID' && (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>
            {isActive && etaMinutes !== null
              ? `Bus arriving in ${etaMinutes} mins`
              : "Bus hasn't started yet"}
          </Text>
        </View>
      )}

      {/* LAYER 5 — Child info card (floating bottom) */}
      {feeStatus !== 'UNPAID' && (
        <View style={styles.childInfoCard}>
          <Text style={styles.childName}>{student.name}</Text>
          <Text style={styles.childGrade}>Grade {student.grade}</Text>

          <View style={styles.divider} />

          <Text style={styles.driverLabel}>Driver</Text>
          <Text style={styles.driverName}>{driver?.name || 'Not Assigned'}</Text>

          {driver?.phone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL('tel:' + driver.phone)}
              activeOpacity={0.85}
            >
              <Text style={styles.callButtonText}>📞 Call Driver</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.requestStopButton}
            onPress={() => navigation.navigate('RequestStopChange')}
            activeOpacity={0.85}
          >
            <Text style={styles.requestStopButtonText}>Request Stop Change</Text>
          </TouchableOpacity>

          {/* Next stop name from route stops array */}
          {routeInfo?.stops && isActive && (
            <View style={styles.nextStopContainer}>
              <Text style={styles.nextStopLabel}>Next Stop:</Text>
              <Text style={styles.nextStopName}>
                {(() => {
                  const nextUnvisitedStop = routeInfo.stops.find((s: any) => {
                    const stopId = s.id || s.name || '';
                    return !busLocation?.visitedStops?.includes(stopId);
                  });
                  return nextUnvisitedStop?.name || 'No more stops';
                })()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* PAYWALL Overlay (locked above map if unpaid status) */}
      {feeStatus === 'UNPAID' && (
        <View style={styles.paywallOverlay}>
          <View style={styles.paywallCard}>
            <Text style={styles.paywallTitle}>Renew to track</Text>
            <Text style={styles.paywallBody}>Your free trial has ended</Text>
            <Text style={styles.paywallAmount}>₹530 / month</Text>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => navigation.navigate('Payment')}
              activeOpacity={0.85}
            >
              <Text style={styles.payButtonText}>Pay Now</Text>
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
    fontWeight: '600',
  },
  noStudentText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  busMarkerText: {
    fontSize: 20,
    color: '#ffffff',
  },
  etaPill: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  etaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  childInfoCard: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 10,
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  childGrade: {
    fontSize: 14,
    color: '#888888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#eeeeee',
    marginVertical: 12,
  },
  driverLabel: {
    fontSize: 12,
    color: '#888888',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#000000',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  nextStopContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextStopLabel: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '600',
  },
  nextStopName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  paywallOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 20,
  },
  paywallCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  paywallBody: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  paywallAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  addChildButton: {
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  addChildButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff3cd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  warningEmoji: {
    fontSize: 40,
  },
  unlinkedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  unlinkedSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
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
  stopMarkerStudent: {
    backgroundColor: Colors.success,
  },
  stopMarkerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  requestStopButton: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  requestStopButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ParentHome;
