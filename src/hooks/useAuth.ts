/**
 * useAuth Hook
 *
 * Manages authentication state, role-based access, and mock login/logout.
 */

import { useState, useCallback, useEffect } from 'react';
import { User, firebaseService, mockOperators } from '../services/firebase';
import type { UserRole } from '../constants/config';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  operatorId: string | null;
}

interface UseAuthReturn extends AuthState {
  login: (role: UserRole, userData?: Partial<User>) => void;
  logout: () => void;
  sendOTP: (phone: string) => Promise<string>;
  verifyOTP: (verificationId: string, code: string) => Promise<boolean>;
  setRole: (role: UserRole) => void;
}

// ─── Mock Users Per Role ─────────────────────────────────────────────

const mockUsers: Record<UserRole, User> = {
  driver: {
    id: 'drv-1',
    role: 'driver',
    name: 'Rajesh Kumar',
    phone: '+919876543210',
    email: 'rajesh@bustrack.com',
    operatorId: 'op-1',
  },
  parent: {
    id: 'par-1',
    role: 'parent',
    name: 'Sneha Sharma',
    phone: '+919876543211',
    email: 'sneha@gmail.com',
    operatorId: 'op-1',
  },
  operator: {
    id: 'op-1',
    role: 'operator',
    name: 'SafeRide Transport',
    phone: '+919876543212',
    email: 'admin@saferide.com',
    operatorId: 'op-1',
  },
};

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
    operatorId: null,
  });

  // Simulate initial auth check
  useEffect(() => {
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, isLoading: false }));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const login = useCallback((role: UserRole, userData?: Partial<User>) => {
    const user = { ...mockUsers[role], ...userData };
    setState({
      user,
      role,
      isAuthenticated: true,
      isLoading: false,
      operatorId: user.operatorId ?? null,
    });
  }, []);

  const logout = useCallback(() => {
    setState({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      operatorId: null,
    });
  }, []);

  const sendOTP = useCallback(async (phone: string): Promise<string> => {
    return firebaseService.sendOTP(phone);
  }, []);

  const verifyOTP = useCallback(
    async (verificationId: string, code: string): Promise<boolean> => {
      try {
        await firebaseService.verifyOTP(verificationId, code);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const setRole = useCallback((role: UserRole) => {
    setState((prev) => ({ ...prev, role }));
  }, []);

  return {
    ...state,
    login,
    logout,
    sendOTP,
    verifyOTP,
    setRole,
  };
}

export default useAuth;
