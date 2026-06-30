'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Check, AlertTriangle } from 'lucide-react';
import { Thumb } from './Thumb';
import { Stars } from './Stars';
import type { LocalBusiness } from '@/lib/supabase/featured';
import { useStoreDistance } from '@/lib/utils/useStoreDistance';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAllergens } from '@/contexts/AllergenContext';
import { allergenLabel } from '@/lib/allergens';

/**
 * A business-focused card (real seeded business): photo, name, department, and
 * a from-price derived from its cheapest menu item. Links to the real profile.
 */
export function BusinessCard({ business }: { business: LocalBusiness }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { matchedAllergens } = useAllergens();
  const [added, setAdded] = useState(false);

  const cheapest = business.products.length
    ? business.products.slice().sort((a, b) => a.price - b.price)[0]
    : null;
  const { label: distanceLabel, etaLabel } = useStoreDistance(business.address);
  const allergyHits = matchedAllergens(business);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cheapest) return;
    addToCart({
      itemId: cheapest.id,
      itemName: cheapest.title,
      itemPrice: cheapest.price,
      itemImage: cheapest.image,
      sellerId: business.id,
      buyerId: user?.id ?? 'guest',
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group/card flex w-[170px] shrink-0 flex-col sm:w-[200px]">
      <Link href={business.href} className="relative block overflow-hidden rounded-2xl">
        <Thumb
          src={business.image}
          label={business.name}
          alt={business.name}
          className="aspect-square rounded-2xl"
          imgClassName="h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-black shadow-sm backdrop-blur dark:bg-gray-900/80 dark:text-white">
          {business.category}
        </span>
        {allergyHits.length > 0 && (
          <span
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-600/95 px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
            title={`Contains your allergens: ${allergyHits.map(allergenLabel).join(', ')}`}
          >
            <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
            Allergen
          </span>
        )}
      </Link>

      <div className="mt-2 flex flex-col gap-1">
        {cheapest && (
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
        )}
        <Link
          href={business.href}
          className="line-clamp-1 text-sm font-semibold text-black hover:underline dark:text-white"
        >
          {business.name}
        </Link>
        {allergyHits.length > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            Contains: {allergyHits.map(allergenLabel).join(', ')}
          </span>
        )}
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {business.products.length} item{business.products.length === 1 ? '' : 's'}
          {cheapest != null ? ` · from $${cheapest.price.toFixed(2)}` : ''}
        </span>
        {business.reviewCount > 0 ? (
          <Stars rating={business.rating} reviewCount={business.reviewCount} />
        ) : (
          <span className="text-xs font-medium text-[#f97316]">New</span>
        )}
        {distanceLabel && (
          <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
            <MapPin className="h-3 w-3 shrink-0 text-[#f97316]" />
            {distanceLabel}
            {etaLabel ? <span className="text-gray-400">· {etaLabel}</span> : null}
          </span>
        )}
      </div>
    </div>
  );
}
