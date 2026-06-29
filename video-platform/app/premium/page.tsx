'use client';

/**
 * Premium page (/premium) — Localy Premium details and subscribe entry point.
 * Purpose: Explains the $5/month Premium benefits (15% off, double coins), shows the user's current
 *   status, and starts the subscription via /api/subscribe-premium.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPremiumStatus } from '@/lib/supabase/profiles';

/** Localy Premium benefits, shown as bullet points on the details view. */
const BENEFITS = [
  '15% discount across all items',
  'Earn double the coins on every order',
  'Enhanced discovery in the feed',
  'Early access to local deals',
];

export default function PremiumPage() {
  const { user, session } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripeConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { isPremium } = await getUserPremiumStatus(user.id);
      if (active) {
        setIsPremium(isPremium);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!session?.access_token) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/subscribe-premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start checkout');
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
      console.error('[premium] subscribe error:', message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <Link href="/profile" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black">
          ← Back
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f97316] text-white">
            <Crown className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Localy Premium</h1>
            <p className="text-sm text-gray-500">$5 / month · cancel anytime</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-900">What you get</h2>
          <ul className="space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-sm text-black">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-[#f97316]">
            {error}
          </p>
        )}

        {!stripeConfigured && (
          <p className="mt-4 text-sm text-gray-500">
            Payments aren&apos;t configured in this environment.
          </p>
        )}

        <div className="mt-6">
          {loading && user ? (
            <div className="h-12 animate-pulse rounded-full bg-gray-100" />
          ) : isPremium ? (
            <div className="flex items-center justify-center gap-2 rounded-full bg-[#f97316]/10 py-3 text-sm font-semibold text-[#f97316]">
              <Crown className="h-4 w-4" /> You&apos;re a Premium member
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={processing || !stripeConfigured}
              className="w-full rounded-full bg-[#f97316] py-3.5 text-base font-bold text-white transition hover:bg-[#ea6a0c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? 'Opening checkout…' : 'Get Premium — $5/month'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
