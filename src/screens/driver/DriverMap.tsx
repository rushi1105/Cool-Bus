/**
 * DriverMap Screen
 *
 * Full-screen map view with route, stops, and current location.
 * Uses a simulated map view since react-native-maps needs native setup.
 */

import React, { useState, useEffect, useRef } from 'react';
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
import StopMarker from '../../components/StopMarker';
import { useBusLocation } from '../../hooks/useBusLocation';
import { mockStudents } from '../../services/firebase';

const { width, height } = Dimensions.get('window');

interface DriverMapProps {
  navigation: any;
}

const stops = [
  { id: 1, label: 'Koramangala Stop', lat: 12.975, lng: 77.598, students: ['Arjun S.', 'Priya P.'] },
  { id: 2, label: 'Indiranagar Stop', lat: 12.982, lng: 77.587, students: ['Rohan G.'] },
  { id: 3, label: 'HSR Layout Stop', lat: 12.912, lng: 77.638, students: ['Meera K.'] },
  { id: 4, label: 'Whitefield Stop', lat: 12.986, lng: 77.590, students: ['Ananya R.'] },
];

export const DriverMap: React.FC<DriverMapProps> = ({ navigation }) => {
  const { location, speed, isTracking, startTracking, stopTracking } = useBusLocation();
  const [nextStopIndex, setNextStopIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    startTracking();
    return () => stopTracking();
  }, []);

  const nextStop = stops[nextStopIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {/* Simulated Map Background */}
      <View style={styles.mapContainer}>
        <View style={styles.mapGrid}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: i * (height / 20) }]} />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: i * (width / 12) }]} />
          ))}
        </View>

        {/* Route Line */}
        <View style={styles.routeLine}>
          <View style={styles.routeLineDash} />
        </View>

        {/* Bus Position */}
        <View style={[styles.busPosition, { top: height * 0.35, left: width * 0.4 }]}>
          <BusMarker
            busNumber="KA-01-AB-1234"
            isActive={true}
            speed={speed}
            driverName="You"
            size="large"
          />
        </View>

        {/* Stop Markers */}
        {stops.map((stop, index) => (
          <View
            key={stop.id}
            style={[
              styles.stopPosition,
              {
                top: height * (0.2 + index * 0.15),
                left: width * (0.15 + index * 0.18),
              },
            ]}
          >
            <StopMarker
              label={stop.label}
              studentNames={stop.students}
              isNext={index === nextStopIndex}
              stopNumber={index + 1}
            />
          </View>
        ))}

        {/* Map Label */}
        <View style={styles.mapLabel}>
          <Text style={styles.mapLabelText}>📍 Bangalore, Karnataka</Text>
        </View>
      </View>

      {/* Top Bar */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.topBarButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.topBarButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Route Map</Text>
        <TouchableOpacity style={styles.topBarButton}>
          <Text style={styles.topBarButtonText}>⚙️</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Card */}
      <Animated.View style={[styles.bottomCard, { opacity: fadeAnim }]}>
        <View style={styles.bottomCardHandle} />

        {/* Next Stop Info */}
        <View style={styles.nextStopSection}>
          <View style={styles.nextStopHeader}>
            <Text style={styles.nextStopLabel}>NEXT STOP</Text>
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>~5 min</Text>
            </View>
          </View>
          <Text style={styles.nextStopName}>{nextStop.label}</Text>
          <Text style={styles.nextStopStudents}>
            👤 {nextStop.students.join(', ')}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.bottomStat}>
            <Text style={styles.bottomStatValue}>{speed}</Text>
            <Text style={styles.bottomStatUnit}>km/h</Text>
          </View>
          <View style={styles.bottomStatDivider} />
          <View style={styles.bottomStat}>
            <Text style={styles.bottomStatValue}>{nextStopIndex + 1}/{stops.length}</Text>
            <Text style={styles.bottomStatUnit}>stops</Text>
          </View>
          <View style={styles.bottomStatDivider} />
          <View style={styles.bottomStat}>
            <Text style={styles.bottomStatValue}>
              {location ? location.latitude.toFixed(4) : '--'}
            </Text>
            <Text style={styles.bottomStatUnit}>lat</Text>
          </View>
        </View>

        {/* Stop Progress */}
        <View style={styles.stopProgress}>
          {stops.map((_, index) => (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.progressDot,
                  index < nextStopIndex && styles.progressDotDone,
                  index === nextStopIndex && styles.progressDotCurrent,
                ]}
              />
              {index < stops.length - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    index < nextStopIndex && styles.progressLineDone,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Navigate Button */}
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => {
            if (nextStopIndex < stops.length - 1) {
              setNextStopIndex((i) => i + 1);
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.navigateButtonText}>
            {nextStopIndex < stops.length - 1 ? 'Mark Stop Done →' : '✓ Route Complete'}
          </Text>
        </TouchableOpacity>
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
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  routeLine: {
    position: 'absolute',
    top: height * 0.15,
    left: width * 0.1,
    width: width * 0.8,
    height: height * 0.6,
    borderWidth: 3,
    borderColor: Colors.primary,
    borderRadius: 30,
    borderStyle: 'dashed',
    opacity: 0.4,
  },
  routeLineDash: {},
  busPosition: {
    position: 'absolute',
    zIndex: 10,
  },
  stopPosition: {
    position: 'absolute',
    zIndex: 5,
  },
  mapLabel: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapLabelText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
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
  topBarButton: {
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
  topBarButtonText: {
    fontSize: 18,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    elevation: 4,
    overflow: 'hidden',
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomCard: {
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
  bottomCardHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  nextStopSection: {
    marginBottom: 16,
  },
  nextStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nextStopLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.error,
    letterSpacing: 1,
  },
  etaBadge: {
    backgroundColor: Colors.primaryFaded,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  nextStopName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  nextStopStudents: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bottomStat: {
    flex: 1,
    alignItems: 'center',
  },
  bottomStatValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.dark,
  },
  bottomStatUnit: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  stopProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  progressDotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  progressDotCurrent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  progressLineDone: {
    backgroundColor: Colors.success,
  },
  navigateButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  navigateButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DriverMap;
