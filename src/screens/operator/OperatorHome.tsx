/**
 * OperatorHome Screen
 *
 * Fleet overview with summary cards, quick actions, recent activity.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated, RefreshControl,
} from 'react-native';
import Colors from '../../constants/colors';
import { mockBuses, mockFees, mockStudents } from '../../services/firebase';
import notificationService, { AppNotification } from '../../services/notifications';

interface OperatorHomeProps {
  navigation: any;
}

export const OperatorHome: React.FC<OperatorHomeProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const opBuses = mockBuses.filter((b) => b.operatorId === 'op-1');
  const activeBuses = opBuses.filter((b) => b.isActive).length;
  const opStudents = mockStudents.filter((s) => s.operatorId === 'op-1');
  const opFees = mockFees.filter((f) => f.operatorId === 'op-1');
  const paidCount = opFees.filter((f) => f.status === 'PAID').length;
  const unpaidCount = opFees.filter((f) => f.status === 'UNPAID').length;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadNotifs();
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  const loadNotifs = async () => {
    const n = await notificationService.getAll();
    setNotifications(n.slice(0, 3));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifs();
    setTimeout(() => setRefreshing(false), 800);
  };

  const activeSOS = notifications.find(n => n.type === 'sos' && !n.read);

  const dismissSOS = async (notifId: string) => {
    await notificationService.markRead(notifId);
    await loadNotifs();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <Text style={styles.loadingEmoji}>🏢</Text>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const summaryCards = [
    { icon: '🚌', value: opBuses.length, label: 'Total Buses', color: Colors.primaryFaded },
    { icon: '🟢', value: activeBuses, label: 'Active Now', color: Colors.successFaded },
    { icon: '✅', value: paidCount, label: 'Paid', color: Colors.successFaded },
    { icon: '⚠️', value: unpaidCount, label: 'Unpaid', color: Colors.errorFaded },
  ];

  const quickActions = [
    { icon: '📢', label: 'Send Reminder', screen: 'SendReminder' },
    { icon: '🎟️', label: 'Generate Coupon', screen: 'CouponManager' },
    { icon: '🗺️', label: 'View Fleet', screen: 'FleetMap' },
    { icon: '💰', label: 'Fee Management', screen: 'FeeManagement' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Operator Panel 🏢</Text>
              <Text style={styles.opName}>SafeRide Transport</Text>
            </View>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>SAFERIDE</Text>
            </View>
          </View>

          {/* SOS Alert Card */}
          {activeSOS && (
            <View style={styles.sosCard}>
              <View style={styles.sosHeader}>
                <Text style={styles.sosTitle}>🚨 EMERGENCY SOS</Text>
                <Text style={styles.sosTime}>
                  {activeSOS.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.sosBody}>{activeSOS.body}</Text>
              <TouchableOpacity
                style={styles.sosDismissBtn}
                onPress={() => dismissSOS(activeSOS.id)}
              >
                <Text style={styles.sosDismissText}>Acknowledge & Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            {summaryCards.map((card, i) => (
              <View key={i} style={[styles.summaryCard, { backgroundColor: card.color }]}>
                <Text style={styles.summaryIcon}>{card.icon}</Text>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={styles.actionCard}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Revenue Summary */}
          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Text style={styles.revenueTitle}>Revenue — June 2026</Text>
              <Text style={styles.revenueAmount}>
                ₹{opFees.filter((f) => f.status === 'PAID').reduce((s, f) => s + f.total, 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.revenueBar}>
              <View style={[styles.revenueFill, { width: `${(paidCount / Math.max(opFees.length, 1)) * 100}%` }]} />
            </View>
            <Text style={styles.revenueSubtext}>
              {paidCount}/{opFees.length} students paid
            </Text>
          </View>

          {/* Recent Activity */}
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {notifications.map((n) => (
            <View key={n.id} style={styles.activityCard}>
              <Text style={styles.activityIcon}>
                {{ info: 'ℹ️', warning: '⚠️', success: '✅', sos: '🚨' }[n.type]}
              </Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{n.title}</Text>
                <Text style={styles.activityBody} numberOfLines={1}>{n.body}</Text>
              </View>
              <Text style={styles.activityTime}>
                {n.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingEmoji: { fontSize: 48, marginBottom: 12 },
  loadingText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  opName: { fontSize: 22, fontWeight: '800', color: Colors.dark, marginTop: 4 },
  codeBadge: {
    backgroundColor: Colors.primaryFaded, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.primary,
  },
  codeText: { fontSize: 12, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  summaryCard: {
    width: '48%', borderRadius: 16, padding: 18, alignItems: 'center', flexGrow: 1,
    flexBasis: '45%',
  },
  summaryIcon: { fontSize: 24, marginBottom: 8 },
  summaryValue: { fontSize: 26, fontWeight: '800', color: Colors.dark },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.dark, marginBottom: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  actionCard: {
    width: '48%', backgroundColor: Colors.white, borderRadius: 16, padding: 20,
    alignItems: 'center', elevation: 2, flexGrow: 1, flexBasis: '45%',
    shadowColor: Colors.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  actionIcon: { fontSize: 28, marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  revenueCard: {
    backgroundColor: Colors.dark, borderRadius: 20, padding: 22, marginBottom: 28,
    elevation: 4,
  },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  revenueTitle: { fontSize: 14, fontWeight: '600', color: Colors.textTertiary },
  revenueAmount: { fontSize: 24, fontWeight: '800', color: Colors.white },
  revenueBar: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  revenueFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 4 },
  revenueSubtext: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' },
  activityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14,
    padding: 14, marginBottom: 8, elevation: 1,
  },
  activityIcon: { fontSize: 22, marginRight: 12 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  activityBody: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  activityTime: { fontSize: 11, color: Colors.textTertiary, fontWeight: '500' },
  sosCard: {
    backgroundColor: Colors.error, borderRadius: 16, padding: 18, marginBottom: 28,
    elevation: 6, shadowColor: Colors.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  sosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sosTitle: { color: Colors.white, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  sosTime: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  sosBody: { color: Colors.white, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  sosDismissBtn: {
    backgroundColor: Colors.white, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  sosDismissText: { color: Colors.error, fontSize: 14, fontWeight: '800' },
});

export default OperatorHome;
