'use client';

/**
 * StoreItemCards.tsx — the item-level UI for the store page: a hook that adds an
 * item to the cart (with a brief "added" confirmation) and the two card layouts
 * that present items (a wide featured card and a compact list row).
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
import { useState } from 'react';
import { Check, Plus, ThumbsUp } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { ItemImage } from './StorePrimitives';
import type { StoreItem } from './types';

/** How long the per-item "added to cart" check stays visible (ms). */
const ADDED_FEEDBACK_MS = 1200;

/**
 * Cart helper for a single store. Returns `addItem` plus an `addedById` map that
 * briefly flags the most recently added item so the button can show a checkmark.
 */
export function useAddToCart(sellerId: string) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [addedById, setAddedById] = useState<Record<string, boolean>>({});

  const addItem = (item: StoreItem) => {
    addToCart({
      itemId: item.id,
      itemName: item.name,
      itemPrice: item.price,
      itemImage: item.image,
      sellerId,
      buyerId: user?.id || 'guest',
      quantity: 1,
      deal: item.deal,
    });
    setAddedById((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAddedById((prev) => ({ ...prev, [item.id]: false })), ADDED_FEEDBACK_MS);
  };

  return { addItem, addedById };
}

/** Round "+" button that adds an item to the cart and flips to a check when added. */
export function AddToCartButton({ item, onAdd, isAdded }: { item: StoreItem; onAdd: (item: StoreItem) => void; isAdded: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(item); }}
      aria-label={`Add ${item.name}`}
      className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white p-0 text-black shadow-sm transition active:scale-95 ${
        isAdded ? 'add-to-cart-pulse border-[#f97316] text-[#f97316]' : 'border-gray-200 hover:border-[#f97316] hover:text-[#f97316]'
      }`}
    >
      {isAdded ? <Check className="h-4 w-4 text-[#f97316]" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
    </button>
  );
}

/** Wide "Featured items" carousel card: large image, rank/deal badges, price + likes. */
export function FeaturedItemCard({ item, rank, onAdd, isAdded, bannerSrc }: { item: StoreItem; rank: number; onAdd: (item: StoreItem) => void; isAdded: boolean; bannerSrc?: string }) {
  return (
    <div className="flex w-[240px] shrink-0 flex-col">
      <div className="relative">
        <ItemImage src={item.image} fallbackSrc={bannerSrc} alt={item.name} className="h-[150px] w-full rounded-xl object-cover" />
        {rank <= 3 && (
          <span className="absolute left-2 top-2 rounded-md bg-black px-1.5 py-0.5 text-[11px] font-semibold text-white">
            #{rank} most liked
          </span>
        )}
        {item.deal && (
          <span className="absolute right-2 top-2 rounded-md bg-[#f97316] px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {item.deal.label}
          </span>
        )}
        <div className="absolute bottom-2 right-2">
          <AddToCartButton item={item} onAdd={onAdd} isAdded={isAdded} />
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium text-black">{item.name}</p>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-600">
        <span className="font-medium text-black">${item.price.toFixed(2)}</span>
        {item.likePct != null && (
          <>
            <span className="text-gray-300">·</span>
            <ThumbsUp className="h-3 w-3 text-[#f97316]" strokeWidth={2} />
            <span>{item.likePct}% ({item.likeCount})</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Compact menu list row: name, price, optional deal/description, and a thumbnail. */
export function MenuItemRow({ item, onAdd, isAdded, bannerSrc }: { item: StoreItem; onAdd: (item: StoreItem) => void; isAdded: boolean; bannerSrc?: string }) {
  return (
    <div className="flex items-stretch justify-between gap-3 rounded-xl border border-gray-200 p-3 transition hover:border-gray-300 hover:shadow-sm">
      <div className="flex min-w-0 flex-col">
        <p className="line-clamp-2 text-sm font-medium text-black">{item.name}</p>
        <p className="mt-1 text-sm text-black">${item.price.toFixed(2)}{item.likePct != null && <span className="ml-2 text-xs text-gray-500">{item.likePct}% ({item.likeCount})</span>}</p>
        {item.deal && (
          <span className="mt-1 inline-flex w-fit rounded-md bg-[#f97316] px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {item.deal.label}
          </span>
        )}
        {item.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.description}</p>}
      </div>
      <div className="relative h-[90px] w-[90px] shrink-0">
        <ItemImage src={item.image} fallbackSrc={bannerSrc} alt={item.name} className="h-[90px] w-[90px] rounded-lg object-cover" />
        <div className="absolute -bottom-1 -right-1">
          <AddToCartButton item={item} onAdd={onAdd} isAdded={isAdded} />
        </div>
      </div>
    </div>
  );
}
