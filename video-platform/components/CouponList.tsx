'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoupon } from '@/contexts/CouponContext';
import { getUserCoupons, removeCoupon } from '@/lib/supabase/coupons';
import { CouponModal } from './CouponModal';
import { Toast } from './Toast';
import type { UserCoupon } from '@/lib/supabase/coupons';

export function CouponList() {
  const { user } = useAuth();
  const { activeCoupon, clearActiveCoupon } = useCoupon();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user) {
      loadCoupons();
    }
  }, [user]);

  const loadCoupons = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getUserCoupons(user.id);
      if (fetchError) {
        console.error('Error loading coupons:', fetchError);
        setError('Failed to load coupons');
        setUserCoupons([]);
      } else {
        setUserCoupons(data || []);
      }
    } catch (err: any) {
      console.error('Exception loading coupons:', err);
      setError('Failed to load coupons');
      setUserCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const activeCoupons = userCoupons.filter(uc => !uc.is_used);
  const usedCoupons = userCoupons.filter(uc => uc.is_used);

  const handleRemoveCoupon = async (couponId: string) => {
    if (!user) return;
    
    setRemoving(couponId);
    console.log('Attempting to remove coupon:', couponId);
    
    const { error: removeError } = await removeCoupon(user.id, couponId);
    
    if (removeError) {
      console.error('Error removing coupon:', removeError);
      setToast({
        message: `Failed to remove coupon`,
        type: 'error',
      });
      setRemoving(null);
    } else {
      console.log('Coupon removed successfully');
      // Optimistically remove from UI immediately
      setUserCoupons(prev => prev.filter(uc => uc.coupon_id !== couponId));
      setToast({
        message: 'Coupon removed successfully',
        type: 'success',
      });
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">⚠️ {error}</p>
          <button
            onClick={loadCoupons}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 px-4 py-2 rounded-lg font-medium transition-all inline-block"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">🎟️ My Coupons</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
          >
            + Activate Coupon
          </button>
        </div>

        {userCoupons.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60 mb-4">No coupons yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 px-4 py-2 rounded-lg font-medium transition-all inline-block"
            >
              Browse Available Coupons
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Currently Active Coupon */}
            {activeCoupon && activeCoupon.coupon && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-yellow-200 text-sm font-semibold mb-1">✨ Currently Active</p>
                    <p className="font-semibold text-white text-lg">{(activeCoupon.coupon as any).code}</p>
                    <p className="text-yellow-200 text-sm">
                      {(activeCoupon.coupon as any).discount_percentage > 0
                        ? `${(activeCoupon.coupon as any).discount_percentage}% off your next order`
                        : `$${(activeCoupon.coupon as any).discount_amount} off your next order`}
                    </p>
                  </div>
                  <button
                    onClick={() => clearActiveCoupon()}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap"
                  >
                    Turn Off
                  </button>
                </div>
              </div>
            )}

            {activeCoupons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-200 mb-2">Active Coupons ({activeCoupons.length})</h4>
                <div className="space-y-2">
                  {activeCoupons.map((userCoupon) => {
                    const coupon = userCoupon.coupon || userCoupon;
                    const isActive = activeCoupon?.coupon_id === userCoupon.coupon_id;
                    
                    if (isActive) return null; // Already shown above
                    
                    return (
                      <div
                        key={userCoupon.id}
                        className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-white">{(coupon as any).code}</p>
                          <p className="text-green-200 text-sm">
                            {(coupon as any).discount_percentage > 0
                              ? `${(coupon as any).discount_percentage}% OFF`
                              : `$${(coupon as any).discount_amount} OFF`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveCoupon(userCoupon.coupon_id)}
                          disabled={removing === userCoupon.coupon_id}
                          className="bg-red-500/20 hover:bg-red-500/30 disabled:bg-red-500/10 text-red-200 text-xs px-3 py-1 rounded transition-all"
                        >
                          {removing === userCoupon.coupon_id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {usedCoupons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white/60 mb-2">Used Coupons ({usedCoupons.length})</h4>
                <div className="space-y-2">
                  {usedCoupons.map((userCoupon) => {
                    const coupon = userCoupon.coupon || userCoupon;
                    return (
                      <div
                        key={userCoupon.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between opacity-60"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-white">{(coupon as any).code}</p>
                          <p className="text-white/60 text-sm">
                            Used on {new Date(userCoupon.used_at!).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-white/40 text-xs px-3 py-1">
                          Used
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCouponActivated={loadCoupons}
      />

      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
