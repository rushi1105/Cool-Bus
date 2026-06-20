import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, withMetadata } from './baseRepository';
import type { Bus } from './types';

export async function fetchBusesByOperator(operatorId: string): Promise<Bus[]> {
  const q = query(
    collection(db, 'buses'),
    where('operatorId', '==', operatorId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bus));
}

export async function getBus(busId: string): Promise<Bus | null> {
  const snap = await getDoc(doc(db, 'buses', busId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Bus;
}

export async function updateBusLocation(
  busId: string,
  location: { latitude: number; longitude: number },
  speed: number,
): Promise<void> {
  await updateDoc(doc(db, 'buses', busId), {
    currentLocation: location,
    speed,
    lastUpdated: serverTimestamp(),
  });
}

export async function fetchBusesByRoute(routeId: string): Promise<Bus[]> {
  const q = query(
    collection(db, 'buses'),
    where('defaultRouteId', '==', routeId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bus));
}

export async function updateBus(
  busId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, 'buses', busId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function createBus(
  data: Omit<Bus, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'buses'),
    withMetadata(data as Record<string, unknown>, ['operatorId', 'busNumber']),
  );
  return ref.id;
}

export async function deleteBus(busId: string): Promise<void> {
  await deleteDoc(doc(db, 'buses', busId));
}

export async function checkBusNumberExists(
  busNumber: string,
  operatorId: string,
  excludeId?: string,
): Promise<boolean> {
  const constraints = [where('busNumber', '==', busNumber), where('operatorId', '==', operatorId)];
  if (excludeId) {
    constraints.push(where('__name__', '!=', excludeId));
  }
  const q = query(collection(db, 'buses'), ...constraints);
  const snap = await getDocs(q);
  return !snap.empty;
}

export function onBusSnapshot(
  busId: string,
  onData: (bus: Bus | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'buses', busId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData({ id: snapshot.id, ...snapshot.data() } as Bus);
    },
    (err) => {
      console.error('[fleetRepository] onBusSnapshot error:', err);
      onError?.(err);
    },
  );
}

export function onBusesSnapshot(
  operatorId: string,
  onData: (buses: Bus[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'buses'),
    where('operatorId', '==', operatorId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const buses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Bus));
      onData(buses);
    },
    (err) => {
      console.error('[fleetRepository] onBusesSnapshot error:', err);
      onError?.(err);
    },
  );
}
