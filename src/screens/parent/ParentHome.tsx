/**
 * ParentHome Screen — Phase 2
 *
 * Ola-style full-screen map with floating overlays.
 * Shows real-time bus tracking, ETA calculation, child selector,
 * bottom sheet with driver details, and paywall if fees are unpaid.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, type Student, type User } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useFeeStatus } from '../../hooks/useFeeStatus';
import { useBusLocation } from '../../hooks/useBusLocation';
import { useNotifications } from '../../hooks/useNotifications';
import Colors from '../../constants/colors';
import FeeStatusBanner from '../../components/FeeStatusBanner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ParentHomeProps {
  navigation: any;
}

export const ParentHome: React.FC<ParentHomeProps> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false);
  const sheetTranslateY = useRef(new Animated.Value(180)).current;

  const expandSheet = useCallback(() => {
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [sheetTranslateY]);

  const collapseSheet = useCallback(() => {
    isExpandedRef.current = false;
    setIsExpanded(false);
    Animated.spring(sheetTranslateY, {
      toValue: 180,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [sheetTranslateY]);

  const toggleSheet = useCallback(() => {
    if (isExpandedRef.current) {
      collapseSheet();
    } else {
      expandSheet();
    }
  }, [expandSheet, collapseSheet]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        let nextVal = (isExpandedRef.current ? 0 : 180) + gestureState.dy;
        nextVal = Math.max(0, Math.min(nextVal, 180));
        sheetTranslateY.setValue(nextVal);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isExpandedRef.current) {
          if (gestureState.dy > 50) {
            collapseSheet();
          } else {
            expandSheet();
          }
        } else {
          if (gestureState.dy < -50) {
            expandSheet();
          } else {
            collapseSheet();
          }
        }
      },
    })
  ).current;

  // Firestore students data state
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  // Driver details state
  const [driverInfo, setDriverInfo] = useState<User | null>(null);
  const [loadingDriver, setLoadingDriver] = useState(false);

  // Map initial region
  const [initialRegion, setInitialRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // ─── Step 1: Real-time listen to Parent's children from Firestore ────
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingStudents(true);
    const q = query(
      collection(db, 'students'),
      where('parentId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Student[];
        setStudents(list);
        setLoadingStudents(false);

        // Set initial region if child exists
        if (list.length > 0 && list[0].stopLocation) {
          setInitialRegion({
            latitude: list[0].stopLocation.latitude,
            longitude: list[0].stopLocation.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
      },
      (err) => {
        console.error('[ParentHome] Students listener error:', err);
        setLoadingStudents(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Active child and derived state
  const child = students[selectedChildIndex] || null;

  // Fee Status Hook
  const feeStatus = useFeeStatus(user?.uid || null, child?.id || null);
  const hasAccess = feeStatus.hasAccess;

  // Real-time Bus Location Hook (only fetch if has access and busId exists)
  const busLocation = useBusLocation(
    hasAccess ? (child?.busId || null) : null,
    child?.stopLocation || null
  );

  // Notifications Hook
  const { notifications, unreadCount } = useNotifications(user?.uid || null);

  // ─── Step 2: Fetch Driver Details for active child's bus ──────────
  useEffect(() => {
    if (!busLocation.bus?.driverId) {
      setDriverInfo(null);
      return;
    }

    setLoadingDriver(true);
    const driverDocRef = doc(db, 'users', busLocation.bus.driverId);
    getDoc(driverDocRef)
      .then((snap) => {
        if (snap.exists()) {
          setDriverInfo({ id: snap.id, ...snap.data() } as User);
        } else {
          setDriverInfo(null);
        }
      })
      .catch((err) => {
        console.error('[ParentHome] Fetch driver error:', err);
      })
      .finally(() => {
        setLoadingDriver(false);
      });
  }, [busLocation.bus?.driverId]);

  // ─── Step 3: Fit Map bounds to show both Bus and Stop ─────────────
  useEffect(() => {
    if (!child || !mapRef.current) return;

    if (busLocation.bus?.isActive && busLocation.bus.currentLocation) {
      mapRef.current.fitToCoordinates(
        [
          {
            latitude: busLocation.bus.currentLocation.latitude,
            longitude: busLocation.bus.currentLocation.longitude,
          },
          {
            latitude: child.stopLocation.latitude,
            longitude: child.stopLocation.longitude,
          },
        ],
        {
          edgePadding: {
            top: Platform.OS === 'ios' ? 180 : 150,
            right: 60,
            bottom: Platform.OS === 'ios' ? 320 : 280,
            left: 60,
          },
          animated: true,
        }
      );
    } else {
      // Just center on child's stop
      mapRef.current.animateToRegion(
        {
          latitude: child.stopLocation.latitude,
          longitude: child.stopLocation.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        1000
      );
    }
  }, [child?.id, busLocation.bus?.isActive, busLocation.bus?.currentLocation]);

  // Contact Driver Link
  const handleCallDriver = () => {
    if (!driverInfo?.phone) {
      Alert.alert('Contact Unavailable', 'Driver phone number is not available.');
      return;
    }
    Linking.openURL(`tel:${driverInfo.phone}`);
  };

  // Switch Child handler
  const handleSelectChild = (index: number) => {
    setSelectedChildIndex(index);
    // Reset bottom sheet to collapsed state
    collapseSheet();
  };

  if (loadingStudents || feeStatus.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Syncing tracker details...</Text>
      </View>
    );
  }

  // ─── Paywall (Locked Screen) ──────────────────────────────────────
  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Map View blurred/under overlay in background */}
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        />

        {/* Lock Overlay */}
        <View style={styles.lockOverlay}>
          <View style={styles.paywallCard}>
            <Text style={styles.paywallIcon}>🔒</Text>
            <Text style={styles.paywallTitle}>Tracking Terminated</Text>
            <Text style={styles.paywallSubtitle}>
              Your free trial has ended. Subscribe now to access real-time school bus tracking, notifications, and emergency driver updates.
            </Text>

            {/* Premium pricing badge */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Premium Subscription</Text>
              <Text style={styles.priceValue}>₹530 / month</Text>
            </View>

            <TouchableOpacity
              style={styles.payNowButton}
              onPress={() => navigation.navigate('Payment')}
              activeOpacity={0.85}
            >
              <Text style={styles.payNowButtonText}>Pay Now & Reactivate</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutButtonLink}
              onPress={() => navigation.navigate('Welcome')}
            >
              <Text style={styles.logoutButtonTextLink}>Go back to main</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Unlocked Live Tracking Screen ────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Full-Screen Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* Student Stop Marker */}
          {child?.stopLocation && (
            <Marker
              coordinate={{
                latitude: child.stopLocation.latitude,
                longitude: child.stopLocation.longitude,
              }}
              title={`${child.name}'s Stop`}
              description={child.stopLocation.label}
            >
              <View style={[styles.markerContainer, { borderColor: Colors.success }]}>
                <Text style={styles.markerEmoji}>
                  {child.gender === 'Male' ? '👦' : '👧'}
                </Text>
              </View>
            </Marker>
          )}

          {/* Real-time Bus Marker */}
          {busLocation.bus?.isActive && busLocation.bus.currentLocation && (
            <Marker
              coordinate={busLocation.coordinate}
              title={busLocation.bus.busNumber}
              description={`Speed: ${busLocation.bus.speed} km/h`}
            >
              <View style={[styles.markerContainer, { borderColor: Colors.primary }]}>
                <Text style={styles.markerEmoji}>🚌</Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* FLOATING FLOATER OVERLAYS */}
        
        {/* Floating Top Header */}
        <View style={styles.topContainer}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.welcomeText}>Parent Dashboard</Text>
              <Text style={styles.parentName}>{profile?.name || 'User Profile'}</Text>
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              style={styles.notificationBell}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.bellEmoji}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Child Selector Row (if multiple children) */}
          {students.length > 0 && (
            <View style={styles.childSelectorContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.childSelectorScroll}
              >
                {students.map((c, index) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.childChip,
                      selectedChildIndex === index && styles.childChipActive,
                    ]}
                    onPress={() => handleSelectChild(index)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.childChipEmoji}>
                      {c.gender === 'Male' ? '👦' : '👧'}
                    </Text>
                    <Text
                      style={[
                        styles.childChipText,
                        selectedChildIndex === index && styles.childChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {/* Add Child Link */}
                <TouchableOpacity
                  style={styles.addChildChip}
                  onPress={() => navigation.navigate('AddChild')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addChildChipText}>+ Add Child</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Floating ETA Pill */}
        {child && (
          <View style={styles.etaPillContainer}>
            <View style={[
              styles.etaPill,
              busLocation.bus?.isActive ? styles.etaActive : styles.etaInactive
            ]}>
              <View style={[
                styles.etaDot,
                { backgroundColor: busLocation.bus?.isActive ? Colors.success : Colors.textTertiary }
              ]} />
              <Text style={styles.etaText}>
                {busLocation.bus?.isActive
                  ? busLocation.eta !== null
                    ? `Bus arriving in ~${busLocation.eta} mins`
                    : 'Bus active • Calculating ETA...'
                  : 'Bus is currently offline'}
              </Text>
            </View>
          </View>
        )}

        {/* BOTTOM SHEET FOR CHILD AND TRACKING DETAILS */}
        {child && (
          <Animated.View
            style={[
              styles.customBottomSheet,
              { transform: [{ translateY: sheetTranslateY }] }
            ]}
          >
            {/* Drag Handle Area */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={toggleSheet}
              {...panResponder.panHandlers}
              style={styles.dragHandleArea}
            >
              <View style={styles.bottomSheetIndicator} />
            </TouchableOpacity>

            <View style={styles.bottomSheetContent}>
              {/* Collapsed top bar summary info */}
              <View style={styles.bottomSheetHeader}>
                <View>
                  <Text style={styles.sheetChildName}>{child.name}</Text>
                  <Text style={styles.sheetSubText}>
                    Grade {child.grade} • Bus {busLocation.bus?.busNumber || 'N/A'}
                  </Text>
                </View>

                {/* Trial Expiry Badge if on trial */}
                {feeStatus.status === 'TRIAL' && (
                  <View style={styles.trialBadge}>
                    <Text style={styles.trialBadgeText}>
                      Trial: {feeStatus.daysLeft}d left
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.sheetDivider} />

              {/* Extended Details */}
              <View style={styles.sheetBody}>
                {/* Stop Info Row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Text style={styles.infoRowEmoji}>📍</Text>
                  </View>
                  <View style={styles.infoTextWrapper}>
                    <Text style={styles.infoRowTitle}>Assigned Stop</Text>
                    <Text style={styles.infoRowVal} numberOfLines={1}>
                      {child.stopLocation.label}
                    </Text>
                  </View>
                </View>

                {/* Driver Info Row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Text style={styles.infoRowEmoji}>👤</Text>
                  </View>
                  <View style={styles.infoTextWrapper}>
                    <Text style={styles.infoRowTitle}>Driver</Text>
                    <Text style={styles.infoRowVal}>
                      {loadingDriver
                        ? 'Fetching details...'
                        : driverInfo
                          ? driverInfo.name
                          : 'Not assigned'}
                    </Text>
                  </View>
                </View>

                {/* Contact Button */}
                {driverInfo && (
                  <TouchableOpacity
                    style={styles.callDriverButton}
                    onPress={handleCallDriver}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.callDriverEmoji}>📞</Text>
                    <Text style={styles.callDriverButtonText}>Call Driver</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // Paywall lock screen styles
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  paywallCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  paywallIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  paywallTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 10,
    textAlign: 'center',
  },
  paywallSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  priceContainer: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  payNowButton: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.error,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  payNowButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButtonLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  logoutButtonTextLink: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Map Markers
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  markerEmoji: {
    fontSize: 20,
  },
  // Floating overlay containers
  topContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  parentName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    marginTop: 2,
  },
  notificationBell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellEmoji: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  // Child selector chips
  childSelectorContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  childSelectorScroll: {
    alignItems: 'center',
    gap: 8,
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  childChipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
  },
  childChipEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  childChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  childChipTextActive: {
    color: Colors.primary,
  },
  addChildChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addChildChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Floating ETA Pill
  etaPillContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 190 : 170,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  etaActive: {
    backgroundColor: Colors.dark,
  },
  etaInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  etaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  etaText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  // Bottom Sheet
  customBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 340,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    paddingBottom: 20,
  },
  dragHandleArea: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetIndicator: {
    backgroundColor: Colors.textTertiary,
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  sheetChildName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
  },
  sheetSubText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trialBadge: {
    backgroundColor: Colors.warningFaded,
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trialBadgeText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: 18,
  },
  sheetBody: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoRowEmoji: {
    fontSize: 18,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoRowTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRowVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    marginTop: 2,
  },
  callDriverButton: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  callDriverEmoji: {
    fontSize: 18,
  },
  callDriverButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ParentHome;
