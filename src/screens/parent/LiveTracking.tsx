/**
 * LiveTracking Screen
 *
 * Full-screen map with animated bus marker, ETA card, driver info.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Colors from '../../constants/colors';
import BusMarker from '../../components/BusMarker';
import { useBusLocation } from '../../hooks/useBusLocation';

const { width, height } = Dimensions.get('window');

interface LiveTrackingProps {
  navigation: any;
}

export const LiveTracking: React.FC<LiveTrackingProps> = ({ navigation }) => {
  const { location, speed, eta, startTracking, stopTracking, bus } = useBusLocation('bus-1');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    startTracking();
    return () => stopTracking();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {/* Simulated Map */}
      <View style={styles.mapContainer}>
        <View style={styles.mapBg}>
          {Array.from({ length: 15 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridH, { top: i * (height / 15) }]} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridV, { left: i * (width / 10) }]} />
          ))}
        </View>

        {/* Route */}
        <View style={styles.routePath} />

        {/* Parent's stop */}
        <View style={[styles.stopMarker, { top: height * 0.28, left: width * 0.6 }]}>
          <View style={styles.stopPin}>
            <Text style={styles.stopPinText}>🏠</Text>
          </View>
          <View style={styles.stopLabel}>
            <Text style={styles.stopLabelText}>Your Stop</Text>
          </View>
        </View>

        {/* Bus */}
        <Animated.View
          style={[
            styles.busOnMap,
            {
              top: height * 0.4,
              left: width * 0.35,
              opacity: fadeAnim,
            },
          ]}
        >
          <BusMarker
            busNumber={bus?.busNumber ?? 'Bus'}
            isActive={true}
            speed={speed}
            driverName="Rajesh Kumar"
            size="large"
          />
        </Animated.View>

        {/* School marker */}
        <View style={[styles.stopMarker, { top: height * 0.55, left: width * 0.2 }]}>
          <View style={[styles.stopPin, { backgroundColor: Colors.primary }]}>
            <Text style={styles.stopPinText}>🏫</Text>
          </View>
          <View style={styles.stopLabel}>
            <Text style={styles.stopLabelText}>School</Text>
          </View>
        </View>
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.topButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.topButton}>
          <Text style={styles.topButtonText}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom ETA Card */}
      <Animated.View style={[styles.etaCard, { opacity: fadeAnim }]}>
        <View style={styles.etaHandle} />

        {/* Driver Info */}
        <View style={styles.driverRow}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>RK</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>Rajesh Kumar</Text>
            <Text style={styles.driverBus}>{bus?.busNumber}</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Text style={styles.callButtonText}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ETA Section */}
        <View style={styles.etaSection}>
          <View style={styles.etaMain}>
            <Text style={styles.etaValue}>{eta ?? '--'}</Text>
            <Text style={styles.etaUnit}>min</Text>
          </View>
          <View style={styles.etaDetails}>
            <View style={styles.etaDetailRow}>
              <Text style={styles.etaDetailIcon}>🏎️</Text>
              <Text style={styles.etaDetailText}>{speed} km/h</Text>
            </View>
            <View style={styles.etaDetailRow}>
              <Text style={styles.etaDetailIcon}>📍</Text>
              <Text style={styles.etaDetailText}>
                {location
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'Locating...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusProgress}>
            <View style={[styles.statusFill, { width: '65%' }]} />
          </View>
          <Text style={styles.statusText}>On the way to your stop</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EFDB',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapBg: {
    ...StyleSheet.absoluteFillObject,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  routePath: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.15,
    width: width * 0.55,
    height: height * 0.35,
    borderWidth: 3,
    borderColor: Colors.primary,
    borderRadius: 20,
    borderStyle: 'dashed',
    opacity: 0.35,
    transform: [{ rotate: '15deg' }],
  },
  stopMarker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  stopPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    elevation: 4,
  },
  stopPinText: {
    fontSize: 18,
  },
  stopLabel: {
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    elevation: 2,
  },
  stopLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  busOnMap: {
    position: 'absolute',
    zIndex: 10,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topButtonText: {
    fontSize: 18,
  },
  topCenter: {
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 1,
  },
  etaCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    elevation: 12,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  etaHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  driverAvatarText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  driverBus: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.successFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  etaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  etaMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 24,
  },
  etaValue: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.primary,
  },
  etaUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  etaDetails: {
    flex: 1,
    gap: 6,
  },
  etaDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaDetailIcon: {
    fontSize: 14,
  },
  etaDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusBar: {
    gap: 8,
  },
  statusProgress: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LiveTracking;
