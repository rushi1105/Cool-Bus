/**
 * useOnboardingProgress — Onboarding completion percentage hook
 *
 * Computes a completion percentage based on operator setup milestones:
 * - Has at least 1 bus
 * - Has at least 1 route
 * - Has at least 1 driver
 * - Has at least 1 student
 * - Has office location set
 *
 * Used by OnboardingKit (2D.5) to gate access to the dashboard
 * until all steps are completed.
 */

import { useState, useEffect } from 'react';
import { fetchBusesByOperator } from '../repositories/fleetRepository';
import { getRoutesByOperator } from '../repositories/routeRepository';
import { getDriversByOperator } from '../repositories/userRepository';
import { fetchOperator } from '../repositories/operatorRepository';

// ─── Types ────────────────────────────────────────────────────────────

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
}

interface UseOnboardingProgressReturn {
  /** Overall progress 0–100 */
  percentage: number;
  /** Individual step completion status */
  steps: OnboardingStep[];
  /** True while fetching data */
  loading: boolean;
  /** True when all steps are complete */
  isComplete: boolean;
  /** Re-fetch progress */
  refresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useOnboardingProgress(
  operatorId: string | null,
): UseOnboardingProgressReturn {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  const computeProgress = async () => {
    if (!operatorId) {
      setSteps([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [buses, routes, drivers, operator] = await Promise.all([
        fetchBusesByOperator(operatorId),
        getRoutesByOperator(operatorId),
        getDriversByOperator(operatorId),
        fetchOperator(operatorId),
      ]);

      const computed: OnboardingStep[] = [
        {
          key: 'bus',
          label: 'Add your first bus',
          completed: buses.length > 0,
        },
        {
          key: 'route',
          label: 'Create a route with stops',
          completed: routes.length > 0,
        },
        {
          key: 'driver',
          label: 'Invite or add a driver',
          completed: drivers.length > 0,
        },
        {
          key: 'office',
          label: 'Set your office location',
          completed: !!(operator?.officeLocation?.latitude),
        },
      ];

      setSteps(computed);
    } catch (err) {
      console.error('[useOnboardingProgress] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    computeProgress();
  }, [operatorId]);

  const completedCount = steps.filter((s) => s.completed).length;
  const percentage = steps.length > 0
    ? Math.round((completedCount / steps.length) * 100)
    : 0;
  const isComplete = steps.length > 0 && completedCount === steps.length;

  return {
    percentage,
    steps,
    loading,
    isComplete,
    refresh: computeProgress,
  };
}
