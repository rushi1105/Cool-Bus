import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useDrivers } from '../../hooks/useDrivers';
import { useFleet } from '../../hooks/useFleet';
import { useRoutes } from '../../hooks/useRoutes';
import { useAssignments } from '../../hooks/useAssignments';
import {
  createAssignment,
  cancelAssignment,
  checkDriverConflict,
  checkBusConflict,
} from '../../repositories/assignmentRepository';
import { getActiveTripForBus } from '../../repositories/tripRepository';
import type { Assignment } from '../../repositories/types';
import { localTodayString, localFormatDate } from '../../utils/date';

interface AssignmentSchedulerProps {
  navigation: any;
}

const SHIFTS: Array<{ label: string; value: 'Morning' | 'Evening' | 'Both' }> = [
  { label: 'Morning', value: 'Morning' },
  { label: 'Evening', value: 'Evening' },
  { label: 'Both', value: 'Both' },
];

function todayString(): string {
  return localTodayString();
}

function formatDate(d: Date): string {
  return localFormatDate(d);
}

export const AssignmentScheduler: React.FC<AssignmentSchedulerProps> = ({ navigation }) => {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId || null;
  const operatorName = profile?.name || '';

  const [selectedDate, setSelectedDate] = useState(todayString());
  const { assignments, loading: asgnLoading, error: asgnError, refresh } = useAssignments(operatorId, selectedDate, selectedDate === todayString());
  const { drivers } = useDrivers(operatorId);
  const { buses } = useFleet(operatorId);
  const { routes } = useRoutes(operatorId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<'Morning' | 'Evening' | 'Both'>('Morning');
  const [submitting, setSubmitting] = useState(false);

  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.isActive !== false),
    [drivers],
  );

  const activeBuses = useMemo(
    () => buses.filter((b) => b.isActive),
    [buses],
  );

  const activeRoutes = useMemo(
    () => routes.filter((r) => r.isActive),
    [routes],
  );

  const handleCreateAssignment = useCallback(async () => {
    if (!operatorId) return;
    if (!selectedDriverId || !selectedBusId || !selectedRouteId) {
      Alert.alert('Validation', 'Please select a driver, bus, and route.');
      return;
    }

    setSubmitting(true);
    try {
      const driverConflict = await checkDriverConflict(selectedDriverId, selectedDate, selectedShift);
      if (driverConflict) {
        Alert.alert('Conflict', 'This driver is already assigned to another shift at this time.');
        setSubmitting(false);
        return;
      }

      const busConflict = await checkBusConflict(selectedBusId, selectedDate, selectedShift);
      if (busConflict) {
        Alert.alert('Conflict', 'This bus is already assigned for this shift.');
        setSubmitting(false);
        return;
      }

      const hasActiveTrip = await getActiveTripForBus(selectedBusId);
      if (hasActiveTrip) {
        Alert.alert('Conflict', 'This bus currently has an active trip. Complete or cancel it first.');
        setSubmitting(false);
        return;
      }

      const id = await createAssignment({
        operatorId,
        driverId: selectedDriverId,
        busId: selectedBusId,
        routeId: selectedRouteId,
        date: selectedDate,
        shift: selectedShift,
        status: 'SCHEDULED',
      });

      if (!id) {
        Alert.alert('Error', 'Failed to create assignment.');
        setSubmitting(false);
        return;
      }

      setShowCreateModal(false);
      setSelectedDriverId(null);
      setSelectedBusId(null);
      setSelectedRouteId(null);
      setSelectedShift('Morning');
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }, [operatorId, selectedDriverId, selectedBusId, selectedRouteId, selectedDate, selectedShift]);

  const handleCancelAssignment = useCallback((asgn: Assignment) => {
    Alert.alert(
      'Cancel Assignment',
      `Cancel assignment for ${asgn.date}? It will be marked as cancelled and kept for history.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAssignment(asgn.id);
            } catch {
              Alert.alert('Error', 'Failed to cancel assignment.');
            }
          },
        },
      ],
    );
  }, []);

  const getDriverName = (id: string) => drivers.find((d) => d.id === id)?.name || 'Unknown';
  const getBusNumber = (id: string) => buses.find((b) => b.id === id)?.busNumber || 'Unknown';
  const getRouteName = (id: string) => routes.find((r) => r.id === id)?.name || 'Unknown';

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  };

  const renderAssignmentItem = ({ item }: { item: Assignment }) => (
    <View style={[styles.asgnCard, item.status === 'CANCELLED' && styles.asgnCardCancelled]}>
      <View style={styles.asgnHeader}>
        <View style={styles.asgnInfo}>
          <Text style={styles.asgnDriver}>{getDriverName(item.driverId)}</Text>
          <Text style={styles.asgnBus}>{getBusNumber(item.busId)}</Text>
        </View>
        <View style={styles.asgnMeta}>
          <View style={[styles.shiftBadge, { backgroundColor: Colors.primaryFaded }]}>
            <Text style={styles.shiftText}>{item.shift}</Text>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: item.status === 'SCHEDULED' ? Colors.primaryFaded :
              item.status === 'IN_PROGRESS' ? Colors.warningFaded :
              item.status === 'COMPLETED' ? Colors.successFaded :
              Colors.errorFaded,
          }]}>
            <Text style={[styles.statusText, {
              color: item.status === 'SCHEDULED' ? Colors.primary :
                item.status === 'IN_PROGRESS' ? Colors.warning :
                item.status === 'COMPLETED' ? Colors.success :
                Colors.error,
            }]}>
              {item.status === 'SCHEDULED' ? 'Scheduled' :
                item.status === 'IN_PROGRESS' ? 'In Progress' :
                item.status === 'COMPLETED' ? 'Completed' :
                'Cancelled'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.asgnRoute}>Route: {getRouteName(item.routeId)}</Text>
      {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
        <TouchableOpacity onPress={() => handleCancelAssignment(item)} style={styles.cancelAsgnBtn}>
          <Text style={styles.cancelAsgnBtnText}>Cancel Assignment</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const createModal = () => (
    <Modal visible={showCreateModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalTitle}>New Assignment</Text>
          <Text style={styles.modalDate}>{selectedDate}</Text>

          <Text style={styles.sectionLabel}>Shift</Text>
          <View style={styles.shiftRow}>
            {SHIFTS.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.shiftOption, selectedShift === s.value && styles.shiftOptionSelected]}
                onPress={() => setSelectedShift(s.value)}
              >
                <Text style={[styles.shiftOptionText, selectedShift === s.value && styles.shiftOptionTextSelected]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Driver</Text>
          {availableDrivers.length === 0 ? (
            <Text style={styles.emptySection}>No active drivers available</Text>
          ) : (
            <View style={styles.pickerList}>
              {availableDrivers.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.pickerItem, selectedDriverId === d.id && styles.pickerItemSelected]}
                  onPress={() => setSelectedDriverId(d.id)}
                >
                  <Text style={styles.pickerName}>{d.name}</Text>
                  <Text style={styles.pickerSub}>{d.phone}</Text>
                  {selectedDriverId === d.id && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Bus</Text>
          {activeBuses.length === 0 ? (
            <Text style={styles.emptySection}>No active buses</Text>
          ) : (
            <View style={styles.pickerList}>
              {activeBuses.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.pickerItem, selectedBusId === b.id && styles.pickerItemSelected]}
                  onPress={() => setSelectedBusId(b.id)}
                >
                  <Text style={styles.pickerName}>{b.busNumber}</Text>
                  <Text style={styles.pickerSub}>{b.plateNumber || ''}</Text>
                  {selectedBusId === b.id && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Route</Text>
          {activeRoutes.length === 0 ? (
            <Text style={styles.emptySection}>No active routes</Text>
          ) : (
            <View style={styles.pickerList}>
              {activeRoutes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerItem, selectedRouteId === r.id && styles.pickerItemSelected]}
                  onPress={() => setSelectedRouteId(r.id)}
                >
                  <Text style={styles.pickerName}>{r.name}</Text>
                  <Text style={styles.pickerSub}>{r.stops.length} stops</Text>
                  {selectedRouteId === r.id && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateAssignment}
              style={styles.submitBtn}
              disabled={submitting || !selectedDriverId || !selectedBusId || !selectedRouteId}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (asgnLoading && assignments.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignments</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DriverManagement', { operatorId, operatorName })} style={styles.manageBtn}>
          <Text style={styles.manageBtnText}>Drivers</Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNav}>
          <Text style={styles.dateNavText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(todayString())} style={styles.dateDisplay}>
          <Text style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
          {selectedDate === todayString() && <Text style={styles.todayTag}>Today</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNav}>
          <Text style={styles.dateNavText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: Colors.primaryFaded }]}>
          <Text style={styles.summaryValue}>{assignments.filter((a) => a.status === 'SCHEDULED').length}</Text>
          <Text style={styles.summaryLabel}>Scheduled</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: Colors.warningFaded }]}>
          <Text style={styles.summaryValue}>{assignments.filter((a) => a.status === 'IN_PROGRESS').length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: Colors.successFaded }]}>
          <Text style={styles.summaryValue}>{assignments.filter((a) => a.status === 'COMPLETED').length}</Text>
          <Text style={styles.summaryLabel}>Done</Text>
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.createBtnText}>+ Create Assignment</Text>
      </TouchableOpacity>

      {/* Assignment List */}
      <FlatList
        data={assignments}
        renderItem={renderAssignmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={asgnLoading}
        onRefresh={refresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No assignments</Text>
            <Text style={styles.emptySubtitle}>Tap "Create Assignment" to schedule drivers</Text>
          </View>
        }
      />

      {createModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.dark,
  },
  manageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.primaryFaded,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  dateNav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
  },
  todayTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  createBtn: {
    marginHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  asgnCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  asgnCardCancelled: {
    opacity: 0.5,
  },
  asgnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  asgnInfo: {
    flex: 1,
  },
  asgnDriver: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  asgnBus: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  asgnMeta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  shiftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  asgnRoute: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  cancelAsgnBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  cancelAsgnBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
    marginTop: 60,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  shiftRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  shiftOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  shiftOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  shiftOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  shiftOptionTextSelected: {
    color: Colors.primary,
  },
  pickerList: {
    gap: 6,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  pickerItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  pickerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  pickerSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptySection: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default AssignmentScheduler;
