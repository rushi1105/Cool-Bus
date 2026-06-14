/**
 * Coupon Service
 *
 * Business logic for coupon generation, validation, and redemption.
 */

import { Coupon, firebaseService } from './firebase';
import Config from '../constants/config';

export interface CouponValidation {
  valid: boolean;
  coupon: Coupon | null;
  message: string;
}

export const couponService = {
  /**
   * Validate a coupon code format
   */
  isValidFormat: (code: string): boolean => {
    return Config.coupon.format.test(code.toUpperCase().trim());
  },

  /**
   * Validate and check a coupon code
   */
  validate: async (code: string, phone?: string): Promise<CouponValidation> => {
    const trimmed = code.toUpperCase().trim();

    if (!trimmed) {
      return { valid: false, coupon: null, message: 'Please enter a coupon code' };
    }

    if (!couponService.isValidFormat(trimmed)) {
      return {
        valid: false,
        coupon: null,
        message: 'Invalid format. Expected: OPERATORNAME-FREE-1234',
      };
    }

    const coupon = await firebaseService.validateCoupon(trimmed);

    if (!coupon) {
      return { valid: false, coupon: null, message: 'Coupon not found' };
    }

    if (coupon.isUsed && (!phone || !coupon.usedByPhones?.includes(phone))) {
       // If it's used but this phone isn't one of the users, then for this mock, let's say anyone can use a coupon multiple times, but NOT the same phone twice.
       // Wait, if "rejects if already used by same phone number", it means:
       // if phone is provided and usedByPhones includes it -> reject
    }
    
    if (phone && coupon.usedByPhones?.includes(phone)) {
      return { valid: false, coupon: null, message: 'This coupon was already used by this phone number' };
    }

    if (new Date() > coupon.expiresAt) {
      return { valid: false, coupon: null, message: 'This coupon has expired' };
    }

    return { valid: true, coupon, message: '🎉 Coupon applied! 1 month free.' };
  },

  /**
   * Redeem a coupon
   */
  redeem: async (couponId: string, parentId: string, phone?: string): Promise<boolean> => {
    try {
      await firebaseService.useCoupon(couponId, parentId, phone);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Generate a new coupon (operator action)
   */
  generate: async (operatorId: string, operatorName: string): Promise<Coupon> => {
    return firebaseService.generateCoupon(operatorId, operatorName);
  },

  /**
   * Get all coupons for an operator
   */
  getOperatorCoupons: async (operatorId: string): Promise<Coupon[]> => {
    return firebaseService.getCoupons(operatorId);
  },

  /**
   * Get coupon stats for an operator
   */
  getStats: async (
    operatorId: string,
  ): Promise<{ total: number; used: number; unused: number; expired: number }> => {
    const coupons = await firebaseService.getCoupons(operatorId);
    const now = new Date();
    return {
      total: coupons.length,
      used: coupons.filter((c) => c.isUsed).length,
      unused: coupons.filter((c) => !c.isUsed && c.expiresAt > now).length,
      expired: coupons.filter((c) => !c.isUsed && c.expiresAt <= now).length,
    };
  },
};

export default couponService;
