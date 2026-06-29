'use client';

/**
 * MenuItemPurchaseButton — the "Buy Now" + "Add to Cart" controls for a single menu item.
 * Purpose: Lets a customer either jump straight to checkout for one item, or add it to the cart and
 *   keep browsing. It hides itself on the merchant's own business (you can't buy from yourself).
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

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

  // Owners can't purchase from their own business, so render nothing in that case.
  if (isOwnBusiness) {
    return null;
  }

  // Skips the cart and goes straight to checkout, passing this item's details via the URL so the
  // checkout page can build the order without a separate lookup.
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

  // Adds one of this item to the cart and briefly flips the button to "Added!" for visual confirmation.
  const handleAddToCart = () => {
    addToCart({ itemId, itemName, itemPrice, itemImage, sellerId, buyerId, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleBuyNow}
        className="flex-1 bg-[#f97316] hover:bg-[#ea6a0c] text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <span>Buy Now</span>
        <span className="text-sm">${itemPrice.toFixed(2)}</span>
      </button>
      <button
        onClick={handleAddToCart}
        disabled={added}
        className="bg-[#f97316] hover:bg-[#ea6a0c] disabled:bg-[#f97316]/50 text-white font-semibold py-2 px-3 rounded-lg transition-colors disabled:cursor-default flex items-center justify-center gap-1"
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
