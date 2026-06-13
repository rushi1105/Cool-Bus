/**
 * FeeStatusBanner Component
 *
 * Displays fee/trial status with contextual styling.
 * Shows paywall message when unpaid, trial countdown when on trial,
 * and success confirmation when paid.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/colors';
import type { FeeStatus } from '../constants/config';

interface FeeStatusBannerProps {
  status: FeeStatus;
  amount?: number;
  trialDaysRemaining?: number;
  month?: string;
  onPayNow?: () => void;
  compact?: boolean;
}

export const FeeStatusBanner: React.FC<FeeStatusBannerProps> = ({
  status,
  amount = 0,
  trialDaysRemaining = 0,
  month,
  onPayNow,
  compact = false,
}) => {
  const config = {
    PAID: {
      bg: Colors.successFaded,
      border: Colors.success,
      icon: '✅',
      title: 'Fees Paid',
      subtitle: month ? `${month} — ₹${amount.toLocaleString()}` : 'All fees up to date',
      textColor: Colors.success,
    },
    UNPAID: {
      bg: Colors.errorFaded,
      border: Colors.error,
      icon: '⚠️',
      title: 'Payment Due',
      subtitle: `₹${amount.toLocaleString()} pending${month ? ` for ${month}` : ''}`,
      textColor: Colors.error,
    },
    TRIAL: {
      bg: Colors.warningFaded,
      border: Colors.warning,
      icon: '🎁',
      title: 'Free Trial Active',
      subtitle: `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`,
      textColor: Colors.warning,
    },
  }[status];

  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          { backgroundColor: config.bg, borderColor: config.border },
        ]}
      >
        <Text style={styles.compactIcon}>{config.icon}</Text>
        <Text style={[styles.compactText, { color: config.textColor }]}>
          {config.title}
        </Text>
        {status === 'TRIAL' && (
          <View style={[styles.daysBadge, { backgroundColor: config.border }]}>
            <Text style={styles.daysBadgeText}>{trialDaysRemaining}d</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: config.textColor }]}>
            {config.title}
          </Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>
      </View>

      {status === 'UNPAID' && onPayNow && (
        <TouchableOpacity
          style={styles.payButton}
          onPress={onPayNow}
          activeOpacity={0.8}
        >
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}

      {status === 'TRIAL' && (
        <View style={styles.trialBar}>
          <View
            style={[
              styles.trialProgress,
              {
                width: `${Math.max(5, ((30 - trialDaysRemaining) / 30) * 100)}%`,
                backgroundColor: config.border,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  payButton: {
    marginTop: 12,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  trialBar: {
    marginTop: 12,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trialProgress: {
    height: '100%',
    borderRadius: 3,
  },
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  compactIcon: {
    fontSize: 16,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  daysBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  daysBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});

export default FeeStatusBanner;
