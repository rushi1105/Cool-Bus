/**
 * useFeeStatus Hook
 *
 * Manages fee status, trial info, and payment state for parent users.
 */

import { useState, useEffect, useCallback } from 'react';
import { Fee, mockFees } from '../services/firebase';
import feeService, { FeeBreakdown, TrialInfo } from '../services/fees';

interface UseFeeStatusReturn {
  fees: Fee[];
  currentFee: Fee | null;
  trialInfo: TrialInfo;
  isLoading: boolean;
  isPaying: boolean;
  hasAccess: boolean; // true if PAID or TRIAL
  breakdown: FeeBreakdown;
  payFee: (feeId: string) => Promise<boolean>;
  refreshFees: () => Promise<void>;
  paidHistory: Fee[];
}

export function useFeeStatus(
  parentId: string = 'par-1',
  studentId: string = 'stu-1',
): UseFeeStatusReturn {
  const [fees, setFees] = useState<Fee[]>([]);
  const [currentFee, setCurrentFee] = useState<Fee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const trialInfo = feeService.getTrialInfo();
  const breakdown = feeService.getBreakdown(2500);

  const loadFees = useCallback(async () => {
    setIsLoading(true);
    try {
      const parentFees = mockFees.filter((f) => f.parentId === parentId);
      setFees(parentFees);

      const current = parentFees.find(
        (f) => f.studentId === studentId && f.month === new Date().toISOString().slice(0, 7),
      );
      setCurrentFee(current ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [parentId, studentId]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const hasAccess =
    currentFee?.status === 'PAID' ||
    currentFee?.status === 'TRIAL' ||
    trialInfo.isOnTrial;

  const payFee = useCallback(async (feeId: string): Promise<boolean> => {
    setIsPaying(true);
    try {
      const result = await feeService.processPayment(feeId);
      if (result.success) {
        await loadFees();
      }
      return result.success;
    } finally {
      setIsPaying(false);
    }
  }, [loadFees]);

  const paidHistory = fees
    .filter((f) => f.status === 'PAID')
    .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));

  return {
    fees,
    currentFee,
    trialInfo,
    isLoading,
    isPaying,
    hasAccess,
    breakdown,
    payFee,
    refreshFees: loadFees,
    paidHistory,
  };
}

export default useFeeStatus;
