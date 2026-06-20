import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFleet } from '../../hooks/useFleet';
import { useFees } from '../../hooks/useFees';
import { useTrips } from '../../hooks/useTrips';
import { fetchOperator } from '../../repositories/operatorRepository';
import type { Operator } from '../../repositories/types';

interface QuickStatProps {
  label: string;
  value: string;
  onPress?: () => void;
}

function QuickStat({ label, value, onPress }: QuickStatProps) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} disabled={!onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function OperatorHome({ navigation }: any) {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId ?? '';

  const { buses } = useFleet(operatorId);
  const { fees, unpaidCount } = useFees(operatorId);
  const { trips: activeTrips, loading: tripsLoading } = useTrips(operatorId, {
    status: 'ACTIVE',
  });
  const [operatorData, setOperatorData] = React.useState<Operator | null>(null);

  React.useEffect(() => {
    if (operatorId) {
      fetchOperator(operatorId).then((op) => setOperatorData(op));
    }
  }, [operatorId]);

  const activeBusCount = buses.filter((b) => b.isActive !== false).length;
  const studentCount = operatorData?.studentCount ?? 0;
  const activeTripCount = activeTrips.length;

  const stats = [
    { label: 'Active Buses', value: String(activeBusCount), onPress: () => navigation.navigate('FleetMap') },
    { label: 'Students', value: String(studentCount), onPress: undefined },
    { label: 'Unpaid Fees', value: String(unpaidCount), onPress: () => navigation.navigate('FeeManagement') },
    { label: 'Active Trips', value: String(activeTripCount), onPress: tripsLoading ? undefined : undefined },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Dashboard</Text>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <QuickStat
            key={index}
            label={stat.label}
            value={stat.value}
            onPress={stat.onPress}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('FleetMap')}
        >
          <Text style={styles.actionTitle}>Fleet Map</Text>
          <Text style={styles.actionSubtitle}>View buses on map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('BusManager', { operatorId })}
        >
          <Text style={styles.actionTitle}>Bus Manager</Text>
          <Text style={styles.actionSubtitle}>Add / remove buses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('RouteEditor', { operatorId })}
        >
          <Text style={styles.actionTitle}>Route Editor</Text>
          <Text style={styles.actionSubtitle}>Manage routes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AssignmentScheduler')}
        >
          <Text style={styles.actionTitle}>Assignments</Text>
          <Text style={styles.actionSubtitle}>Schedule drivers & buses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('DriverManagement', { operatorId, operatorName: profile?.name ?? '' })}
        >
          <Text style={styles.actionTitle}>Drivers</Text>
          <Text style={styles.actionSubtitle}>Invite & manage drivers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('FeeManagement')}
        >
          <Text style={styles.actionTitle}>Fee Management</Text>
          <Text style={styles.actionSubtitle}>Track payments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('CouponManager')}
        >
          <Text style={styles.actionTitle}>Coupons</Text>
          <Text style={styles.actionSubtitle}>Generate promo codes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8f9fa' },
  heading: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#1a1a2e' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4a90d9',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a2e',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#999',
  },
});
