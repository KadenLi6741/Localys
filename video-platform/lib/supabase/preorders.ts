import { supabase } from './client';
import type {
  PreOrder,
  PreOrderItem,
  PreOrderStatus,
  PreOrderCreatePayload,
} from '../../models/PreOrder';

function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${code}`;
}

function generateQrToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

export async function createPreOrder(customerId: string, payload: PreOrderCreatePayload) {
  try {
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, upfront_payment_pct')
      .eq('id', payload.businessId)
      .single();

    if (bizError || !business) {
      return { data: null, error: bizError || new Error('Business not found') };
    }

    const upfrontPct = business.upfront_payment_pct ?? 100;
    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const amountPaid = Math.round(subtotal * (upfrontPct / 100) * 100) / 100;
    const amountRemaining = Math.round((subtotal - amountPaid) * 100) / 100;

    const orderCode = generateOrderCode();
    const qrToken = generateQrToken();

    const { data: preorder, error: insertError } = await supabase
      .from('preorders')
      .insert({
        order_code: orderCode,
        qr_token: qrToken,
        business_id: payload.businessId,
        customer_id: customerId,
        table_id: payload.tableId,
        order_type: payload.orderType,
        scheduled_time: payload.scheduledTime,
        subtotal,
        upfront_pct: upfrontPct,
        amount_paid: amountPaid,
        amount_remaining: amountRemaining,
        status: upfrontPct === 0 ? 'confirmed' : 'pending_payment',
        notes: payload.notes || null,
        confirmed_at: upfrontPct === 0 ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating preorder:', insertError);
      return { data: null, error: insertError };
    }

    const items = payload.items.map((item) => ({
      preorder_id: preorder.id,
      menu_item_id: item.menuItemId,
      item_name: item.name,
      item_price: item.price,
      quantity: item.quantity,
      special_instructions: item.specialInstructions || null,
    }));

    const { error: itemsError } = await supabase
      .from('preorder_items')
      .insert(items);

    if (itemsError) {
      console.error('Error creating preorder items:', itemsError);
      await supabase.from('preorders').delete().eq('id', preorder.id);
      return { data: null, error: itemsError };
    }

    if (payload.tableId && upfrontPct === 0) {
      await supabase
        .from('restaurant_tables')
        .update({ status: 'reserved' })
        .eq('id', payload.tableId);
    }

    return { data: preorder as PreOrder, error: null };
  } catch (error: any) {
    console.error('Exception creating preorder:', error);
    return { data: null, error };
  }
}

export async function getPreOrderByQrToken(qrToken: string) {
  try {
    const { data, error } = await supabase
      .from('preorders')
      .select(`
        *,
        preorder_items(*),
        restaurant_tables(label, section),
        profiles!preorders_customer_id_fkey(full_name, username, profile_picture_url),
        businesses!preorders_business_id_fkey(business_name)
      `)
      .eq('qr_token', qrToken)
      .single();

    if (error) {
      console.error('Error fetching preorder by QR token:', error);
      return { data: null, error };
    }

    const mapped = {
      ...data,
      restaurant_table: data.restaurant_tables || null,
      customer: data.profiles || null,
      business: data.businesses || null,
    };
    delete (mapped as any).restaurant_tables;
    delete (mapped as any).profiles;
    delete (mapped as any).businesses;

    return { data: mapped as PreOrder, error: null };
  } catch (error: any) {
    console.error('Exception fetching preorder by QR:', error);
    return { data: null, error };
  }
}

export async function getPreOrderById(preorderId: string) {
  try {
    const { data, error } = await supabase
      .from('preorders')
      .select(`
        *,
        preorder_items(*),
        restaurant_tables(label, section),
        profiles!preorders_customer_id_fkey(full_name, username, profile_picture_url),
        businesses!preorders_business_id_fkey(business_name)
      `)
      .eq('id', preorderId)
      .single();

    if (error) {
      console.error('Error fetching preorder:', error);
      return { data: null, error };
    }

    const mapped = {
      ...data,
      restaurant_table: data.restaurant_tables || null,
      customer: data.profiles || null,
      business: data.businesses || null,
    };
    delete (mapped as any).restaurant_tables;
    delete (mapped as any).profiles;
    delete (mapped as any).businesses;

    return { data: mapped as PreOrder, error: null };
  } catch (error: any) {
    console.error('Exception fetching preorder:', error);
    return { data: null, error };
  }
}

export async function getCustomerPreOrders(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('preorders')
      .select(`
        *,
        preorder_items(*),
        restaurant_tables(label, section),
        businesses!preorders_business_id_fkey(business_name)
      `)
      .eq('customer_id', customerId)
      .order('scheduled_time', { ascending: false });

    if (error) {
      console.error('Error fetching customer preorders:', error);
      return { data: null, error };
    }

    const mapped = (data || []).map((d: any) => ({
      ...d,
      restaurant_table: d.restaurant_tables || null,
      business: d.businesses || null,
    }));

    return { data: mapped as PreOrder[], error: null };
  } catch (error: any) {
    console.error('Exception fetching customer preorders:', error);
    return { data: null, error };
  }
}

export async function getBusinessPreOrders(businessId: string, statusFilter?: PreOrderStatus[]) {
  try {
    let query = supabase
      .from('preorders')
      .select(`
        *,
        preorder_items(*),
        restaurant_tables(label, section),
        profiles!preorders_customer_id_fkey(full_name, username, profile_picture_url)
      `)
      .eq('business_id', businessId)
      .order('scheduled_time', { ascending: true });

    if (statusFilter && statusFilter.length > 0) {
      query = query.in('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching business preorders:', error);
      return { data: null, error };
    }

    const mapped = (data || []).map((d: any) => ({
      ...d,
      restaurant_table: d.restaurant_tables || null,
      customer: d.profiles || null,
    }));

    return { data: mapped as PreOrder[], error: null };
  } catch (error: any) {
    console.error('Exception fetching business preorders:', error);
    return { data: null, error };
  }
}

export async function updatePreOrderStatus(preorderId: string, newStatus: PreOrderStatus) {
  try {
    const timestampFields: Record<string, string> = {};
    const now = new Date().toISOString();

    switch (newStatus) {
      case 'confirmed':
        timestampFields.confirmed_at = now;
        break;
      case 'arrived':
        timestampFields.arrived_at = now;
        break;
      case 'completed':
        timestampFields.completed_at = now;
        break;
      case 'cancelled':
        timestampFields.cancelled_at = now;
        break;
    }

    const { data, error } = await supabase
      .from('preorders')
      .update({
        status: newStatus,
        ...timestampFields,
        updated_at: now,
      })
      .eq('id', preorderId)
      .select('*, restaurant_tables(label, section)')
      .single();

    if (error) {
      console.error('Error updating preorder status:', error);
      return { data: null, error };
    }

    if (data.table_id) {
      if (newStatus === 'confirmed') {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'reserved' })
          .eq('id', data.table_id);
      } else if (newStatus === 'arrived') {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' })
          .eq('id', data.table_id);
      } else if (newStatus === 'completed' || newStatus === 'cancelled') {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'available' })
          .eq('id', data.table_id);
      }
    }

    return { data: data as PreOrder, error: null };
  } catch (error: any) {
    console.error('Exception updating preorder status:', error);
    return { data: null, error };
  }
}

export async function cancelPreOrder(preorderId: string, userId: string) {
  try {
    const { data: preorder, error: fetchError } = await supabase
      .from('preorders')
      .select('*, businesses!preorders_business_id_fkey(owner_id)')
      .eq('id', preorderId)
      .single();

    if (fetchError || !preorder) {
      return { data: null, error: fetchError || new Error('Preorder not found') };
    }

    const isCustomer = preorder.customer_id === userId;
    const isOwner = (preorder as any).businesses?.owner_id === userId;
    if (!isCustomer && !isOwner) {
      return { data: null, error: new Error('Unauthorized') };
    }

    if (['completed', 'cancelled'].includes(preorder.status)) {
      return { data: null, error: new Error('Cannot cancel a completed or already cancelled order') };
    }

    return await updatePreOrderStatus(preorderId, 'cancelled');
  } catch (error: any) {
    console.error('Exception cancelling preorder:', error);
    return { data: null, error };
  }
}
