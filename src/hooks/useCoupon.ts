/**
 * useCoupon Hook
 *
 * Handles coupon validation and redemption for registration flow.
 */

import { useState, useCallback } from 'react';
import couponService, { CouponValidation } from '../services/coupons';
import type { Coupon } from '../repositories/types';

interface UseCouponReturn {
  code: string;
  setCode: (code: string) => void;
  validation: CouponValidation | null;
  isValidating: boolean;
  isRedeemed: boolean;
  validateCode: (phone?: string) => Promise<CouponValidation>;
  redeemCode: (parentId: string, phone?: string) => Promise<boolean>;
  reset: () => void;
  // Operator features
  coupons: Coupon[];
  isLoadingCoupons: boolean;
  loadCoupons: (operatorId: string) => Promise<void>;
  generateCoupon: (operatorId: string, operatorName: string) => Promise<Coupon | null>;
}

export function useCoupon(): UseCouponReturn {
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState<CouponValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  const validateCode = useCallback(async (phone?: string): Promise<CouponValidation> => {
    setIsValidating(true);
    try {
      const result = await couponService.validate(code, phone);
      setValidation(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [code]);

  const redeemCode = useCallback(
    async (parentId: string, phone?: string): Promise<boolean> => {
      if (!validation?.valid || !validation.coupon) return false;
      const success = await couponService.redeem(validation.coupon.id, parentId, phone);
      if (success) setIsRedeemed(true);
      return success;
    },
    [validation],
  );

  const reset = useCallback(() => {
    setCode('');
    setValidation(null);
    setIsRedeemed(false);
  }, []);

  const loadCoupons = useCallback(async (operatorId: string) => {
    setIsLoadingCoupons(true);
    try {
      const data = await couponService.getOperatorCoupons(operatorId);
      setCoupons(data);
    } finally {
      setIsLoadingCoupons(false);
    }
  }, []);

  const generateCoupon = useCallback(
    async (operatorId: string, operatorName: string): Promise<Coupon | null> => {
      try {
        const coupon = await couponService.generate(operatorId, operatorName);
        if (coupon) {
          setCoupons((prev) => [coupon, ...prev]);
        }
        return coupon;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    code,
    setCode,
    validation,
    isValidating,
    isRedeemed,
    validateCode,
    redeemCode,
    reset,
    coupons,
    isLoadingCoupons,
    loadCoupons,
    generateCoupon,
  };
}

export default useCoupon;
