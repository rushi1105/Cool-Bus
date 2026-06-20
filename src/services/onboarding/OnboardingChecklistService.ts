import type { Operator, Route, Bus } from '../../repositories/types';

export type OnboardingStepId = 'officeLocation' | 'route' | 'bus' | 'driver' | 'parent';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  isComplete: boolean;
  actionText: string;
  navigateTo: string;
  estimatedMinutes: number;
}

export interface OnboardingState {
  completionPercentage: number;
  completedItems: OnboardingStep[];
  missingItems: OnboardingStep[];
  nextRecommendedAction: OnboardingStep | null;
  estimatedSetupTimeRemaining: number;
  isFullyComplete: boolean;
  allSteps: OnboardingStep[];
}

export function evaluateOnboardingState(
  operator: Operator | null | undefined,
  routes: Route[],
  buses: Bus[],
  driverCount: number,
): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      id: 'officeLocation',
      title: 'Office Location',
      isComplete: operator?.officeLocation !== undefined && operator?.officeLocation !== null,
      actionText: 'Set Office Location',
      navigateTo: 'Settings',
      estimatedMinutes: 1,
    },
    {
      id: 'route',
      title: 'Routes',
      isComplete: routes.length > 0,
      actionText: 'Create your first Route',
      navigateTo: 'RouteEditor',
      estimatedMinutes: 2,
    },
    {
      id: 'bus',
      title: 'Buses',
      isComplete: buses.length > 0,
      actionText: 'Create your first Bus',
      navigateTo: 'BusManager',
      estimatedMinutes: 1,
    },
    {
      id: 'driver',
      title: 'Drivers',
      isComplete: driverCount > 0 || (operator?.driverIds?.length ?? 0) > 0,
      actionText: 'Assign or Invite a Driver',
      navigateTo: 'DriverManagement',
      estimatedMinutes: 1,
    },
    {
      id: 'parent',
      title: 'Parents',
      isComplete: (operator?.parentCount ?? 0) > 0,
      actionText: 'Invite Parents',
      navigateTo: 'InviteManager',
      estimatedMinutes: 1,
    },
  ];

  const completedItems = steps.filter((s) => s.isComplete);
  const missingItems = steps.filter((s) => !s.isComplete);
  
  const completionPercentage = Math.round((completedItems.length / steps.length) * 100);
  const isFullyComplete = completedItems.length === steps.length;
  
  const estimatedSetupTimeRemaining = missingItems.reduce((total, step) => total + step.estimatedMinutes, 0);

  // Determine next action in logical order
  let nextRecommendedAction: OnboardingStep | null = null;
  if (!isFullyComplete) {
    if (!steps[1].isComplete) nextRecommendedAction = steps[1]; // Route
    else if (!steps[2].isComplete) nextRecommendedAction = steps[2]; // Bus
    else if (!steps[3].isComplete) nextRecommendedAction = steps[3]; // Driver
    else if (!steps[4].isComplete) nextRecommendedAction = steps[4]; // Parent
    else if (!steps[0].isComplete) nextRecommendedAction = steps[0]; // Office
  }

  return {
    completionPercentage,
    completedItems,
    missingItems,
    nextRecommendedAction,
    estimatedSetupTimeRemaining,
    isFullyComplete,
    allSteps: steps,
  };
}
