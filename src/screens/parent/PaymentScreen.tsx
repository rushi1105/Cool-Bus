/**
 * PaymentScreen
 *
 * Monthly fee breakdown, trial info, and Pay Now button.
 */

import React, { useState } from 'react';
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
import { useFeeStatus } from '../../hooks/useFeeStatus';

interface PaymentScreenProps {
  navigation: any;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation }) => {
  const feeStatus = useFeeStatus();
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async () => {
    if (!feeStatus.currentFee) return;
    setIsPaying(true);
    const success = await feeStatus.payFee(feeStatus.currentFee.id);
    setIsPaying(false);
    if (success) {
      // Show success — will reload via state
    }
  };

  const { breakdown, trialInfo, currentFee } = feeStatus;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Payment</Text>

        {/* Student Card */}
        <View style={styles.studentCard}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>👦</Text>
          </View>
          <View>
            <Text style={styles.studentName}>Arjun Sharma</Text>
            <Text style={styles.studentGrade}>Grade 5th • SafeRide Transport</Text>
          </View>
        </View>

        {/* Trial Info */}
        {trialInfo.isOnTrial && (
          <View style={styles.trialCard}>
            <Text style={styles.trialIcon}>🎁</Text>
            <View style={styles.trialContent}>
              <Text style={styles.trialTitle}>Free Trial Active</Text>
              <Text style={styles.trialDays}>
                {trialInfo.trialDaysRemaining} days remaining
              </Text>
              <View style={styles.trialBar}>
                <View
                  style={[
                    styles.trialFill,
                    {
                      width: `${((30 - trialInfo.trialDaysRemaining) / 30) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Fee Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>June 2026 — Fee Breakdown</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Bus Transport Fee</Text>
            <Text style={styles.breakdownValue}>₹{breakdown.busFee.toLocaleString()}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee</Text>
            <Text style={styles.breakdownValue}>₹{breakdown.platformFee}</Text>
          </View>
          {breakdown.discount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: Colors.success }]}>
                Coupon Discount
              </Text>
              <Text style={[styles.breakdownValue, { color: Colors.success }]}>
                -₹{breakdown.discount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{breakdown.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodSection}>
          <Text style={styles.methodTitle}>Accepted Payments</Text>
          <View style={styles.methodIcons}>
            {['💳 Card', '🏦 UPI', '📱 GPay', '🏪 PhonePe'].map((method) => (
              <View key={method} style={styles.methodChip}>
                <Text style={styles.methodChipText}>{method}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pay Button */}
        {currentFee?.status !== 'PAID' && (
          <TouchableOpacity
            style={[
              styles.payButton,
              isPaying && styles.payButtonDisabled,
            ]}
            onPress={handlePay}
            disabled={isPaying}
            activeOpacity={0.85}
          >
            {isPaying ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.payButtonText}>
                  Pay ₹{breakdown.total.toLocaleString()}
                </Text>
                <Text style={styles.payButtonSub}>Powered by Razorpay</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {currentFee?.status === 'PAID' && (
          <View style={styles.paidBanner}>
            <Text style={styles.paidBannerIcon}>✅</Text>
            <Text style={styles.paidBannerText}>
              June 2026 fees paid on{' '}
              {currentFee.paidAt?.toLocaleDateString('en-IN') ?? 'N/A'}
            </Text>
          </View>
        )}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your payment is secure and encrypted. We never store your card details.
          </Text>
        </View>
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
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 24,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    gap: 14,
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: 24,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  studentGrade: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trialCard: {
    flexDirection: 'row',
    backgroundColor: Colors.warningFaded,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.warning,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    alignItems: 'flex-start',
  },
  trialIcon: {
    fontSize: 28,
  },
  trialContent: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.warning,
  },
  trialDays: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  trialBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trialFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
  breakdownCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  methodSection: {
    marginBottom: 24,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  methodIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  payButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  payButtonSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  paidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successFaded,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  paidBannerIcon: {
    fontSize: 24,
  },
  paidBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  securityIcon: {
    fontSize: 14,
  },
  securityText: {
    fontSize: 12,
    color: Colors.textTertiary,
    flex: 1,
    lineHeight: 16,
  },
});

export default PaymentScreen;
