import {
  getAllAvailableCoupons,
  getUserCoupons,
  activateCoupon,
  validateCoupon,
  useCoupon,
  type Coupon,
  type UserCoupon,
} from '@/lib/supabase/coupons';

export class CouponService {
  async getAllAvailable() {
    return getAllAvailableCoupons();
  }

  async getUserCoupons(userId: string) {
    return getUserCoupons(userId);
  }

  async activateCoupon(userId: string, couponCode: string) {
    return activateCoupon(userId, couponCode);
  }

  async validateCoupon(code: string, userId: string, orderAmount?: number) {
    return validateCoupon(code, userId, orderAmount);
  }

  async useCoupon(couponCode: string, userId: string) {
    return useCoupon(couponCode, userId);
  }
}

export const couponService = new CouponService();
