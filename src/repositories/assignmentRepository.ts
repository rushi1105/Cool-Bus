import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { Assignment } from './types';

export async function getAssignmentByRouteAndDate(
  routeId: string,
  date: string,
): Promise<Assignment | null> {
  const q = query(
    collection(db, 'assignments'),
    where('routeId', '==', routeId),
    where('date', '==', date),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Assignment;
}

export async function getAssignmentsByRoute(routeId: string): Promise<Assignment[]> {
  const q = query(
    collection(db, 'assignments'),
    where('routeId', '==', routeId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
}

export async function getOperatorAssignmentsByDate(
  operatorId: string,
  date: string,
): Promise<Assignment[]> {
  const q = query(
    collection(db, 'assignments'),
    where('operatorId', '==', operatorId),
    where('date', '==', date),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
}

export async function checkDriverConflict(
  driverId: string,
  date: string,
  shift: string,
): Promise<boolean> {
  const q = query(
    collection(db, 'assignments'),
    where('driverId', '==', driverId),
    where('date', '==', date),
    where('shift', '==', shift),
    where('status', 'in', ['SCHEDULED', 'IN_PROGRESS']),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function checkBusConflict(
  busId: string,
  date: string,
  shift: string,
): Promise<boolean> {
  const q = query(
    collection(db, 'assignments'),
    where('busId', '==', busId),
    where('date', '==', date),
    where('shift', '==', shift),
    where('status', 'in', ['SCHEDULED', 'IN_PROGRESS']),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createAssignment(
  data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'assignments'),
    withMetadata({ ...data, status: 'SCHEDULED' } as Record<string, unknown>, ['operatorId', 'driverId', 'busId', 'routeId', 'date', 'shift']),
  );
  return ref.id;
}

export async function cancelAssignment(assignmentId: string): Promise<void> {
  await updateDoc(doc(db, 'assignments', assignmentId), {
    status: 'CANCELLED',
    updatedAt: serverTimestamp(),
  });
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: Assignment['status'],
): Promise<void> {
  await updateDoc(doc(db, 'assignments', assignmentId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function onAssignmentsSnapshot(
  routeId: string,
  date: string,
  onData: (assignments: Assignment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'assignments'),
    where('routeId', '==', routeId),
    where('date', '==', date),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const assignments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
      onData(assignments);
    },
    (err) => {
      console.error('[assignmentRepository] onAssignmentsSnapshot error:', err);
      onError?.(err);
    },
  );
}

export function onOperatorAssignmentsSnapshot(
  operatorId: string,
  date: string,
  onData: (assignments: Assignment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'assignments'),
    where('operatorId', '==', operatorId),
    where('date', '==', date),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const assignments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
      onData(assignments);
    },
    (err) => {
      console.error('[assignmentRepository] onOperatorAssignmentsSnapshot error:', err);
      onError?.(err);
    },
  );
}
