'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface ProductQuickViewProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    item_name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_available?: boolean;
  };
  sellerId: string;
  businessName?: string;
}

export function ProductQuickView({ isOpen, onClose, item, sellerId, businessName }: ProductQuickViewProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [closing, setClosing] = useState(false);
  const [added, setAdded] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setAdded(false);
      // Fetch review stats
      (async () => {
        const { data } = await supabase
          .from('comments')
          .select('rating')
          .eq('item_id', item.id)
          .not('rating', 'is', null);
        if (data && data.length > 0) {
          const sum = data.reduce((s, r) => s + (r.rating || 0), 0);
          setAvgRating(sum / data.length);
          setReviewCount(data.length);
        } else {
          setAvgRating(null);
          setReviewCount(0);
        }
      })();
    }
  }, [isOpen, item.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 280);
  };

  const handleAddToCart = () => {
    if (!user) return;
    addToCart({
      itemId: item.id,
      itemName: item.item_name,
      itemPrice: item.price,
      itemImage: item.image_url,
      sellerId,
      buyerId: user.id,
      quantity,
    });
    setAdded(true);
    setTimeout(() => handleClose(), 800);
  };

  if (!isOpen) return null;

  const subtotal = item.price * quantity;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? 'animate-[fadeOut_0.28s_ease-in_forwards]' : 'animate-[fadeIn_0.2s_ease-out]'}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div
        className={`relative bg-white w-full max-w-3xl max-h-[90vh] overflow-auto shadow-2xl ${closing ? 'animate-[slideDown_0.28s_ease-in_forwards]' : 'animate-[slideUp_0.3s_ease-out]'}`}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-[#F8F8F6] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left: Image (55%) */}
          <div className="md:w-[55%] aspect-square md:aspect-auto bg-[#F8F8F6] relative">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.item_name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full min-h-[300px] flex items-center justify-center">
                <svg className="w-16 h-16 text-[#E8E8E4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Right: Details (45%) */}
          <div className="md:w-[45%] p-6 md:p-8 flex flex-col">
            {/* Business Name */}
            {businessName && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B6B65] mb-2">
                {businessName}
              </p>
            )}

            {/* Product Name */}
            <h2 className="text-[28px] font-bold uppercase text-[#1A1A1A] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {item.item_name}
            </h2>

            {/* Star Rating */}
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${avgRating !== null && star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-[#E8E8E4]'}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="text-xs text-[#6B6B65] ml-1">
                {avgRating !== null ? `${avgRating.toFixed(1)} (${reviewCount})` : 'No reviews'}
              </span>
            </div>

            {/* Price */}
            <p className="text-[22px] font-bold text-[#1A1A1A] mb-5">
              ${item.price.toFixed(2)}
            </p>

            {/* Availability */}
            {item.is_available === false && (
              <div className="text-sm text-red-500 font-medium mb-4">Currently unavailable</div>
            )}

            {/* Quantity Selector */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B6B65] mb-2 block">
                QTY
              </label>
              <div className="flex items-center border border-[#E8E8E4] w-fit">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-medium text-[#1A1A1A]">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!user || item.is_available === false || added}
              className={`btn-add-to-cart w-full py-3.5 text-sm font-semibold uppercase tracking-[0.1em] transition-all duration-300 ${
                added
                  ? 'bg-green-600 text-white'
                  : 'bg-[#1B5EA8] text-white hover:bg-[#1B5EA8]/90'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {added ? 'Added to Cart' : `Add to Cart — $${subtotal.toFixed(2)}`}
            </button>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-[#6B6B65] leading-relaxed mt-4">
                {item.description}
              </p>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* View Full Details */}
            <Link
              href={`/product/${item.id}`}
              className="block text-center text-sm text-[#1B5EA8] hover:text-[#1B5EA8]/80 mt-4 underline underline-offset-2"
              onClick={handleClose}
            >
              View Full Details
            </Link>

            {!user && (
              <p className="text-xs text-[#6B6B65] text-center mt-2">Sign in to purchase</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
