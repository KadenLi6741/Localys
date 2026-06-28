'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getShopCoupons, Coupon } from '@/lib/supabase/coupons';
import { validatePromoCode, calcPromoDiscount, PromoCode } from '@/lib/supabase/promo-codes';
import { createGroupOrder, getGroupOrderByCode, addGroupOrderItem, GroupOrder } from '@/lib/supabase/group-orders';
import Link from 'next/link';
import { ChevronLeft, Trash2, ShoppingCart, CalendarClock, Users, Tag, Check, X } from 'lucide-react';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, updateSpecialRequests, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Schedule state
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // Group order state
  const [showGroupOrder, setShowGroupOrder] = useState(false);
  const [groupJoinCode, setGroupJoinCode] = useState('');
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupCreated, setGroupCreated] = useState(false);

  const total = items.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const promoDiscount = promoApplied ? calcPromoDiscount(promoApplied, total) : 0;
  const finalTotal = Math.max(0, total - promoDiscount);

  const primarySellerId = items[0]?.sellerId;

  useEffect(() => {
    if (items.length === 0) { setCoupons([]); return; }
    const sellerIds = [...new Set(items.map(i => i.sellerId))];
    const fetchCoupons = async () => {
      setLoadingCoupons(true);
      const all: Coupon[] = [];
      for (const sid of sellerIds) {
        const { data } = await getShopCoupons(sid);
        if (data) all.push(...data);
      }
      setCoupons(all);
      setLoadingCoupons(false);
    };
    fetchCoupons();
  }, [items]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !primarySellerId) return;
    setPromoLoading(true);
    setPromoError(null);
    const { data, error } = await validatePromoCode(promoInput.trim(), primarySellerId);
    setPromoLoading(false);
    if (error) { setPromoError(error); return; }
    setPromoApplied(data);
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoInput('');
    setPromoError(null);
  };

  const handleStartGroupOrder = async () => {
    if (!user || !primarySellerId) return;
    setGroupLoading(true);
    setGroupError(null);
    const { data, error } = await createGroupOrder(user.id, primarySellerId);
    setGroupLoading(false);
    if (error || !data) { setGroupError('Failed to create group order.'); return; }
    setGroupOrder(data);
    setGroupCreated(true);
    // Add current cart items to the group order
    for (const item of items) {
      await addGroupOrderItem(data.id, user.id, user.email || 'Me', item.itemId, item.itemName, item.itemPrice, item.quantity, item.specialRequests);
    }
  };

  const handleJoinGroupOrder = async () => {
    if (!groupJoinCode.trim()) return;
    setGroupLoading(true);
    setGroupError(null);
    const { data, error } = await getGroupOrderByCode(groupJoinCode.trim());
    setGroupLoading(false);
    if (error || !data) { setGroupError('Group order not found. Check the code and try again.'); return; }
    if (data.status !== 'open') { setGroupError('This group order is no longer open.'); return; }
    router.push(`/group-order/${data.join_code}`);
  };

  const handleCheckout = () => {
    if (!user) { router.push('/login'); return; }
    if (items.length === 0) return;
    const params = new URLSearchParams({ source: 'cart' });
    if (scheduledAt) params.set('scheduledAt', scheduledAt);
    if (groupOrder?.id) params.set('groupOrderId', groupOrder.id);
    if (promoApplied?.code) params.set('promoCode', promoApplied.code);
    router.push(`/checkout?${params.toString()}`);
  };

  const minScheduleDate = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16);
  })();

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24">
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/feed" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors text-sm mb-4">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          {items.length > 0 && <p className="text-gray-500 text-sm mt-0.5">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Your cart is empty</p>
            <p className="text-gray-500 text-sm mb-6">Browse local businesses and add items</p>
            <Link href="/feed" className="inline-block bg-[#f97316] hover:opacity-90 text-white font-semibold rounded-xl px-6 py-3 transition-opacity active:scale-95">
              Browse Services
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.itemId} className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors">
                  <div className="flex gap-3">
                    {item.itemImage && (
                      <img src={item.itemImage} alt={item.itemName} className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 font-semibold truncate">{item.itemName}</h3>
                      <p className="text-[#f97316] font-bold">${(item.itemPrice * item.quantity).toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.itemId)} className="text-gray-400 hover:text-red-500 p-2 self-start rounded-lg hover:bg-red-50 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" aria-label="Remove item">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-gray-500 text-sm">Qty:</span>
                    <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                      <button onClick={() => updateQuantity(item.itemId, item.quantity - 1)} disabled={item.quantity <= 1} className="px-3 py-1.5 text-gray-900 hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors min-w-[40px] min-h-[40px]">&minus;</button>
                      <span className="px-3 py-1.5 text-gray-900 font-medium min-w-[2rem] text-center border-x border-gray-200">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.itemId, item.quantity + 1)} className="px-3 py-1.5 text-gray-900 hover:bg-gray-200 transition-colors min-w-[40px] min-h-[40px]">+</button>
                    </div>
                    {item.quantity > 1 && <span className="text-gray-400 text-xs">${item.itemPrice.toFixed(2)} each</span>}
                  </div>
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Special requests (e.g. no onions, extra sauce...)"
                      value={item.specialRequests || ''}
                      onChange={(e) => updateSpecialRequests(item.itemId, e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 transition-colors"
                      aria-label="Special requests"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Promo Code ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-[#f97316]" />
                <span className="text-sm font-semibold text-gray-900">Promo Code</span>
              </div>
              {promoApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-mono font-semibold text-green-700">{promoApplied.code}</span>
                    <span className="text-xs text-green-600">
                      {promoApplied.discount_type === 'percent' ? `${promoApplied.discount_value}% off` : `-$${promoApplied.discount_value.toFixed(2)}`} — saving ${promoDiscount.toFixed(2)}
                    </span>
                  </div>
                  <button onClick={handleRemovePromo} className="text-gray-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Enter promo code"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316] uppercase"
                    />
                    <button onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()} className="bg-gray-900 hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-opacity disabled:opacity-40">
                      {promoLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <p className="text-red-600 text-xs">{promoError}</p>}
                </div>
              )}
            </div>

            {/* ── Available Coupons ── */}
            {!loadingCoupons && coupons.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                <h2 className="text-base font-semibold mb-1 text-gray-900">Available Coupons</h2>
                <p className="text-gray-500 text-xs mb-3">Apply at checkout</p>
                <div className="space-y-2">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="flex items-center justify-between p-3 rounded-xl border border-green-200 bg-white">
                      <div>
                        <p className="font-semibold text-green-700">{coupon.code}</p>
                        <p className="text-gray-500 text-sm">{coupon.discount_percentage}% off</p>
                      </div>
                      <span className="text-green-600 text-xs border border-green-200 px-2 py-1 rounded-lg">Apply at checkout</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loadingCoupons && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#f97316]" />
              </div>
            )}

            {/* ── Schedule for Later ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
              <button onClick={() => setShowSchedule(!showSchedule)} className="flex items-center gap-2 w-full text-left">
                <CalendarClock className="h-4 w-4 text-[#f97316]" />
                <span className="text-sm font-semibold text-gray-900 flex-1">Schedule for Later</span>
                {scheduledAt && <span className="text-xs text-[#f97316] font-medium">{new Date(scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                <span className="text-gray-400 text-xs">{showSchedule ? 'Hide' : 'Set time'}</span>
              </button>
              {showSchedule && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500">Order for a future time — even if the business is currently closed.</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      min={minScheduleDate}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#f97316]"
                    />
                    {scheduledAt && (
                      <button onClick={() => setScheduledAt('')} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                  {scheduledAt && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5 text-[#f97316] shrink-0" />
                      <p className="text-xs text-gray-700">
                        Scheduled for <strong>{new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Group Order ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
              <button onClick={() => setShowGroupOrder(!showGroupOrder)} className="flex items-center gap-2 w-full text-left">
                <Users className="h-4 w-4 text-[#f97316]" />
                <span className="text-sm font-semibold text-gray-900 flex-1">Group Order</span>
                <span className="text-gray-400 text-xs">{showGroupOrder ? 'Hide' : 'Start or join'}</span>
              </button>
              {showGroupOrder && (
                <div className="mt-3 space-y-4">
                  {groupCreated && groupOrder ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <p className="text-sm font-medium text-gray-900 mb-1">Group order created!</p>
                      <p className="text-xs text-gray-500 mb-2">Share this code with friends so they can join at <strong>/group-order/{groupOrder.join_code}</strong></p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xl text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl tracking-widest">{groupOrder.join_code}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/group-order/${groupOrder.join_code}`)}
                          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Start a new group order with your current items. Friends can join and add their own items, each paying for themselves.</p>
                        <button onClick={handleStartGroupOrder} disabled={groupLoading || items.length === 0} className="w-full bg-gray-900 hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-xl transition-opacity disabled:opacity-40">
                          {groupLoading ? 'Creating…' : 'Start Group Order'}
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <div className="flex-grow border-t border-gray-200" />
                        <span className="mx-3 text-xs text-gray-400">or join</span>
                        <div className="flex-grow border-t border-gray-200" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={groupJoinCode}
                            onChange={e => { setGroupJoinCode(e.target.value.toUpperCase()); setGroupError(null); }}
                            placeholder="Enter group code (e.g. ABC123)"
                            maxLength={6}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316] uppercase"
                          />
                          <button onClick={handleJoinGroupOrder} disabled={groupLoading || !groupJoinCode.trim()} className="bg-[#f97316] hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-opacity disabled:opacity-40">
                            Join
                          </button>
                        </div>
                        {groupError && <p className="text-red-600 text-xs">{groupError}</p>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">${total.toFixed(2)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600">Promo ({promoApplied?.code})</span>
                  <span className="font-medium text-green-600">-${promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {scheduledAt && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>Scheduled for {new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button onClick={handleCheckout} className="w-full bg-[#f97316] hover:opacity-90 text-white font-semibold py-3.5 rounded-xl transition-opacity active:scale-[0.98] shadow-sm min-h-[48px]">
                Proceed to Checkout{scheduledAt ? ' (Scheduled)' : ''}
              </button>
              <button onClick={clearCart} className="w-full bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 font-medium py-3 rounded-xl transition-colors border border-gray-200 min-h-[44px]">
                Clear Cart
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
