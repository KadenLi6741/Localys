'use client';

/**
 * ProductCard — the standard product/item card used in every home-page row.
 * Purpose: Shows an item's image, deal badge, price (with struck original), title, rating and quick
 *   actions (like + add to cart). Like ratings elsewhere, demo/slug items persist engagement
 *   client-side while real (UUID) items also sync to Supabase, so the card works for both kinds.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Plus, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/lib/home-data';
import { isMenuItemLiked, toggleMenuItemLike, subscribeEngagement } from '@/lib/clientEngagement';
import { likeMenuItem, unlikeMenuItem } from '@/lib/supabase/likedItems';
import { isDemoId } from '@/lib/utils/ids';
import { Stars } from './Stars';
import { Thumb } from './Thumb';

/**
 * THE reusable Walmart-style product/business card used across every Home row.
 *
 * Layout: image (with heart top-right) → "+ Add" → price (discounted + struck
 * original) → title/description → stars + review count. Uses `Thumb` so a real
 * photo drops in via `product.image`; otherwise a flat lettered placeholder.
 */
export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);

  // Reflect persisted like state (client snapshot covers demo + real items),
  // and stay in sync if the same item is liked/unliked elsewhere.
  useEffect(() => {
    let active = true;
    const sync = () => { if (active) setLiked(isMenuItemLiked(product.id)); };
    const unsub = subscribeEngagement(sync);
    Promise.resolve().then(sync); // defer off the synchronous effect tick
    return () => { active = false; unsub(); };
  }, [product.id]);

  // Toggles a like on this item. Updates instantly via the client snapshot (works for demo items),
  // then mirrors the change to Supabase only for real UUID items belonging to a signed-in user.
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    const snapshot = {
      id: product.id,
      name: product.title,
      price: product.price,
      image: product.image,
      storeName: product.businessName,
      href: product.href,
    };
    const next = toggleMenuItemLike(snapshot); // optimistic + localStorage
    setLiked(next);
    // Real (UUID) items also persist to Supabase; demo/slug items stay client-side.
    try {
      if (user && !isDemoId(product.id)) {
        if (next) await likeMenuItem(user.id, snapshot);
        else await unlikeMenuItem(user.id, product.id);
      }
    } catch (err) {
      console.error('Item like failed:', err instanceof Error ? err.message : err);
    }
  };

  // Adds this item to the cart (preventDefault so the card's link doesn't also fire) and briefly
  // shows an "Added" confirmation.
  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      itemId: product.id,
      itemName: product.title,
      itemPrice: product.price,
      itemImage: product.image,
      sellerId: product.businessId,
      buyerId: user?.id ?? 'guest',
      quantity: 1,
      deal: product.deal,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group/card flex w-[170px] shrink-0 flex-col sm:w-[200px]">
      {/* Image */}
      <Link href={product.href} className="relative block overflow-hidden rounded-2xl">
        <Thumb
          src={product.hq === false ? undefined : product.image}
          label={product.title}
          alt={product.title}
          className="aspect-square rounded-2xl"
          imgClassName="h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
        />

        {/* deal badge — allowed orange */}
        {product.dealLabel || product.discountPct ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#f97316] px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            {product.dealLabel ?? `${product.discountPct}% off`}
          </span>
        ) : null}

        <button
          type="button"
          aria-label={liked ? 'Unlike' : 'Like'}
          aria-pressed={liked}
          onClick={handleLike}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full p-0 bg-white/90 text-black shadow-sm backdrop-blur transition hover:bg-white dark:bg-gray-900/80 dark:text-white"
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-[#f97316] text-[#f97316]' : ''}`} strokeWidth={1.8} />
        </button>
      </Link>

      {/* Body */}
      <div className="mt-2 flex flex-col gap-1">
        {/* + Add — allowed orange */}
        <button
          type="button"
          onClick={handleAdd}
          className={`inline-flex w-fit items-center gap-1 rounded-full border border-[#f97316] px-3 py-1 text-sm font-semibold transition active:scale-95 ${
            added ? 'add-to-cart-pulse bg-[#f97316] text-white' : 'text-[#f97316] hover:bg-[#f97316] hover:text-white'
          }`}
        >
          {added ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
          {added ? 'Added' : 'Add'}
        </button>

        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-lg font-bold text-black dark:text-white">${product.price.toFixed(2)}</span>
          {product.originalPrice ? (
            <span className="text-sm text-black line-through dark:text-white">${product.originalPrice.toFixed(2)}</span>
          ) : null}
        </div>

        <Link href={product.href} className="line-clamp-2 text-sm font-medium text-black hover:underline dark:text-white">
          {product.title} — <span className="font-normal">{product.description}</span>
        </Link>

        {product.reviewCount > 0 ? (
          <Stars rating={product.rating} reviewCount={product.reviewCount} />
        ) : (
          <span className="text-xs font-medium text-[#f97316]">New</span>
        )}
      </div>
    </div>
  );
}
