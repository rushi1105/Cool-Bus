/**
 * TransactionHistory Screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Colors from '../../constants/colors';
import { mockFees } from '../../services/firebase';

interface TransactionHistoryProps {
  navigation: any;
}

const months = ['All', 'Jun 2026', 'May 2026', 'Apr 2026'];

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ navigation }) => {
  const [selectedMonth, setSelectedMonth] = useState('All');

  const transactions = mockFees
    .filter((f) => f.parentId === 'par-1' && f.status === 'PAID')
    .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Transactions</Text>

        {/* Month Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {months.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.filterChip, selectedMonth === m && styles.filterChipActive]}
              onPress={() => setSelectedMonth(m)}
            >
              <Text style={[styles.filterText, selectedMonth === m && styles.filterTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>₹{transactions.reduce((s, t) => s + t.total, 0).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Paid</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{transactions.length}</Text>
            <Text style={styles.summaryLabel}>Transactions</Text>
          </View>
        </View>

        {/* Transaction List */}
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Your payment history will appear here</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txIcon}>
                <Text style={styles.txIconText}>✅</Text>
              </View>
              <View style={styles.txContent}>
                <Text style={styles.txMonth}>{tx.month}</Text>
                <Text style={styles.txDate}>
                  Paid on {tx.paidAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>₹{tx.total.toLocaleString()}</Text>
                <View style={styles.txBadge}>
                  <Text style={styles.txBadgeText}>PAID</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: Colors.dark, marginBottom: 20 },
  filterRow: { marginBottom: 20, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary },
  summaryCard: {
    flexDirection: 'row', backgroundColor: Colors.dark, borderRadius: 18, padding: 20,
    marginBottom: 24, elevation: 4,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.white },
  summaryLabel: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500', marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, marginBottom: 10, elevation: 1,
  },
  txIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.successFaded,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  txIconText: { fontSize: 18 },
  txContent: { flex: 1 },
  txMonth: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  txDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  txBadge: {
    marginTop: 4, backgroundColor: Colors.successFaded, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  txBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.success },
  emptyState: {
    alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.white, borderRadius: 18,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary, marginTop: 4, textAlign: 'center' },
});

export default TransactionHistory;
