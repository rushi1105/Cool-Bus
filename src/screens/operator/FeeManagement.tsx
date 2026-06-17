/**
 * FeeManagement Screen — All students with PAID/UNPAID/TRIAL badges
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Colors from '../../constants/colors';
import { mockStudents, mockFees } from '../../services/firebase';

interface FeeManagementProps { navigation: any }

export const FeeManagement: React.FC<FeeManagementProps> = ({ navigation }) => {
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'TRIAL'>('ALL');

  const students = mockStudents.filter((s) => s.operatorId === 'op-1');
  const studentFees = students.map((s) => {
    const fee = mockFees.find((f) => f.studentId === s.id && f.month === '2026-06');
    return { ...s, fee };
  });

  const filtered = filter === 'ALL' ? studentFees : studentFees.filter((sf) => sf.fee?.status === filter);

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'PAID': return { bg: Colors.successFaded, color: Colors.success, label: 'PAID' };
      case 'UNPAID': return { bg: Colors.errorFaded, color: Colors.error, label: 'UNPAID' };
      case 'TRIAL': return { bg: Colors.warningFaded, color: Colors.warning, label: 'TRIAL' };
      default: return { bg: Colors.background, color: Colors.textTertiary, label: 'N/A' };
    }
  };

  const filters = [
    { key: 'ALL', label: 'All', count: studentFees.length },
    { key: 'PAID', label: 'Paid', count: studentFees.filter((sf) => sf.fee?.status === 'PAID').length },
    { key: 'UNPAID', label: 'Unpaid', count: studentFees.filter((sf) => sf.fee?.status === 'UNPAID').length },
    { key: 'TRIAL', label: 'Trial', count: studentFees.filter((sf) => sf.fee?.status === 'TRIAL').length },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Fee Management</Text>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key as any)}
            >
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === f.key && styles.filterCountTextActive]}>{f.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Student List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No students in this category</Text>
          </View>
        ) : (
          filtered.map((sf) => {
            const sc = getStatusConfig(sf.fee?.status);
            return (
              <View key={sf.id} style={styles.studentCard}>
                <View style={styles.studentLeft}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>{sf.gender === 'Male' ? '👦' : '👧'}</Text>
                  </View>
                  <View>
                    <Text style={styles.studentName}>{sf.name}</Text>
                    <Text style={styles.studentGrade}>Grade {sf.grade} • {sf.stopLocation?.label || 'No stop'}</Text>
                  </View>
                </View>
                <View style={styles.studentRight}>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  {sf.fee && (
                    <Text style={styles.feeAmount}>₹{sf.fee.total.toLocaleString()}</Text>
                  )}
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
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark, marginBottom: 20 },
  filterScroll: { marginBottom: 20, flexGrow: 0 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, marginRight: 8,
  },
  filterTabActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: Colors.primary },
  filterCount: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  filterCountActive: { backgroundColor: Colors.primary },
  filterCountText: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary },
  filterCountTextActive: { color: Colors.white },
  studentCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 10, elevation: 1,
  },
  studentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  studentAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { fontSize: 20 },
  studentName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  studentGrade: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  studentRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  feeAmount: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.white, borderRadius: 18 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, fontWeight: '500' },
});

export default FeeManagement;
