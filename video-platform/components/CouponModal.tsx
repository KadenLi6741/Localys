'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoupon } from '@/contexts/CouponContext';
import { getAllAvailableCoupons, activateCoupon, getUserCoupons } from '@/lib/supabase/coupons';
import type { Coupon, UserCoupon } from '@/lib/supabase/coupons';
import { Toast } from '@/components/Toast';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCouponActivated?: () => void;
}

export function CouponModal({ isOpen, onClose, onCouponActivated }: CouponModalProps) {
  const { user } = useAuth();
  const { activeCoupon, setActiveCoupon, clearActiveCoupon } = useCoupon();
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'my-coupons'>('available');

  useEffect(() => {
    if (isOpen && user) {
      loadCoupons();
    }
  }, [isOpen, user]);

  const loadCoupons = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load available coupons
      const { data: availData, error: availError } = await getAllAvailableCoupons();
      console.log('Available coupons:', availData, availError);
      setAvailableCoupons(availData || []);

      // Load user's coupons
      const { data: userCouponData, error: userError } = await getUserCoupons(user.id);
      console.log('User coupons:', userCouponData, userError);
      setUserCoupons(userCouponData || []);
    } catch (err) {
      console.error('Error loading coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCoupon = async (coupon: Coupon) => {
    if (!user) return;

    setActivatingId(coupon.id);
    try {
      const { data, error } = await activateCoupon(user.id, coupon.code);

      if (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : (typeof error === 'object' && error !== null && 'message' in error)
          ? (error as any).message
          : 'Failed to activate coupon';
        
        console.error('Activation error details:', error);
        setToast({
          message: errorMessage || 'Failed to activate coupon',
          type: 'error',
        });
      } else {
        setToast({
          message: `Coupon "${coupon.code}" activated successfully!`,
          type: 'success',
        });
        
        // Set as active coupon globally immediately
        const userCoupon: any = {
          coupon_id: coupon.id,
          user_id: user.id,
          coupon: coupon,
          id: `${user.id}-${coupon.id}`,
          created_at: new Date().toISOString(),
          is_used: false,
          used_at: null,
        };
        setActiveCoupon(userCoupon);
        
        await loadCoupons(); // Reload to update the UI
        onCouponActivated?.();
      }
    } catch (error: any) {
      console.error('Exception activating coupon:', error);
      setToast({
        message: error.message || 'Failed to activate coupon',
        type: 'error',
      });
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeactivateCoupon = () => {
    clearActiveCoupon();
    setToast({
      message: 'Coupon deactivated. You can reactivate it later.',
      type: 'success',
    });
  };

  const isUserCouponActivated = (couponId: string) => {
    return userCoupons.some(uc => uc.coupon_id === couponId);
  };

  const getUserCouponStatus = (couponId: string) => {
    const userCoupon = userCoupons.find(uc => uc.coupon_id === couponId);
    if (!userCoupon) return null;
    return userCoupon;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-white/10 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-neutral-900 to-neutral-800 border-b border-white/10 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">🎟️ Coupons</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-4 px-6 font-medium transition-all ${
                activeTab === 'available'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Available Coupons
            </button>
            <button
              onClick={() => setActiveTab('my-coupons')}
              className={`flex-1 py-4 px-6 font-medium transition-all ${
                activeTab === 'my-coupons'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              My Coupons ({userCoupons.length})
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Active Coupon Banner */}
            {activeCoupon && activeCoupon.coupon && (
              <div className="mb-6 bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-green-200 font-medium mb-1">Currently Active</p>
                    <h3 className="text-xl font-bold text-white">
                      {(activeCoupon.coupon as any).code}
                    </h3>
                    <p className="text-green-200 text-sm mt-1">
                      {(activeCoupon.coupon as any).discount_percentage > 0
                        ? `${(activeCoupon.coupon as any).discount_percentage}% off`
                        : `$${(activeCoupon.coupon as any).discount_amount} off`}
                      {' - Will be applied to your next order'}
                    </p>
                  </div>
                  <button
                    onClick={handleDeactivateCoupon}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded font-medium transition-all whitespace-nowrap"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
              </div>
            ) : activeTab === 'available' ? (
              <div className="space-y-4">
                {availableCoupons.length === 0 ? (
                  <p className="text-center text-white/60 py-8">No available coupons at this time.</p>
                ) : (
                  availableCoupons.map((coupon) => {
                    const isActivated = isUserCouponActivated(coupon.id);
                    const isCurrentlyActive = activeCoupon?.coupon_id === coupon.id;
                    return (
                      <div
                        key={coupon.id}
                        className={`border rounded-lg p-4 ${
                          isCurrentlyActive
                            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
                            : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">{coupon.code}</h3>
                            {coupon.description && (
                              <p className="text-white/70 text-sm mb-2">{coupon.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              {coupon.discount_percentage > 0 && (
                                <span className="bg-green-500/30 text-green-200 px-2 py-1 rounded">
                                  {coupon.discount_percentage}% OFF
                                </span>
                              )}
                              {coupon.discount_amount && coupon.discount_amount > 0 && (
                                <span className="bg-green-500/30 text-green-200 px-2 py-1 rounded">
                                  ${coupon.discount_amount} OFF
                                </span>
                              )}
                              {coupon.max_uses && (
                                <span className="bg-white/10 text-white/70 px-2 py-1 rounded">
                                  {coupon.max_uses - coupon.used_count} remaining
                                </span>
                              )}
                              {coupon.expiry_date && (
                                <span className="bg-white/10 text-white/70 px-2 py-1 rounded">
                                  Expires: {new Date(coupon.expiry_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isCurrentlyActive ? (
                              <button
                                onClick={handleDeactivateCoupon}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded font-semibold text-sm transition-all"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateCoupon(coupon)}
                                disabled={activatingId === coupon.id}
                                className="bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 text-white px-4 py-2 rounded font-semibold text-sm transition-all"
                              >
                                {activatingId === coupon.id ? 'Activating...' : isActivated ? 'Switch' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {userCoupons.length === 0 ? (
                  <p className="text-center text-white/60 py-8">You haven't activated any coupons yet.</p>
                ) : (
                  userCoupons.map((userCoupon) => {
                    const coupon = userCoupon.coupon || userCoupon;
                    const isUsed = userCoupon.is_used || userCoupon.used_at;
                    const isActive = activeCoupon?.coupon_id === userCoupon.coupon_id;

                    return (
                      <div
                        key={userCoupon.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
                            : isUsed
                            ? 'bg-white/5 border-white/10'
                            : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">
                              {(coupon as Coupon).code}
                            </h3>
                            {(coupon as Coupon).description && (
                              <p className="text-white/70 text-sm mb-2">
                                {(coupon as Coupon).description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              {(coupon as Coupon).discount_percentage > 0 && (
                                <span className="bg-green-500/30 text-green-200 px-2 py-1 rounded">
                                  {(coupon as Coupon).discount_percentage}% OFF
                                </span>
                              )}
                              {isActive && (
                                <span className="bg-green-500/30 text-green-200 px-2 py-1 rounded font-semibold">
                                  ✓ Active
                                </span>
                              )}
                              {isUsed && (
                                <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded">
                                  Used on {new Date(userCoupon.used_at!).toLocaleDateString()}
                                </span>
                              )}
                              {!isUsed && !isActive && (
                                <span className="bg-white/10 text-white/70 px-2 py-1 rounded">
                                  Ready to use
                                </span>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <button
                              onClick={handleDeactivateCoupon}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded font-medium text-sm transition-all whitespace-nowrap"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-medium transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
