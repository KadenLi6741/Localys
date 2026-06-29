'use client';

/**
 * Premium success page (/premium/success) — Stripe redirect after subscribing to Premium.
 * Purpose: Confirms the subscription from the Stripe session id (activating Premium via
 *   /api/verify-premium as a safety net beside the webhook) and shows a welcome confirmation.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function PremiumSuccessInner() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>(sessionId ? 'loading' : 'error');

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const verify = async () => {
      try {
        const response = await fetch(`/api/verify-premium?session_id=${encodeURIComponent(sessionId)}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!active) return;
        setStatus(response.ok ? 'done' : 'error');
        if (!response.ok) {
          console.error('[premium-success] verify failed:', response.status);
        }
      } catch (err) {
        if (active) setStatus('error');
        console.error('[premium-success] verify error:', err);
      }
    };
    verify();
    return () => {
      active = false;
    };
  }, [sessionId, session]);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center sm:px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f97316] text-white">
          <Crown className="h-8 w-8" strokeWidth={2.2} />
        </div>
        {status === 'loading' && (
          <p className="mt-6 text-sm text-gray-500">Activating your Premium membership…</p>
        )}
        {status === 'done' && (
          <>
            <h1 className="mt-6 text-2xl font-extrabold">You&apos;re Premium!</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enjoy 15% off all items and double coins on every order.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="mt-6 text-2xl font-extrabold">Almost there</h1>
            <p className="mt-2 text-sm text-gray-600">
              We couldn&apos;t confirm your subscription yet. If you completed payment, it will
              activate shortly.
            </p>
          </>
        )}
        <Link
          href="/profile"
          className="mt-8 rounded-full bg-[#f97316] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ea6a0c]"
        >
          Back to profile
        </Link>
      </div>
    </div>
  );
}

export default function PremiumSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PremiumSuccessInner />
    </Suspense>
  );
}
