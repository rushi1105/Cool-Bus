import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { User, Fee, Student } from './types';
import { SCHEMA_VERSION } from './types';

export async function getUserProfile(uid: string): Promise<User | null> {
  return getUserByUid(uid);
}

export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as User;
  } catch (err) {
    console.error('[authRepository] getUserByUid error:', err);
    return null;
  }
}

export async function createUserDoc(
  uid: string,
  data: Omit<User, 'id'>,
): Promise<void> {
  try {
    await setDoc(doc(db, 'users', uid), withMetadata(data as Record<string, unknown>));
  } catch (err) {
    console.error('[authRepository] createUserDoc error:', err);
    throw err;
  }
}

export function onUserProfileSnapshot(
  uid: string,
  onData: (user: User | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (snapshot.exists()) {
        onData({ id: snapshot.id, ...snapshot.data() } as User);
      } else {
        onData(null);
      }
    },
    (err) => {
      console.error('[authRepository] onUserProfileSnapshot error:', err);
      onError?.(err);
    },
  );
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const normalizedPhone = `+91${phone}`;
  const q = query(
    collection(db, 'users'),
    where('phone', '==', normalizedPhone),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function registerDriver(
  uid: string,
  data: {
    name: string;
    phone: string;
    operatorId: string;
    shift: string;
  },
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', uid);

    batch.set(userRef, {
      name: data.name,
      phone: data.phone,
      email: '',
      role: 'driver',
      operatorId: data.operatorId,
      shift: data.shift,
      schemaVersion: 3,
      isActive: true,
      availability: 'assigned',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    console.error('[authRepository] registerDriver error:', err);
    throw err;
  }
}

export async function registerParent(
  uid: string,
  data: {
    parentName: string;
    phone: string;
    email: string;
    childName: string;
    grade: string;
    gender: string;
    operatorCode: string;
    operatorId: string;
    routeId: string;
    stopId: string;
    stopName?: string;
  },
): Promise<void> {
  try {
    const batch = writeBatch(db);

    let operatorId = data.operatorId;
    if (!operatorId) {
      const opQ = query(
        collection(db, 'operators'),
        where('code', '==', data.operatorCode),
      );
      const opSnap = await getDocs(opQ);
      operatorId = opSnap.docs[0]?.id ?? '';
    }

    const userRef = doc(db, 'users', uid);
    batch.set(userRef, {
      name: data.parentName,
      phone: data.phone,
      email: data.email,
      role: 'parent',
      operatorCode: data.operatorCode,
      schemaVersion: 3,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const studentCountQ = query(
      collection(db, 'students'),
      where('parentId', '==', uid),
    );
    const existingCountSnap = await getDocs(studentCountQ);
    const existingCount = existingCountSnap.size;

    const studentRef = doc(collection(db, 'students'));
    batch.set(studentRef, {
      name: data.childName,
      parentId: uid,
      operatorId,
      routeId: data.routeId,
      stopId: data.stopId,
      grade: data.grade,
      gender: data.gender as 'Male' | 'Female' | 'Other',
      isActive: true,
      schemaVersion: 3,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const feeRef = doc(collection(db, 'fees'));
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (existingCount === 0) {
      const trialExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      batch.set(feeRef, {
        parentId: uid,
        operatorId,
        studentId: studentRef.id,
        status: 'TRIAL',
        month: currentMonth,
        total: 0,
        trialUsed: true,
        trialExpiry: Timestamp.fromDate(trialExpiry),
        schemaVersion: 3,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(feeRef, {
        parentId: uid,
        operatorId,
        studentId: studentRef.id,
        status: 'UNPAID',
        month: currentMonth,
        total: 2500,
        trialUsed: true,
        schemaVersion: 3,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    console.error('[authRepository] registerParent error:', err);
    throw err;
  }
}

export async function registerOperator(
  uid: string,
  data: {
    companyName: string;
    operatorCode: string;
    phone: string;
  },
): Promise<void> {
  try {
    const batch = writeBatch(db);

    const operatorRef = doc(collection(db, 'operators'));
    batch.set(operatorRef, withMetadata({
      name: data.companyName,
      code: data.operatorCode.toUpperCase(),
      busIds: [],
      driverIds: [],
    }));

    const userRef = doc(db, 'users', uid);
    batch.set(userRef, withMetadata({
      name: data.companyName,
      phone: data.phone,
      email: '',
      role: 'operator',
      operatorId: operatorRef.id,
      operatorCode: data.operatorCode.toUpperCase(),
    }));

    await batch.commit();
  } catch (err) {
    console.error('[authRepository] registerOperator error:', err);
    throw err;
  }
}

export async function linkExistingOperator(
  uid: string,
  operatorId: string,
  data: { companyName: string; operatorCode: string; phone: string }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, withMetadata({
      name: data.companyName,
      phone: data.phone,
      email: '',
      role: 'operator',
      operatorId: operatorId,
      operatorCode: data.operatorCode.toUpperCase(),
    }));
  } catch (err) {
    console.error('[authRepository] linkExistingOperator error:', err);
    throw err;
  }
}
