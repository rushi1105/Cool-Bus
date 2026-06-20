import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useDrivers } from '../../hooks/useDrivers';
import { useAssignments } from '../../hooks/useAssignments';

interface DriverAttendanceProps { navigation: any }

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const DriverAttendance: React.FC<DriverAttendanceProps> = () => {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId || null;
  const { drivers, loading: driversLoading } = useDrivers(operatorId);
  const { assignments, loading: asgnLoading } = useAssignments(operatorId, todayString(), true);

  const todayAssignments = useMemo(() =>
    assignments.filter((a) => a.status !== 'CANCELLED'),
    [assignments],
  );

  const activeDrivers = useMemo(() =>
    todayAssignments.filter((a) => a.status === 'IN_PROGRESS').length,
    [todayAssignments],
  );

  const absentCount = useMemo(() => {
    const assignedIds = new Set(todayAssignments.map((a) => a.driverId));
    return drivers.filter((d) => !assignedIds.has(d.id)).length;
  }, [drivers, todayAssignments]);

  const getDriverStatus = (driverId: string) => {
    const asgn = todayAssignments.find((a) => a.driverId === driverId);
    if (!asgn) return { label: 'Unassigned', color: Colors.textTertiary };
    if (asgn.status === 'IN_PROGRESS') return { label: 'On Trip', color: Colors.success };
    if (asgn.status === 'SCHEDULED') return { label: 'Scheduled', color: Colors.primary };
    return { label: asgn.status, color: Colors.textSecondary };
  };

  const getDriverBus = (driverId: string) => {
    const asgn = todayAssignments.find((a) => a.driverId === driverId);
    return asgn?.busId ? `Bus assigned` : 'No bus';
  };

  const getDriverTrips = (driverId: string) => {
    const asgn = todayAssignments.find((a) => a.driverId === driverId);
    return asgn?.status === 'COMPLETED' ? '1 trip' : '0 trips';
  };

  const loading = driversLoading || asgnLoading;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Driver Attendance</Text>
        <Text style={styles.subtitle}>
          Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: Colors.successFaded }]}>
            <Text style={styles.summaryValue}>{activeDrivers}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: Colors.errorFaded }]}>
            <Text style={styles.summaryValue}>{absentCount}</Text>
            <Text style={styles.summaryLabel}>Unassigned</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: Colors.primaryFaded }]}>
            <Text style={styles.summaryValue}>{drivers.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {/* Driver List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : drivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>No drivers yet</Text>
            <Text style={styles.emptySubtitle}>Invite drivers from the management screen</Text>
          </View>
        ) : (
          drivers.map((d) => {
            const status = getDriverStatus(d.id);
            return (
              <View key={d.id} style={styles.driverCard}>
                <View style={[styles.driverAvatar, { backgroundColor: status.color }]}>
                  <Text style={styles.driverAvatarText}>
                    {d.name ? d.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                  </Text>
                </View>
                <View style={styles.driverContent}>
                  <Text style={styles.driverName}>{d.name || 'Unknown'}</Text>
                  <Text style={styles.driverBus}>{getDriverBus(d.id)}</Text>
                </View>
                <View style={styles.driverRight}>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <Text style={styles.driverTrips}>{getDriverTrips(d.id)}</Text>
                </View>
              </View>
            );
          })
        )}
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
  driverAvatarText: { fontSize: 14, fontWeight: '800', color: Colors.white },
  driverContent: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  driverBus: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  driverRight: { alignItems: 'flex-end' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  driverTrips: { fontSize: 11, color: Colors.textTertiary, marginTop: 4, fontWeight: '500' },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default DriverAttendance;
