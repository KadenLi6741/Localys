'use client';

/**
 * BusinessItemsRail — the vertical strip of a business's menu item cards shown on the Discover feed.
 * Purpose: While watching a business's video, this rail surfaces a few of its purchasable items (image,
 *   rating, price, quick-add) so viewers can buy without leaving the feed. Items come from props (alias
 *   demo content) or are loaded from the business's menu.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useState } from 'react';
import { Plus, Check, ShoppingCart, Star } from 'lucide-react';
import { getUserMenu } from '@/lib/supabase/profiles';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import type { AliasItem } from '@/lib/businessAliases';

// Render up to 6; how many actually show scales with viewport width via CSS below.
const MAX_CARDS = 6;

// Deterministic 4.0–5.0 star rating per item id — the menu source has no rating
// field, so derive a stable value so each item shows a consistent rating.
function itemRating(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 4 + (h % 11) / 10;
}

// First 4 items always visible; 5th on xl, 6th on 2xl.
const cardVisibility = (i: number) =>
  i < 4 ? '' : i === 4 ? 'hidden xl:block' : 'hidden 2xl:block';

export function BusinessItemsRail({
  userId,
  businessId,
  businessName,
  items: itemsProp,
}: {
  userId: string;
  businessId: string;
  businessName: string;
  items?: AliasItem[];
}) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const hasProvidedItems = !!itemsProp?.length;
  const [loadedItems, setLoadedItems] = useState<AliasItem[]>([]);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (hasProvidedItems || !userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await getUserMenu(userId);
      const menuItems = (data?.menu_items ?? []).filter((i) => i.is_available !== false);
      if (!cancelled) {
        setLoadedItems(
          menuItems.map((it) => ({
            id: it.id,
            name: it.item_name,
            price: Number(it.price) || 0,
            image: it.image_url || undefined,
          })),
        );
      }
    })();
    return () => { cancelled = true; };
  }, [hasProvidedItems, userId]);

  const items = hasProvidedItems ? itemsProp! : loadedItems;
  const shown = items.slice(0, MAX_CARDS);
  if (shown.length === 0) return null;

  return (
    <div className="pointer-events-auto hidden w-full flex-col gap-2 pb-4 sm:flex lg:gap-2.5" aria-label={`${businessName} menu`}>
      {shown.map((item, i) => (
        <div
          key={item.id}
          className={`overflow-hidden rounded-2xl border border-black/8 bg-white dark:border-white/10 dark:bg-[#1e1e1e] ${cardVisibility(i)}`}
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className="h-24 w-full object-cover lg:h-28"
            />
          ) : (
            <div className="flex h-24 w-full items-center justify-center bg-gray-100 lg:h-28">
              <ShoppingCart className="h-8 w-8 text-gray-300" />
            </div>
          )}
          {/* Deal badge on first item */}
          {i === 0 && (
            <div className="mx-2.5 mt-1.5 inline-block rounded-full bg-[#f97316] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Featured
            </div>
          )}
          <div className="px-2.5 pb-2 pt-1 lg:px-3 lg:pb-2.5">
            <p className="text-sm font-bold leading-tight text-black dark:text-white">{item.name}</p>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-black dark:text-white">
              <Star className="h-3.5 w-3.5 fill-[#f97316] text-[#f97316]" />
              {itemRating(item.id).toFixed(1)}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-[#f97316] lg:text-xl">${item.price.toFixed(2)}</span>
              <button
                type="button"
                aria-label={`Add ${item.name} to cart`}
                onClick={() => {
                  addToCart({
                    itemId: item.id,
                    itemName: item.name,
                    itemPrice: item.price,
                    itemImage: item.image,
                    sellerId: businessId || userId,
                    buyerId: user?.id ?? 'guest',
                    quantity: 1,
                  });
                  setAddedId(item.id);
                  window.setTimeout(() => setAddedId((p) => (p === item.id ? null : p)), 1200);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f97316] p-0 text-white shadow-md transition hover:opacity-90 active:scale-95 lg:h-10 lg:w-10"
              >
                {addedId === item.id ? <Check className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" /> : <Plus className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" />}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
