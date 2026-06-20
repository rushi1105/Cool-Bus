import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { useCoupons } from '../../hooks/useCoupons';
import { useAuth } from '../../hooks/useAuth';
import type { Coupon } from '../../repositories/types';

export default function CouponManager() {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId ?? null;
  const operatorCode = profile?.operatorCode ?? '';
  const { coupons, totalCount, usedCount, loading, generate } = useCoupons(operatorId);

  const handleGenerate = async () => {
    if (!operatorId || !operatorCode) return;
    const code = await generate(operatorId, operatorCode);
    if (code) {
      Alert.alert('Coupon Created', code, [
        { text: 'Copy', onPress: () => Clipboard.setString(code) },
        { text: 'OK' },
      ]);
    } else {
      Alert.alert('Error', 'Failed to generate coupon');
    }
  };

  const renderCoupon = ({ item }: { item: Coupon }) => {
    const expired = !item.isUsed && item.expiresAt < new Date();
    return (
      <View style={[styles.couponItem, item.isUsed && styles.usedItem]}>
        <Text style={styles.couponCode}>{item.code}</Text>
        <Text style={[styles.couponStatus, item.isUsed && styles.usedText]}>
          {item.isUsed ? 'Used' : expired ? 'Expired' : 'Active'}
        </Text>
        <Text style={styles.couponDate}>
          Expires: {item.expiresAt.toLocaleDateString()}
        </Text>
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
      <Text style={styles.heading}>Coupon Manager</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{usedCount}</Text>
          <Text style={styles.statLabel}>Used</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{totalCount - usedCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
        <Text style={styles.generateText}>Generate New Coupon</Text>
      </TouchableOpacity>

      <FlatList
        data={coupons}
        renderItem={renderCoupon}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No coupons yet. Generate one above.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#4a90d9' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  generateButton: {
    backgroundColor: '#4a90d9',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  couponItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usedItem: { opacity: 0.5 },
  couponCode: { fontSize: 16, fontWeight: '600', flex: 1 },
  couponStatus: { fontSize: 12, fontWeight: '600', color: '#4CAF50', marginHorizontal: 8 },
  usedText: { color: '#999' },
  couponDate: { fontSize: 12, color: '#999' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});
