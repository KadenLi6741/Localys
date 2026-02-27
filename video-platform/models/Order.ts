import type { PreOrder } from './PreOrder';

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
  stripe_session_id?: string;
  status: 'completed' | 'pending' | 'cancelled';
  purchased_at: string;
}

export type Order = CoinPurchase | ItemPurchase | PreOrder;

export function isCoinPurchase(order: Order): order is CoinPurchase {
  return 'coins' in order;
}

export function isItemPurchase(order: Order): order is ItemPurchase {
  return 'item_name' in order && 'seller_id' in order;
}

export function isPreOrder(order: Order): order is PreOrder {
  return 'qr_token' in order && 'order_code' in order;
}
