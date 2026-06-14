/**
 * SendReminder Screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import Colors from '../../constants/colors';
import { mockStudents, mockFees } from '../../services/firebase';

interface SendReminderProps { navigation: any }

export const SendReminder: React.FC<SendReminderProps> = ({ navigation }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const unpaidStudents = mockStudents
    .filter((s) => s.operatorId === 'op-1')
    .map((s) => {
      const fee = mockFees.find((f) => f.studentId === s.id && f.status === 'UNPAID');
      return { ...s, fee };
    })
    .filter((s) => s.fee);

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

  const handleSend = () => {
    Alert.alert(
      'Reminders Sent',
      `Fee reminders sent to ${selectedIds.length} parent(s) via SMS & Push notification.`,
      [{ text: 'Done', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Send Reminder</Text>
        <Text style={styles.subtitle}>
          Select parents with unpaid fees to send a payment reminder
        </Text>

        {/* Select All */}
        <TouchableOpacity style={styles.selectAll} onPress={selectAll}>
          <View style={[styles.checkbox, selectedIds.length === unpaidStudents.length && styles.checkboxChecked]}>
            {selectedIds.length === unpaidStudents.length && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.selectAllText}>
            Select All ({unpaidStudents.length})
          </Text>
        </TouchableOpacity>

        {/* List */}
        {unpaidStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
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
                <Text style={styles.feeAmount}>₹{s.fee?.total.toLocaleString()}</Text>
                <Text style={styles.feeMonth}>{s.fee?.month}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Send Button */}
        {selectedIds.length > 0 && (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            activeOpacity={0.85}
          >
            <Text style={styles.sendButtonText}>
              📢 Send Reminder to {selectedIds.length} Parent{selectedIds.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  selectAll: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
  },
  selectAllText: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  checkbox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, marginBottom: 8, elevation: 1, gap: 12,
  },
  studentCardSelected: { backgroundColor: Colors.primaryFaded, borderWidth: 1, borderColor: Colors.primary },
  studentContent: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  studentParent: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  studentRight: { alignItems: 'flex-end' },
  feeAmount: { fontSize: 15, fontWeight: '700', color: Colors.error },
  feeMonth: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  sendButton: {
    marginTop: 24, height: 56, backgroundColor: Colors.warning, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  sendButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.white, borderRadius: 18 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
});

export default SendReminder;
