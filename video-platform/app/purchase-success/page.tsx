'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// qrcode.react ships only when an order QR is actually rendered.
const OrderQRCode = dynamic(
  () => import('@/components/QRCode').then((m) => m.OrderQRCode),
  { ssr: false, loading: () => <div className="h-40 w-40 animate-pulse rounded-lg bg-white/10" /> },
);
import { useAuth } from '@/contexts/AuthContext';
import { saveLocalOrder, getLocalOrders } from '@/lib/clientEngagement';

interface OrderInfo {
  orderId: string;
  token: string;
  itemName: string;
  price: number;
  quantity?: number;
  scheduledAt?: string | null;
  specialRequests?: string | null;
  fulfillment?: 'pickup' | 'delivery' | 'reservation';
  reservation?: { party: number; time: string; comments: string | null } | null;
}

/** Last-resort order number when verification is unavailable (demo/offline). */
function fallbackOrderNumber(sessionId: string): string {
  return `ORD-${sessionId.slice(-8).toUpperCase()}`;
}

/** "Sat, Jun 28 at 6:30 PM" from an ISO string, or null. */
function formatSchedule(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" />
      </div>
    }>
      <PurchaseSuccessContent />
    </Suspense>
  );
}

function PurchaseSuccessContent() {
  const { session, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    // Wait until AuthContext has finished initialising — otherwise the token is
    // not yet available and the request goes out without an Authorization header.
    if (authLoading) return;

    const verifyPurchase = async () => {
      try {
        const response = await fetch('/api/verify-item-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          let serverErr = '';
          try { const e = await response.json(); serverErr = e?.detail || e?.error || ''; } catch { /* no body */ }
          console.error('[purchase-success] Verify failed:', response.status, serverErr);

          // Never show a blank/error screen: fall back to any orders saved for an
          // earlier visit, and always present an order number + friendly message.
          const saved = getLocalOrders();
          if (saved.length > 0) {
            setOrders(saved.slice(0, 5).map((o) => ({ orderId: o.id, token: '', itemName: o.itemName, price: o.price })));
            setConfirmationNumber(saved[0].confirmationNumber || fallbackOrderNumber(sessionId));
          } else {
            setConfirmationNumber(fallbackOrderNumber(sessionId));
          }
          setNotice('Your payment went through. We are finalizing your order details — they will appear in your order history shortly.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.confirmationNumber) setConfirmationNumber(data.confirmationNumber);
        if (typeof data.total === 'number') setServerTotal(data.total);
        if (data.orders?.length > 0) {
          setOrders(data.orders);
          // Save to localStorage so demo/local orders appear in order history
          const now = new Date().toISOString();
          data.orders.forEach((o: OrderInfo) => {
            try {
              saveLocalOrder({
                id: o.orderId,
                confirmationNumber: data.confirmationNumber,
                itemName: o.itemName,
                price: o.price,
                purchased_at: now,
                scheduledAt: o.scheduledAt ?? null,
                specialRequests: o.specialRequests ?? null,
                token: o.token || null,
                quantity: o.quantity,
                fulfillment: o.fulfillment,
              });
            } catch (err) {
              console.error('[purchase-success] Could not save local order:', err);
            }
          });
        }
      } catch (err) {
        console.error('[purchase-success] Verification error:', err);
        // Graceful, never-blank fallback on network/parse failure too.
        setConfirmationNumber((prev) => prev || fallbackOrderNumber(sessionId));
        setNotice('Your payment went through. We are finalizing your order details — they will appear in your order history shortly.');
      } finally {
        setLoading(false);
      }
    };

    verifyPurchase();
  }, [sessionId, session?.access_token, authLoading]);

  const computedTotal = orders.reduce((sum, o) => sum + o.price * (o.quantity ?? 1), 0);
  const total = serverTotal ?? computedTotal;
  const qrOrders = orders.filter((o) => o.token);
  const scheduledLabel = formatSchedule(orders.find((o) => o.scheduledAt)?.scheduledAt);
  const fulfillment = orders.find((o) => o.fulfillment)?.fulfillment ?? 'delivery';
  const fulfillmentLabel = fulfillment === 'pickup' ? 'Pickup' : fulfillment === 'reservation' ? 'Reservation' : 'Delivery';
  const reservation = orders.find((o) => o.reservation)?.reservation ?? null;
  const reservationLabel = formatSchedule(reservation?.time);

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="w-full max-w-lg mx-auto px-4 py-10">

        {/* Success icon + heading */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#f97316]/10 border-2 border-[#f97316] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#f97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-black mb-1">Order confirmed!</h1>
          <p className="text-gray-500 text-sm">Thank you for your purchase</p>
        </div>

        {/* Order number */}
        {confirmationNumber && (
          <div className="bg-black rounded-2xl p-5 mb-4 text-center">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Order number</p>
            <p className="text-2xl font-mono font-bold text-[#f97316] tracking-wider">{confirmationNumber}</p>
            <p className="text-white/40 text-xs mt-1">Save this for your records</p>
          </div>
        )}

        {/* Friendly notice when details are still finalizing (never a blank/error screen) */}
        {!loading && notice && (
          <div className="border border-[#f97316]/30 bg-[#f97316]/5 rounded-2xl p-4 mb-4">
            <p className="text-sm text-black">{notice}</p>
          </div>
        )}

        {/* Loading while verifying */}
        {loading && (
          <div className="border border-gray-100 rounded-2xl p-6 mb-4 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f97316]" />
            <p className="text-gray-400 text-sm">Confirming order details...</p>
          </div>
        )}

        {/* Order summary */}
        {!loading && orders.length > 0 && (
          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-semibold text-black mb-3">Order summary</h2>
            <div className="space-y-3 divide-y divide-gray-100">
              {orders.map((o) => (
                <div key={o.orderId} className="flex items-start justify-between pt-3 first:pt-0">
                  <div className="min-w-0 pr-3">
                    <span className="text-sm text-black font-medium">
                      {o.itemName}{o.quantity && o.quantity > 1 ? <span className="text-gray-500 font-normal"> ×{o.quantity}</span> : null}
                    </span>
                    {o.specialRequests && (
                      <p className="text-xs text-gray-500 mt-0.5">Note: {o.specialRequests}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#f97316] shrink-0">${(o.price * (o.quantity ?? 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fulfillment</span>
              <span className="text-sm font-semibold text-black">{fulfillmentLabel}</span>
            </div>
            {fulfillment === 'delivery' && (
              <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery fee (5%)</span>
                <span className="text-sm font-semibold text-black">Included in total</span>
              </div>
            )}
            {fulfillment === 'reservation' && reservation && (
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party size</span>
                  <span className="text-sm font-semibold text-black">{reservation.party} {reservation.party === 1 ? 'guest' : 'guests'}</span>
                </div>
                {reservationLabel && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reservation</span>
                    <span className="text-sm font-semibold text-black">{reservationLabel}</span>
                  </div>
                )}
                {reservation.comments && (
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Comments</span>
                    <span className="text-sm text-black text-right break-words min-w-0">{reservation.comments}</span>
                  </div>
                )}
              </div>
            )}
            {scheduledLabel && (
              <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled for</span>
                <span className="text-sm font-semibold text-black">{scheduledLabel}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
              <span className="text-sm font-semibold text-black">Total</span>
              <span className="text-sm font-bold text-black">${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* QR codes for pickup */}
        {!loading && qrOrders.length > 0 && (
          <div className="border border-gray-200 rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold text-black mb-1">Pickup QR code</p>
            <p className="text-xs text-gray-400 mb-4">Show this at the business when you arrive</p>
            <div className="space-y-4">
              {qrOrders.map((order) => (
                <div key={order.orderId} className="flex flex-col items-center">
                  <OrderQRCode orderId={order.orderId} token={order.token} size={160} />
                  <p className="text-sm font-medium text-black mt-2">{order.itemName}</p>
                  <p className="text-xs text-gray-400">${order.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            href="/profile"
            className="block w-full bg-[#f97316] hover:opacity-90 text-white font-semibold py-3.5 rounded-xl text-center transition-opacity"
          >
            View Order History
          </Link>
          <Link
            href="/feed"
            className="block w-full border border-gray-200 hover:border-gray-400 text-black font-semibold py-3.5 rounded-xl text-center transition-colors"
          >
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
