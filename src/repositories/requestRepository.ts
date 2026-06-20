import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { StopChangeRequest } from './types';

export async function createRequest(data: {
  operatorId: string;
  parentId: string;
  studentId: string;
  routeId: string;
  currentStopId: string;
  requestedStopId: string;
  reason?: string;
}): Promise<string> {
  const ref = await addDoc(
    collection(db, 'requests'),
    withMetadata({
      ...data,
      status: 'PENDING',
    } as Record<string, unknown>, ['operatorId', 'parentId', 'studentId', 'routeId']),
  );
  return ref.id;
}

export async function resolveRequest(
  requestId: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<void> {
  await updateDoc(doc(db, 'requests', requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getRequestsByOperator(
  operatorId: string,
): Promise<StopChangeRequest[]> {
  const q = query(
    collection(db, 'requests'),
    where('operatorId', '==', operatorId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StopChangeRequest));
}

export async function getRequestsByParent(
  parentId: string,
): Promise<StopChangeRequest[]> {
  const q = query(
    collection(db, 'requests'),
    where('parentId', '==', parentId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StopChangeRequest));
}

export function onRequestsByOperatorSnapshot(
  operatorId: string,
  onData: (requests: StopChangeRequest[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'requests'),
    where('operatorId', '==', operatorId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StopChangeRequest));
      onData(requests);
    },
    (err) => {
      console.error('[requestRepository] onRequestsByOperatorSnapshot error:', err);
      onError?.(err);
    },
  );
}

export function onRequestsByParentSnapshot(
  parentId: string,
  onData: (requests: StopChangeRequest[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'requests'),
    where('parentId', '==', parentId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StopChangeRequest));
      onData(requests);
    },
    (err) => {
      console.error('[requestRepository] onRequestsByParentSnapshot error:', err);
      onError?.(err);
    },
  );
}
