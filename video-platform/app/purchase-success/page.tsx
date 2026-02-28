'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <p className="text-white/70">Loading purchase details...</p>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  );
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [confirmationNumber, setConfirmationNumber] = useState('');

  useEffect(() => {
    if (!sessionId) return;

    const verifyPurchase = async () => {
      try {
        const response = await fetch('/api/verify-item-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();
        if (data.confirmationNumber) {
          setConfirmationNumber(data.confirmationNumber);
        }
      } catch (err) {
        console.error('Verification error:', err);
        // Still show success page
      }
    };

    verifyPurchase();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-2 text-green-400">Purchase Complete!</h1>
          <p className="text-white/60 mb-8">Thank you for your purchase</p>

          {confirmationNumber && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-6">
              <p className="text-white/60 text-sm mb-2">Order Confirmation Number</p>
              <p className="text-2xl font-mono font-bold text-green-400 tracking-wider">{confirmationNumber}</p>
              <p className="text-white/40 text-xs mt-2">Save this for your records</p>
            </div>
          )}

          {sessionId && (
            <div className="bg-black/40 rounded-lg p-4 mb-6 text-left">
              <p className="text-white/60 text-xs mb-1">Session ID:</p>
              <p className="text-white/40 font-mono text-xs break-all">{sessionId}</p>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-blue-400 text-sm">
              ✓ Your order has been confirmed and will be processed shortly
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Back to Home
            </Link>
            <Link
              href="/profile"
              className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              My Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
