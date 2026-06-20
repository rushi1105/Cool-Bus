import { useState, useEffect, useCallback } from 'react';
import { fetchBusesByOperator } from '../repositories/fleetRepository';
import { getRoutesByOperator } from '../repositories/routeRepository';
import { getDriversByOperator } from '../repositories/userRepository';
import { fetchOperator } from '../repositories/operatorRepository';
import { evaluateOnboardingState, type OnboardingState } from '../services/onboarding/OnboardingChecklistService';

interface UseOnboardingChecklistReturn {
  state: OnboardingState | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useOnboardingChecklist(operatorId: string | null): UseOnboardingChecklistReturn {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!operatorId) {
      setState(null);
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

      const newState = evaluateOnboardingState(operator, routes, buses, drivers.length);
      setState(newState);
    } catch (err) {
      console.error('[useOnboardingChecklist] Failed to load onboarding state:', err);
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { state, loading, refresh: loadData };
}
