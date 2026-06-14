/**
 * Firebase Service — Real Firebase JS SDK + Mock Data
 *
 * Phase 1: Real Firebase init, Auth, and Firestore helpers.
 * Mock data preserved for screens not yet migrated (maps, trips, etc.).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  initializeAuth,
  // @ts-ignore - this is available at runtime but TS types in this version sometimes miss it
  getReactNativePersistence,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signOut,
  onAuthStateChanged,
  type ConfirmationResult,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/config';

// ─── Firebase Init ───────────────────────────────────────────────────

const firebaseConfig = Config.firebase;
console.log('Firebase Config at runtime:', firebaseConfig);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { onAuthStateChanged, signOut };
export type { ConfirmationResult, FirebaseUser };

// ─── Types ───────────────────────────────────────────────────────────
export interface User {
  id: string;
  role: 'driver' | 'parent' | 'operator';
  name: string;
  phone: string;
  email: string;
  operatorId?: string;
  operatorCode?: string;
  busNumber?: string;
  shift?: string;
  avatarUrl?: string;
  createdAt?: any;
}

export interface Bus {
  id: string;
  operatorId: string;
  driverId: string;
  busNumber: string;
  currentLocation: { latitude: number; longitude: number };
  isActive: boolean;
  speed: number;
}

export interface Trip {
  id: string;
  busId: string;
  driverId: string;
  startTime: Date;
  endTime?: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  routePoints: Array<{ latitude: number; longitude: number }>;
}

export interface Student {
  id: string;
  name: string;
  parentId: string;
  busId: string;
  operatorId: string;
  grade: string;
  gender: 'Male' | 'Female' | 'Other';
  stopLocation: { latitude: number; longitude: number; label: string };
}

export interface Fee {
  id: string;
  parentId: string;
  operatorId: string;
  studentId: string;
  status: 'PAID' | 'UNPAID' | 'TRIAL';
  month: string; // e.g. "2026-06"
  total: number;
  trialUsed: boolean;
  trialExpiry?: Date;
  paidAt?: Date;
}

export interface Coupon {
  id: string;
  code: string;
  operatorId: string;
  isUsed: boolean;
  usedBy?: string;
  usedByPhones?: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface Operator {
  id: string;
  name: string;
  code: string;
  busIds: string[];
  driverIds: string[];
}

// ─── Firestore Helpers (Real) ────────────────────────────────────────

/**
 * Get a user document from /users/{uid}
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as User;
  } catch (err) {
    console.error('[Firebase] getUserByUid error:', err);
    return null;
  }
}

/**
 * Create or overwrite a user document at /users/{uid}
 */
export async function createUserDoc(
  uid: string,
  data: Omit<User, 'id'>,
): Promise<void> {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[Firebase] createUserDoc error:', err);
    throw err;
  }
}

/**
 * Add a student document to /students (auto-ID)
 */
export async function addStudentDoc(
  data: Omit<Student, 'id'>,
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'students'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[Firebase] addStudentDoc error:', err);
    throw err;
  }
}

/**
 * Create a fee record in /fees (auto-ID)
 */
export async function createFeeDoc(
  data: Omit<Fee, 'id'>,
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'fees'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[Firebase] createFeeDoc error:', err);
    throw err;
  }
}

/**
 * Count how many students a parent has in /students
 */
export async function getStudentCountByParent(
  parentId: string,
): Promise<number> {
  try {
    const q = query(
      collection(db, 'students'),
      where('parentId', '==', parentId),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.error('[Firebase] getStudentCountByParent error:', err);
    return 0;
  }
}

/**
 * Fetch all operators from /operators collection
 */
export async function fetchOperators(): Promise<Operator[]> {
  try {
    const snap = await getDocs(collection(db, 'operators'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Operator));
  } catch (err) {
    console.error('[Firebase] fetchOperators error:', err);
    return [];
  }
}

/**
 * Find an operator by their code
 */
export async function getOperatorByCode(
  code: string,
): Promise<Operator | null> {
  try {
    const q = query(
      collection(db, 'operators'),
      where('code', '==', code.toUpperCase()),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Operator;
  } catch (err) {
    console.error('[Firebase] getOperatorByCode error:', err);
    return null;
  }
}

/**
 * Register a new driver: create user doc in Firestore
 */
export async function registerDriver(
  uid: string,
  data: {
    name: string;
    phone: string;
    operatorId: string;
    busNumber: string;
    shift: string;
  },
): Promise<void> {
  await createUserDoc(uid, {
    name: data.name,
    phone: data.phone,
    email: '',
    role: 'driver',
    operatorId: data.operatorId,
    busNumber: data.busNumber,
    shift: data.shift,
  });
}

/**
 * Register a new parent: create user doc, student doc, and fee doc
 */
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
  },
): Promise<void> {
  // 1. Resolve operator by code
  const operator = await getOperatorByCode(data.operatorCode);
  const operatorId = operator?.id ?? '';

  // 2. Create user doc
  await createUserDoc(uid, {
    name: data.parentName,
    phone: data.phone,
    email: data.email,
    role: 'parent',
    operatorCode: data.operatorCode,
  });

  // 3. Check existing children count BEFORE adding the new one
  const existingCount = await getStudentCountByParent(uid);

  // 4. Add student doc
  const studentId = await addStudentDoc({
    name: data.childName,
    parentId: uid,
    busId: '',  // will be assigned by operator later
    operatorId,
    grade: data.grade,
    gender: data.gender as 'Male' | 'Female' | 'Other',
    stopLocation: { latitude: 0, longitude: 0, label: '' },
  });

  // 5. Create fee record
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (existingCount === 0) {
    // First child → free trial
    const trialExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await createFeeDoc({
      parentId: uid,
      operatorId,
      studentId,
      status: 'TRIAL',
      month: currentMonth,
      total: 0,
      trialUsed: true,
      trialExpiry,
    });
  } else {
    // Additional child → unpaid
    await createFeeDoc({
      parentId: uid,
      operatorId,
      studentId,
      status: 'UNPAID',
      month: currentMonth,
      total: 2500,
      trialUsed: true,
    });
  }
}

// ─── Mock Data (preserved for screens not yet migrated) ──────────────

const BANGALORE_CENTER = { latitude: 12.9716, longitude: 77.5946 };

export const mockOperators: Operator[] = [
  {
    id: 'op-1',
    name: 'SafeRide Transport',
    code: 'SAFERIDE',
    busIds: ['bus-1', 'bus-2', 'bus-3'],
    driverIds: ['drv-1', 'drv-2', 'drv-3'],
  },
  {
    id: 'op-2',
    name: 'CityBus Academy',
    code: 'CITYBUS',
    busIds: ['bus-4', 'bus-5'],
    driverIds: ['drv-4', 'drv-5'],
  },
];

export const mockBuses: Bus[] = [
  {
    id: 'bus-1',
    operatorId: 'op-1',
    driverId: 'drv-1',
    busNumber: 'KA-01-AB-1234',
    currentLocation: { latitude: 12.9716, longitude: 77.5946 },
    isActive: true,
    speed: 32,
  },
  {
    id: 'bus-2',
    operatorId: 'op-1',
    driverId: 'drv-2',
    busNumber: 'KA-01-CD-5678',
    currentLocation: { latitude: 12.9796, longitude: 77.5906 },
    isActive: true,
    speed: 18,
  },
  {
    id: 'bus-3',
    operatorId: 'op-1',
    driverId: 'drv-3',
    busNumber: 'KA-01-EF-9012',
    currentLocation: { latitude: 12.9656, longitude: 77.6006 },
    isActive: false,
    speed: 0,
  },
  {
    id: 'bus-4',
    operatorId: 'op-2',
    driverId: 'drv-4',
    busNumber: 'KA-02-GH-3456',
    currentLocation: { latitude: 12.9836, longitude: 77.5846 },
    isActive: true,
    speed: 25,
  },
  {
    id: 'bus-5',
    operatorId: 'op-2',
    driverId: 'drv-5',
    busNumber: 'KA-02-IJ-7890',
    currentLocation: { latitude: 12.9596, longitude: 77.5746 },
    isActive: false,
    speed: 0,
  },
];

export const mockStudents: Student[] = [
  {
    id: 'stu-1',
    name: 'Arjun Sharma',
    parentId: 'par-1',
    busId: 'bus-1',
    operatorId: 'op-1',
    grade: '5th',
    gender: 'Male',
    stopLocation: { latitude: 12.9750, longitude: 77.5980, label: 'Koramangala Stop' },
  },
  {
    id: 'stu-2',
    name: 'Priya Patel',
    parentId: 'par-1',
    busId: 'bus-1',
    operatorId: 'op-1',
    grade: '3rd',
    gender: 'Female',
    stopLocation: { latitude: 12.9750, longitude: 77.5980, label: 'Koramangala Stop' },
  },
  {
    id: 'stu-3',
    name: 'Rohan Gupta',
    parentId: 'par-2',
    busId: 'bus-2',
    operatorId: 'op-1',
    grade: '7th',
    gender: 'Male',
    stopLocation: { latitude: 12.9820, longitude: 77.5870, label: 'Indiranagar Stop' },
  },
  {
    id: 'stu-4',
    name: 'Ananya Reddy',
    parentId: 'par-3',
    busId: 'bus-4',
    operatorId: 'op-2',
    grade: '6th',
    gender: 'Female',
    stopLocation: { latitude: 12.9860, longitude: 77.5900, label: 'Whitefield Stop' },
  },
];

export const mockFees: Fee[] = [
  {
    id: 'fee-1',
    parentId: 'par-1',
    operatorId: 'op-1',
    studentId: 'stu-1',
    status: 'PAID',
    month: '2026-05',
    total: 2500,
    trialUsed: true,
    paidAt: new Date('2026-05-05'),
  },
  {
    id: 'fee-2',
    parentId: 'par-1',
    operatorId: 'op-1',
    studentId: 'stu-1',
    status: 'UNPAID',
    month: '2026-06',
    total: 2500,
    trialUsed: true,
  },
  {
    id: 'fee-3',
    parentId: 'par-1',
    operatorId: 'op-1',
    studentId: 'stu-2',
    status: 'TRIAL',
    month: '2026-06',
    total: 0,
    trialUsed: false,
  },
  {
    id: 'fee-4',
    parentId: 'par-2',
    operatorId: 'op-1',
    studentId: 'stu-3',
    status: 'PAID',
    month: '2026-06',
    total: 2500,
    trialUsed: true,
    paidAt: new Date('2026-06-01'),
  },
  {
    id: 'fee-5',
    parentId: 'par-3',
    operatorId: 'op-2',
    studentId: 'stu-4',
    status: 'UNPAID',
    month: '2026-06',
    total: 3000,
    trialUsed: true,
  },
];

export const mockCoupons: Coupon[] = [
  {
    id: 'cpn-1',
    code: 'SAFERIDE-FREE-1001',
    operatorId: 'op-1',
    isUsed: true,
    usedBy: 'par-1',
    usedByPhones: ['+919876543210'],
    createdAt: new Date('2026-01-15'),
    expiresAt: new Date('2026-07-15'),
  },
  {
    id: 'cpn-2',
    code: 'SAFERIDE-FREE-1002',
    operatorId: 'op-1',
    isUsed: false,
    usedByPhones: [],
    createdAt: new Date('2026-03-10'),
    expiresAt: new Date('2026-09-10'),
  },
  {
    id: 'cpn-3',
    code: 'CITYBUS-FREE-2001',
    operatorId: 'op-2',
    isUsed: true,
    usedBy: 'par-3',
    usedByPhones: ['+918888888888'],
    createdAt: new Date('2026-02-20'),
    expiresAt: new Date('2026-08-20'),
  },
  {
    id: 'cpn-4',
    code: 'SAFERIDE-FREE-1003',
    operatorId: 'op-1',
    isUsed: false,
    usedByPhones: [],
    createdAt: new Date('2026-06-01'),
    expiresAt: new Date('2026-12-01'),
  },
];

export const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    busId: 'bus-1',
    driverId: 'drv-1',
    startTime: new Date('2026-06-13T07:30:00'),
    endTime: new Date('2026-06-13T08:45:00'),
    status: 'COMPLETED',
    routePoints: [
      { latitude: 12.9650, longitude: 77.5900 },
      { latitude: 12.9700, longitude: 77.5930 },
      { latitude: 12.9750, longitude: 77.5980 },
      { latitude: 12.9800, longitude: 77.6020 },
    ],
  },
  {
    id: 'trip-2',
    busId: 'bus-2',
    driverId: 'drv-2',
    startTime: new Date('2026-06-13T07:15:00'),
    status: 'ACTIVE',
    routePoints: [
      { latitude: 12.9750, longitude: 77.5850 },
      { latitude: 12.9796, longitude: 77.5906 },
      { latitude: 12.9820, longitude: 77.5870 },
    ],
  },
];

// ─── Mock Service Methods (preserved for un-migrated screens) ────────

export const firebaseService = {
  // Auth — these are now no-ops since real auth is in screens directly
  sendOTP: async (_phone: string): Promise<string> => {
    await delay(1000);
    return 'mock-verification-id';
  },

  verifyOTP: async (_verificationId: string, _code: string): Promise<User> => {
    await delay(1000);
    return {
      id: 'usr-new',
      role: 'parent',
      name: 'New User',
      phone: '+919876543210',
      email: 'user@example.com',
    };
  },

  // Users
  getUser: async (userId: string): Promise<User | null> => {
    await delay(500);
    return null;
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User> => {
    await delay(800);
    return { id: `usr-${Date.now()}`, ...user };
  },

  // Buses
  getBuses: async (operatorId?: string): Promise<Bus[]> => {
    await delay(500);
    if (operatorId) return mockBuses.filter((b) => b.operatorId === operatorId);
    return mockBuses;
  },

  getBus: async (busId: string): Promise<Bus | null> => {
    await delay(300);
    return mockBuses.find((b) => b.id === busId) ?? null;
  },

  updateBusLocation: async (
    busId: string,
    location: { latitude: number; longitude: number },
    speed: number,
  ): Promise<void> => {
    await delay(200);
    const bus = mockBuses.find((b) => b.id === busId);
    if (bus) {
      bus.currentLocation = location;
      bus.speed = speed;
    }
  },

  // Trips
  startTrip: async (busId: string, driverId: string): Promise<Trip> => {
    await delay(800);
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      busId,
      driverId,
      startTime: new Date(),
      status: 'ACTIVE',
      routePoints: [],
    };
    mockTrips.push(trip);
    return trip;
  },

  endTrip: async (tripId: string): Promise<Trip> => {
    await delay(600);
    const trip = mockTrips.find((t) => t.id === tripId);
    if (trip) {
      trip.status = 'COMPLETED';
      trip.endTime = new Date();
    }
    return trip!;
  },

  // Students
  getStudents: async (parentId?: string, operatorId?: string): Promise<Student[]> => {
    await delay(500);
    let results = [...mockStudents];
    if (parentId) results = results.filter((s) => s.parentId === parentId);
    if (operatorId) results = results.filter((s) => s.operatorId === operatorId);
    return results;
  },

  addStudent: async (student: Omit<Student, 'id'>, hasCoupon: boolean = false): Promise<Student> => {
    await delay(800);
    const newStudent = { id: `stu-${Date.now()}`, ...student };
    mockStudents.push(newStudent);
    
    // Check if this is the first child for this parent
    const existingStudents = mockStudents.filter(s => s.parentId === student.parentId);
    const isFirstChild = existingStudents.length === 1; // It includes the newly added one
    
    // Create fee record based on first child logic or coupon
    if (isFirstChild || hasCoupon) {
      mockFees.push({
        id: `fee-${Date.now()}`,
        parentId: student.parentId,
        operatorId: student.operatorId,
        studentId: newStudent.id,
        status: 'TRIAL',
        month: '2026-06',
        total: 0,
        trialUsed: false,
      });
    } else {
      mockFees.push({
        id: `fee-${Date.now()}`,
        parentId: student.parentId,
        operatorId: student.operatorId,
        studentId: newStudent.id,
        status: 'UNPAID',
        month: '2026-06',
        total: 2500,
        trialUsed: true,
      });
    }
    
    return newStudent;
  },

  // Fees
  getFees: async (parentId?: string, operatorId?: string): Promise<Fee[]> => {
    await delay(500);
    let results = [...mockFees];
    if (parentId) results = results.filter((f) => f.parentId === parentId);
    if (operatorId) results = results.filter((f) => f.operatorId === operatorId);
    return results;
  },

  payFee: async (feeId: string): Promise<Fee> => {
    await delay(1000);
    const fee = mockFees.find((f) => f.id === feeId);
    if (fee) {
      fee.status = 'PAID';
      fee.paidAt = new Date();
    }
    return fee!;
  },

  // Coupons
  getCoupons: async (operatorId?: string): Promise<Coupon[]> => {
    await delay(500);
    if (operatorId) return mockCoupons.filter((c) => c.operatorId === operatorId);
    return mockCoupons;
  },

  validateCoupon: async (code: string): Promise<Coupon | null> => {
    await delay(600);
    const coupon = mockCoupons.find((c) => c.code === code);
    return coupon ?? null;
  },

  useCoupon: async (couponId: string, parentId: string, phone?: string): Promise<void> => {
    await delay(500);
    const coupon = mockCoupons.find((c) => c.id === couponId);
    if (coupon) {
      coupon.isUsed = true;
      coupon.usedBy = parentId;
      if (phone) {
        coupon.usedByPhones = coupon.usedByPhones || [];
        if (!coupon.usedByPhones.includes(phone)) {
          coupon.usedByPhones.push(phone);
        }
      }
    }
  },

  generateCoupon: async (operatorId: string, operatorName: string): Promise<Coupon> => {
    await delay(800);
    const digits = Math.floor(1000 + Math.random() * 9000);
    const coupon: Coupon = {
      id: `cpn-${Date.now()}`,
      code: `${operatorName.toUpperCase().replace(/\s+/g, '')}-FREE-${digits}`,
      operatorId,
      isUsed: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    };
    mockCoupons.push(coupon);
    return coupon;
  },

  // Operators
  getOperators: async (): Promise<Operator[]> => {
    await delay(400);
    return mockOperators;
  },

  getOperatorByCode: async (code: string): Promise<Operator | null> => {
    await delay(400);
    return mockOperators.find((o) => o.code === code) ?? null;
  },

  // SOS
  sendSOS: async (driverId: string, busNumber: string, location: { latitude: number; longitude: number }): Promise<void> => {
    await delay(500);
    console.log(`[SOS] Driver ${driverId} — Bus ${busNumber} — Location: ${location.latitude},${location.longitude}`);
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default firebaseService;
