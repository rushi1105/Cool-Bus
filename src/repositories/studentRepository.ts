import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { Student } from './types';

export async function addStudentDoc(
  data: Omit<Student, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'students'), withMetadata(data as Record<string, unknown>, ['parentId', 'name', 'operatorId']));
  return ref.id;
}

export async function getStudentCountByParent(parentId: string): Promise<number> {
  const q = query(
    collection(db, 'students'),
    where('parentId', '==', parentId),
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function getStudentsByParent(
  parentId: string,
): Promise<Student[]> {
  const q = query(collection(db, 'students'), where('parentId', '==', parentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
}

export async function getStudentsByOperatorId(
  operatorId: string,
): Promise<Student[]> {
  const q = query(collection(db, 'students'), where('operatorId', '==', operatorId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
}

export async function getStudentsByBus(busId: string): Promise<Student[]> {
  const q = query(collection(db, 'students'), where('busId', '==', busId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
}

export function onStudentsSnapshot(
  parentId: string,
  onData: (students: Student[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'students'),
    where('parentId', '==', parentId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      onData(students);
    },
    (err) => {
      console.error('[studentRepository] onStudentsSnapshot error:', err);
      onError?.(err);
    },
  );
}

export function onStudentsByOperatorSnapshot(
  operatorId: string,
  onData: (students: Student[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'students'),
    where('operatorId', '==', operatorId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      onData(students);
    },
    (err) => {
      console.error('[studentRepository] onStudentsByOperatorSnapshot error:', err);
      onError?.(err);
    },
  );
}

export async function updateStudentStop(studentId: string, newStopId: string): Promise<void> {
  await updateDoc(doc(db, 'students', studentId), {
    stopId: newStopId,
    updatedAt: serverTimestamp(),
  });
}

export async function updateOperatorStudentCount(operatorId: string, delta: number): Promise<void> {
  await updateDoc(doc(db, 'operators', operatorId), {
    studentCount: increment(delta),
    updatedAt: serverTimestamp(),
  });
}

