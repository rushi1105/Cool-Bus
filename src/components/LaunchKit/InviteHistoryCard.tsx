import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import { useInvites } from '../../hooks/useInvites';
import { useAuth } from '../../hooks/useAuth';

export const InviteHistoryCard: React.FC = () => {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId || null;
  const operatorName = profile?.name || 'Operator';
  
  const { acceptances, loading } = useInvites(operatorId, operatorName);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (!acceptances || acceptances.length === 0) {
    return null; // Don't show if there's no history yet
  }

  // Sort acceptances by date, newest first
  const sortedAcceptances = [...acceptances].sort((a, b) => {
    const timeA = a.acceptedAt?.toMillis ? a.acceptedAt.toMillis() : 0;
    const timeB = b.acceptedAt?.toMillis ? b.acceptedAt.toMillis() : 0;
    return timeB - timeA;
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recent Registrations</Text>
      <Text style={styles.description}>Users who joined via your invite links.</Text>

      <View style={styles.listContainer}>
        {sortedAcceptances.slice(0, 5).map((acceptance) => (
          <View key={acceptance.id} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <View style={[styles.roleBadge, acceptance.role === 'driver' ? styles.badgeDriver : styles.badgeParent]}>
                <Text style={styles.roleBadgeText}>
                  {acceptance.role === 'driver' ? 'D' : 'P'}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{acceptance.userName || 'Unknown User'}</Text>
                <Text style={styles.roleText}>{acceptance.role.charAt(0).toUpperCase() + acceptance.role.slice(1)}</Text>
              </View>
            </View>
            <Text style={styles.dateText}>
              {acceptance.acceptedAt?.toDate ? acceptance.acceptedAt.toDate().toLocaleDateString() : 'Recent'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  listContainer: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDriver: {
    backgroundColor: '#E0E7FF',
  },
  badgeParent: {
    backgroundColor: '#DCFCE7',
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  roleText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
