import { supabase } from './client';

export interface PromoCode {
  id: string;
  seller_id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses?: number;
  used_count: number;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
}

export async function getSellerPromoCodes(sellerId: string) {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  return { data: (data as PromoCode[]) || [], error };
}

export async function createPromoCode(
  sellerId: string,
  code: string,
  discountType: 'percent' | 'fixed',
  discountValue: number,
  maxUses?: number,
  expiryDate?: string
) {
  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      seller_id: sellerId,
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: maxUses || null,
      expiry_date: expiryDate || null,
    })
    .select()
    .single();
  return { data: data as PromoCode | null, error };
}

export async function updatePromoCode(
  id: string,
  updates: Partial<Pick<PromoCode, 'is_active' | 'max_uses' | 'expiry_date' | 'discount_value'>>
) {
  const { data, error } = await supabase
    .from('promo_codes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data: data as PromoCode | null, error };
}

export async function deletePromoCode(id: string) {
  const { error } = await supabase.from('promo_codes').delete().eq('id', id);
  return { error };
}

export async function validatePromoCode(
  code: string,
  sellerId: string
): Promise<{ data: PromoCode | null; error: string | null }> {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('seller_id', sellerId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { data: null, error: 'Promo code not found or not valid for this store.' };
  }

  const promo = data as PromoCode;

  if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
    return { data: null, error: 'This promo code has expired.' };
  }

  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    return { data: null, error: 'This promo code has reached its maximum uses.' };
  }

  return { data: promo, error: null };
}

export async function incrementPromoUse(id: string, currentUsed: number) {
  const { error } = await supabase
    .from('promo_codes')
    .update({ used_count: currentUsed + 1 })
    .eq('id', id);
  return { error };
}

export function calcPromoDiscount(promo: PromoCode, subtotal: number): number {
  if (promo.discount_type === 'percent') {
    return Math.round(subtotal * (promo.discount_value / 100) * 100) / 100;
  }
  return Math.min(promo.discount_value, subtotal);
}
