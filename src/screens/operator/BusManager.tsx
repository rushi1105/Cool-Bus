import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useFleet } from '../../hooks/useFleet';
import { createBus, deleteBus, checkBusNumberExists } from '../../repositories/fleetRepository';
import type { Bus } from '../../repositories/types';

interface BusManagerProps {
  navigation: any;
  route: any;
}

export const BusManager: React.FC<BusManagerProps> = ({ navigation, route }) => {
  const { profile } = useAuth();
  const operatorId: string = route.params?.operatorId ?? profile?.operatorId ?? '';
  const { buses, loading, error } = useFleet(operatorId);

  const [showModal, setShowModal] = useState(false);
  const [busNumber, setBusNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [busType, setBusType] = useState<'minibus' | 'bus' | 'van'>('bus');
  const [submitting, setSubmitting] = useState(false);

  const handleAddBus = useCallback(async () => {
    if (!busNumber.trim()) {
      Alert.alert('Validation', 'Bus number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const exists = await checkBusNumberExists(busNumber.trim(), operatorId);
      if (exists) {
        Alert.alert('Validation', 'Bus number already exists in your fleet.');
        setSubmitting(false);
        return;
      }

      await createBus({
        operatorId,
        driverId: '',
        busNumber: busNumber.trim(),
        plateNumber: plateNumber.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        type: busType,
        isActive: true,
      });

      setShowModal(false);
      setBusNumber('');
      setPlateNumber('');
      setCapacity('');
      setBusType('bus');
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }, [busNumber, plateNumber, capacity, busType, operatorId]);

  const handleDeleteBus = useCallback((bus: Bus) => {
    Alert.alert(
      'Remove Bus',
      `Delete ${bus.busNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBus(bus.id);
          },
        },
      ],
    );
  }, []);

  const renderBusItem = ({ item }: { item: Bus }) => (
    <View style={styles.busCard}>
      <View style={styles.busHeader}>
        <View style={styles.busIcon}>
          <Text style={styles.busIconText}>🚌</Text>
        </View>
        <View style={styles.busInfo}>
          <Text style={styles.busNumber}>{item.busNumber}</Text>
          {item.plateNumber ? (
            <Text style={styles.busPlate}>{item.plateNumber}</Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <View style={styles.busDetails}>
        {item.type ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>{item.type}</Text>
          </View>
        ) : null}
        {item.capacity ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>{item.capacity} seats</Text>
          </View>
        ) : null}
        {item.defaultRouteId ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>Has route</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => handleDeleteBus(item)} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModal = () => (
    <Modal visible={showModal} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Bus</Text>

          <TextInput
            style={styles.modalInput}
            value={busNumber}
            onChangeText={setBusNumber}
            placeholder="Bus number *"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="characters"
          />

          <TextInput
            style={styles.modalInput}
            value={plateNumber}
            onChangeText={setPlateNumber}
            placeholder="Plate number"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="characters"
          />

          <TextInput
            style={styles.modalInput}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="Capacity (seats)"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
          />

          <Text style={styles.typeLabel}>Type</Text>
          <View style={styles.typeRow}>
            {(['bus', 'minibus', 'van'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, busType === t && styles.typeBtnSelected]}
                onPress={() => setBusType(t)}
              >
                <Text style={[styles.typeBtnText, busType === t && styles.typeBtnTextSelected]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddBus} style={styles.submitBtn} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Add Bus</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Manager</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Fleet count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{buses.length} bus{buses.length !== 1 ? 'es' : ''} in fleet</Text>
      </View>

      {/* Bus List */}
      <FlatList
        data={buses}
        renderItem={renderBusItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚌</Text>
            <Text style={styles.emptyTitle}>No buses yet</Text>
            <Text style={styles.emptySubtitle}>Tap "+ Add" to add your first vehicle</Text>
          </View>
        }
      />

      {renderModal()}
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
  errorText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
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
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  countRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  busCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busIconText: {
    fontSize: 20,
  },
  busInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
  },
  busPlate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: Colors.successFaded,
  },
  inactiveBadge: {
    backgroundColor: Colors.errorFaded,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeText: {
    color: Colors.success,
  },
  inactiveText: {
    color: Colors.error,
  },
  busDetails: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 6,
  },
  detailChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  deleteBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.errorFaded,
  },
  deleteBtnText: {
    fontSize: 11,
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
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  typeBtnTextSelected: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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

export default BusManager;
