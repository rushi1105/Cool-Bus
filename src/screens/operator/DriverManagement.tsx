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
import { useDrivers } from '../../hooks/useDrivers';
import { createDriverInvite, findUserByPhone } from '../../repositories/userRepository';
import type { User } from '../../repositories/types';

interface DriverManagementProps {
  navigation: any;
  route: any;
}

export const DriverManagement: React.FC<DriverManagementProps> = ({ navigation, route }) => {
  const { profile } = useAuth();
  const operatorId: string = route.params?.operatorId ?? profile?.operatorId ?? '';
  const operatorName: string = route.params?.operatorName || 'Your Operator';
  const { drivers, loading, error } = useDrivers(operatorId);

  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInvite = useCallback(async () => {
    const cleaned = phone.replace(/\s+/g, '');
    if (!cleaned || cleaned.length < 10) {
      Alert.alert('Validation', 'Enter a valid phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const existing = await findUserByPhone(cleaned);
      if (existing) {
        if (existing.role === 'driver' && existing.operatorId) {
          if (existing.operatorId === operatorId) {
            Alert.alert('Already a Driver', 'This driver is already in your fleet.');
          } else {
            Alert.alert('Already Registered', 'This phone is registered with another operator.');
          }
          setSubmitting(false);
          return;
        }
      }

      await createDriverInvite(cleaned, operatorId, operatorName);

      Alert.alert(
        'Invite Sent',
        `An invite has been sent to ${cleaned}. When they log in, they will see your invitation.`,
      );
      setShowModal(false);
      setPhone('');
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }, [phone, operatorId, operatorName]);

  const getDriverStatus = (driver: User) => {
    if (driver.isActive === false) return { label: 'Inactive', color: Colors.error };
    if (driver.availability === 'busy') return { label: 'On Trip', color: Colors.warning };
    return { label: 'Available', color: Colors.success };
  };

  const renderDriverItem = ({ item }: { item: User }) => {
    const status = getDriverStatus(item);
    return (
      <View style={styles.driverCard}>
        <View style={[styles.avatar, { backgroundColor: item.isActive !== false ? Colors.primary : Colors.textTertiary }]}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
          </Text>
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.name || 'Unknown'}</Text>
          <Text style={styles.driverPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
    );
  };

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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Management</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>{drivers.length} driver{drivers.length !== 1 ? 's' : ''} in fleet</Text>
      </View>

      <FlatList
        data={drivers}
        renderItem={renderDriverItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>No drivers yet</Text>
            <Text style={styles.emptySubtitle}>Tap "+ Invite" to add a driver by phone number</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Driver</Text>
            <Text style={styles.modalSubtitle}>
              Enter the driver's phone number. They will receive an invite when they log in.
            </Text>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleInvite} style={styles.submitBtn} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  driverPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 20,
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

export default DriverManagement;
