/**
 * NotificationCard Component
 *
 * Renders a single notification item with icon, timestamp, and type-based styling.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/colors';
import type { AppNotification } from '../services/notifications';

interface NotificationCardProps {
  notification: AppNotification;
  onPress?: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
}) => {
  const typeConfig = {
    info: { icon: 'ℹ️', color: Colors.primary, bg: Colors.primaryFaded },
    warning: { icon: '⚠️', color: Colors.warning, bg: Colors.warningFaded },
    success: { icon: '✅', color: Colors.success, bg: Colors.successFaded },
    sos: { icon: '🚨', color: Colors.error, bg: Colors.errorFaded },
  }[notification.type];

  const timeAgo = getTimeAgo(notification.timestamp);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.read && styles.unread,
        !notification.read && { borderLeftColor: typeConfig.color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: typeConfig.bg }]}>
        <Text style={styles.icon}>{typeConfig.icon}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.title, !notification.read && styles.titleUnread]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>

      {!notification.read && <View style={[styles.dot, { backgroundColor: typeConfig.color }]} />}
    </TouchableOpacity>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 0,
    elevation: 1,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  unread: {
    borderLeftWidth: 3,
    backgroundColor: '#FAFCFF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  body: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});

export default NotificationCard;
