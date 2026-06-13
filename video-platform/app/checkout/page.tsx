'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartItem } from '@/contexts/CartContext';
import { getShopCoupons, Coupon } from '@/lib/supabase/coupons';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface BusinessHours {
  [day: string]: {
    open?: string;
    close?: string;
    closed?: boolean;
  };
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function generateTimeSlots(open: string, close: string): string[] {
  const slots: string[] = [];
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  let h = openH, m = openM;
  while (h < closeH || (h === closeH && m < closeM)) {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(`${displayH}:${m.toString().padStart(2, '0')} ${period}`);
    m += 30;
    if (m >= 60) { h += 1; m = 0; }
  }
  return slots;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { items: cartItems, clearCart, loaded: cartLoaded } = useCart();

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');

  // Reservation state
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [hasBusinessHours, setHasBusinessHours] = useState(false);

  // Contact info for reservation
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const source = searchParams.get('source');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!cartLoaded) return;

    if (source === 'cart') {
      setCheckoutItems(cartItems);
    } else {
      const itemId = searchParams.get('itemId');
      const itemName = searchParams.get('itemName');
      const itemPrice = searchParams.get('itemPrice');
      const sellerId = searchParams.get('sellerId');
      const buyerId = searchParams.get('buyerId');
      const itemImage = searchParams.get('itemImage') || undefined;

      if (itemId && itemName && itemPrice && sellerId && buyerId) {
        setCheckoutItems([{
          itemId,
          itemName,
          itemPrice: parseFloat(itemPrice),
          itemImage,
          sellerId,
          buyerId,
          quantity: 1,
        }]);
      }
    }
    setLoading(false);
  }, [user, source, searchParams, cartItems, cartLoaded, router]);

  // Fetch coupons and business hours
  useEffect(() => {
    if (checkoutItems.length === 0) return;

    const sellerIds = [...new Set(checkoutItems.map(i => i.sellerId))];

    // Fetch coupons
    const fetchCoupons = async () => {
      const allCoupons: Coupon[] = [];
      for (const sellerId of sellerIds) {
        const { data } = await getShopCoupons(sellerId);
        if (data) allCoupons.push(...data);
      }
      setCoupons(allCoupons);
    };
    fetchCoupons();

    // Fetch business hours for the first seller's business
    const fetchBusinessHours = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, business_hours')
        .eq('owner_id', sellerIds[0])
        .single();

      if (data?.business_hours && typeof data.business_hours === 'object') {
        const hours = data.business_hours as BusinessHours;
        const hasAnyHours = Object.values(hours).some(d => d.open && d.close && !d.closed);
        setBusinessHours(hours);
        setBusinessId(data.id);
        setHasBusinessHours(hasAnyHours);
      }
    };
    fetchBusinessHours();
  }, [checkoutItems]);

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
  const discountAmount = selectedCoupon
    ? Math.round(subtotal * (selectedCoupon.discount_percentage / 100) * 100) / 100
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

  // Generate next 14 days for the calendar
  const calendarDays = useMemo(() => {
    const days: { date: string; dayName: string; dayNum: number; monthShort: string; available: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = DAY_NAMES[d.getDay()];
      const dayInfo = businessHours?.[dayName];
      const available = !!dayInfo && !dayInfo.closed && !!dayInfo.open && !!dayInfo.close;
      days.push({
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        available,
      });
    }
    return days;
  }, [businessHours]);

  const timeSlots = useMemo(() => {
    if (!selectedDate || !businessHours) return [];
    const d = new Date(selectedDate + 'T12:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    const dayInfo = businessHours[dayName];
    if (!dayInfo?.open || !dayInfo?.close || dayInfo.closed) return [];
    return generateTimeSlots(dayInfo.open, dayInfo.close);
  }, [selectedDate, businessHours]);

  const handleProceedToPayment = async () => {
    if (checkoutItems.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            itemPrice: item.itemPrice,
            itemImage: item.itemImage,
            sellerId: item.sellerId,
            buyerId: item.buyerId,
            quantity: item.quantity,
            specialRequests: specialRequests || item.specialRequests,
          })),
          couponCode: selectedCoupon?.code || null,
          specialRequests: specialRequests || null,
          bookingDate: selectedDate || null,
          bookingTime: selectedTime || null,
          businessId: businessId || null,
          contactName: contactName || null,
          contactPhone: contactPhone || null,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.url) {
        if (source === 'cart') clearCart();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-[var(--text-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-transparent text-[var(--text-primary)] p-4">
        <div className="w-full px-4 lg:px-12 text-center py-16">
          <p className="text-[var(--text-tertiary)] mb-4">No items to checkout</p>
          <Link href="/" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg px-6 py-2 transition-colors">
            Browse Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] p-4">
      <div className="w-full px-4 lg:px-12">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4 inline-flex items-center gap-2">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>

        {/* ===== ORDER DETAILS ===== */}
          <>
            {/* Order Summary */}
            <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
              <div className="space-y-3">
                {checkoutItems.map((item) => (
                  <div key={item.itemId} className="flex items-center gap-3">
                    {item.itemImage && (
                      <img
                        src={item.itemImage}
                        alt={item.itemName}
                        className="w-12 h-12 rounded-lg object-cover border border-[var(--glass-border)]"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] font-medium truncate">{item.itemName}</p>
                      {item.quantity > 1 && (
                        <p className="text-[var(--text-muted)] text-xs">x{item.quantity} @ ${item.itemPrice.toFixed(2)}</p>
                      )}
                    </div>
                    <p className="text-yellow-400 font-bold">${(item.itemPrice * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Coupons */}
            {coupons.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold mb-3">Available Coupons</h2>
                <div className="space-y-2">
                  {coupons.map((coupon) => {
                    const isSelected = selectedCoupon?.id === coupon.id;
                    return (
                      <button
                        key={coupon.id}
                        onClick={() => setSelectedCoupon(isSelected ? null : coupon)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-green-400">{coupon.code}</p>
                            <p className="text-[var(--text-tertiary)] text-sm">{coupon.discount_percentage}% off</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-green-400 text-sm font-medium">-${discountAmount.toFixed(2)}</span>
                            )}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-green-500 bg-green-500' : 'border-white/30'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Requests */}
            <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3">Special Requests</h2>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any special requests? (allergies, customizations...)"
                rows={3}
                className="w-full bg-transparent border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6]/30 focus:border-[#2A6FD6] resize-none"
              />
            </div>

            {/* Price Breakdown */}
            <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[var(--text-tertiary)]">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {selectedCoupon && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount ({selectedCoupon.discount_percentage}%)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-[var(--glass-border)] pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-yellow-400">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* ===== RESERVATION / PICKUP TIME ===== */}
            {hasBusinessHours && (
              <>
                <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-4 mb-6">
                  <h2 className="text-lg font-semibold mb-4">Select Pickup Day</h2>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {calendarDays.map((day) => (
                      <button
                        key={day.date}
                        onClick={() => { if (day.available) { setSelectedDate(day.date); setSelectedTime(null); } }}
                        disabled={!day.available}
                        className={`flex flex-col items-center min-w-[60px] px-3 py-2 rounded-lg transition-all ${
                          selectedDate === day.date
                            ? 'bg-[#2A6FD6] text-white'
                            : day.available
                              ? 'bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
                              : 'bg-[var(--glass-bg)] text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-[10px] font-semibold uppercase">{day.dayName}</span>
                        <span className="text-lg font-bold">{day.dayNum}</span>
                        <span className="text-[10px]">{day.monthShort}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && timeSlots.length > 0 && (
                  <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Select Pickup Time</h2>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`w-full px-4 py-3 text-left rounded-lg text-sm font-medium transition-all ${
                            selectedTime === slot
                              ? 'bg-[#2A6FD6] text-white'
                              : 'bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{slot}</span>
                            {selectedTime === slot && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Info for Reservation */}
                <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-4 mb-6">
                  <h2 className="text-lg font-semibold mb-3">Contact Info</h2>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-transparent border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6]/30 focus:border-[#2A6FD6]"
                    />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full bg-transparent border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6]/30 focus:border-[#2A6FD6]"
                    />
                  </div>
                </div>

                {/* Selected summary */}
                {selectedDate && selectedTime && (
                  <div className="bg-[#2A6FD6]/10 border border-[#2A6FD6]/30 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-[#2A6FD6]">
                      Pickup: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}
                    </p>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Proceed to Payment Button */}
            <button
              onClick={handleProceedToPayment}
              disabled={processing || (hasBusinessHours && (!selectedDate || !selectedTime))}
              className="w-full bg-[#2A6FD6] hover:bg-[#245FCC] disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                `Proceed to Payment — $${total.toFixed(2)}`
              )}
            </button>
            <p className="text-[var(--text-muted)] text-xs text-center mt-3">
              You will be redirected to Stripe for secure payment
            </p>
          </>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent text-[var(--text-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
