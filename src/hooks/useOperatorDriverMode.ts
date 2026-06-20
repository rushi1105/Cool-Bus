/**
 * useOperatorDriverMode — Dual-role mode switching hook
 *
 * Manages the ephemeral session state for operators who have
 * enabled driver mode. The active mode determines which stack
 * is rendered by AppNavigator.
 *
 * State is held in React context (not Firestore) — intentionally
 * not persisted across app restarts (safe default: operator mode).
 */

import React, { useState, useCallback, useContext, createContext, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────

export type ActiveMode = 'operator' | 'driver';

interface OperatorDriverModeState {
  /** Current active mode for this session */
  activeMode: ActiveMode;
  /** Whether the user has the operator+driver dual role */
  isOperatorDriver: boolean;
  /** Switch to a specific mode */
  setMode: (mode: ActiveMode) => void;
  /** Toggle between operator and driver mode */
  toggleMode: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────

const OperatorDriverModeContext = createContext<OperatorDriverModeState>({
  activeMode: 'operator',
  isOperatorDriver: false,
  setMode: () => {},
  toggleMode: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────

interface ProviderProps {
  isOperatorDriver: boolean;
  children: React.ReactNode;
}

/**
 * Wrap the app (or operator stack) with this provider to enable
 * mode switching for operators who have enabled driver mode.
 */
export function OperatorDriverModeProvider({
  isOperatorDriver,
  children,
}: ProviderProps) {
  const [activeMode, setActiveMode] = useState<ActiveMode>('operator');

  const setMode = useCallback((mode: ActiveMode) => {
    setActiveMode(mode);
  }, []);

  const toggleMode = useCallback(() => {
    setActiveMode((prev) => (prev === 'operator' ? 'driver' : 'operator'));
  }, []);

  const value = useMemo(
    () => ({
      activeMode,
      isOperatorDriver,
      setMode,
      toggleMode,
    }),
    [activeMode, isOperatorDriver, setMode, toggleMode],
  );

  return React.createElement(
    OperatorDriverModeContext.Provider,
    { value },
    children,
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────

/**
 * Access the operator-driver mode state.
 * Must be called within an OperatorDriverModeProvider.
 */
export function useOperatorDriverMode(): OperatorDriverModeState {
  return useContext(OperatorDriverModeContext);
}
