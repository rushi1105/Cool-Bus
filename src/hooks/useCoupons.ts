import { useState, useEffect, useCallback } from 'react';
import {
  getCoupons,
  checkCouponCodeExists,
  createCoupon,
} from '../repositories/couponRepository';
import type { Coupon } from '../repositories/types';

const COUPON_EXPIRY_DAYS = 180;

interface UseCouponsReturn {
  coupons: Coupon[];
  totalCount: number;
  usedCount: number;
  unusedCount: number;
  loading: boolean;
  error: string | null;
  generate: (operatorId: string, operatorCode: string) => Promise<string | null>;
}

function generateCode(operatorCode: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${operatorCode.toUpperCase()}-${suffix}`;
}

export function useCoupons(operatorId: string | null): UseCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!operatorId) {
      setCoupons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCoupons(operatorId);
      setCoupons(data);
    } catch {
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = useCallback(
    async (operatorId: string, operatorCode: string): Promise<string | null> => {
      let code = generateCode(operatorCode);
      let attempts = 0;
      while (await checkCouponCodeExists(code)) {
        if (attempts > 10) return null;
        code = generateCode(operatorCode);
        attempts++;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + COUPON_EXPIRY_DAYS);

      const id = await createCoupon(operatorId, code, expiresAt);
      if (!id) return null;

      await load();
      return code;
    },
    [load],
  );

  const totalCount = coupons.length;
  const usedCount = coupons.filter((c) => c.isUsed).length;
  const unusedCount = totalCount - usedCount;

  return { coupons, totalCount, usedCount, unusedCount, loading, error, generate };
}
