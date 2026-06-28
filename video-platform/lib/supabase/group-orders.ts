import { supabase } from './client';

export interface GroupOrder {
  id: string;
  creator_id: string;
  seller_id: string;
  status: 'open' | 'placed' | 'cancelled';
  join_code: string;
  note?: string;
  created_at: string;
}

export interface GroupOrderItem {
  id: string;
  group_order_id: string;
  user_id: string;
  user_name?: string;
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  special_requests?: string;
  created_at: string;
}

function randomCode(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function createGroupOrder(creatorId: string, sellerId: string, note?: string) {
  const join_code = randomCode(6);
  const { data, error } = await supabase
    .from('group_orders')
    .insert({ creator_id: creatorId, seller_id: sellerId, join_code, note })
    .select()
    .single();
  return { data: data as GroupOrder | null, error, join_code };
}

export async function getGroupOrderByCode(code: string) {
  const { data, error } = await supabase
    .from('group_orders')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .single();
  return { data: data as GroupOrder | null, error };
}

export async function getGroupOrderItems(groupOrderId: string) {
  const { data, error } = await supabase
    .from('group_order_items')
    .select('*')
    .eq('group_order_id', groupOrderId)
    .order('created_at', { ascending: true });
  return { data: (data as GroupOrderItem[]) || [], error };
}

export async function addGroupOrderItem(
  groupOrderId: string,
  userId: string,
  userName: string,
  itemId: string,
  itemName: string,
  price: number,
  quantity = 1,
  specialRequests?: string
) {
  const { data, error } = await supabase
    .from('group_order_items')
    .insert({
      group_order_id: groupOrderId,
      user_id: userId,
      user_name: userName,
      item_id: itemId,
      item_name: itemName,
      price,
      quantity,
      special_requests: specialRequests,
    })
    .select()
    .single();
  return { data: data as GroupOrderItem | null, error };
}

export async function removeGroupOrderItem(itemId: string) {
  const { error } = await supabase
    .from('group_order_items')
    .delete()
    .eq('id', itemId);
  return { error };
}

export async function updateGroupOrderStatus(
  groupOrderId: string,
  status: 'open' | 'placed' | 'cancelled'
) {
  const { data, error } = await supabase
    .from('group_orders')
    .update({ status })
    .eq('id', groupOrderId)
    .select()
    .single();
  return { data: data as GroupOrder | null, error };
}

export async function getSellerGroupOrders(sellerId: string) {
  const { data, error } = await supabase
    .from('group_orders')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(30);
  return { data: (data as GroupOrder[]) || [], error };
}
