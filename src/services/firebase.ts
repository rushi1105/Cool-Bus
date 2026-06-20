/**
 * Firebase Service — App initialization only.
 *
 * All Firestore operations have been moved to src/repositories/.
 * This file exports only the Firebase app, Auth, and Firestore instances.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  // @ts-ignore - available at runtime in React Native
  getReactNativePersistence,
  signOut,
  onAuthStateChanged,
  type ConfirmationResult,
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
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export { onAuthStateChanged, signOut };
export type { ConfirmationResult, FirebaseUser };
