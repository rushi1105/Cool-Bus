/**
 * useAuth Hook
 *
 * Listens to Firebase onAuthStateChanged and reads the user's
 * profile + role from Firestore /users/{uid}.
 *
 * Returns { user, profile, role, loading, logout }
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
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
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous Firestore snapshot listener if any
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Subscribe to real-time changes of user profile
        unsubscribeSnapshot = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snapshot) => {
            if (snapshot.exists()) {
              const userDoc = { id: snapshot.id, ...snapshot.data() } as UserProfile;
              setProfile(userDoc);
              setRole(userDoc.role as UserRole);
            } else {
              // Profile document does not exist yet (mid-registration)
              setProfile(null);
              setRole(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error('[useAuth] Firestore onSnapshot error:', err);
            setProfile(null);
            setRole(null);
            setLoading(false);
          }
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
