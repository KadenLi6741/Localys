'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartItem } from '@/contexts/CartContext';
import { getShopCoupons, Coupon } from '@/lib/supabase/coupons';
import { saveConsent } from '@/lib/supabase/emailConsents';
import { validateFutureDateTime } from '@/lib/utils/validation';
import Link from 'next/link';
import { ChevronLeft, CalendarClock, Tag, CheckCircle, Truck, Store } from 'lucide-react';

type Fulfillment = 'pickup' | 'delivery';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, session } = useAuth();
  const { items: cartItems, clearCart } = useCart();

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Email/notifications opt-in — UNCHECKED by default (explicit opt-in).
  const [emailConsent, setEmailConsent] = useState(false);

  const source = searchParams.get('source');
  const scheduledAt = searchParams.get('scheduledAt');
  const groupOrderId = searchParams.get('groupOrderId');
  const promoCodeParam = searchParams.get('promoCode');
  const couponCodeParam = searchParams.get('couponCode');
  const fulfillment: Fulfillment = searchParams.get('fulfillment') === 'pickup' ? 'pickup' : 'delivery';

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (source === 'cart') {
      setCheckoutItems(cartItems);
    } else {
      const itemId = searchParams.get('itemId');
      const itemName = searchParams.get('itemName');
      const itemPrice = searchParams.get('itemPrice');
      const sellerId = searchParams.get('sellerId');
      const buyerId = searchParams.get('buyerId');
      const itemImage = searchParams.get('itemImage') || undefined;
      if (itemId && itemName && itemPrice && sellerId && buyerId) {
        setCheckoutItems([{ itemId, itemName, itemPrice: parseFloat(itemPrice), itemImage, sellerId, buyerId, quantity: 1 }]);
      }
    }
    setLoading(false);
  }, [user, source, searchParams, cartItems, router]);

  useEffect(() => {
    if (checkoutItems.length === 0) return;
    const sellerIds = [...new Set(checkoutItems.map(i => i.sellerId))];
    const fetchCoupons = async () => {
      const all: Coupon[] = [];
      for (const sid of sellerIds) {
        const { data } = await getShopCoupons(sid);
        if (data) all.push(...data);
      }
      // Dedupe so a global coupon (fetched once per seller) renders once and React
      // keys stay unique — fixes the duplicate-key crash.
      const byKey = new Map<string, Coupon>();
      for (const c of all) {
        const key = c.id ?? c.code;
        if (key && !byKey.has(key)) byKey.set(key, c);
      }
      const deduped = [...byKey.values()];
      setCoupons(deduped);
      // Preselect a coupon passed from the cart (keeps enter-time + checkout in sync).
      if (couponCodeParam) {
        const match = deduped.find((c) => c.code.toUpperCase() === couponCodeParam.toUpperCase());
        if (match) setSelectedCoupon(match);
      }
    };
    fetchCoupons();
  }, [checkoutItems, couponCodeParam]);

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);

  // Apply the straightforward item deals: % off, $ off (over threshold), and BOGO
  // (cheapest of each pair free). free_delivery/bundle/first_order are display badges.
  const dealSavings = Math.round(checkoutItems.reduce((sum, item) => {
    const d = item.deal;
    if (!d) return sum;
    const line = item.itemPrice * item.quantity;
    if ((d.type === 'percent' || d.type === 'first_order') && d.value) return sum + (line * d.value) / 100;
    if (d.type === 'dollar_off' && d.value) return line >= (d.threshold ?? 0) ? sum + d.value : sum;
    if (d.type === 'bogo') return sum + Math.floor(item.quantity / 2) * item.itemPrice;
    return sum;
  }, 0) * 100) / 100;

  const couponDiscount = selectedCoupon ? Math.round((subtotal - dealSavings) * (selectedCoupon.discount_percentage / 100) * 100) / 100 : 0;

  // Tax is added to the customer's total; Localy's 5% platform fee is taken from
  // the BUSINESS's portion (shown for transparency, NOT charged to the customer).
  const TAX_RATE = 0.0825;
  const LOCALY_FEE_RATE = 0.05;
  const taxableBase = Math.max(0, subtotal - dealSavings - couponDiscount);
  const tax = Math.round(taxableBase * TAX_RATE * 100) / 100;
  const localyFee = Math.round(taxableBase * LOCALY_FEE_RATE * 100) / 100;
  const businessNet = Math.round(taxableBase * (1 - LOCALY_FEE_RATE) * 100) / 100;
  const total = Math.round((taxableBase + tax) * 100) / 100;

  const handleProceedToPayment = async () => {
    if (checkoutItems.length === 0) return;
    if (!session?.access_token) { setError('Your session has expired. Please sign in again.'); return; }
    // Semantic guard: a scheduled order time (carried over from the cart) must
    // still be in the future when payment starts.
    if (scheduledAt) {
      const scheduleErr = validateFutureDateTime(scheduledAt, { label: 'Scheduled time' });
      if (scheduleErr) { setError(scheduleErr); return; }
    }
    setProcessing(true);
    setError(null);

    // Save email/notification consent for each business in this order — only if
    // the customer opted in. Best-effort + fire-and-forget so it never blocks or
    // crashes checkout (handles demo/slug sellers gracefully).
    if (emailConsent && user) {
      const sellerIds = [...new Set(checkoutItems.map((i) => i.sellerId))];
      const userName = (user.user_metadata?.full_name as string) || user.email || null;
      for (const sellerId of sellerIds) {
        void saveConsent({
          userId: user.id,
          userEmail: user.email ?? null,
          userName,
          businessId: sellerId,
        });
      }
    }

    try {
      const response = await fetch('/api/checkout-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          items: checkoutItems.map((item) => ({
            itemId: item.itemId, itemName: item.itemName, itemImage: item.itemImage,
            sellerId: item.sellerId, quantity: item.quantity, specialRequests: item.specialRequests,
          })),
          // Only ONE discount at a time: a selected coupon takes precedence over a
          // promo code carried from the cart.
          couponCode: selectedCoupon?.code || null,
          promoCode: selectedCoupon ? null : (promoCodeParam || null),
          scheduledAt: scheduledAt || null,
          groupOrderId: groupOrderId || null,
          fulfillment,
        }),
      });
      const data = await response.json();
      if (data.error) { setError(data.error); return; }
      if (data.url) {
        if (source === 'cart') clearCart();
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" /></div>;
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-md mx-auto text-center py-16">
          <p className="text-gray-500 mb-4">No items to checkout</p>
          <Link href="/feed" className="inline-block bg-[#f97316] text-white font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition-opacity">
            Browse Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <div className="w-full max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors text-sm mb-4">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Fulfillment notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          {fulfillment === 'pickup'
            ? <Store className="h-5 w-5 text-[#f97316] shrink-0 mt-0.5" />
            : <Truck className="h-5 w-5 text-[#f97316] shrink-0 mt-0.5" />}
          <div>
            <p className="text-sm font-semibold text-gray-900">{fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</p>
            <p className="text-sm text-gray-600">
              {fulfillment === 'pickup' ? 'Pick this order up at the store' : 'This order will be delivered to you'}
            </p>
          </div>
        </div>

        {/* Scheduled notice */}
        {scheduledAt && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <CalendarClock className="h-5 w-5 text-[#f97316] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Scheduled Order</p>
              <p className="text-sm text-gray-600">
                {new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
                {new Date(scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}

        {/* Promo code applied (hidden when a coupon is selected — one discount at a time) */}
        {promoCodeParam && !selectedCoupon && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#f97316] shrink-0" />
            <p className="text-sm text-black">Promo code <strong className="font-mono text-[#f97316]">{promoCodeParam}</strong> applied</p>
          </div>
        )}

        {/* Group order notice */}
        {groupOrderId && (
          <div className="bg-gray-100 border border-gray-200 rounded-2xl p-3 mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-gray-500 shrink-0" />
            <p className="text-sm text-gray-600">Part of a group order</p>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h2>
          <div className="space-y-3 divide-y divide-gray-100">
            {checkoutItems.map((item) => (
              <div key={item.itemId} className="flex items-center gap-3 pt-3 first:pt-0">
                {item.itemImage && <img src={item.itemImage} alt={item.itemName} className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium truncate">{item.itemName}</p>
                  {item.deal && <span className="mt-0.5 inline-flex rounded bg-[#f97316] px-1.5 py-0.5 text-[11px] font-semibold text-white">{item.deal.label}</span>}
                  {item.quantity > 1 && <p className="text-gray-400 text-xs">×{item.quantity} @ ${item.itemPrice.toFixed(2)}</p>}
                  {item.specialRequests && <p className="text-gray-500 text-xs mt-0.5">{item.specialRequests}</p>}
                </div>
                <p className="text-[#f97316] font-bold shrink-0">${(item.itemPrice * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Coupons */}
        {coupons.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Available Coupons</h2>
            <div className="space-y-2">
              {coupons.map((coupon) => {
                const isSelected = selectedCoupon?.id === coupon.id;
                return (
                  <button
                    key={coupon.id ?? coupon.code}
                    onClick={() => setSelectedCoupon(isSelected ? null : coupon)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-[#f97316] bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-mono font-semibold text-sm ${isSelected ? 'text-[#f97316]' : 'text-gray-900'}`}>{coupon.code}</p>
                        <p className="text-gray-500 text-xs">{coupon.discount_percentage}% off</p>
                      </div>
                      {isSelected && <CheckCircle className="h-5 w-5 text-[#f97316] shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
          </div>
          {dealSavings > 0 && (
            <div className="flex justify-between text-sm text-[#f97316]">
              <span>Deals</span><span>-${dealSavings.toFixed(2)}</span>
            </div>
          )}
          {selectedCoupon && (
            <div className="flex justify-between text-sm text-[#f97316]">
              <span>Coupon ({selectedCoupon.discount_percentage}%)</span>
              <span>-${couponDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax (8.25%)</span><span>${tax.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>

          {/* Transparency: Localy's 5% platform fee comes out of the business's
              portion — it is NOT added to the customer's total. */}
          <div className="mt-2 border-t border-dashed border-gray-200 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900">Localy fee (5%)</span>
              <span className="font-medium text-[#f97316]">${localyFee.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">
              Localy only takes 5% — the business keeps 95% (${businessNet.toFixed(2)}). This isn&apos;t added to your total.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Email/notifications consent — opt-in, unchecked by default */}
        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4">
          <input
            type="checkbox"
            checked={emailConsent}
            onChange={(e) => setEmailConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#f97316]"
          />
          <span className="text-sm text-gray-700">
            Allow this business to send me emails and notifications about deals and updates.
          </span>
        </label>

        {/* Proceed */}
        <button
          onClick={handleProceedToPayment}
          disabled={processing}
          className="w-full bg-[#f97316] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-opacity flex items-center justify-center gap-2 min-h-[52px]"
        >
          {processing ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Processing…</>
          ) : (
            `Pay $${total.toFixed(2)}${scheduledAt ? ' (Scheduled)' : ''}`
          )}
        </button>
        <p className="text-gray-400 text-xs text-center mt-3">Redirecting to Stripe for secure payment</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
