import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { User } from './types';

export async function getDriversByOperator(operatorId: string): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('operatorId', '==', operatorId),
    where('role', '==', 'driver'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
}

export async function getDriverById(driverId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', driverId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  const q = query(collection(db, 'users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as User;
}

export async function createDriverInvite(
  phone: string,
  operatorId: string,
  operatorName: string,
): Promise<string> {
  if (!phone || !operatorId || !operatorName) {
    throw new Error(`Validation failed: createDriverInvite requires phone, operatorId, operatorName`);
  }
  const inviteRef = doc(collection(db, 'invites'));
  await setDoc(inviteRef, {
    phone,
    operatorId,
    operatorName,
    status: 'PENDING',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return inviteRef.id;
}

export async function getPendingInviteByPhone(phone: string): Promise<{
  id: string;
  operatorId: string;
  operatorName: string;
  status: string;
} | null> {
  const q = query(
    collection(db, 'invites'),
    where('phone', '==', phone),
    where('status', '==', 'PENDING'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    operatorId: data.operatorId,
    operatorName: data.operatorName,
    status: data.status,
  };
}

export async function acceptInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, 'invites', inviteId), {
    status: 'ACCEPTED',
    updatedAt: serverTimestamp(),
  });
}

export async function updateUser(
  uid: string,
  data: Partial<Omit<User, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function onDriversSnapshot(
  operatorId: string,
  onData: (drivers: User[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users'),
    where('operatorId', '==', operatorId),
    where('role', '==', 'driver'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const drivers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
      onData(drivers);
    },
    (err) => {
      console.error('[userRepository] onDriversSnapshot error:', err);
      onError?.(err);
    },
  );
}

/**
 * Enable driver mode for an operator.
 * Adds 'driver' to the roles array and sets isOperatorDriver flag.
 */
export async function enableDriverMode(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    roles: arrayUnion('driver'),
    isOperatorDriver: true,
    updatedAt: serverTimestamp(),
  });
}
