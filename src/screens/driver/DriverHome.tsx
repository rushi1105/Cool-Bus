/**
 * DriverHome Screen
 *
 * Ola-inspired UI with large Start/End trip button, trip status, route summary.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import Colors from '../../constants/colors';
import TripButton from '../../components/TripButton';
import { mockTrips, mockBuses } from '../../services/firebase';

interface DriverHomeProps {
  navigation: any;
}

export const DriverHome: React.FC<DriverHomeProps> = ({ navigation }) => {
  const [isTripActive, setIsTripActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bus = mockBuses[0];
  const todayTrips = mockTrips.filter(
    (t) => t.driverId === 'drv-1' && t.status === 'COMPLETED',
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setTimeout(() => setIsLoading(false), 800);
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTripActive && tripStartTime) {
      interval = setInterval(() => {
        const diff = Date.now() - tripStartTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTripActive, tripStartTime]);

  const handleTripToggle = () => {
    if (isTripActive) {
      setIsTripActive(false);
      setTripStartTime(null);
      setElapsedTime('00:00:00');
    } else {
      setIsTripActive(true);
      setTripStartTime(new Date());
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <Text style={styles.loadingEmoji}>🚌</Text>
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
              <Text style={styles.greeting}>Good Morning 👋</Text>
              <Text style={styles.driverName}>Rajesh Kumar</Text>
            </View>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatar}>👤</Text>
              <View style={[styles.onlineIndicator, isTripActive && styles.onlineActive]} />
            </View>
          </View>

          {/* Bus Info Card */}
          <View style={styles.busCard}>
            <View style={styles.busCardHeader}>
              <Text style={styles.busCardIcon}>🚌</Text>
              <View style={styles.busCardInfo}>
                <Text style={styles.busNumber}>{bus.busNumber}</Text>
                <Text style={styles.busOperator}>SafeRide Transport</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isTripActive ? Colors.successFaded : Colors.warningFaded },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isTripActive ? Colors.success : Colors.warning },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isTripActive ? Colors.success : Colors.warning },
                  ]}
                >
                  {isTripActive ? 'On Trip' : 'Idle'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trip Button */}
          <View style={styles.tripButtonContainer}>
            <TripButton
              isActive={isTripActive}
              onPress={handleTripToggle}
              elapsedTime={isTripActive ? elapsedTime : undefined}
            />
          </View>

          {/* Quick Stats */}
          {isTripActive && (
            <View style={styles.tripStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{bus.speed}</Text>
                <Text style={styles.statLabel}>km/h</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>4</Text>
                <Text style={styles.statLabel}>Stops</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
            </View>
          )}

          {/* Today's Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Today's Summary</Text>

            <View style={styles.summaryCards}>
              <View style={[styles.summaryCard, { backgroundColor: Colors.primaryFaded }]}>
                <Text style={styles.summaryCardValue}>{todayTrips.length}</Text>
                <Text style={styles.summaryCardLabel}>Trips Done</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: Colors.successFaded }]}>
                <Text style={styles.summaryCardValue}>12.5 km</Text>
                <Text style={styles.summaryCardLabel}>Distance</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: Colors.warningFaded }]}>
                <Text style={styles.summaryCardValue}>1h 15m</Text>
                <Text style={styles.summaryCardLabel}>Drive Time</Text>
              </View>
            </View>
          </View>

          {/* Recent Trips */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>

            {todayTrips.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No trips completed today</Text>
                <Text style={styles.emptySubtext}>
                  Start your first trip by tapping the button above
                </Text>
              </View>
            ) : (
              todayTrips.map((trip) => (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripCardLeft}>
                    <View style={styles.tripDot} />
                    <View style={styles.tripLine} />
                    <View style={[styles.tripDot, styles.tripDotEnd]} />
                  </View>
                  <View style={styles.tripCardContent}>
                    <View style={styles.tripRow}>
                      <Text style={styles.tripTime}>
                        {trip.startTime.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text style={styles.tripLabel}>Started</Text>
                    </View>
                    <View style={styles.tripRow}>
                      <Text style={styles.tripTime}>
                        {trip.endTime?.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) ?? '--:--'}
                      </Text>
                      <Text style={styles.tripLabel}>Ended</Text>
                    </View>
                  </View>
                  <View style={styles.tripCardRight}>
                    <Text style={styles.tripStops}>
                      {trip.routePoints.length} stops
                    </Text>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓</Text>
                    </View>
                  </View>
                </View>
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
  driverName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    marginTop: 4,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    fontSize: 36,
    width: 48,
    height: 48,
    textAlign: 'center',
    lineHeight: 48,
    backgroundColor: Colors.primaryFaded,
    borderRadius: 24,
    overflow: 'hidden',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.textTertiary,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  onlineActive: {
    backgroundColor: Colors.success,
  },
  busCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    marginBottom: 32,
  },
  busCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busCardIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  busCardInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  busOperator: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tripButtonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 24,
  },
  tripStats: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    marginBottom: 28,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
  },
  summarySection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 14,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  summaryCardLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  recentSection: {},
  tripCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  tripCardLeft: {
    alignItems: 'center',
    marginRight: 14,
    paddingVertical: 2,
  },
  tripDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  tripLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  tripDotEnd: {
    backgroundColor: Colors.error,
  },
  tripCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripTime: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  tripLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  tripCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tripStops: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.successFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadgeText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderRadius: 18,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default DriverHome;
