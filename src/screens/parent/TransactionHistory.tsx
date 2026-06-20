import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getFees } from '../../repositories/feeRepository';
import type { Fee } from '../../repositories/types';

export default function TransactionHistory() {
  const { profile } = useAuth();
  const parentId = profile?.id ?? '';
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentId) return;
    setLoading(true);
    getFees(parentId).then((data) => {
      setFees(data);
      setLoading(false);
    });
  }, [parentId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderFee = ({ item }: { item: Fee }) => (
    <View style={[styles.feeItem, item.status === 'PAID' && styles.paidItem]}>
      <View style={styles.feeInfo}>
        <Text style={styles.feeAmount}>${item.total.toFixed(2)}</Text>
        <Text style={styles.feeStatus}>{item.status}</Text>
      </View>
      <Text style={styles.feeDate}>
        Month: {item.month}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Transaction History</Text>
      <FlatList
        data={fees}
        renderItem={renderFee}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  feeItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidItem: { opacity: 0.6 },
  feeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  feeAmount: { fontSize: 18, fontWeight: '600' },
  feeStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  feeDate: { fontSize: 12, color: '#999' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});
