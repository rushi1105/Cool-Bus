import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useStudents } from '../../hooks/useStudents';
import { useFees } from '../../hooks/useFees';
import { NotificationService } from '../../services/notifications/NotificationService';
import type { Fee, Student } from '../../repositories/types';

interface SendReminderProps { navigation: any }

export default function SendReminder({ navigation }: SendReminderProps) {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId ?? null;
  const operatorName = profile?.name ?? '';
  const { students, loading: studentsLoading } = useStudents(operatorId);
  const { fees, loading: feesLoading } = useFees(operatorId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const unpaidFees = fees.filter((f) => f.status === 'UNPAID');
  const unpaidStudents: (Student & { fee: Fee })[] = unpaidFees
    .map((fee) => {
      const student = students.find((s) => s.id === fee.studentId);
      return student ? { ...student, fee } : null;
    })
    .filter((s): s is Student & { fee: Fee } => s !== null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === unpaidStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidStudents.map((s) => s.id));
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const selected = unpaidStudents.filter((s) => selectedIds.includes(s.id));
      const results = await Promise.all(
        selected.map((s) =>
          NotificationService.sendFeeReminder({
            parentId: s.parentId,
            parentName: operatorName,
            operatorId: operatorId ?? '',
            studentName: s.name,
            amount: s.fee.total,
            month: s.fee.month,
          }),
        ),
      );
      const sent = results.filter((id) => id !== null).length;
      Alert.alert(
        'Reminders Sent',
        `Fee reminders sent to ${sent} parent(s).`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to send reminders.');
    } finally {
      setSending(false);
    }
  };

  if (studentsLoading || feesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Send Reminder</Text>
        <Text style={styles.subtitle}>
          Select parents with unpaid fees to send a payment reminder
        </Text>

        <TouchableOpacity style={styles.selectAll} onPress={selectAll}>
          <View style={[styles.checkbox, selectedIds.length === unpaidStudents.length && styles.checkboxChecked]}>
            {selectedIds.length === unpaidStudents.length && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.selectAllText}>
            Select All ({unpaidStudents.length})
          </Text>
        </TouchableOpacity>

        {unpaidStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>All fees are paid!</Text>
            <Text style={styles.emptySubtext}>No unpaid students to remind</Text>
          </View>
        ) : (
          unpaidStudents.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.studentCard, selectedIds.includes(s.id) && styles.studentCardSelected]}
              onPress={() => toggleSelect(s.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, selectedIds.includes(s.id) && styles.checkboxChecked]}>
                {selectedIds.includes(s.id) && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.studentContent}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentParent}>Parent ID: {s.parentId}</Text>
              </View>
              <View style={styles.studentRight}>
                <Text style={styles.feeAmount}>${s.fee.total.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {selectedIds.length > 0 && (
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.disabledButton]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.85}
          >
            <Text style={styles.sendButtonText}>
              {sending ? 'Sending...' : `Send Reminder to ${selectedIds.length} Parent${selectedIds.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  selectAll: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
  },
  selectAllText: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  checkbox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#4a90d9', borderColor: '#4a90d9' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 8, elevation: 1, gap: 12,
  },
  studentCardSelected: { backgroundColor: '#e8f0fe', borderWidth: 1, borderColor: '#4a90d9' },
  studentContent: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  studentParent: { fontSize: 12, color: '#999', marginTop: 2 },
  studentRight: { alignItems: 'flex-end' },
  feeAmount: { fontSize: 15, fontWeight: '700', color: '#e53935' },
  sendButton: {
    marginTop: 24, height: 56, backgroundColor: '#ff9800', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  disabledButton: { opacity: 0.6 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 18 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 13, color: '#999', marginTop: 4 },
});
