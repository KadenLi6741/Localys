'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { UserCoupon } from '@/lib/supabase/coupons';

interface CouponContextType {
  activeCoupon: UserCoupon | null;
  setActiveCoupon: (coupon: UserCoupon | null) => void;
  clearActiveCoupon: () => void;
  getDiscountAmount: (price: number) => number;
  getDiscountedPrice: (price: number) => number;
}

const CouponContext = createContext<CouponContextType | undefined>(undefined);

export function CouponProvider({ children }: { children: ReactNode }) {
  const [activeCoupon, setActiveCoupon] = useState<UserCoupon | null>(null);

  const clearActiveCoupon = useCallback(() => {
    setActiveCoupon(null);
  }, []);

  const getDiscountAmount = useCallback((price: number): number => {
    if (!activeCoupon) return 0;
    const coupon = activeCoupon.coupon as any;
    if (!coupon) return 0;

    if (coupon.discount_percentage > 0) {
      return Math.ceil(price * 100 * (coupon.discount_percentage / 100)) / 100;
    } else if (coupon.discount_amount > 0) {
      return coupon.discount_amount;
    }
    return 0;
  }, [activeCoupon]);

  const getDiscountedPrice = useCallback((price: number): number => {
    return Math.max(0, price - getDiscountAmount(price));
  }, [getDiscountAmount]);

  return (
    <CouponContext.Provider
      value={{
        activeCoupon,
        setActiveCoupon,
        clearActiveCoupon,
        getDiscountAmount,
        getDiscountedPrice,
      }}
    >
      {children}
    </CouponContext.Provider>
  );
}

export function useCoupon() {
  const context = useContext(CouponContext);
  if (context === undefined) {
    throw new Error('useCoupon must be used within a CouponProvider');
  }
  return context;
}
