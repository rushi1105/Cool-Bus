import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { Route } from './types';

export async function getRoute(routeId: string): Promise<Route | null> {
  const snap = await getDoc(doc(db, 'routes', routeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Route;
}

export async function getRoutesByOperator(operatorId: string): Promise<Route[]> {
  const q = query(
    collection(db, 'routes'),
    where('operatorId', '==', operatorId),
    where('isActive', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Route));
}

export async function getActiveRoutes(): Promise<Route[]> {
  const q = query(
    collection(db, 'routes'),
    where('isActive', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Route));
}

export async function createRoute(
  data: Omit<Route, 'id' | 'version' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'routes'),
    withMetadata({
      ...data,
      version: 1,
      isActive: true,
    } as Record<string, unknown>, ['operatorId', 'name']),
  );
  return ref.id;
}

export async function updateRoute(
  routeId: string,
  data: Partial<Omit<Route, 'id' | 'version' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'routes', routeId), {
    ...data,
    version: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export function onRoutesSnapshot(
  operatorId: string,
  onData: (routes: Route[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'routes'),
    where('operatorId', '==', operatorId),
    where('isActive', '==', true),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const routes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Route));
      onData(routes);
    },
    (err) => {
      console.error('[routeRepository] onRoutesSnapshot error:', err);
      onError?.(err);
    },
  );
}
