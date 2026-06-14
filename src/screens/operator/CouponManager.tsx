/**
 * CouponManager Screen — Generate + track coupons
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import { useCoupon } from '../../hooks/useCoupon';

interface CouponManagerProps { navigation: any }

export const CouponManager: React.FC<CouponManagerProps> = () => {
  const { coupons, isLoadingCoupons, loadCoupons, generateCoupon } = useCoupon();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadCoupons('op-1');
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateCoupon('op-1', 'SafeRide');
    setIsGenerating(false);
  };

  const usedCount = coupons.filter((c) => c.isUsed).length;
  const unusedCount = coupons.filter((c) => !c.isUsed).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Coupon Manager</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.primaryFaded }]}>
            <Text style={styles.statValue}>{coupons.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.successFaded }]}>
            <Text style={styles.statValue}>{usedCount}</Text>
            <Text style={styles.statLabel}>Used</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.warningFaded }]}>
            <Text style={styles.statValue}>{unusedCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerate}
          disabled={isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.generateBtnIcon}>🎟️</Text>
              <Text style={styles.generateBtnText}>Generate New Coupon</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.formatHint}>Format: SAFERIDE-FREE-XXXX</Text>

        {/* Coupon List */}
        <Text style={styles.sectionTitle}>All Coupons</Text>

        {isLoadingCoupons ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading coupons...</Text>
          </View>
        ) : coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎟️</Text>
            <Text style={styles.emptyText}>No coupons generated yet</Text>
          </View>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <View style={styles.couponLeft}>
                <Text style={styles.couponCode}>{coupon.code}</Text>
                <Text style={styles.couponDate}>
                  Created: {coupon.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <Text style={styles.couponExpiry}>
                  Expires: {coupon.expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {coupon.isUsed && coupon.usedBy && (
                  <Text style={styles.couponUsedBy}>Used by: {coupon.usedBy}</Text>
                )}
              </View>
              <View style={[styles.couponBadge, {
                backgroundColor: coupon.isUsed ? Colors.successFaded : Colors.warningFaded,
              }]}>
                <Text style={[styles.couponBadgeText, {
                  color: coupon.isUsed ? Colors.success : Colors.warning,
                }]}>
                  {coupon.isUsed ? 'USED' : 'UNUSED'}
                </Text>
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
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.dark },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', marginTop: 4 },
  generateBtn: {
    height: 56, backgroundColor: Colors.primary, borderRadius: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  generateBtnIcon: { fontSize: 22 },
  generateBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  formatHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: 8, marginBottom: 28, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.dark, marginBottom: 14 },
  loading: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingText: { fontSize: 13, color: Colors.textTertiary },
  couponCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 10, elevation: 1,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  couponLeft: { flex: 1 },
  couponCode: { fontSize: 15, fontWeight: '800', color: Colors.dark, letterSpacing: 0.5, fontFamily: 'monospace' },
  couponDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  couponExpiry: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  couponUsedBy: { fontSize: 12, color: Colors.success, fontWeight: '600', marginTop: 4 },
  couponBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  couponBadgeText: { fontSize: 11, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.white, borderRadius: 18 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, fontWeight: '500' },
});

export default CouponManager;
