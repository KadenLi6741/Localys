'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function CheckoutSuccessPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [coinsAdded, setCoinsAdded] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const timer = setTimeout(async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('coin_balance')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const { data: purchase, error: purchaseError } = await supabase
          .from('coin_purchases')
          .select('coins')
          .eq('stripe_session_id', sessionId)
          .single();

        if (purchaseError) {
          console.log('Purchase record not found yet:', purchaseError);
        } else if (purchase) {
          setCoinsAdded(purchase.coins);
        }

        setNewBalance(profile?.coin_balance || 0);
        setStatus('success');
      } catch (error) {
        console.error('Error verifying purchase:', error);
        setStatus('error');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId, user]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white/60">Processing your purchase...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Payment Failed</h1>
            <p className="text-white/60 mb-6">
              We couldn't verify your payment. Please contact support if you were charged.
            </p>
            <div className="space-y-3">
              <Link
                href="/buy-coins"
                className="block bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all"
              >
                Try Again
              </Link>
              <Link
                href="/profile"
                className="block bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-lg transition-all font-semibold"
              >
                Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 border border-yellow-500/30 rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="text-5xl mb-4">✨</div>

          <h1 className="text-3xl font-bold mb-2">Purchase Complete!</h1>
          <p className="text-white/60 mb-8">
            Your coins have been added to your account.
          </p>

          {/* Coins Added */}
          {coinsAdded > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
              <p className="text-white/60 text-sm mb-2">Coins Added</p>
              <p className="text-3xl font-bold text-yellow-400">🪙 {coinsAdded.toLocaleString()}</p>
            </div>
          )}

          {/* New Balance */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
            <p className="text-white/60 text-sm mb-2">New Total Balance</p>
            <p className="text-4xl font-bold">🪙 {newBalance.toLocaleString()}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/profile"
              className="block bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg transition-all font-semibold"
            >
              Go to Profile
            </Link>
            <Link
              href="/buy-coins"
              className="block bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition-all"
            >
              Buy More Coins
            </Link>
          </div>

          {/* What Next? */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-white/60 text-sm mb-4">
              💡 Use your coins to promote your videos and boost their visibility!
            </p>
            <Link
              href="/"
              className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold"
            >
              Go to Feed
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
