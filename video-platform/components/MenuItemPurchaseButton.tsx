'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

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
  const router = useRouter();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  if (isOwnBusiness) {
    return null;
  }

  const handleBuyNow = () => {
    const params = new URLSearchParams({
      itemId,
      itemName,
      itemPrice: itemPrice.toString(),
      sellerId,
      buyerId,
    });
    if (itemImage) {
      params.set('itemImage', itemImage);
    }
    router.push(`/checkout?${params.toString()}`);
  };

  const handleAddToCart = () => {
    addToCart({ itemId, itemName, itemPrice, itemImage, sellerId, buyerId, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleBuyNow}
        className="btn-shine flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <span>Buy Now</span>
        <span className="text-sm">${itemPrice.toFixed(2)}</span>
      </button>
      <button
        onClick={handleAddToCart}
        disabled={added}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white font-semibold py-2 px-3 rounded-lg transition-colors disabled:cursor-default flex items-center justify-center gap-1"
      >
        {added ? (
          <span className="text-sm">Added!</span>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        )}
      </button>
    </div>
  );
}
