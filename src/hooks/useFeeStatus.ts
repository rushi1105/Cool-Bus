/**
 * useFeeStatus Hook — Phase 2
 *
 * Queries real Firestore /fees collection for parent fee status.
 * Determines if parent has access (PAID/TRIAL) or is locked out (UNPAID).
 * Provides breakdown, trial info, and payFee method.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, type Fee } from '../services/firebase';

export interface FeeBreakdown {
  busFee: number;
  platformFee: number;
  discount: number;
  total: number;
}

export interface TrialInfo {
  isOnTrial: boolean;
  trialDaysRemaining: number;
}

interface UseFeeStatusReturn {
  fees: Fee[];
  currentFee: Fee | null;
  isLoading: boolean;
  hasAccess: boolean;
  status: 'PAID' | 'TRIAL' | 'UNPAID';
  trialExpiry: Date | null;
  daysLeft: number;
  breakdown: FeeBreakdown;
  trialInfo: TrialInfo;
  refreshFees: () => Promise<void>;
  payFee: (feeId: string) => Promise<boolean>;
}

export function useFeeStatus(
  parentId: string | null,
  studentId?: string | null,
): UseFeeStatusReturn {
  const [fees, setFees] = useState<Fee[]>([]);
  const [currentFee, setCurrentFee] = useState<Fee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const loadFees = useCallback(async () => {
    if (!parentId) {
      setFees([]);
      setCurrentFee(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all fees for this parent
      const q = query(
        collection(db, 'fees'),
        where('parentId', '==', parentId),
      );
      const snap = await getDocs(q);
      const allFees = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Fee[];

      setFees(allFees);

      // Find current month fee for this student (or any if no studentId)
      let current: Fee | null = null;
      if (studentId) {
        current = allFees.find(
          (f) => f.studentId === studentId && f.month === currentMonth,
        ) ?? null;
      } else {
        current = allFees.find((f) => f.month === currentMonth) ?? null;
      }
      setCurrentFee(current);
    } catch (err) {
      console.error('[useFeeStatus] Error loading fees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [parentId, studentId, currentMonth]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const payFee = useCallback(async (feeId: string) => {
    try {
      await updateDoc(doc(db, 'fees', feeId), {
        status: 'PAID',
        paidAt: serverTimestamp(),
      });
      await loadFees();
      return true;
    } catch (err) {
      console.error('[useFeeStatus] payFee error:', err);
      return false;
    }
  }, [loadFees]);

  const status: 'PAID' | 'TRIAL' | 'UNPAID' = currentFee?.status ?? 'UNPAID';
  const hasAccess = status === 'PAID' || status === 'TRIAL';

  // Calculate trial expiry
  let trialExpiry: Date | null = null;
  let daysLeft = 0;

  if (status === 'TRIAL' && currentFee?.trialExpiry) {
    const expiry = currentFee.trialExpiry as any;
    trialExpiry = expiry instanceof Date
      ? expiry
      : expiry.toDate
        ? expiry.toDate()
        : new Date(expiry);
    daysLeft = Math.max(
      0,
      Math.ceil((trialExpiry!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );
  }

  // Calculate breakdown compatible with PaymentScreen
  const total = currentFee?.total ?? (status === 'TRIAL' ? 0 : 2500);
  const platformFee = total > 0 ? 100 : 0;
  const busFee = total - platformFee;
  const discount = status === 'TRIAL' ? 2500 : 0;

  const breakdown: FeeBreakdown = {
    busFee,
    platformFee,
    discount,
    total,
  };

  const trialInfo: TrialInfo = {
    isOnTrial: status === 'TRIAL',
    trialDaysRemaining: daysLeft,
  };

  return {
    fees,
    currentFee,
    isLoading,
    hasAccess,
    status,
    trialExpiry,
    daysLeft,
    breakdown,
    trialInfo,
    refreshFees: loadFees,
    payFee,
  };
}

export default useFeeStatus;
