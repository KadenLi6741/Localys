'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  getGroupOrderByCode,
  getGroupOrderItems,
  addGroupOrderItem,
  removeGroupOrderItem,
  GroupOrder,
  GroupOrderItem,
} from '@/lib/supabase/group-orders';
import { supabase } from '@/lib/supabase/client';
import { Users, Plus, Trash2, ShoppingCart, Share2 } from 'lucide-react';

export default function GroupOrderPage() {
  return <ProtectedRoute><GroupOrderContent /></ProtectedRoute>;
}

interface MenuItem { id: string; item_name: string; price: number; image_url?: string; }

function GroupOrderContent() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [items, setItems] = useState<GroupOrderItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState(1);
  const [specialReq, setSpecialReq] = useState('');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data: go, error: goErr } = await getGroupOrderByCode(code);
    if (goErr || !go) { setError('Group order not found.'); setLoading(false); return; }
    setGroupOrder(go);

    const [{ data: goItems }, menuRes] = await Promise.all([
      getGroupOrderItems(go.id),
      supabase.from('menu_items').select('id, item_name, price, image_url').eq('user_id', go.seller_id).eq('is_available', true),
    ]);
    setItems(goItems);
    setMenuItems((menuRes.data as MenuItem[]) || []);
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  /* Group by user */
  const grouped = items.reduce<Record<string, { userName: string; items: GroupOrderItem[] }>>((acc, item) => {
    if (!acc[item.user_id]) acc[item.user_id] = { userName: item.user_name || 'Someone', items: [] };
    acc[item.user_id].items.push(item);
    return acc;
  }, {});

  const myItems = items.filter(i => i.user_id === user?.id);
  const myTotal = myItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleAddItem = async () => {
    if (!selectedItem || !user || !groupOrder) return;
    const mi = menuItems.find(m => m.id === selectedItem);
    if (!mi) return;
    setAdding(true);
    await addGroupOrderItem(groupOrder.id, user.id, user.email?.split('@')[0] || 'Me', mi.id, mi.item_name, mi.price, qty, specialReq || undefined);
    setSelectedItem(''); setQty(1); setSpecialReq('');
    setAdding(false);
    load();
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeGroupOrderItem(itemId);
    load();
  };

  const handleCheckoutMyItems = () => {
    if (!user || myItems.length === 0) return;
    // Add my group order items to the cart, then go to checkout
    for (const item of myItems) {
      addToCart({
        itemId: item.item_id,
        itemName: item.item_name,
        itemPrice: item.price,
        sellerId: groupOrder!.seller_id,
        buyerId: user.id,
        quantity: item.quantity,
        specialRequests: item.special_requests,
      });
    }
    router.push(`/checkout?source=cart&groupOrderId=${groupOrder!.id}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/group-order/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" /></div>;
  }

  if (error || !groupOrder) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-900 font-semibold mb-2">{error || 'Group order not found'}</p>
          <button onClick={() => router.back()} className="text-[#f97316] text-sm hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#f97316]/10 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-[#f97316]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900">Group Order</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Code:</span>
            <span className="font-mono font-bold text-sm text-gray-900 tracking-wider">{code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${groupOrder.status === 'open' ? 'bg-orange-50 text-[#f97316]' : 'bg-gray-100 text-gray-500'}`}>{groupOrder.status}</span>
          </div>
        </div>
        <button onClick={handleCopyLink} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-xl transition-colors shrink-0">
          <Share2 className="h-3.5 w-3.5" />
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Everyone's items */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Shared Cart</h2>
            <p className="text-xs text-gray-400 mt-0.5">{Object.keys(grouped).length} participant{Object.keys(grouped).length !== 1 ? 's' : ''} · {items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No items yet. Add yours below!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {Object.entries(grouped).map(([uid, { userName, items: userItems }]) => (
                <div key={uid} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#f97316]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#f97316]">{userName[0]?.toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{uid === user?.id ? 'You' : userName}</p>
                    <span className="text-xs text-gray-400">${userItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span>
                  </div>
                  <div className="space-y-1.5 pl-8">
                    {userItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-700 truncate">
                            {item.item_name}
                            {item.quantity > 1 && <span className="text-gray-400"> ×{item.quantity}</span>}
                          </span>
                          {item.special_requests && <p className="text-xs text-gray-400">{item.special_requests}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-[#f97316] font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                          {uid === user?.id && (
                            <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add items (only if order is open) */}
        {groupOrder.status === 'open' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Add Your Items</h2>
            {menuItems.length === 0 ? (
              <p className="text-gray-400 text-sm">No menu items found for this business.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
                  <select
                    value={selectedItem}
                    onChange={e => setSelectedItem(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="">Choose an item…</option>
                    {menuItems.map(m => (
                      <option key={m.id} value={m.id}>{m.item_name} — ${m.price.toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                    <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 text-gray-900 hover:bg-gray-200 min-w-[40px]">&minus;</button>
                      <span className="px-3 py-2 font-medium text-gray-900 min-w-[2rem] text-center border-x border-gray-200">{qty}</span>
                      <button onClick={() => setQty(q => q + 1)} className="px-3 py-2 text-gray-900 hover:bg-gray-200 min-w-[40px]">+</button>
                    </div>
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Special Requests</label>
                    <input
                      type="text"
                      value={specialReq}
                      onChange={e => setSpecialReq(e.target.value)}
                      placeholder="Optional notes"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316]"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddItem}
                  disabled={adding || !selectedItem}
                  className="w-full flex items-center justify-center gap-2 bg-[#f97316] hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-xl transition-opacity disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  {adding ? 'Adding…' : 'Add to Group Order'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Checkout my items */}
        {myItems.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Your Total</p>
                <p className="text-2xl font-bold text-[#f97316]">${myTotal.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{myItems.length} item{myItems.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-gray-400">each pays their share</p>
              </div>
            </div>
            <button
              onClick={handleCheckoutMyItems}
              className="w-full bg-gray-900 hover:opacity-90 text-white text-sm font-semibold py-3 rounded-xl transition-opacity"
            >
              Pay for My Items — ${myTotal.toFixed(2)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
