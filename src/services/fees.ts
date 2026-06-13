/**
 * Fee Service
 *
 * Business logic for fee management, trial calculations, and payment processing.
 */

import { Fee, firebaseService } from './firebase';
import Config from '../constants/config';

export interface FeeBreakdown {
  busFee: number;
  platformFee: number;
  discount: number;
  total: number;
}

export interface TrialInfo {
  isOnTrial: boolean;
  trialDaysRemaining: number;
  trialStartDate: Date;
  trialEndDate: Date;
}

export const feeService = {
  /**
   * Get fee breakdown for a student
   */
  getBreakdown: (baseFee: number, hasCoupon: boolean = false): FeeBreakdown => {
    const platformFee = Config.fees.platformFee;
    const discount = hasCoupon ? baseFee + platformFee : 0;
    const total = Math.max(0, baseFee + platformFee - discount);
    return { busFee: baseFee, platformFee, discount, total };
  },

  /**
   * Check if a parent has any unpaid fees
   */
  hasUnpaidFees: async (parentId: string): Promise<boolean> => {
    const fees = await firebaseService.getFees(parentId);
    return fees.some((f) => f.status === 'UNPAID');
  },

  /**
   * Get the current fee status for a student
   */
  getCurrentStatus: async (
    parentId: string,
    studentId: string,
  ): Promise<Fee | null> => {
    const fees = await firebaseService.getFees(parentId);
    const currentMonth = new Date().toISOString().slice(0, 7);
    return fees.find((f) => f.studentId === studentId && f.month === currentMonth) ?? null;
  },

  /**
   * Calculate trial info
   */
  getTrialInfo: (registrationDate: Date = new Date('2026-06-01')): TrialInfo => {
    const trialEnd = new Date(registrationDate);
    trialEnd.setDate(trialEnd.getDate() + Config.fees.trialDays);

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      isOnTrial: daysRemaining > 0,
      trialDaysRemaining: daysRemaining,
      trialStartDate: registrationDate,
      trialEndDate: trialEnd,
    };
  },

  /**
   * Process payment (mock)
   */
  processPayment: async (feeId: string): Promise<{ success: boolean; transactionId: string }> => {
    await firebaseService.payFee(feeId);
    return {
      success: true,
      transactionId: `TXN-${Date.now()}`,
    };
  },

  /**
   * Get payment history for a parent
   */
  getPaymentHistory: async (parentId: string): Promise<Fee[]> => {
    const fees = await firebaseService.getFees(parentId);
    return fees
      .filter((f) => f.status === 'PAID')
      .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));
  },

  /**
   * Get all fees (for operator)
   */
  getAllFees: async (operatorId: string): Promise<Fee[]> => {
    return firebaseService.getFees(undefined, operatorId);
  },

  /**
   * Get summary stats for operator
   */
  getOperatorStats: async (
    operatorId: string,
  ): Promise<{ paid: number; unpaid: number; trial: number; totalRevenue: number }> => {
    const fees = await firebaseService.getFees(undefined, operatorId);
    return {
      paid: fees.filter((f) => f.status === 'PAID').length,
      unpaid: fees.filter((f) => f.status === 'UNPAID').length,
      trial: fees.filter((f) => f.status === 'TRIAL').length,
      totalRevenue: fees.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.total, 0),
    };
  },
};

export default feeService;
