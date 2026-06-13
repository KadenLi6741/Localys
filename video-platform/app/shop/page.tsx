'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  Star,
  Plus,
  Check,
  ImageIcon,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { haversineDistance } from '@/lib/utils/geo';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/* ============================ Types ============================ */

interface ShopProduct {
  id: string;
  user_id: string;
  item_name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  created_at: string;
  // joined
  businessName: string;
  businessType: string | null;
  rating: number | null;
  reviewCount: number;
  sellerLat: number | null;
  sellerLng: number | null;
  distanceKm: number | null;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'retail', label: 'Retail' },
  { id: 'service', label: 'Services' },
  { id: 'featured', label: 'Featured' },
  { id: 'deals', label: 'Deals' },
] as const;
type CategoryId = (typeof CATEGORIES)[number]['id'];

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low → high' },
  { id: 'price-desc', label: 'Price: high → low' },
  { id: 'rating', label: 'Top rated' },
  { id: 'nearest', label: 'Nearest' },
] as const;
type SortId = (typeof SORTS)[number]['id'];

const PRICE_CEIL = 200;

/* ============================ Page ============================ */

export default function ShopPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Controls
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  const [sort, setSort] = useState<SortId>('featured');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [priceMax, setPriceMax] = useState(PRICE_CEIL);
  const [minRating, setMinRating] = useState(0);
  const [maxDistanceKm, setMaxDistanceKm] = useState(50);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  // Best-effort geolocation for the Nearest sort + distance filter.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    const { data: items } = await supabase
      .from('menu_items')
      .select('id, user_id, item_name, description, price, category, image_url, created_at, is_available')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(60);

    const rows = items ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const itemIds = rows.map((r) => r.id);

    // Batch seller profiles + review aggregates (real data, no N+1 per card).
    const [{ data: profiles }, { data: reviews }] = await Promise.all([
      userIds.length
        ? supabase
            .from('profiles')
            .select('id, full_name, username, type, latitude, longitude')
            .in('id', userIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      itemIds.length
        ? supabase.from('reviews').select('item_id, rating').in('item_id', itemIds).not('rating', 'is', null)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const profileMap = new Map(
      (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p]),
    );
    const ratingAgg = new Map<string, { sum: number; count: number }>();
    for (const r of (reviews ?? []) as { item_id: string; rating: number }[]) {
      const cur = ratingAgg.get(r.item_id) ?? { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      ratingAgg.set(r.item_id, cur);
    }

    const mapped: ShopProduct[] = rows.map((r) => {
      const p = profileMap.get(r.user_id) as
        | { full_name?: string; username?: string; type?: string; latitude?: number; longitude?: number }
        | undefined;
      const agg = ratingAgg.get(r.id);
      return {
        id: r.id,
        user_id: r.user_id,
        item_name: r.item_name,
        description: r.description,
        price: Number(r.price) || 0,
        image_url: r.image_url,
        category: r.category,
        created_at: r.created_at,
        businessName: p?.full_name || p?.username || 'Local business',
        businessType: p?.type ?? null,
        rating: agg ? Number((agg.sum / agg.count).toFixed(1)) : null,
        reviewCount: agg?.count ?? 0,
        sellerLat: p?.latitude ?? null,
        sellerLng: p?.longitude ?? null,
        distanceKm: null,
      };
    });

    setProducts(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    let stale = false;
    Promise.resolve().then(() => {
      if (!stale) loadProducts();
    });
    return () => {
      stale = true;
    };
  }, [loadProducts]);

  // Attach live distances when we have coordinates.
  const withDistance = useMemo(() => {
    if (!coords) return products;
    return products.map((p) =>
      p.sellerLat != null && p.sellerLng != null
        ? { ...p, distanceKm: haversineDistance(coords.lat, coords.lng, p.sellerLat, p.sellerLng) }
        : p,
    );
  }, [products, coords]);

  // A deal = priced at a friendly point (demo heuristic on real items).
  const isDeal = useCallback((p: ShopProduct) => p.price > 0 && p.price <= 15, []);

  const filtered = useMemo(() => {
    let list = withDistance.filter((p) => {
      if (query.trim() && !`${p.item_name} ${p.businessName}`.toLowerCase().includes(query.trim().toLowerCase()))
        return false;
      if (p.price > priceMax) return false;
      if (minRating > 0 && (p.rating ?? 0) < minRating) return false;
      if (coords && maxDistanceKm < 50 && p.distanceKm != null && p.distanceKm > maxDistanceKm) return false;
      if (category === 'food' || category === 'retail' || category === 'service') {
        if (p.businessType !== category) return false;
      }
      if (category === 'deals' && !isDeal(p)) return false;
      return true;
    });

    switch (sort) {
      case 'price-asc':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'nearest':
        if (coords) list = [...list].sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
        break;
      case 'featured':
      default:
        if (category === 'featured') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
    }
    return list;
  }, [withDistance, query, priceMax, minRating, maxDistanceKm, category, sort, coords, isDeal]);

  const handleAdd = (p: ShopProduct) => {
    if (!user) {
      router.push('/login');
      return;
    }
    addToCart({
      itemId: p.id,
      itemName: p.item_name,
      itemPrice: p.price,
      itemImage: p.image_url || undefined,
      sellerId: p.user_id,
      buyerId: user.id,
      quantity: 1,
    });
    setAdded((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [p.id]: false })), 1500);
  };

  const activeFilters = priceMax < PRICE_CEIL || minRating > 0 || maxDistanceKm < 50;

  // Close the filters popover on click-away.
  const filtersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filtersOpen]);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      {/* ===== Storefront header ===== */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-8">
          <h1 className="mb-3 text-heading-sm font-bold text-foreground">Shop local</h1>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search within shop */}
            <div className="flex h-10 flex-1 items-center gap-2 rounded-[4px] border border-border bg-surface px-3 focus-within:border-primary">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products and businesses"
                className="h-full w-full bg-transparent text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Search the shop"
              />
            </div>
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-10 items-center gap-1.5 rounded-[4px] border border-border bg-surface px-3 text-body-sm font-semibold text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Sort: {SORTS.find((s) => s.id === sort)?.label}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORTS.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => setSort(s.id)}
                    className={cn(sort === s.id && 'text-primary')}
                  >
                    {s.label}
                    {sort === s.id && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden="true" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Filters — popover anchored to this button (no left rail) */}
            <div ref={filtersRef} className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-[4px] border px-3 text-body-sm font-semibold transition-colors',
                  activeFilters ? 'border-primary text-primary' : 'border-border text-foreground hover:bg-surface/60',
                )}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filters
              </button>
              {filtersOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 space-y-4 rounded-[4px] border border-border bg-popover p-4 shadow-[inset_0_0_0_1px_var(--border)]">
                  {/* Max price */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max price</span>
                      <span className="text-caption font-bold text-foreground tabular-nums">{priceMax >= PRICE_CEIL ? 'Any' : `$${priceMax}`}</span>
                    </div>
                    <input type="range" min={5} max={PRICE_CEIL} step={5} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-[4px] bg-surface-2 accent-primary" aria-label="Maximum price" />
                  </div>
                  {/* Min rating */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Min rating</span>
                      <button type="button" onClick={() => setMinRating(0)} className="text-caption font-semibold text-muted-foreground hover:text-foreground">{minRating > 0 ? 'Clear' : 'Any'}</button>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setMinRating(star === minRating ? 0 : star)} aria-label={`At least ${star} stars`} aria-pressed={minRating >= star}>
                          <Star className={cn('h-6 w-6', minRating >= star ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Distance */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Distance</span>
                      <span className="text-caption font-bold text-foreground tabular-nums">{maxDistanceKm >= 50 ? 'Any' : `${maxDistanceKm} km`}</span>
                    </div>
                    <input type="range" min={1} max={50} step={1} value={maxDistanceKm} onChange={(e) => setMaxDistanceKm(Number(e.target.value))} disabled={!coords} className="h-1.5 w-full cursor-pointer appearance-none rounded-[4px] bg-surface-2 accent-primary disabled:opacity-40" aria-label="Maximum distance" />
                    {!coords && <p className="mt-1 text-[10px] text-muted-foreground">Enable location to filter by distance</p>}
                  </div>
                  {/* Apply */}
                  <div className="flex justify-between gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => { setPriceMax(PRICE_CEIL); setMinRating(0); setMaxDistanceKm(50); }}
                      className="rounded-[4px] px-3 py-1.5 text-caption font-semibold text-muted-foreground transition-colors hover:bg-surface/60 hover:text-foreground"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="rounded-[4px] bg-primary px-4 py-1.5 text-caption font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'rounded-[4px] border px-3 py-1.5 text-caption font-semibold transition-colors',
                  category === c.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-surface hover:text-foreground',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Body: full-width product grid (filters live in the popover) ===== */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
        {/* Product grid */}
        <div className="min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse border border-border bg-surface">
                  <div className="aspect-square bg-surface-2" />
                  <div className="space-y-2 p-3">
                    <div className="h-4 w-3/4 rounded-[4px] bg-surface-2" />
                    <div className="h-3 w-1/2 rounded-[4px] bg-surface-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-border bg-surface py-20 text-center">
              <p className="font-semibold text-foreground">No products found</p>
              <p className="mt-1 text-body-sm text-muted-foreground">Try a different category, search, or loosen the filters.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-caption text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filtered.map((p) => {
                  const justAdded = !!added[p.id];
                  return (
                    <div key={p.id} className="group flex flex-col border border-border bg-surface transition-colors hover:border-primary">
                      {/* Large image */}
                      <Link href={`/product/${p.id}`} className="block">
                        <div className="relative aspect-square overflow-hidden rounded-[4px] bg-background">
                          {p.image_url ? (
                            <Image src={p.image_url} alt={p.item_name} fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                            </div>
                          )}
                          {isDeal(p) && (
                            <span className="absolute left-2 top-2 rounded-[4px] bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Deal</span>
                          )}
                        </div>
                      </Link>

                      {/* Details */}
                      <div className="flex flex-1 flex-col p-3">
                        <Link href={`/product/${p.id}`} className="block">
                          <p className="line-clamp-2 text-body-sm font-semibold leading-snug text-foreground hover:text-primary">{p.item_name}</p>
                        </Link>
                        <p className="mt-0.5 truncate text-caption text-muted-foreground">{p.businessName}</p>
                        <div className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                          {p.rating != null ? (
                            <>
                              <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                              <span className="font-semibold text-foreground">{p.rating}</span>
                              <span>({p.reviewCount})</span>
                            </>
                          ) : (
                            <span>No reviews yet</span>
                          )}
                        </div>
                        <p className="mt-2 text-body font-bold text-foreground">${p.price.toFixed(2)}</p>
                        <button
                          type="button"
                          onClick={() => handleAdd(p)}
                          className={cn(
                            'mt-2 inline-flex items-center justify-center gap-1.5 rounded-[4px] px-3 py-2 text-body-sm font-bold transition-colors',
                            justAdded ? 'border border-success bg-success/10 text-success' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                          )}
                        >
                          {justAdded ? (<><Check className="h-4 w-4" aria-hidden="true" /> Added</>) : (<><Plus className="h-4 w-4" aria-hidden="true" /> Add to cart</>)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
