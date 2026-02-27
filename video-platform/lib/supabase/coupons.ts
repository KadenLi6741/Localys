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

/**
 * Get all available public coupons
 */
export async function getAllAvailableCoupons() {
  try {
    console.log('Fetching available coupons...');
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    console.log('Coupons fetch result:', { data, error });

    if (error) {
      console.error('Error fetching coupons:', error);
      return { data: [], error };
    }

    console.log(`Fetched ${data?.length || 0} active coupons`);
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Exception fetching coupons:', error);
    return { data: [], error };
  }
}

/**
 * Get user's activated coupons
 */
export async function getUserCoupons(userId: string) {
  try {
    // First, get user's coupons from user_coupons table
    const { data: userCouponsData, error: userCouponsError } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (userCouponsError) {
      console.error('Error fetching user_coupons:', userCouponsError);
      return { data: [], error: userCouponsError };
    }

    if (!userCouponsData || userCouponsData.length === 0) {
      return { data: [], error: null };
    }

    // Get all the coupon IDs
    const couponIds = userCouponsData.map((uc: any) => uc.coupon_id);

    // Fetch all coupons for these IDs
    const { data: couponsData, error: couponsError } = await supabase
      .from('coupons')
      .select('*')
      .in('id', couponIds);

    if (couponsError) {
      console.error('Error fetching coupons:', couponsError);
      return { data: [], error: couponsError };
    }

    // Create a map of coupons by ID for easy lookup
    const couponsMap = new Map((couponsData || []).map((c: any) => [c.id, c]));

    // Combine user_coupons with coupon data
    const transformedData = userCouponsData.map((uc: any) => ({
      ...uc,
      coupon: couponsMap.get(uc.coupon_id) || null,
    }));

    return { data: transformedData, error: null };
  } catch (error: any) {
    console.error('Exception in getUserCoupons:', error);
    return { data: [], error };
  }
}

/**
 * Activate a coupon for a user
 */
export async function activateCoupon(userId: string, couponCode: string) {
  try {
    // First, get the coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return {
        data: null,
        error: new Error('Coupon not found or is inactive')
      };
    }

    // Check if coupon is expired
    if (coupon.expiry_date) {
      const expirationDate = new Date(coupon.expiry_date);
      if (expirationDate < new Date()) {
        return {
          data: null,
          error: new Error('Coupon has expired')
        };
      }
    }

    // Check if coupon has reached max uses
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return {
        data: null,
        error: new Error('Coupon usage limit reached')
      };
    }

    // Check if user already has this coupon
    const { data: existingCoupon, error: existingError } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('user_id', userId)
      .eq('coupon_id', coupon.id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      return { data: null, error: existingError };
    }

    // If user already has this coupon, just return success so they can activate it globally
    if (existingCoupon) {
      console.log('User already has coupon, allowing activation for context:', coupon.code);
      return {
        data: {
          id: existingCoupon.id,
          user_id: userId,
          coupon_id: coupon.id,
          is_used: existingCoupon.is_used,
          used_at: existingCoupon.used_at,
          created_at: existingCoupon.created_at,
          coupon: coupon,
        },
        error: null
      };
    }

    // Activate the coupon for the user (new coupon)
    const { data, error } = await supabase
      .from('user_coupons')
      .insert({
        user_id: userId,
        coupon_id: coupon.id,
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error activating coupon:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception activating coupon:', error);
    return { data: null, error };
  }
}

/**
 * Validate and apply a coupon code for checkout
 */
export async function validateCoupon(code: string, userId: string, orderAmount: number = 0) {
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

    // Check if user has this coupon activated
    const { data: userCoupon } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('user_id', userId)
      .eq('coupon_id', coupon.id)
      .single();

    if (!userCoupon) {
      return { data: null, error: { message: 'You have not activated this coupon' } };
    }

    if (userCoupon.is_used) {
      return { data: null, error: { message: 'You have already used this coupon' } };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_percentage > 0) {
      discount = (orderAmount * coupon.discount_percentage) / 100;
    } else if (coupon.discount_amount && coupon.discount_amount > 0) {
      discount = coupon.discount_amount;
    }

    return {
      data: {
        coupon,
        discount,
        discountType: coupon.discount_percentage > 0 ? 'percentage' : 'fixed'
      },
      error: null
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Mark a coupon as used after successful purchase
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

    // Get user coupon
    const { data: userCoupon, error: userCouponError } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('user_id', userId)
      .eq('coupon_id', coupon.id)
      .single();

    if (userCouponError) {
      return { data: null, error: userCouponError };
    }

    // Mark user coupon as used
    const { data: updatedUserCoupon, error: updateError } = await supabase
      .from('user_coupons')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', userCoupon.id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Increment used count on coupon
    await supabase
      .from('coupons')
      .update({
        used_count: (coupon.used_count || 0) + 1,
      })
      .eq('id', coupon.id);

    return { data: updatedUserCoupon, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Remove a coupon from user's activated coupons
 */
export async function removeCoupon(userId: string, couponId: string) {
  try {
    console.log(`Attempting to remove coupon ${couponId} for user ${userId}`);
    
    const { data, error } = await supabase
      .from('user_coupons')
      .delete()
      .eq('user_id', userId)
      .eq('coupon_id', couponId)
      .select();

    console.log('Delete response:', { data, error });

    if (error) {
      console.error('Error removing coupon:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      return { data: null, error };
    }

    console.log('Coupon removed successfully');
    return { data: { success: true }, error: null };
  } catch (error: any) {
    console.error('Exception removing coupon:', error);
    return { data: null, error };
  }
}
