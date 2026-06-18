/**
 * ParentProfile Screen
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface ParentProfileProps {
  navigation: any;
}

export const ParentProfile: React.FC<ParentProfileProps> = () => {
  const { profile, logout } = useAuth();

  const [students, setStudents] = useState<any[]>([]);
  const [latestFeesByStudent, setLatestFeesByStudent] = useState<Record<string, any>>({});
  const [busesByBusId, setBusesByBusId] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchedBusIdsRef = useRef<Set<string>>(new Set());

  const displayName = profile?.name ?? 'Parent';
  const displayPhone = profile?.phone ?? '';
  const displayEmail = profile?.email ?? '';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // 1. Fetch Students and Fees in Real-time
  useEffect(() => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to students where parentId == profile.id
    const studentQ = query(
      collection(db, 'students'),
      where('parentId', '==', profile.id)
    );

    const unsubscribeStudents = onSnapshot(
      studentQ,
      (snapshot) => {
        const studentsList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as any[];

        setStudents(studentsList);
        setIsLoading(false);
      },
      (err) => {
        console.error('[ParentProfile] Students snapshot error:', err);
        setError('Failed to load child profiles');
        setIsLoading(false);
      }
    );

    // Subscribe to fees where parentId == profile.id
    const feesQ = query(
      collection(db, 'fees'),
      where('parentId', '==', profile.id)
    );

    const unsubscribeFees = onSnapshot(
      feesQ,
      (snapshot) => {
        const feesList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as any[];

        const latestFees: Record<string, any> = {};
        feesList.forEach((fee) => {
          const studentId = fee.studentId;
          if (!studentId) return;

          const existingFee = latestFees[studentId];
          if (!existingFee) {
            latestFees[studentId] = fee;
          } else {
            // Compare billing months (format YYYY-MM) to resolve latest fee per child
            if (fee.month > existingFee.month) {
              latestFees[studentId] = fee;
            }
          }
        });

        setLatestFeesByStudent(latestFees);
      },
      (err) => {
        console.error('[ParentProfile] Fees snapshot error:', err);
      }
    );

    return () => {
      unsubscribeStudents();
      unsubscribeFees();
    };
  }, [profile?.id]);

  // 2. Fetch buses dynamically (batch & cache lookups)
  useEffect(() => {
    if (students.length === 0) return;

    const busIds = Array.from(new Set(students.map((s) => s.busId).filter(Boolean)));
    const newBusesToFetch = busIds.filter((id) => !fetchedBusIdsRef.current.has(id));

    if (newBusesToFetch.length === 0) return;

    newBusesToFetch.forEach((id) => fetchedBusIdsRef.current.add(id));

    const fetchBuses = async () => {
      const newBuses: Record<string, any> = {};
      await Promise.all(
        newBusesToFetch.map(async (busId) => {
          try {
            const snap = await getDoc(doc(db, 'buses', busId));
            if (snap.exists()) {
              newBuses[busId] = snap.data();
            }
          } catch (err) {
            console.error('[ParentProfile] Error fetching bus:', busId, err);
          }
        })
      );

      if (Object.keys(newBuses).length > 0) {
        setBusesByBusId((prev) => ({ ...prev, ...newBuses }));
      }
    };

    fetchBuses();
  }, [students]);

  const menuItems = [
    { icon: '🔔', label: 'Notifications', subtitle: 'Manage alert preferences' },
    { icon: '💳', label: 'Payment History', subtitle: 'View receipts and invoices' },
    { icon: '📞', label: 'Support', subtitle: 'Get help & contact support' },
    { icon: '📜', label: 'Terms & Privacy', subtitle: 'Read legal agreements' },
  ];

  const getFeeStatusDetails = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return {
          text: 'PAID',
          color: Colors.success,
          bg: Colors.successFaded,
        };
      case 'TRIAL':
        return {
          text: 'TRIAL',
          color: Colors.warning,
          bg: Colors.warningFaded,
        };
      case 'UNPAID':
      default:
        return {
          text: 'UNPAID',
          color: Colors.error,
          bg: Colors.errorFaded,
        };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Profile</Text>
        </View>

        {/* Parent Avatar Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profilePhone}>{displayPhone}</Text>
          {displayEmail ? <Text style={styles.profileEmail}>{displayEmail}</Text> : null}
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>🏠 Parent</Text>
          </View>
        </View>

        {/* My Children Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Children</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.infoText}>Loading child profiles...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👶</Text>
            <Text style={styles.emptyText}>No registered children</Text>
          </View>
        ) : (
          <View style={styles.childrenList}>
            {students.map((student) => {
              const busInfo = busesByBusId[student.busId];
              const busNumber = busInfo?.busNumber ?? 'Not Assigned';
              const stopName = student.stopLocation?.label ?? 'N/A';
              const feeDoc = latestFeesByStudent[student.id];
              const feeDetails = getFeeStatusDetails(feeDoc?.status);

              return (
                <View key={student.id} style={styles.childCard}>
                  <View style={styles.childAvatar}>
                    <Text style={styles.childAvatarText}>
                      {student.name ? student.name.charAt(0).toUpperCase() : 'C'}
                    </Text>
                  </View>
                  <View style={styles.childDetails}>
                    <Text style={styles.childNameText}>{student.name}</Text>
                    <Text style={styles.childSubtext}>Grade: {student.grade}</Text>
                    <Text style={styles.childSubtext}>Bus: {busNumber}</Text>
                    <Text style={styles.childSubtext}>Stop: {stopName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: feeDetails.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: feeDetails.color }]}>
                      {feeDetails.text}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Fee Summary Section */}
        {students.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fee Summary</Text>
            </View>
            <View style={styles.feeSummaryCard}>
              {students.map((student, idx) => {
                const feeDoc = latestFeesByStudent[student.id];
                const feeDetails = getFeeStatusDetails(feeDoc?.status);
                const amount = feeDoc?.total ?? 0;
                const showBorder = idx < students.length - 1;

                return (
                  <View
                    key={student.id}
                    style={[styles.feeRow, showBorder && styles.feeRowBorder]}
                  >
                    <View style={styles.feeRowLeft}>
                      <Text style={styles.feeStudentName}>{student.name}</Text>
                      <Text style={styles.feeMonth}>
                        {feeDoc?.month ? `Billing Month: ${feeDoc.month}` : 'No billing info'}
                      </Text>
                    </View>
                    <View style={styles.feeRowRight}>
                      <Text style={styles.feeAmount}>₹{amount.toLocaleString()}</Text>
                      <View style={[styles.feeMiniBadge, { backgroundColor: feeDetails.bg }]}>
                        <Text style={[styles.feeMiniBadgeText, { color: feeDetails.color }]}>
                          {feeDetails.text}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>🚪 Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>BusTrack v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileBadge: {
    marginTop: 12,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  centerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  emptyContainer: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  childrenList: {
    marginBottom: 24,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  childAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  childAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  childDetails: {
    flex: 1,
  },
  childNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  childSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feeSummaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  feeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  feeRowLeft: {
    flex: 1,
  },
  feeStudentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  feeMonth: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  feeRowRight: {
    alignItems: 'flex-end',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  feeMiniBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  feeMiniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIconText: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 22,
    color: Colors.textTertiary,
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: Colors.errorFaded,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 20,
  },
});

export default ParentProfile;
