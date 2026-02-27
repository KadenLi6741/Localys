import { useState } from 'react';
import { useCoupon } from '@/contexts/CouponContext';

interface MenuItemPurchaseProps {
  itemId: string;
  itemName: string;
  itemPrice: number;
  itemImage?: string;
  sellerId: string;
  buyerId: string;
  isOwnBusiness?: boolean;
}

export function MenuItemPurchaseButton({
  itemId,
  itemName,
  itemPrice,
  itemImage,
  sellerId,
  buyerId,
  isOwnBusiness = false,
}: MenuItemPurchaseProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeCoupon, getDiscountedPrice, clearActiveCoupon } = useCoupon();

  if (isOwnBusiness) {
    return null; // Don't show buy button for your own items
  }

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);

    try {
      const finalPrice = activeCoupon ? getDiscountedPrice(itemPrice) : itemPrice;
      
      const response = await fetch('/api/checkout-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          itemName,
          itemPrice: finalPrice, // Send discounted price
          itemImage,
          sellerId,
          buyerId,
          couponCode: activeCoupon?.coupon?.code || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const finalPrice = activeCoupon ? getDiscountedPrice(itemPrice) : itemPrice;

  return (
    <div>
      {error && (
        <p className="text-red-400 text-sm mb-2">{error}</p>
      )}
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Processing...
          </>
        ) : (
          <>
            <span>💳 Buy Now</span>
            <div className="flex flex-col items-end text-sm">
              {activeCoupon && (
                <span className="line-through text-white/60">${itemPrice.toFixed(2)}</span>
              )}
              <span>${finalPrice.toFixed(2)}</span>
            </div>
          </>
        )}
      </button>
      {activeCoupon && (
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-green-300 text-xs">
            ✓ {activeCoupon.coupon?.code || 'Coupon'} applied ({activeCoupon.coupon?.discount_percentage}% off)
          </p>
          <button
            onClick={() => clearActiveCoupon()}
            className="text-red-300 hover:text-red-200 text-xs underline transition-colors"
          >
            Turn off
          </button>
        </div>
      )}
    </div>
  );
}
