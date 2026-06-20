import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './baseRepository';
import { withMetadata } from './baseRepository';
import type { Coupon } from './types';

export async function validateCoupon(code: string): Promise<Coupon | null> {
  const q = query(
    collection(db, 'coupons'),
    where('code', '==', code.toUpperCase().trim()),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    code: data.code,
    operatorId: data.operatorId,
    isUsed: data.isUsed || false,
    usedBy: data.usedBy,
    usedAt: data.usedAt,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt),
  } as Coupon;
}

export async function useCoupon(
  couponId: string,
  parentId: string,
  phone?: string,
): Promise<void> {
  const ref = doc(db, 'coupons', couponId);
  await updateDoc(ref, {
    isUsed: true,
    usedBy: parentId,
    usedAt: Timestamp.now(),
  });
}

export async function checkCouponCodeExists(code: string): Promise<boolean> {
  const q = query(
    collection(db, 'coupons'),
    where('code', '==', code.toUpperCase().trim()),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createCoupon(
  operatorId: string,
  code: string,
  expiresAt: Date,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'coupons'),
    withMetadata({
      code: code.toUpperCase().trim(),
      operatorId,
      isUsed: false,
      expiresAt,
    } as Record<string, unknown>, ['operatorId', 'code']),
  );
  return ref.id;
}

export async function getCoupons(operatorId: string): Promise<Coupon[]> {
  const q = query(collection(db, 'coupons'), where('operatorId', '==', operatorId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      code: data.code,
      operatorId: data.operatorId,
      isUsed: data.isUsed || false,
      usedBy: data.usedBy,
      usedAt: data.usedAt,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt),
    } as Coupon;
  });
}
