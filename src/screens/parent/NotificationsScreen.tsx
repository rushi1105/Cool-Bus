/**
 * NotificationsScreen — Parent Notifications Feed
 *
 * Real-time notification list from Firestore /notifications collection.
 * Displays relative timestamps, icons colored by severity, and read/unread states.
 * Allows tapping to mark a single notification read or tapping "Mark All Read".
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications, type Notification } from '../../hooks/useNotifications';

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { notifications, loading, markRead, markAllRead } = useNotifications(user?.uid || null);

  // Helper to format timestamps relatively
  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp instanceof Date
      ? timestamp
      : timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationStyle = (type: Notification['type'], isRead: boolean) => {
    const config = {
      info: {
        bg: Colors.primaryFaded,
        border: Colors.primary,
        icon: 'ℹ️',
      },
      warning: {
        bg: Colors.warningFaded,
        border: Colors.warning,
        icon: '⚠️',
      },
      success: {
        bg: Colors.successFaded,
        border: Colors.success,
        icon: '✅',
      },
    }[type] || {
      bg: Colors.background,
      border: Colors.border,
      icon: '🔔',
    };

    return {
      ...config,
      opacity: isRead ? 0.6 : 1,
    };
  };

  const handleMarkRead = (item: Notification) => {
    if (!item.read) {
      markRead(item.id);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const styleConfig = getNotificationStyle(item.type, item.read);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: styleConfig.bg,
            borderColor: item.read ? Colors.border : styleConfig.border,
            opacity: styleConfig.opacity,
          },
        ]}
        onPress={() => handleMarkRead(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{styleConfig.icon}</Text>
          <Text style={styles.timeText}>{formatRelativeTime(item.timestamp)}</Text>
        </View>
        <Text style={[styles.messageText, item.read && styles.messageReadText]}>
          {item.message}
        </Text>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: styleConfig.border }]} />}
      </TouchableOpacity>
    );
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Notifications</Text>
          
          {hasUnread ? (
            <TouchableOpacity
              onPress={markAllRead}
              style={styles.markAllButton}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllText}>Read All</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderButton} />
          )}
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Fetching notification updates...</Text>
          </View>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              You have no notifications or updates at this moment.
            </Text>
          </View>
        ) : (
          /* List Feed */
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingLeft: 12,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  placeholderButton: {
    width: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    position: 'relative',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 20,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 20,
    paddingRight: 10,
  },
  messageReadText: {
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default NotificationsScreen;
