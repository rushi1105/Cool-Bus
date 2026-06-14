/**
 * useAuth Hook
 *
 * Listens to Firebase onAuthStateChanged and reads the user's
 * profile + role from Firestore /users/{uid}.
 *
 * Returns { user, profile, role, loading, logout }
 */

import { useState, useEffect, useCallback } from 'react';
import {
  auth,
  onAuthStateChanged,
  signOut,
  getUserByUid,
  type FirebaseUser,
  type User as UserProfile,
} from '../services/firebase';
import type { UserRole } from '../constants/config';

interface UseAuthReturn {
  /** Firebase Auth user object (null if signed out) */
  user: FirebaseUser | null;
  /** Firestore /users/{uid} profile document */
  profile: UserProfile | null;
  /** User's role from Firestore */
  role: UserRole | null;
  /** True while initial auth state is being resolved */
  loading: boolean;
  /** Sign the user out of Firebase */
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getUserByUid(firebaseUser.uid);
          if (userDoc) {
            setProfile(userDoc);
            setRole(userDoc.role as UserRole);
          } else {
            // User is authenticated but has no Firestore profile yet
            // (mid-registration — profile will be created after OTP verify)
            setProfile(null);
            setRole(null);
          }
        } catch (err) {
          console.error('[useAuth] Error fetching profile:', err);
          setProfile(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
    }
  }, []);

  return { user, profile, role, loading, logout };
}

export default useAuth;
