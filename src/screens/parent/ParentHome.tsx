/**
 * ParentHome Screen
 *
 * Shows live tracking card, quick stats, notification feed.
 * Paywall banner if fees are unpaid.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import Colors from '../../constants/colors';
import FeeStatusBanner from '../../components/FeeStatusBanner';
import NotificationCard from '../../components/NotificationCard';
import { useFeeStatus } from '../../hooks/useFeeStatus';
import { mockStudents, mockBuses } from '../../services/firebase';
import notificationService, { AppNotification } from '../../services/notifications';

interface ParentHomeProps {
  navigation: any;
}

export const ParentHome: React.FC<ParentHomeProps> = ({ navigation }) => {
  const [selectedChild, setSelectedChild] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const children = mockStudents.filter((s) => s.parentId === 'par-1');
  const child = children[selectedChild];
  const bus = mockBuses.find((b) => b.id === child?.busId);
  const feeStatus = useFeeStatus('par-1', child?.id);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    loadNotifications();
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  const loadNotifications = async () => {
    const notifs = await notificationService.getAll();
    setNotifications(notifs.slice(0, 5));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setTimeout(() => setRefreshing(false), 800);
  };

  const currentFeeStatus = feeStatus.currentFee?.status ?? (feeStatus.trialInfo.isOnTrial ? 'TRIAL' : 'UNPAID');
  const hasAccess = currentFeeStatus === 'PAID' || currentFeeStatus === 'TRIAL';

  const getTrialExpiryDate = () => {
    if (!feeStatus.trialInfo.isOnTrial) return '';
    const date = new Date();
    date.setDate(date.getDate() + feeStatus.trialInfo.trialDaysRemaining);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <Text style={styles.loadingEmoji}>👨‍👩‍👧</Text>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

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
              <Text style={styles.greeting}>Welcome back 👋</Text>
              <Text style={styles.parentName}>Sneha Sharma</Text>
            </View>
            <TouchableOpacity style={styles.notifBell}>
              <Text style={styles.notifBellIcon}>🔔</Text>
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>2</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Child Selector */}
          {children.length > 1 && (
            <View style={styles.childSelector}>
              {children.map((c, index) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.childChip,
                    selectedChild === index && styles.childChipActive,
                  ]}
                  onPress={() => setSelectedChild(index)}
                >
                  <Text style={styles.childChipEmoji}>
                    {c.gender === 'Male' ? '👦' : '👧'}
                  </Text>
                  <Text
                    style={[
                      styles.childChipText,
                      selectedChild === index && styles.childChipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {currentFeeStatus === 'TRIAL' && (
            <Text style={styles.trialExpiryText}>
              Free trial ends: {getTrialExpiryDate()}
            </Text>
          )}

          {/* Fee Status Banner */}
          <FeeStatusBanner
            status={currentFeeStatus as any}
            amount={feeStatus.breakdown.total}
            trialDaysRemaining={feeStatus.trialInfo.trialDaysRemaining}
            month="June 2026"
            onPayNow={() => navigation.navigate('Payment')}
          />

          {/* Paywall or Content */}
          {!hasAccess ? (
            <View style={styles.paywallContainer}>
              <View style={styles.paywallCard}>
                <Text style={styles.paywallIcon}>🔒</Text>
                <Text style={styles.paywallTitle}>Tracking Locked</Text>
                <Text style={styles.paywallSubtitle}>
                  Pay your pending fees to access live bus tracking and all features.
                </Text>
                <TouchableOpacity
                  style={styles.paywallButton}
                  onPress={() => navigation.navigate('Payment')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.paywallButtonText}>Pay Now & Unlock</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Live Tracking Card */}
              <TouchableOpacity
                style={styles.trackingCard}
                onPress={() => navigation.navigate('LiveTracking')}
                activeOpacity={0.85}
              >
                <View style={styles.trackingCardHeader}>
                  <View>
                    <Text style={styles.trackingLabel}>LIVE TRACKING</Text>
                    <Text style={styles.trackingBusNumber}>
                      {bus?.busNumber ?? 'No Bus'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.liveBadge,
                      { backgroundColor: bus?.isActive ? Colors.success : Colors.textTertiary },
                    ]}
                  >
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>
                      {bus?.isActive ? 'LIVE' : 'OFFLINE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.trackingStats}>
                  <View style={styles.trackingStat}>
                    <Text style={styles.trackingStatValue}>
                      {bus?.speed ?? 0} km/h
                    </Text>
                    <Text style={styles.trackingStatLabel}>Speed</Text>
                  </View>
                  <View style={styles.trackingStatDivider} />
                  <View style={styles.trackingStat}>
                    <Text style={styles.trackingStatValue}>~5 min</Text>
                    <Text style={styles.trackingStatLabel}>ETA</Text>
                  </View>
                  <View style={styles.trackingStatDivider} />
                  <View style={styles.trackingStat}>
                    <Text style={styles.trackingStatValue}>
                      {child?.stopLocation.label ?? '--'}
                    </Text>
                    <Text style={styles.trackingStatLabel}>Your Stop</Text>
                  </View>
                </View>

                <View style={styles.trackingCTA}>
                  <Text style={styles.trackingCTAText}>Tap to view live map →</Text>
                </View>
              </TouchableOpacity>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={[styles.quickStatCard, { backgroundColor: Colors.primaryFaded }]}>
                  <Text style={styles.quickStatValue}>{child?.grade}</Text>
                  <Text style={styles.quickStatLabel}>Grade</Text>
                </View>
                <View style={[styles.quickStatCard, { backgroundColor: Colors.successFaded }]}>
                  <Text style={styles.quickStatValue}>
                    {child?.stopLocation.label.split(' ')[0]}
                  </Text>
                  <Text style={styles.quickStatLabel}>Stop</Text>
                </View>
              </View>
            </>
          )}

          {/* Notifications */}
          <View style={styles.notifSection}>
            <View style={styles.notifHeader}>
              <Text style={styles.sectionTitle}>Recent Updates</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No recent updates</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <NotificationCard
                  key={notif.id}
                  notification={notif}
                  onPress={() => notificationService.markRead(notif.id)}
                />
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  parentName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    marginTop: 4,
  },
  notifBell: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    elevation: 2,
  },
  notifBellIcon: {
    fontSize: 22,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  childSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  childChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
  },
  childChipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
  },
  childChipEmoji: {
    fontSize: 18,
  },
  childChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  childChipTextActive: {
    color: Colors.primary,
  },
  trialExpiryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
    textAlign: 'center',
    marginBottom: 16,
  },
  // Paywall
  paywallContainer: {
    marginBottom: 24,
  },
  paywallCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  paywallIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  paywallTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  paywallSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  paywallButton: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.error,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  paywallButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  // Tracking Card
  trackingCard: {
    backgroundColor: Colors.dark,
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  trackingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  trackingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  trackingBusNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  trackingStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  trackingStat: {
    flex: 1,
    alignItems: 'center',
  },
  trackingStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  trackingStatLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 4,
  },
  trackingStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  trackingCTA: {
    alignItems: 'center',
  },
  trackingCTAText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  quickStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  notifSection: {},
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
});

export default ParentHome;
