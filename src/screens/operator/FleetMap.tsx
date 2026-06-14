/**
 * FleetMap Screen — All buses on one map
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Animated } from 'react-native';
import Colors from '../../constants/colors';
import BusMarker from '../../components/BusMarker';
import { mockBuses } from '../../services/firebase';

const { width, height } = Dimensions.get('window');

interface FleetMapProps { navigation: any }

export const FleetMap: React.FC<FleetMapProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const buses = mockBuses.filter((b) => b.operatorId === 'op-1');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {/* Map BG */}
      <View style={styles.mapBg}>
        {Array.from({ length: 15 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridH, { top: i * (height / 15) }]} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridV, { left: i * (width / 10) }]} />
        ))}

        {buses.map((bus, idx) => (
          <View
            key={bus.id}
            style={[styles.busOnMap, { top: height * (0.2 + idx * 0.17), left: width * (0.15 + idx * 0.2) }]}
          >
            <BusMarker busNumber={bus.busNumber} isActive={bus.isActive} speed={bus.speed} size="medium" />
          </View>
        ))}
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.topBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Fleet Map</Text>
        <TouchableOpacity style={styles.topBtn}><Text style={styles.topBtnText}>⚙️</Text></TouchableOpacity>
      </View>

      {/* Bottom Legend */}
      <Animated.View style={[styles.bottomCard, { opacity: fadeAnim }]}>
        <View style={styles.bottomHandle} />
        <Text style={styles.bottomTitle}>Fleet Overview</Text>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Active ({buses.filter((b) => b.isActive).length})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.textTertiary }]} />
            <Text style={styles.legendText}>Inactive ({buses.filter((b) => !b.isActive).length})</Text>
          </View>
        </View>

        {buses.map((bus) => (
          <View key={bus.id} style={styles.busItem}>
            <Text style={styles.busItemEmoji}>🚌</Text>
            <View style={styles.busItemContent}>
              <Text style={styles.busItemNumber}>{bus.busNumber}</Text>
              <Text style={styles.busItemSpeed}>
                {bus.isActive ? `${bus.speed} km/h` : 'Offline'}
              </Text>
            </View>
            <View style={[styles.busItemStatus, { backgroundColor: bus.isActive ? Colors.successFaded : Colors.background }]}>
              <Text style={[styles.busItemStatusText, { color: bus.isActive ? Colors.success : Colors.textTertiary }]}>
                {bus.isActive ? '● Live' : '○ Off'}
              </Text>
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EFDB' },
  mapBg: { flex: 1, position: 'relative' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.04)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.04)' },
  busOnMap: { position: 'absolute', zIndex: 5 },
  topBar: {
    position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  topBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  topBtnText: { fontSize: 18 },
  topTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.dark, backgroundColor: Colors.white,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, elevation: 4, overflow: 'hidden',
  },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24,
    paddingTop: 12, paddingBottom: 36, elevation: 12,
  },
  bottomHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 },
  bottomTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark, marginBottom: 14 },
  legendRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  busItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  busItemEmoji: { fontSize: 20, marginRight: 12 },
  busItemContent: { flex: 1 },
  busItemNumber: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  busItemSpeed: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  busItemStatus: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  busItemStatusText: { fontSize: 11, fontWeight: '700' },
});

export default FleetMap;
