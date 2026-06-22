import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, withMetadata } from './baseRepository';
import type { AppNotification } from './types';

export async function addNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (!data.userId || !data.type || !data.title || !data.message) {
    throw new Error('Validation failed: addNotification requires userId, type, title, message');
  }
  const ref = await addDoc(
    collection(db, 'notifications'),
    withMetadata(data as Record<string, unknown>, ['userId', 'type', 'title', 'message']),
  );
  return ref.id;
}

export function onNotificationsSnapshot(
  userId: string,
  onData: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs: AppNotification[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];

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

      onData(notifs);
    },
    (err) => {
      console.error('[notificationRepository] onNotificationsSnapshot error:', err);
      onError?.(err);
    },
  );
}

export async function markRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

export async function markAllRead(userId: string): Promise<void> {
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
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
}
