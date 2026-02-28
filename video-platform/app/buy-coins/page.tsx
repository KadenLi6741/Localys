'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCoins } from '@/lib/supabase/profiles';
import { getUserCoupons, validateCoupon } from '@/lib/supabase/coupons';
import { useEffect } from 'react';
import Link from 'next/link';
import type { UserCoupon } from '@/lib/supabase/coupons';

const COIN_PACKAGES = [
  {
    id: 'starter',
    coins: 1000,
    price: 10,
    popular: false,
    description: 'Perfect for getting started',
  },
  {
    id: 'pro',
    coins: 2500,
    price: 20,
    popular: true,
    description: 'Best value - save 25%',
  },
  {
    id: 'premium',
    coins: 6000,
    price: 50,
    popular: false,
    description: 'Maximum coins',
  },
];

export default function BuyCoinsPage() {
  const { user } = useAuth();
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setStripeConfigured(false);
      setError('Payment system is not configured. Please contact support.');
    }

    if (user) {
      loadCoinBalance();
      loadCoupons();
    }
  }, [user]);

  const loadCoupons = async () => {
    try {
      const { data: coupons, error } = await getUserCoupons(user?.id || '');
      console.log('Loaded coupons:', { coupons, error });
      if (!error && coupons) {
        setAvailableCoupons(coupons);
      } else if (error) {
        console.error('Error loading coupons:', error);
      }
    } catch (err) {
      console.error('Error loading coupons:', err);
    }
  };

  const loadCoinBalance = async () => {
    try {
      const { data: coins } = await getUserCoins(user?.id || '');
      setCoinBalance(coins || 0);
    } catch (err) {
      console.error('Error loading coin balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async (coupon: UserCoupon) => {
    if (!selectedPackage) {
      setError('Please select a package first');
      return;
    }

    try {
      // Validate coupon
      const couponCode = (coupon.coupon as any)?.code || '';
      const { data: validatedCoupon, error: validateError } = await validateCoupon(
        couponCode,
        user?.id || ''
      );

      if (validateError || !validatedCoupon) {
        setError(validateError?.message || 'Invalid coupon');
        return;
      }

      setSelectedCoupon(coupon);
      
      // Calculate discount
      const pkg = COIN_PACKAGES.find(p => p.id === selectedPackage);
      if (pkg) {
        const discount = Math.ceil(pkg.price * (validatedCoupon.discount_percentage / 100));
        setDiscountAmount(discount);
      }
    } catch (err) {
      console.error('Error applying coupon:', err);
      setError('Failed to apply coupon');
    }
  };

  const handleCheckout = async (packageId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setProcessing(true);
    setSelectedPackage(packageId);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          userId: user.id,
          couponCode: selectedCoupon ? (selectedCoupon.coupon as any)?.code : null,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error: Please try again later');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Checkout failed';
      setError(errorMsg);
      console.error('Checkout error:', err);
    } finally {
      setProcessing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link href="/profile" className="text-white/60 hover:text-white mb-4 inline-flex items-center gap-2">
            ← Back to Profile
          </Link>
          <h1 className="text-4xl font-bold mb-2">Buy Coins</h1>
          <p className="text-white/60">Boost your videos to get more views and engagement</p>
        </div>

        {/* Current Balance */}
        {!loading && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-12">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Current Balance</p>
                <p className="text-3xl font-bold">🪙 {coinBalance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm mb-2">Need coins?</p>
                <p className="text-white/80 text-sm">Choose a package below to get started</p>
              </div>
            </div>
          </div>
        )}

        {/* Stripe Configuration Warning */}
        {!stripeConfigured && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Payment system not configured.</strong> The administrator needs to set up Stripe API keys.
            </p>
          </div>
        )}

        {/* Available Coupons */}
        {availableCoupons.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">🎉 Available Coupons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableCoupons.map((coupon) => {
                const couponData = (coupon.coupon as any);
                const isSelected = selectedCoupon?.id === coupon.id;
                return (
                  <button
                    key={coupon.id}
                    onClick={() => handleApplyCoupon(coupon)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-400">{couponData.code}</p>
                        <p className="text-white/60 text-sm">{couponData.discount_percentage}% Off</p>
                      </div>
                      {isSelected && (
                        <span className="text-green-400 text-lg">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Coupon Applied Not */}
        {selectedCoupon && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8">
            <p className="text-blue-400 text-sm">
              ✓ Coupon applied! You'll save ${discountAmount} on your purchase.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-sm border border-red-500/50 rounded-lg p-8 max-w-sm w-full text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">Currently This Option Is Not Available</h2>
              <p className="text-white/60 mb-6 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="bg-white/10 hover:bg-white/20 text-white py-2 px-6 rounded-lg transition-all w-full font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COIN_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-lg border transition-all ${
                pkg.popular
                  ? 'border-yellow-500 bg-yellow-500/5 ring-2 ring-yellow-500/30'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="p-8 pt-10">
                {/* Coins */}
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold mb-2">🪙</div>
                  <p className="text-3xl font-bold text-yellow-400">{pkg.coins.toLocaleString()}</p>
                  <p className="text-white/60 text-sm mt-2">{pkg.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-8 border-t border-b border-white/10 py-6">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-4xl font-bold">
                      ${selectedCoupon && selectedPackage === pkg.id ? Math.max(0, pkg.price - discountAmount) : pkg.price}
                    </p>
                    {selectedCoupon && selectedPackage === pkg.id && (
                      <p className="text-white/40 line-through text-lg">${pkg.price}</p>
                    )}
                  </div>
                  <p className="text-white/60 text-sm">
                    {(pkg.coins / pkg.price).toFixed(0)} coins per dollar
                  </p>
                </div>

                {/* Button */}
                <button
                  onClick={() => handleCheckout(pkg.id)}
                  disabled={processing || selectedPackage === pkg.id || !stripeConfigured}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    pkg.popular
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400 disabled:bg-yellow-500/50'
                      : 'bg-white/10 text-white hover:bg-white/20 disabled:bg-white/5'
                  } disabled:cursor-not-allowed`}
                >
                  {processing && selectedPackage === pkg.id ? 'Processing...' : `Buy Now`}
                </button>

                {/* Benefits */}
                <div className="mt-6 space-y-2 text-sm">
                  <p className="text-white/60">✓ Instant delivery</p>
                  <p className="text-white/60">✓ Secure payment</p>
                  <p className="text-white/60">✓ Use anytime</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 bg-white/5 border border-white/10 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">How do I use coins?</h3>
              <p className="text-white/60">Use coins to promote your videos. Each coin spent increases your video's visibility in the feed.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Are payments secure?</h3>
              <p className="text-white/60">Yes, we use Stripe for secure payments. Your payment information is encrypted and never stored on our servers.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I get a refund?</h3>
              <p className="text-white/60">Coins are non-refundable once purchased, but you can use them anytime to promote your videos.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do coins expire?</h3>
              <p className="text-white/60">No, your coins never expire. Use them whenever you want to boost your videos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
