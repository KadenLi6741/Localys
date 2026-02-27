'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { OrderTypeSelector } from '@/components/preorder/OrderTypeSelector';
import { TimeSlotPicker } from '@/components/preorder/TimeSlotPicker';
import { PaymentSummaryCard } from '@/components/preorder/PaymentSummaryCard';
import { SeatMapViewer } from '@/components/floorplan/SeatMapViewer';
import type { CartItem, OrderType } from '@/models/PreOrder';
import { supabase } from '@/lib/supabase/client';

function CheckoutContent({ params }: { params: Promise<{ businessId: string }> }) {
  const [businessId, setBusinessId] = useState('');
  const [business, setBusiness] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    params.then((p) => {
      setBusinessId(p.businessId);
      loadBusiness(p.businessId);
    });
  }, [params]);

  useEffect(() => {
    const cartParam = searchParams.get('cart');
    if (cartParam) {
      try { setCart(JSON.parse(decodeURIComponent(cartParam))); } catch {}
    }
  }, [searchParams]);

  const loadBusiness = async (bizId: string) => {
    const { data } = await supabase
      .from('businesses')
      .select('id, business_name, owner_id, upfront_payment_pct')
      .eq('id', bizId)
      .single();
    if (data) setBusiness(data);
    setLoading(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const upfrontPct = business?.upfront_payment_pct ?? 100;

  const handleSubmit = async () => {
    if (!user || !scheduledTime || cart.length === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/checkout-preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          businessId,
          customerId: user.id,
          scheduledTime,
          tableId: orderType === 'dine-in' ? selectedTableId : null,
          orderType,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.noPaymentRequired) {
        router.push(`/preorder-success?preorder_id=${data.preorderId}&no_payment=true`);
      } else {
        console.error('Checkout error:', data.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading...</div>;
  if (!business) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Restaurant not found</div>;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white/80 text-sm transition-colors">&larr; Back to menu</button>

        <h1 className="text-white text-2xl font-bold">Checkout</h1>

        {/* Cart Summary */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Order Summary</h3>
          {cart.map((item) => (
            <div key={item.menuItemId} className="flex justify-between text-sm py-1">
              <span className="text-white/70">{item.quantity}x {item.name}</span>
              <span className="text-white/50">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Order Type */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Order Type</h3>
          <OrderTypeSelector value={orderType} onChange={setOrderType} />
        </div>

        {/* Seat Map */}
        {orderType === 'dine-in' && (
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Choose Your Table</h3>
            <SeatMapViewer businessId={businessId} selectedTableId={selectedTableId} onTableSelect={setSelectedTableId} />
          </div>
        )}

        {/* Time Slot */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Schedule Time</h3>
          <TimeSlotPicker value={scheduledTime} onChange={setScheduledTime} />
        </div>

        {/* Special Instructions */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">Special Instructions</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any allergies or special requests..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
            rows={3}
          />
        </div>

        {/* Payment Summary */}
        <PaymentSummaryCard subtotal={subtotal} upfrontPct={upfrontPct} />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !scheduledTime || cart.length === 0}
          className="w-full py-3.5 bg-green-500 hover:bg-green-600 disabled:bg-green-500/30 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-lg"
        >
          {submitting ? 'Processing...' : upfrontPct > 0 ? `Pay $${(subtotal * upfrontPct / 100).toFixed(2)} & Confirm` : 'Confirm Order'}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ businessId: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading...</div>}>
      <CheckoutContent params={params} />
    </Suspense>
  );
}
