import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { Fee } from './types';

export async function getFeesByOperatorAndStatus(
  operatorId: string,
  status: string,
): Promise<Fee[]> {
  const q = query(
    collection(db, 'fees'),
    where('operatorId', '==', operatorId),
    where('status', '==', status),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fee));
}

export function onOperatorFeesSnapshot(
  operatorId: string,
  onData: (fees: Fee[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'fees'),
    where('operatorId', '==', operatorId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const fees = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Fee));
      onData(fees);
    },
    (err) => {
      console.error('[feeRepository] onOperatorFeesSnapshot error:', err);
      onError?.(err);
    },
  );
}

export async function getFees(
  parentId: string,
): Promise<Fee[]> {
  const q = query(collection(db, 'fees'), where('parentId', '==', parentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fee));
}

export async function getFeesByOperator(
  operatorId: string,
): Promise<Fee[]> {
  const q = query(collection(db, 'fees'), where('operatorId', '==', operatorId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fee));
}

export async function createFeeDoc(
  data: Omit<Fee, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'fees'), withMetadata(data as Record<string, unknown>, ['operatorId', 'studentId', 'parentId', 'month']));
  return ref.id;
}

export async function payFee(feeId: string): Promise<void> {
  await updateDoc(doc(db, 'fees', feeId), {
    status: 'PAID',
    paidAt: serverTimestamp(),
  });
}

export function onFeeSnapshot(
  feeId: string,
  onData: (fee: Fee | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'fees', feeId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData({ id: snapshot.id, ...snapshot.data() } as Fee);
    },
    (err) => {
      console.error('[feeRepository] onFeeSnapshot error:', err);
      onError?.(err);
    },
  );
}

export function onParentFeesSnapshot(
  parentId: string,
  onData: (fees: Fee[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'fees'),
    where('parentId', '==', parentId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const fees = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Fee));
      onData(fees);
    },
    (err) => {
      console.error('[feeRepository] onParentFeesSnapshot error:', err);
      onError?.(err);
    },
  );
}
