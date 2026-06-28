'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart, MoreHorizontal, Search, Users, ChevronLeft, ChevronRight,
  Info, Clock, Plus, Star, ThumbsUp, Check, DollarSign,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

/* ----------------------------- types ----------------------------- */
export interface StoreItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category: string;
  likePct?: number;
  likeCount?: number;
}
export interface StoreMenu {
  slug: string;
  banner?: string | null;
  rating: number;
  ratingCount: string;
  address: string;
  availability: string;
  hoursLabel: string;
  deliveryTime: string;
  reviews: { name: string; stars: number; date: string; text: string }[];
  categories: string[];
  featuredIds: string[];
  pickedIds: string[];
  items: StoreItem[];
}

const ORANGE = '#f97316';
const catId = (c: string) => 'cat-' + c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* ----------------------------- placeholder ----------------------------- */
function ItemImg({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <svg className="h-1/3 w-1/3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-8-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function Stars({ value, className = 'h-3.5 w-3.5' }: { value: number; className?: string }) {
  return (
    <div className="flex items-center" aria-label={`Rated ${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={`relative inline-block ${className}`}>
            <Star className={`absolute inset-0 ${className} text-gray-300`} strokeWidth={1.5} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={`${className} text-[${ORANGE}]`} style={{ fill: ORANGE, color: ORANGE }} strokeWidth={1.5} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ----------------------------- add button ----------------------------- */
function useAdd(sellerId: string) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const add = (it: StoreItem) => {
    addToCart({ itemId: it.id, itemName: it.name, itemPrice: it.price, itemImage: it.image, sellerId, buyerId: user?.id || 'guest', quantity: 1 });
    setAdded((p) => ({ ...p, [it.id]: true }));
    setTimeout(() => setAdded((p) => ({ ...p, [it.id]: false })), 1200);
  };
  return { add, added };
}

function AddBtn({ item, onAdd, isAdded }: { item: StoreItem; onAdd: (it: StoreItem) => void; isAdded: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(item); }}
      aria-label={`Add ${item.name}`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-sm transition hover:border-[#f97316] hover:text-[#f97316]"
    >
      {isAdded ? <Check className="h-4 w-4 text-[#f97316]" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
    </button>
  );
}

/* ----------------------------- cards ----------------------------- */
function FeaturedCard({ item, rank, onAdd, isAdded }: { item: StoreItem; rank: number; onAdd: (it: StoreItem) => void; isAdded: boolean }) {
  return (
    <div className="flex w-[240px] shrink-0 flex-col">
      <div className="relative">
        <ItemImg src={item.image} alt={item.name} className="h-[150px] w-full rounded-xl object-cover" />
        {rank <= 3 && (
          <span className="absolute left-2 top-2 rounded-md bg-black px-1.5 py-0.5 text-[11px] font-semibold text-white">
            #{rank} most liked
          </span>
        )}
        <div className="absolute bottom-2 right-2">
          <AddBtn item={item} onAdd={onAdd} isAdded={isAdded} />
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

function ItemRow({ item, onAdd, isAdded }: { item: StoreItem; onAdd: (it: StoreItem) => void; isAdded: boolean }) {
  return (
    <div className="flex items-stretch justify-between gap-3 rounded-xl border border-gray-200 p-3 transition hover:border-gray-300 hover:shadow-sm">
      <div className="flex min-w-0 flex-col">
        <p className="line-clamp-2 text-sm font-medium text-black">{item.name}</p>
        <p className="mt-1 text-sm text-black">${item.price.toFixed(2)}{item.likePct != null && <span className="ml-2 text-xs text-gray-500">{item.likePct}% ({item.likeCount})</span>}</p>
        {item.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.description}</p>}
      </div>
      <div className="relative h-[90px] w-[90px] shrink-0">
        <ItemImg src={item.image} alt={item.name} className="h-[90px] w-[90px] rounded-lg object-cover" />
        <div className="absolute -bottom-1 -right-1">
          <AddBtn item={item} onAdd={onAdd} isAdded={isAdded} />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- main ----------------------------- */
export function StorePage({ storeName, sellerId, menu }: { storeName: string; sellerId: string; menu: StoreMenu }) {
  const { add, added } = useAdd(sellerId);
  const byId = useMemo(() => new Map(menu.items.map((it) => [it.id, it])), [menu.items]);
  const featured = menu.featuredIds.map((id) => byId.get(id)).filter(Boolean) as StoreItem[];
  const picked = menu.pickedIds.map((id) => byId.get(id)).filter(Boolean) as StoreItem[];
  const itemsByCat = useMemo(() => {
    const m: Record<string, StoreItem[]> = {};
    for (const it of menu.items) (m[it.category] ??= []).push(it);
    return m;
  }, [menu.items]);

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: number) => carouselRef.current?.scrollBy({ left: dir * carouselRef.current.clientWidth * 0.8, behavior: 'smooth' });

  // sidebar scroll-spy
  const navKeys = useMemo(() => ['featured', 'picked', ...menu.categories.map(catId)], [menu.categories]);
  const [active, setActive] = useState('featured');
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: 0 }
    );
    navKeys.forEach((k) => { const el = document.getElementById(k); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [navKeys]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); }
  };

  const navItems: { key: string; label: string }[] = [
    { key: 'featured', label: 'Featured items' },
    { key: 'picked', label: 'Picked for you' },
    ...menu.categories.map((c) => ({ key: catId(c), label: c })),
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-28 sm:px-6">
        {/* 1. Banner */}
        <div className="relative mt-3 overflow-hidden rounded-xl">
          <ItemImg src={menu.banner || undefined} alt={storeName} className="h-[170px] w-full object-cover sm:h-[210px]" />
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <button aria-label="Save" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow backdrop-blur transition hover:text-[#f97316]">
              <Heart className="h-5 w-5" strokeWidth={2} />
            </button>
            <button aria-label="More" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow backdrop-blur transition hover:text-[#f97316]">
              <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 2. Header block */}
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-black">{storeName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="flex items-center gap-1 font-semibold text-black">
                {menu.rating.toFixed(1)} <Star className="h-3.5 w-3.5" style={{ fill: '#000', color: '#000' }} />
              </span>
              <span className="text-gray-500">({menu.ratingCount})</span>
              <span className="text-gray-300">·</span>
              <button className="font-medium text-black underline-offset-2 hover:underline">Info</button>
            </div>
            <div className="mt-1.5 flex items-start gap-1.5 text-sm text-gray-600">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" strokeWidth={2} />
              <div>
                <span className="text-black">{menu.availability}</span>
                <div className="text-gray-500">{menu.address}</div>
              </div>
            </div>
          </div>

          {/* in-store search */}
          <div className="relative w-full md:w-[300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Search in ${storeName}`}
              className="w-full rounded-full border border-gray-200 bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-black placeholder-gray-500 transition focus:border-[#f97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
            />
          </div>
        </div>

        {/* 3. Action row */}
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 p-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-gray-100 p-1">
              <button className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black shadow-sm">Delivery</button>
              <button className="rounded-full px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:text-black">Pickup</button>
            </div>
            <button className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-50">
              <Users className="h-4 w-4" strokeWidth={2} /> Group order
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="font-medium text-black">
                <span className="text-gray-400 line-through">$0.99</span>{' '}
                <span className="text-[#f97316]">$0 Delivery &amp; Service Fees on $30+</span>
              </p>
              <p className="flex items-center gap-1 text-gray-500">Pricing &amp; fees <Info className="h-3.5 w-3.5" /></p>
            </div>
            <div className="hidden h-9 w-px bg-gray-200 sm:block" />
            <div className="text-right">
              <p className="font-semibold text-black">Closed</p>
              <p className="text-gray-500">{menu.deliveryTime} delivery</p>
            </div>
          </div>
        </div>

        {/* 4 + 5. Sidebar + content */}
        <div className="mt-6 flex gap-8">
          {/* sticky category nav */}
          <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-[180px] shrink-0 overflow-y-auto pb-10 md:block">
            <p className="px-3 text-base font-bold text-black">Menu</p>
            <p className="mb-2 px-3 text-xs text-gray-500">{menu.hoursLabel}</p>
            <nav className="flex flex-col">
              {navItems.map((n) => (
                <button
                  key={n.key}
                  onClick={() => jump(n.key)}
                  className={`relative rounded-md px-3 py-2 text-left text-sm transition ${
                    active === n.key ? 'font-bold text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  {active === n.key && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#f97316]" />}
                  {n.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* main content */}
          <div className="min-w-0 flex-1">
            {/* Savings and more */}
            <section>
              <h2 className="mb-3 text-2xl font-bold text-black">Savings and more</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-black">Save with $0 Delivery &amp; Service Fees when you order $30+</p>
                    <p className="mt-1 text-xs text-gray-600">Expires tomorrow by 1:13 p.m.</p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
                    <DollarSign className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-black">$0 Delivery Fee + 5% off with Uber One</p>
                    <button className="mt-1 text-xs font-semibold text-[#f97316] hover:underline">Try free for 4 weeks</button>
                  </div>
                  <ItemImg src={menu.banner || undefined} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                </div>
              </div>
            </section>

            {/* Featured items */}
            {featured.length > 0 && (
              <section id="featured" className="mt-8 scroll-mt-24">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-black">Featured items</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => scrollCarousel(-1)} aria-label="Scroll left" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition hover:bg-gray-50">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => scrollCarousel(1)} aria-label="Scroll right" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition hover:bg-gray-50">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {featured.map((it, i) => (
                    <FeaturedCard key={it.id} item={it} rank={i + 1} onAdd={add} isAdded={!!added[it.id]} />
                  ))}
                </div>
              </section>
            )}

            {/* Rating and reviews */}
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">Rating and reviews</h2>
                <button className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-gray-50">See more</button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 p-4">
                  <span className="text-4xl font-extrabold text-black">{menu.rating.toFixed(1)}</span>
                  <Stars value={menu.rating} className="h-4 w-4" />
                  <span className="mt-1 text-xs text-gray-500">{menu.ratingCount} Ratings</span>
                </div>
                {menu.reviews.slice(0, 3).map((r, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4">
                    <p className="line-clamp-3 text-sm text-black">&ldquo;{r.text}&rdquo;</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <Stars value={r.stars} />
                      <span className="text-xs text-gray-500">{r.name} · {r.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Picked for you */}
            {picked.length > 0 && (
              <section id="picked" className="mt-8 scroll-mt-24">
                <h2 className="mb-3 text-2xl font-bold text-black">Picked for you</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {picked.map((it) => <ItemRow key={it.id} item={it} onAdd={add} isAdded={!!added[it.id]} />)}
                </div>
              </section>
            )}

            {/* Category sections */}
            {menu.categories.map((cat) => (
              <section key={cat} id={catId(cat)} className="mt-8 scroll-mt-24">
                <h2 className="mb-3 text-2xl font-bold text-black">{cat}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(itemsByCat[cat] || []).map((it) => <ItemRow key={it.id} item={it} onAdd={add} isAdded={!!added[it.id]} />)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
