export interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  discount_amount?: number;
  max_uses?: number;
  used_count: number;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
  coupon?: Coupon;
}

export interface CouponValidateResult {
  valid: boolean;
  message: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}
