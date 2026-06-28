export interface CoinPurchase {
  id: string;
  user_id: string;
  coins: number;
  amount_cents?: number;
  stripe_session_id?: string;
  created_at: string;
}

export interface ItemPurchase {
  id: string;
  item_id: string;
  seller_id: string;
  buyer_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  special_requests?: string;
  original_price?: number;
  coupon_code?: string;
  discount_percentage?: number;
  verification_token?: string;
  stripe_session_id?: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed';
  purchased_at: string;
  scheduled_at?: string;
  group_order_id?: string;
}

export type Order = CoinPurchase | ItemPurchase;

export function isCoinPurchase(order: Order): order is CoinPurchase {
  return 'coins' in order;
}

export function isItemPurchase(order: Order): order is ItemPurchase {
  return 'item_name' in order && 'seller_id' in order;
}
