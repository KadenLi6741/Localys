'use client';

/**
 * MenuPopup — toggleable menu panel overlaid on the Discover feed video.
 * Purpose: Lets viewers open a business's full menu (name/price/add-to-cart) while watching its video,
 *   loading the menu lazily on first open. Styled as a dark translucent panel because it sits on top of
 *   the (always-dark) video, so its colors are intentionally fixed rather than theme-aware.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useState } from 'react';
import { X, UtensilsCrossed, Plus, Check } from 'lucide-react';
import { getUserMenu, type Menu } from '@/lib/supabase/profiles';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Left-side menu pop-up for the Discover feed: a toggle button that opens a
 * panel listing the business's menu items (name/price/add) while watching.
 * Menu data via getUserMenu(userId); items add to cart.
 */
export function MenuPopup({
  userId,
  businessId,
  businessName,
}: {
  userId: string;
  businessId: string;
  businessName: string;
}) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await getUserMenu(userId);
      if (!cancelled) {
        setMenu(data ?? null);
        setLoaded(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, loaded, userId]);

  const items = (menu?.menu_items ?? []).filter((i) => i.is_available !== false);

  return (
    <div className="pointer-events-auto">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-r-xl border border-white/20 bg-black/55 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-black/70"
      >
        <UtensilsCrossed className="h-5 w-5" />
        <span className="hidden sm:inline">Menu</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute left-0 top-0 z-30 max-h-[60vh] w-[280px] overflow-y-auto rounded-2xl border border-white/15 bg-black/80 p-3 text-white backdrop-blur-xl sm:w-[320px]">
          <div className="mb-2 flex items-center justify-between">
            <p className="truncate font-bold">{businessName} — Menu</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <p className="py-4 text-center text-sm text-white">Loading menu…</p>
          ) : items.length === 0 ? (
            <p className="py-4 text-center text-sm text-white">No menu yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.item_name}</span>
                    <span className="text-xs text-white">${Number(item.price).toFixed(2)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      addToCart({
                        itemId: item.id,
                        itemName: item.item_name,
                        itemPrice: Number(item.price),
                        itemImage: item.image_url,
                        sellerId: businessId || userId,
                        buyerId: user?.id ?? 'guest',
                        quantity: 1,
                      });
                      setAddedId(item.id);
                      window.setTimeout(() => setAddedId((p) => (p === item.id ? null : p)), 1200);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#f97316] px-2.5 py-1 text-xs font-semibold text-[#f97316] transition hover:bg-[#f97316] hover:text-white"
                  >
                    {addedId === item.id ? <Check className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                    {addedId === item.id ? 'Added' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
