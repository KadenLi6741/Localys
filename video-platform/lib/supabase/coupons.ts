import { supabase } from './client';

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

/**
 * Create a welcome coupon for new users (20% off)
 */
export async function createWelcomeCoupon(userId: string) {
  try {
    // Generate unique code: WELCOME + 6 random characters
    const code = `WELCOME${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create the coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .insert({
        code,
        discount_percentage: 20,
        created_by: userId,
      })
      .select()
      .single();

    if (couponError || !coupon) {
      console.error('Failed to create coupon:', couponError);
      return { data: null, error: couponError };
    }

    // Assign coupon to user
    const { data: userCoupon, error: userCouponError } = await supabase
      .from('user_coupons')
      .insert({
        user_id: userId,
        coupon_id: coupon.id,
      })
      .select()
      .single();

    if (userCouponError) {
      console.error('Failed to assign coupon to user:', userCouponError);
      return { data: null, error: userCouponError };
    }

    return { data: { coupon, userCoupon }, error: null };
  } catch (error: any) {
    console.error('Exception creating welcome coupon:', error);
    return { data: null, error };
  }
}

/**
 * Get user's available (unused) coupons
 */
export async function getUserCoupons(userId: string) {
  try {
    console.log('Fetching coupons for user:', userId);
    const { data, error } = await supabase
      .from('user_coupons')
      .select('*, coupon:coupon_id(id, code, discount_percentage, discount_amount, is_active, expiry_date)')
      .eq('user_id', userId)
      .eq('is_used', false);

    console.log('Coupons query result:', { data, error });
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error: any) {
    console.error('Exception in getUserCoupons:', error);
    return { data: null, error };
  }
}

/**
 * Validate and apply a coupon code
 */
export async function validateCoupon(code: string, userId: string) {
  try {
    // Get the coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return { data: null, error: { message: 'Coupon not found or expired' } };
    }

    // Check if coupon is expired
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return { data: null, error: { message: 'Coupon has expired' } };
    }

    // Check if coupon has reached max uses
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { data: null, error: { message: 'Coupon has reached maximum uses' } };
    }

    // Check if user already has this coupon assigned
    const { data: userCoupon } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('user_id', userId)
      .eq('coupon_id', coupon.id)
      .single();

    if (!userCoupon) {
      return { data: null, error: { message: 'You do not have access to this coupon' } };
    }

    if (userCoupon.is_used) {
      return { data: null, error: { message: 'You have already used this coupon' } };
    }

    return { data: coupon, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Mark a coupon as used
 */
export async function useCoupon(couponCode: string, userId: string) {
  try {
    // Get the coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .single();

    if (couponError || !coupon) {
      return { data: null, error: couponError };
    }

    // Mark user coupon as used
    const { data: userCoupon, error: userCouponError } = await supabase
      .from('user_coupons')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('coupon_id', coupon.id)
      .select()
      .single();

    if (userCouponError) {
      return { data: null, error: userCouponError };
    }

    // Increment used count on coupon
    const { error: updateError } = await supabase
      .from('coupons')
      .update({
        used_count: coupon.used_count + 1,
      })
      .eq('id', coupon.id);

    if (updateError) {
      console.error('Failed to update coupon used count:', updateError);
    }

    return { data: userCoupon, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
