/**
 * useNotifications Hook
 *
 * Real-time notifications from Firestore /notifications collection.
 * Provides unread count badge, mark-read, and mark-all-read.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../services/firebase';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'success';
  message: string;
  timestamp: any;
  read: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (notifId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: Notification[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Notification[];

        // Sort in memory by timestamp descending to bypass Firestore composite index requirement
        notifs.sort((a, b) => {
          const getMs = (ts: any) => {
            if (!ts) return 0;
            if (ts instanceof Date) return ts.getTime();
            if (ts.toDate) return ts.toDate().getTime();
            if (ts.seconds) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
            return new Date(ts).getTime();
          };
          return getMs(b.timestamp) - getMs(a.timestamp);
        });

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
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      console.error('[useNotifications] markRead error:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
      );
      const snap = await getDocs(q);
      if (snap.empty) return;

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('[useNotifications] markAllRead error:', err);
    }
  }, [userId]);

  return { notifications, unreadCount, loading, error, markRead, markAllRead };
}

export default useNotifications;
