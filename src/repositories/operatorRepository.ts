import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import type { Operator, OfficeLocation } from './types';

export async function fetchOperators(): Promise<Operator[]> {
  const snap = await getDocs(collection(db, 'operators'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Operator));
}

export async function fetchOperator(id: string): Promise<Operator | null> {
  const snap = await getDoc(doc(db, 'operators', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Operator;
}

export async function getOperatorByCode(code: string): Promise<Operator | null> {
  const q = query(
    collection(db, 'operators'),
    where('code', '==', code.toUpperCase()),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Operator;
}

export async function getOperatorByPhone(phone: string): Promise<Operator | null> {
  const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
  const q = query(
    collection(db, 'operators'),
    where('phone', '==', normalizedPhone),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Operator;
}

export async function checkOperatorCodeExists(code: string): Promise<boolean> {
  const q = query(
    collection(db, 'operators'),
    where('code', '==', code.toUpperCase()),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function fetchOperatorNames(): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, 'operators'));
  const names: Record<string, string> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    names[d.id] = data.name || d.id;
  });
  return names;
}

/**
 * Update operator's office/base location.
 * Used by LocationManager for initial map region priority.
 */
export async function updateOfficeLocation(
  operatorId: string,
  location: OfficeLocation,
): Promise<void> {
  await updateDoc(doc(db, 'operators', operatorId), {
    officeLocation: location,
    updatedAt: serverTimestamp(),
  });
}
