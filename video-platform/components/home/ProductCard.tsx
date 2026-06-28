'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/lib/home-data';
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
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group/card flex w-[170px] shrink-0 flex-col sm:w-[200px]">
      {/* Image */}
      <Link href={product.href} className="relative block overflow-hidden rounded-2xl">
        <Thumb
          src={product.image}
          label={product.title}
          alt={product.title}
          className="aspect-square rounded-2xl"
          imgClassName="h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
        />

        {/* % off — allowed orange */}
        {product.discountPct ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#f97316] px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            {product.discountPct}% off
          </span>
        ) : null}

        <button
          type="button"
          aria-label={liked ? 'Unlike' : 'Like'}
          aria-pressed={liked}
          onClick={(e) => { e.preventDefault(); setLiked((v) => !v); }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black shadow-sm backdrop-blur transition hover:bg-white dark:bg-gray-900/80 dark:text-white"
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
          className="inline-flex w-fit items-center gap-1 rounded-full border border-[#f97316] px-3 py-1 text-sm font-semibold text-[#f97316] transition hover:bg-[#f97316] hover:text-white"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
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
