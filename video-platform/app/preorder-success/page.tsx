'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeDisplay } from '@/components/preorder/QRCodeDisplay';
import { PreOrderTimeline } from '@/components/preorder/PreOrderTimeline';
import type { PreOrder } from '@/models/PreOrder';
import { getPreOrderById } from '@/lib/supabase/preorders';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [preorder, setPreorder] = useState<PreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const preorderId = searchParams.get('preorder_id');
    const noPayment = searchParams.get('no_payment');

    if (preorderId) {
      if (sessionId && !noPayment) {
        verifyAndLoad(sessionId, preorderId);
      } else {
        loadPreorder(preorderId);
      }
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const verifyAndLoad = async (sessionId: string, preorderId: string) => {
    setVerifying(true);
    try {
      await fetch('/api/verify-preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, preorderId }),
      });
    } catch (err) {
      console.error('Verify error:', err);
    }
    setVerifying(false);
    await loadPreorder(preorderId);
  };

  const loadPreorder = async (id: string) => {
    const { data } = await getPreOrderById(id);
    if (data) setPreorder(data);
    setLoading(false);
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">{verifying ? 'Verifying payment...' : 'Loading order...'}</p>
        </div>
      </div>
    );
  }

  if (!preorder) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Order not found</p>
          <Link href="/" className="text-green-400 hover:text-green-300">Go home</Link>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(preorder.scheduled_time);

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <h1 className="text-white text-2xl font-bold mb-1">Order Confirmed!</h1>
          <p className="text-white/50 text-sm">Your pre-order has been placed successfully</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6 text-center">
          <p className="text-white/50 text-xs mb-1">Order Code</p>
          <p className="text-white text-3xl font-mono font-bold tracking-wider">{preorder.order_code}</p>
        </div>

        <div className="flex justify-center mb-8">
          <QRCodeDisplay qrToken={preorder.qr_token} orderCode={preorder.order_code} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Scheduled</span>
            <span className="text-white">
              {scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' at '}
              {scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Type</span>
            <span className="text-white capitalize">{preorder.order_type}</span>
          </div>
          {preorder.restaurant_table && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Table</span>
              <span className="text-white">{preorder.restaurant_table.label} ({preorder.restaurant_table.section})</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total</span>
            <span className="text-green-400 font-semibold">${Number(preorder.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Paid</span>
            <span className="text-white">${Number(preorder.amount_paid).toFixed(2)}</span>
          </div>
          {Number(preorder.amount_remaining) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Due at restaurant</span>
              <span className="text-yellow-400">${Number(preorder.amount_remaining).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="text-white font-semibold text-sm mb-3">Order Status</h3>
          <PreOrderTimeline preorder={preorder} />
        </div>

        <div className="space-y-3">
          <Link href="/my-orders" className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white text-center font-medium rounded-lg transition-colors">
            View All Orders
          </Link>
          <Link href="/" className="block w-full py-3 text-white/50 hover:text-white/80 text-center text-sm transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PreOrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
