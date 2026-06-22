import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, withMetadata } from './baseRepository';
import type { Trip, EntitySnapshot, RoutePoint } from './types';

export async function getActiveTrip(busId: string): Promise<Trip | null> {
  const q = query(
    collection(db, 'trips'),
    where('busId', '==', busId),
    where('status', '==', 'ACTIVE'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Trip;
}

export async function getActiveTripByAssignment(assignmentId: string): Promise<Trip | null> {
  const q = query(
    collection(db, 'trips'),
    where('assignmentId', '==', assignmentId),
    where('status', '==', 'ACTIVE'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Trip;
}

export async function startTrip(data: {
  assignmentId: string;
  busId: string;
  driverId: string;
  operatorId: string;
  routeId: string;
  routeSnapshot: EntitySnapshot;
  driverSnapshot: EntitySnapshot;
  busSnapshot: EntitySnapshot;
  operatorSnapshot: EntitySnapshot;
}): Promise<string> {
  if (!data.assignmentId || !data.busId || !data.driverId || !data.operatorId || !data.routeId) {
    throw new Error('Validation failed: startTrip requires assignmentId, busId, driverId, operatorId, routeId');
  }
  const ref = await addDoc(
    collection(db, 'trips'),
    withMetadata({
      ...data,
      status: 'ACTIVE',
      routePoints: [],
      startTime: serverTimestamp(),
    } as Record<string, unknown>, ['assignmentId', 'busId', 'driverId', 'operatorId', 'routeId']),
  );
  return ref.id;
}

export async function addRoutePoints(
  tripId: string,
  points: RoutePoint[],
): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const snap = await getDocs(query(collection(db, 'trips'), where('__name__', '==', tripId)));
  if (snap.empty) return false;
  const existing = snap.docs[0].data().routePoints || [];
  await updateDoc(tripRef, {
    routePoints: [...existing, ...points],
    updatedAt: serverTimestamp(),
  });
  return true;
}

export async function endTrip(
  tripId: string,
  finalPoints?: RoutePoint[],
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status: 'COMPLETED',
    endTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (finalPoints && finalPoints.length > 0) {
    updateData.routePoints = finalPoints;
  }
  await updateDoc(doc(db, 'trips', tripId), updateData);
}

export async function cancelTrip(tripId: string): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId), {
    status: 'CANCELLED',
    endTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function onActiveTripSnapshot(
  busId: string,
  onData: (trip: Trip | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'trips'),
    where('busId', '==', busId),
    where('status', '==', 'ACTIVE'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
        return;
      }
      const d = snapshot.docs[0];
      onData({ id: d.id, ...d.data() } as Trip);
    },
    (err) => {
      console.error('[tripRepository] onActiveTripSnapshot error:', err);
      onError?.(err);
    },
  );
}

export function onActiveTripByAssignmentSnapshot(
  assignmentId: string,
  onData: (trip: Trip | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'trips'),
    where('assignmentId', '==', assignmentId),
    where('status', '==', 'ACTIVE'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
        return;
      }
      const d = snapshot.docs[0];
      onData({ id: d.id, ...d.data() } as Trip);
    },
    (err) => {
      console.error('[tripRepository] onActiveTripByAssignmentSnapshot error:', err);
      onError?.(err);
    },
  );
}

export async function getTripsByOperatorAndStatus(
  operatorId: string,
  status: string,
): Promise<Trip[]> {
  const q = query(
    collection(db, 'trips'),
    where('operatorId', '==', operatorId),
    where('status', '==', status),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
}

export function onOperatorTripsSnapshot(
  operatorId: string,
  onData: (trips: Trip[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'trips'),
    where('operatorId', '==', operatorId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const trips = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
      onData(trips);
    },
    (err) => {
      console.error('[tripRepository] onOperatorTripsSnapshot error:', err);
      onError?.(err);
    },
  );
}

export async function getActiveTripForBus(busId: string): Promise<boolean> {
  const q = query(
    collection(db, 'trips'),
    where('busId', '==', busId),
    where('status', '==', 'ACTIVE'),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
