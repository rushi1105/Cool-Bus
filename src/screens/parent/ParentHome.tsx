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
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { calculateETA } from '../../services/location';
import Colors from '../../constants/colors';

interface ParentHomeProps {
  navigation: any;
}

export const ParentHome: React.FC<ParentHomeProps> = ({ navigation }) => {
  const { user } = useAuth();

  // States
  const [student, setStudent] = useState<any>(null);
  const [feeStatus, setFeeStatus] = useState<string | null>(null);
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

    // 1. Query /students where parentId == uid (limit 1 for first child)
    const studentQ = query(
      collection(db, 'students'),
      where('parentId', '==', user.uid)
    );

    getDocs(studentQ).then(async (studentSnap) => {
      if (studentSnap.empty) {
        setStudent(null);
        setIsLoading(false);
        return;
      }

      const studentDoc = studentSnap.docs[0];
      const studentData = { id: studentDoc.id, ...studentDoc.data() } as any;
      setStudent(studentData);

      // Set initial marker coordinate to stop location
      if (studentData.stopLocation) {
        markerCoord.setValue({
          latitude: studentData.stopLocation.latitude,
          longitude: studentData.stopLocation.longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
        });
        setInitialRegion({
          latitude: studentData.stopLocation.latitude,
          longitude: studentData.stopLocation.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      } else {
        // Fallback
        setInitialRegion({
          latitude: 19.1873,
          longitude: 73.1927,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }

      // 2. Query /fees where parentId == uid and studentId == student.id limit 1
      const feeQ = query(
        collection(db, 'fees'),
        where('parentId', '==', user.uid),
        where('studentId', '==', studentDoc.id)
      );
      const feeSnap = await getDocs(feeQ);
      let fStatus = 'TRIAL';
      if (!feeSnap.empty) {
        fStatus = feeSnap.docs[0].data().status || 'UNPAID';
      }
      setFeeStatus(fStatus);

      setIsLoading(false);
    }).catch((err) => {
      console.error('[ParentHome] Load initial data error:', err);
      setIsLoading(false);
    });
  }, [user?.uid]);

  // Subscribe to /buses/{busId} only if fee status is NOT unpaid
  useEffect(() => {
    if (!student?.busId || feeStatus === 'UNPAID') return;

    const unsubscribe = onSnapshot(doc(db, 'buses', student.busId), (snap) => {
      if (snap.exists()) {
        const busData = snap.data() as any;
        if (!busData) return;

        const lat =
          busData.currentLocation?.latitude ??
          busData.currentLocation?.lat;

        const lng =
          busData.currentLocation?.longitude ??
          busData.currentLocation?.lng;

        if (!lat || !lng) return;

        setBusLocation({
          ...busData,
          currentLocation: {
            latitude: lat,
            longitude: lng,
          },
        });

        setIsActive(busData.isActive === true);

        if (
          busData.isActive &&
          student?.stopLocation
        ) {
          const eta = calculateETA(
            lat,
            lng,
            student.stopLocation.latitude,
            student.stopLocation.longitude
          );
          setEtaMinutes(eta);
        }

        // Smoothly animate bus coordinate updates
        if (busData.isActive) {
          markerCoord.timing({
            latitude: lat,
            longitude: lng,
            duration: 1000,
            useNativeDriver: false,
          } as any).start();
        }
      } else {
        setBusLocation(null);
        setIsActive(false);
        setEtaMinutes(null);
      }
    }, (err) => {
      console.error('[ParentHome] Bus stream error:', err);
    });

    return () => unsubscribe();
  }, [student?.busId, feeStatus, student?.stopLocation]);

  // Fetch driver profile information on change
  useEffect(() => {
    if (!busLocation?.driverId) {
      setDriver(null);
      return;
    }

    getDoc(doc(db, 'users', busLocation.driverId)).then((snap) => {
      if (snap.exists()) {
        setDriver(snap.data());
      } else {
        setDriver(null);
      }
    }).catch(err => {
      console.error('[ParentHome] Fetch driver error:', err);
    });
  }, [busLocation?.driverId]);

  if (isLoading) {
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

  if (!student.busId || !student.stopLocation) {
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
        <Text style={styles.unlinkedTitle}>Child Not Linked to a Bus</Text>
        <Text style={styles.unlinkedSubtitle}>Your child is not linked to a bus yet. Please contact your operator to assign a bus and stop.</Text>
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

        {/* LAYER 3 — Stop marker (red pin) */}
        {student.stopLocation && (
          <Marker
            coordinate={{
              latitude: student.stopLocation.latitude,
              longitude: student.stopLocation.longitude,
            }}
            pinColor="red"
            title={student.stopLocation.label || `${student.name}'s Stop`}
          />
        )}
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

          {/* Next stop name from bus stops array */}
          {busLocation?.stops && (
            <View style={styles.nextStopContainer}>
              <Text style={styles.nextStopLabel}>Next Stop:</Text>
              <Text style={styles.nextStopName}>
                {(() => {
                  const nextUnvisitedStop = busLocation.stops.find((s: any) => {
                    const stopId = s.id || s.name || '';
                    return !busLocation.visitedStops?.includes(stopId);
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
});

export default ParentHome;
