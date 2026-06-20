import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFees } from '../../hooks/useFees';
import { useAuth } from '../../hooks/useAuth';
import { useStudents } from '../../hooks/useStudents';
import { createFeeDoc, payFee } from '../../repositories/feeRepository';
import type { Fee, Student } from '../../repositories/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function FeeManagement() {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId ?? null;
  const { fees, loading, refresh } = useFees(operatorId, true);
  const { students } = useStudents(operatorId);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [total, setTotal] = useState('');
  const [month, setMonth] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeStudents = students.filter((s) => s.isActive !== false);

  const handleCreateFee = async () => {
    if (!operatorId || !selectedStudent || !total) return;
    setSubmitting(true);
    try {
      const parsedTotal = parseFloat(total);
      if (isNaN(parsedTotal) || parsedTotal <= 0) {
        Alert.alert('Invalid amount');
        setSubmitting(false);
        return;
      }
      const student = students.find((s) => s.id === selectedStudent);
      await createFeeDoc({
        studentId: selectedStudent,
        operatorId,
        total: parsedTotal,
        month: month || new Date().toLocaleString('default', { month: 'long' }),
        status: 'UNPAID',
        parentId: student?.parentId ?? '',
        trialUsed: false,
      });
      Alert.alert('Fee created');
      setSelectedStudent(null);
      setTotal('');
      setMonth('');
      refresh();
    } catch {
      Alert.alert('Failed to create fee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (fee: Fee) => {
    try {
      await payFee(fee.id);
      refresh();
    } catch {
      Alert.alert('Failed to update fee');
    }
  };

  const renderFeeItem = ({ item }: { item: Fee }) => {
    const student = students.find((s) => s.id === item.studentId);
    return (
      <View style={[styles.feeItem, item.status === 'PAID' && styles.paidItem]}>
        <Text style={styles.studentName}>{student?.name ?? 'Unknown'}</Text>
        <Text style={styles.feeAmount}>${item.total.toFixed(2)}</Text>
        <Text style={styles.feeStatus}>{item.status}</Text>
        {item.status === 'UNPAID' && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handleMarkPaid(item)}
          >
            <Text style={styles.payButtonText}>Mark Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Fee Management</Text>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Create Fee</Text>
        {activeStudents.length === 0 ? (
          <Text style={{ color: '#666', fontStyle: 'italic', marginBottom: 12 }}>
            No active students to invoice.
          </Text>
        ) : (
          <FlatList
            data={activeStudents}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }: { item: Student }) => (
              <TouchableOpacity
                style={[
                  styles.studentPill,
                  selectedStudent === item.id && styles.selectedPill,
                ]}
                onPress={() => setSelectedStudent(item.id)}
              >
                <Text style={selectedStudent === item.id ? { color: '#fff' } : undefined}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Amount"
          value={total}
          onChangeText={setTotal}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Month (e.g. June)"
          value={month}
          onChangeText={setMonth}
        />
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreateFee}
          disabled={!selectedStudent || !total || submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? 'Creating...' : 'Create Fee'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        All Fees ({fees.length})
      </Text>
      <FlatList
        data={fees}
        renderItem={renderFeeItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginVertical: 12 },
  form: { marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 },
  studentPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedPill: { backgroundColor: '#4a90d9' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4a90d9',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '600' },
  feeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  paidItem: { opacity: 0.6 },
  studentName: { flex: 1, fontSize: 16 },
  feeAmount: { fontSize: 16, fontWeight: '600', marginRight: 12 },
  feeStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
    textTransform: 'uppercase',
  },
  payButton: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 6 },
  payButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
