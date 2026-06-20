/**
 * useNotifications Hook
 *
 * Real-time notifications from Firestore /notifications collection.
 * Provides unread count badge, mark-read, and mark-all-read.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  onNotificationsSnapshot,
  markRead as repoMarkRead,
  markAllRead as repoMarkAllRead,
} from '../repositories/notificationRepository';
import type { AppNotification } from '../repositories/types';

export type { AppNotification as Notification };

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (notifId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onNotificationsSnapshot(
      userId,
      (notifs) => {
        setNotifications(notifs);
        setLoading(false);
      },
      (err) => {
        console.error('[useNotifications] Snapshot error:', err);
        setError('Failed to load notifications');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (notifId: string) => {
    try {
      await repoMarkRead(notifId);
    } catch (err) {
      console.error('[useNotifications] markRead error:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await repoMarkAllRead(userId);
    } catch (err) {
      console.error('[useNotifications] markAllRead error:', err);
    }
  }, [userId]);

  return { notifications, unreadCount, loading, error, markRead, markAllRead };
}

export default useNotifications;
