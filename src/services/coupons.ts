/**
 * Coupon Service
 *
 * Business logic for coupon generation, validation, and redemption.
 */

import {
  validateCoupon,
  useCoupon,
  getCoupons,
  checkCouponCodeExists,
  createCoupon,
} from '../repositories/couponRepository';
import type { Coupon } from '../repositories/types';
import Config from '../constants/config';

export interface CouponValidation {
  valid: boolean;
  coupon: Coupon | null;
  message: string;
}

async function generateUniqueCode(operatorName: string): Promise<string | null> {
  const prefix = operatorName.toUpperCase().replace(/\s+/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${prefix}-${suffix}`;
    const exists = await checkCouponCodeExists(code);
    if (!exists) return code;
  }
  return null;
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
        message: 'Invalid format. Expected: OPERATORCODE-XXXXXX',
      };
    }

    const coupon = await validateCoupon(trimmed);

    if (!coupon) {
      return { valid: false, coupon: null, message: 'Coupon not found' };
    }

    if (coupon.isUsed) {
      return { valid: false, coupon: null, message: 'This coupon has already been used' };
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
      await useCoupon(couponId, parentId, phone);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Generate a new coupon with unique code
   */
  generate: async (operatorId: string, operatorName: string): Promise<Coupon | null> => {
    const code = await generateUniqueCode(operatorName);
    if (!code) return null;

    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const id = await createCoupon(operatorId, code, expiresAt);
    if (!id) return null;

    return {
      id,
      code,
      operatorId,
      isUsed: false,
      createdAt: new Date(),
      expiresAt,
    };
  },

  /**
   * Get all coupons for an operator
   */
  getOperatorCoupons: async (operatorId: string): Promise<Coupon[]> => {
    return getCoupons(operatorId);
  },

  /**
   * Get coupon stats for an operator
   */
  getStats: async (
    operatorId: string,
  ): Promise<{ total: number; used: number; unused: number; expired: number }> => {
    const coupons = await getCoupons(operatorId);
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
