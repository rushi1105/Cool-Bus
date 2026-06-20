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
  type FirebaseUser,
} from '../services/firebase';
import { onUserProfileSnapshot } from '../repositories/authRepository';
import type { User as UserProfile } from '../repositories/types';
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
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        unsubscribeSnapshot = onUserProfileSnapshot(
          firebaseUser.uid,
          (userDoc) => {
            if (userDoc) {
              setProfile(userDoc);
              setRole(userDoc.role as UserRole);
            } else {
              setProfile(null);
              setRole(null);
            }
            setLoading(false);
          },
          () => {
            setProfile(null);
            setRole(null);
            setLoading(false);
          },
        );
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
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
