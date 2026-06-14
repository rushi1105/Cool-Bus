/**
 * DriverAttendance Screen
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import Colors from '../../constants/colors';

interface DriverAttendanceProps { navigation: any }

const drivers = [
  { id: 'drv-1', name: 'Rajesh Kumar', bus: 'KA-01-AB-1234', status: 'active', trips: 2 },
  { id: 'drv-2', name: 'Suresh Babu', bus: 'KA-01-CD-5678', status: 'active', trips: 1 },
  { id: 'drv-3', name: 'Manoj Patil', bus: 'KA-01-EF-9012', status: 'absent', trips: 0 },
];

export const DriverAttendance: React.FC<DriverAttendanceProps> = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Driver Attendance</Text>
        <Text style={styles.subtitle}>Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: Colors.successFaded }]}>
            <Text style={styles.summaryValue}>{drivers.filter((d) => d.status === 'active').length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: Colors.errorFaded }]}>
            <Text style={styles.summaryValue}>{drivers.filter((d) => d.status === 'absent').length}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: Colors.primaryFaded }]}>
            <Text style={styles.summaryValue}>{drivers.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {/* Driver List */}
        {drivers.map((d) => (
          <View key={d.id} style={styles.driverCard}>
            <View style={[styles.driverAvatar, { backgroundColor: d.status === 'active' ? Colors.primary : Colors.textTertiary }]}>
              <Text style={styles.driverAvatarText}>{d.name.split(' ').map((n) => n[0]).join('')}</Text>
            </View>
            <View style={styles.driverContent}>
              <Text style={styles.driverName}>{d.name}</Text>
              <Text style={styles.driverBus}>{d.bus}</Text>
            </View>
            <View style={styles.driverRight}>
              <View style={[styles.statusBadge, {
                backgroundColor: d.status === 'active' ? Colors.successFaded : Colors.errorFaded,
              }]}>
                <Text style={[styles.statusText, {
                  color: d.status === 'active' ? Colors.success : Colors.error,
                }]}>
                  {d.status === 'active' ? '✓ Active' : '✗ Absent'}
                </Text>
              </View>
              <Text style={styles.driverTrips}>{d.trips} trips</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryBox: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800', color: Colors.dark },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', marginTop: 4 },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16,
    padding: 16, marginBottom: 10, elevation: 2,
  },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  driverAvatarText: { fontSize: 16, fontWeight: '800', color: Colors.white },
  driverContent: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  driverBus: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  driverRight: { alignItems: 'flex-end' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  driverTrips: { fontSize: 11, color: Colors.textTertiary, marginTop: 4, fontWeight: '500' },
});

export default DriverAttendance;
