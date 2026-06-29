'use client';

/**
 * StorePage.tsx — the full restaurant/shop storefront: banner, header (rating,
 * Message + Info actions, distance), delivery/pickup action row, a sticky
 * category navigation with scroll-spy, and the menu sections (featured carousel,
 * reviews, picked-for-you, and per-category item lists).
 *
 * Presentational pieces live in sibling modules so this file stays focused on
 * page composition and behaviour:
 *   - StorePrimitives  → ItemImage, Stars
 *   - StoreItemCards   → useAddToCart, FeaturedItemCard, MenuItemRow
 *   - InfoModal        → the store info / map pop-up
 *   - types            → StoreMenu, StoreItem, StoreDeal (re-exported below)
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart, Share2, Search, Users, ChevronLeft, ChevronRight,
  Info, Clock, Star, DollarSign, MapPin, MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateOneToOneChat } from '@/lib/supabase/messaging';
import { isUuid } from '@/lib/utils/uuid';
import { openDemoChat } from '@/lib/demoChat';
import { useStoreDistance } from '@/lib/utils/useStoreDistance';
import { ItemImage, Stars } from './StorePrimitives';
import { useAddToCart, FeaturedItemCard, MenuItemRow } from './StoreItemCards';
import { InfoModal } from './InfoModal';
import type { StoreItem, StoreMenu } from './types';
import { isItemBookmarked, toggleItemBookmark } from '@/lib/clientEngagement';

// Re-export the store types so existing importers (e.g. the profile page) keep
// importing them from this module.
export type { StoreDeal, StoreItem, StoreMenu } from './types';

/** Turn a category label into a stable DOM id used for scroll-spy + jump links. */
const categoryDomId = (category: string) =>
  'cat-' + category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function StorePage({ storeName, sellerId, menu }: { storeName: string; sellerId: string; menu: StoreMenu }) {
  const { addItem, addedById } = useAddToCart(sellerId);
  const { user } = useAuth();
  const router = useRouter();
  const { label: distanceLabel } = useStoreDistance(menu.address);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);

  // Banner "save" (heart): persists the store to the client-side saves so it
  // toggles, survives reload, and shows up in the profile's Saved section.
  const [saved, setSaved] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  useEffect(() => {
    setSaved(isItemBookmarked(sellerId));
  }, [sellerId]);

  const handleToggleSave = () => {
    const next = toggleItemBookmark({
      id: sellerId,
      type: 'business',
      name: storeName,
      image: menu.banner || undefined,
    });
    setSaved(next);
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = { title: storeName, text: `Check out ${storeName} on Localy`, url };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1500);
      }
    } catch {
      // user dismissed the share sheet — no-op
    }
  };

  // Open (or create) a 1:1 chat with this business and navigate to it. Guests are
  // sent to login; messaging yourself is a no-op.
  const handleMessageClick = async () => {
    if (!user) { router.push('/login'); return; }
    if (!sellerId || sellerId === user.id) return;
    setMessagingLoading(true);
    try {
      // Open the FULL Messages UI (left conversation list intact) with this business
      // thread selected. On desktop that's /chats?c=<id>; on mobile the conversation
      // is its own screen (/chats/<id>), matching how the list opens a chat.
      const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

      let chatId: string;
      if (isUuid(sellerId)) {
        // Real store with a Supabase profile — normal persisted chat.
        const { data, error } = await getOrCreateOneToOneChat(user.id, sellerId);
        if (error || !data?.id) {
          console.error('Could not start chat with business:', error instanceof Error ? error.message : error);
          return;
        }
        chatId = data.id;
      } else {
        // Demo store (slug id, no Supabase row) — open a local conversation, no DB call.
        chatId = openDemoChat(sellerId, storeName, menu.banner || undefined).id!;
      }
      router.push(isDesktop ? `/chats?c=${chatId}` : `/chats/${chatId}`);
    } catch (err) {
      console.error('Unexpected error starting chat:', err);
    } finally {
      setMessagingLoading(false);
    }
  };

  // Resolve featured / picked items and group the rest by category for the menu.
  const itemById = useMemo(() => new Map(menu.items.map((item) => [item.id, item])), [menu.items]);
  const featuredItems = menu.featuredIds.map((id) => itemById.get(id)).filter(Boolean) as StoreItem[];
  const pickedItems = menu.pickedIds.map((id) => itemById.get(id)).filter(Boolean) as StoreItem[];
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, StoreItem[]> = {};
    for (const item of menu.items) (grouped[item.category] ??= []).push(item);
    return grouped;
  }, [menu.items]);

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (direction: number) =>
    carouselRef.current?.scrollBy({ left: direction * carouselRef.current.clientWidth * 0.8, behavior: 'smooth' });

  // Sticky sidebar scroll-spy: highlight the section currently nearest the top.
  const navKeys = useMemo(() => ['featured', 'picked', ...menu.categories.map(categoryDomId)], [menu.categories]);
  const [activeSection, setActiveSection] = useState('featured');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: 0 }
    );
    navKeys.forEach((key) => { const el = document.getElementById(key); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [navKeys]);

  const jumpToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); }
  };

  const navItems: { key: string; label: string }[] = [
    { key: 'featured', label: 'Featured items' },
    { key: 'picked', label: 'Picked for you' },
    ...menu.categories.map((category) => ({ key: categoryDomId(category), label: category })),
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      {showInfoModal && <InfoModal menu={menu} storeName={storeName} onClose={() => setShowInfoModal(false)} />}
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-28 sm:px-6">
        {/* 1. Banner */}
        <div className="relative mt-3 overflow-hidden rounded-xl">
          <ItemImage src={menu.banner || undefined} alt={storeName} className="h-[170px] w-full object-cover sm:h-[210px]" />
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <button
              onClick={handleToggleSave}
              aria-label={saved ? 'Remove from saved' : 'Save'}
              aria-pressed={saved}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-0 ring-1 ring-black/10 shadow-lg transition hover:bg-gray-50"
            >
              <Heart
                className="h-5 w-5"
                color={saved ? '#ef4444' : '#000000'}
                fill={saved ? '#ef4444' : 'none'}
                strokeWidth={2.2}
              />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white p-0 ring-1 ring-black/10 shadow-lg transition hover:bg-gray-50"
            >
              <Share2 className="h-5 w-5" color="#000000" strokeWidth={2.2} />
              {shareCopied && (
                <span className="absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-black px-2 py-0.5 text-[11px] font-semibold text-white">
                  Link copied
                </span>
              )}
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
              <button
                onClick={handleMessageClick}
                disabled={messagingLoading}
                className="inline-flex items-center gap-1 rounded-full border border-[#f97316] px-3 py-1 text-sm font-semibold text-black transition hover:bg-[#f97316]/10 disabled:opacity-60"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#f97316]" strokeWidth={2} />
                {messagingLoading ? 'Opening…' : 'Message'}
              </button>
              <button onClick={() => setShowInfoModal(true)} className="font-medium text-black underline-offset-2 hover:underline">Info</button>
            </div>
            {distanceLabel && (
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-4 w-4 shrink-0 text-[#f97316]" strokeWidth={2} />
                <span className="text-black">{distanceLabel}</span>
              </div>
            )}
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
              {navItems.map((nav) => (
                <button
                  key={nav.key}
                  onClick={() => jumpToSection(nav.key)}
                  className={`relative rounded-md px-3 py-2 text-left text-sm transition ${
                    activeSection === nav.key ? 'font-bold text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  {activeSection === nav.key && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#f97316]" />}
                  {nav.label}
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
                    <p className="text-sm font-semibold text-black">Save 15% across all orders when you order $30+</p>
                    <p className="mt-1 text-xs text-gray-600">Expires tomorrow by 1:13 p.m.</p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
                    <DollarSign className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-black">15% discounts across all items with Localy Premium</p>
                    <Link href="/premium" className="mt-1 inline-block text-xs font-semibold text-[#f97316] hover:underline">Get Premium — $5/month</Link>
                  </div>
                  <ItemImage src={menu.banner || undefined} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                </div>
              </div>
            </section>

            {/* Featured items */}
            {featuredItems.length > 0 && (
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
                  {featuredItems.map((item, i) => (
                    <FeaturedItemCard key={item.id} item={item} rank={i + 1} onAdd={addItem} isAdded={!!addedById[item.id]} bannerSrc={menu.banner || undefined} />
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
                {menu.reviews.slice(0, 3).map((review, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4">
                    <p className="line-clamp-3 text-sm text-black">&ldquo;{review.text}&rdquo;</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <Stars value={review.stars} />
                      <span className="text-xs text-gray-500">{review.name} · {review.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Picked for you */}
            {pickedItems.length > 0 && (
              <section id="picked" className="mt-8 scroll-mt-24">
                <h2 className="mb-3 text-2xl font-bold text-black">Picked for you</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {pickedItems.map((item) => <MenuItemRow key={item.id} item={item} onAdd={addItem} isAdded={!!addedById[item.id]} bannerSrc={menu.banner || undefined} />)}
                </div>
              </section>
            )}

            {/* Category sections */}
            {menu.categories.map((category) => (
              <section key={category} id={categoryDomId(category)} className="mt-8 scroll-mt-24">
                <h2 className="mb-3 text-2xl font-bold text-black">{category}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(itemsByCategory[category] || []).map((item) => <MenuItemRow key={item.id} item={item} onAdd={addItem} isAdded={!!addedById[item.id]} bannerSrc={menu.banner || undefined} />)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
