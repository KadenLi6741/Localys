export type PreOrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export type OrderType = 'dine-in' | 'pickup';

export interface PreOrder {
  id: string;
  order_code: string;
  qr_token: string;
  business_id: string;
  customer_id: string;
  table_id: string | null;
  order_type: OrderType;
  scheduled_time: string;
  subtotal: number;
  upfront_pct: number;
  amount_paid: number;
  amount_remaining: number;
  stripe_session_id: string | null;
  status: PreOrderStatus;
  notes: string | null;
  confirmed_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  preorder_items?: PreOrderItem[];
  restaurant_table?: { label: string; section: string } | null;
  business?: { business_name: string } | null;
  customer?: { full_name: string; username: string; profile_picture_url?: string } | null;
}

export interface PreOrderItem {
  id: string;
  preorder_id: string;
  menu_item_id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  special_instructions: string | null;
  created_at: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  image_url?: string;
}

export interface PreOrderCreatePayload {
  businessId: string;
  tableId: string | null;
  orderType: OrderType;
  scheduledTime: string;
  items: CartItem[];
  notes?: string;
}
