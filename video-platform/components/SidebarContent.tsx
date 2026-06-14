'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Home,
  Video,
  Users,
  MessageCircle,
  ShoppingCart,
  ChevronDown,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { supabase } from '@/lib/supabase/client';
import { RECENTLY_VIEWED_EVENT, RECENTLY_VIEWED_KEY } from '@/lib/utils/recentlyViewed';
import { COMMUNITIES_EVENT, COMMUNITIES_KEY, type Community } from '@/lib/utils/communities';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'messages' | 'cart';
  onClick?: () => void;
};

/** Seeded daily challenges shown in the sidebar; the full list lives on /rewards. */
const DAILY_CHALLENGES = [
  { id: 'visit-3', label: 'Visit 3 small businesses this week', progress: 1, total: 3 },
  { id: 'review-2', label: 'Leave 2 reviews', progress: 0, total: 2 },
  { id: 'watch-10', label: 'Watch 10 local videos', progress: 6, total: 10 },
];

/** RESOURCES list — each entry links to a section on the /info page. */
const RESOURCE_LINKS: { label: string; href: string; beta?: boolean }[] = [
  { label: 'About Localys', href: '/info#about' },
  { label: 'Advertise', href: '/info#advertise' },
  { label: 'Developer Platform', href: '/info#developer-platform' },
  { label: 'Localys Pro', href: '/info#localys-pro', beta: true },
  { label: 'Help', href: '/info#help' },
  { label: 'Blog', href: '/info#blog' },
  { label: 'Careers', href: '/info#careers' },
  { label: 'Press', href: '/info#press' },
];

const RESOURCE_BEST = { label: 'Best of Localys', href: '/info#best-of' };

const RESOURCE_LEGAL: { label: string; href: string }[] = [
  { label: 'Localys Rules', href: '/info#rules' },
  { label: 'Privacy Policy', href: '/info#privacy-policy' },
  { label: 'User Agreement', href: '/info#user-agreement' },
  { label: 'Accessibility', href: '/info#accessibility' },
];

interface RecentBusiness {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
  type: string | null;
}

// Same-tab broadcast so every section re-reads localStorage when one changes.
const SIDEBAR_EVENT = 'localys:sidebar-section';

function readOpen(storageKey: string, defaultOpen: boolean): boolean {
  if (typeof window === 'undefined') return defaultOpen;
  const v = window.localStorage.getItem(storageKey);
  return v === null ? defaultOpen : v === '1';
}

/**
 * Per-section open/closed state persisted in localStorage. Uses
 * useSyncExternalStore so the server/hydration snapshot is stable (no
 * hydration mismatch) while still reflecting the user's saved preference.
 */
function usePersistentDisclosure(storageKey: string, defaultOpen: boolean) {
  const open = useSyncExternalStore(
    (cb) => {
      window.addEventListener(SIDEBAR_EVENT, cb);
      window.addEventListener('storage', cb);
      return () => {
        window.removeEventListener(SIDEBAR_EVENT, cb);
        window.removeEventListener('storage', cb);
      };
    },
    () => readOpen(storageKey, defaultOpen),
    () => defaultOpen,
  );

  const toggle = () => {
    window.localStorage.setItem(storageKey, open ? '0' : '1');
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  };

  return [open, toggle] as const;
}

/**
 * Collapsible sidebar section with a small-caps gray header + chevron (Reddit
 * pattern). Open/closed state is remembered per-section in localStorage.
 */
function SidebarSection({
  id,
  title,
  children,
  // All sidebar sections start CLOSED on first load (per-section state is then
  // remembered in localStorage once the user opens one).
  defaultOpen = false,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, toggle] = usePersistentDisclosure(`localys.sidebar.${id}`, defaultOpen);

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open ? '' : '-rotate-90')}
          aria-hidden="true"
        />
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

/**
 * Reddit-style sidebar body: primary nav, Daily Challenges, Recent businesses,
 * Communities (with star favorites), and footer links. Rendered inside the
 * fixed desktop rail and the mobile drawer.
 */
export function SidebarContent({
  onCartOpen,
  onNavigate,
}: {
  onCartOpen?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { getCartCount } = useCart();
  const { unreadMessages } = useUnreadMessages();
  const cartCount = getCartCount();

  const [discoverRecents, setDiscoverRecents] = useState<RecentBusiness[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Recently-viewed profiles (live via localStorage); used as the primary
  // "Recent" source so the section reflects profiles the user actually visited.
  const viewedJson = useSyncExternalStore(
    (cb) => {
      window.addEventListener(RECENTLY_VIEWED_EVENT, cb);
      window.addEventListener('storage', cb);
      return () => {
        window.removeEventListener(RECENTLY_VIEWED_EVENT, cb);
        window.removeEventListener('storage', cb);
      };
    },
    () => window.localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]',
    () => '[]',
  );
  const viewed = useMemo<RecentBusiness[]>(() => {
    try {
      return JSON.parse(viewedJson) as RecentBusiness[];
    } catch {
      return [];
    }
  }, [viewedJson]);

  // Real communities (localStorage). The section only renders when some exist.
  const communitiesJson = useSyncExternalStore(
    (cb) => {
      window.addEventListener(COMMUNITIES_EVENT, cb);
      window.addEventListener('storage', cb);
      return () => {
        window.removeEventListener(COMMUNITIES_EVENT, cb);
        window.removeEventListener('storage', cb);
      };
    },
    () => window.localStorage.getItem(COMMUNITIES_KEY) || '[]',
    () => '[]',
  );
  const communities = useMemo<Community[]>(() => {
    try {
      return JSON.parse(communitiesJson) as Community[];
    } catch {
      return [];
    }
  }, [communitiesJson]);

  // Discovery fallback for when the user hasn't viewed any profiles yet.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, username, full_name, profile_picture_url, type')
      .in('type', ['food', 'retail', 'service'])
      .limit(5)
      .then(({ data }) => {
        if (!cancelled && data) setDiscoverRecents(data as RecentBusiness[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefer recently-viewed; fall back to discovery when the user is new.
  const recents = viewed.length > 0 ? viewed : discoverRecents;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Video },
    { href: '/communities', label: 'Communities', icon: Users },
    { href: '/chats', label: 'Messages', icon: MessageCircle, badge: 'messages' },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, badge: 'cart', onClick: onCartOpen },
  ];

  const rowClasses = (active: boolean) =>
    cn(
      'group relative flex items-center gap-3 rounded-[4px] px-4 py-2.5 text-body-sm font-semibold transition-colors',
      active ? 'bg-surface text-foreground' : 'text-foreground hover:bg-surface'
    );

  return (
    <div className="flex h-full flex-col overflow-y-auto px-2 py-3">
      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const count =
            item.badge === 'messages' ? unreadMessages : item.badge === 'cart' ? cartCount : 0;

          const inner = (
            <>
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-foreground"
                  aria-hidden="true"
                />
              )}
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
              {count > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-[4px] bg-foreground px-1 text-caption font-bold text-background">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </>
          );

          // Cart opens the slide-over drawer instead of navigating.
          if (item.onClick) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  onNavigate?.();
                }}
                className={cn(rowClasses(active), 'text-left')}
                aria-current={active ? 'page' : undefined}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={rowClasses(active)}
              aria-current={active ? 'page' : undefined}
            >
              {inner}
            </Link>
          );
        })}
      </nav>


      {/* Daily challenges */}
      <SidebarSection id="daily-challenges" title="Daily Challenges">
        {DAILY_CHALLENGES.map((c) => (
          <Link
            key={c.id}
            href="/rewards"
            onClick={onNavigate}
            className="group rounded-[4px] px-4 py-2 transition-colors hover:bg-surface"
          >
            <span className="flex items-start gap-2.5">
              <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-body-sm text-foreground">{c.label}</span>
                <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-[4px] bg-surface-2">
                  <span
                    className="block h-full bg-foreground"
                    style={{ width: `${(c.progress / c.total) * 100}%` }}
                  />
                </span>
                <span className="mt-1 block text-caption text-muted-foreground">
                  {c.progress}/{c.total} complete
                </span>
              </span>
            </span>
          </Link>
        ))}
      </SidebarSection>


      {/* Recent businesses */}
      <SidebarSection id="recent" title="Recent">
        {recents.length === 0 ? (
          <p className="px-4 py-2 text-caption text-muted-foreground">No businesses near you yet</p>
        ) : (
          recents.map((b) => (
            <Link
              key={b.id}
              href={`/profile/${b.username || b.id}`}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-[4px] px-4 py-2 transition-colors hover:bg-surface"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                {b.profile_picture_url ? (
                  <Image
                    src={b.profile_picture_url}
                    alt=""
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-caption font-bold text-muted-foreground">
                    {(b.full_name || b.username || 'B').charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm text-foreground">
                  {b.full_name || b.username}
                </span>
                <span className="block text-caption capitalize text-muted-foreground">{b.type}</span>
              </span>
            </Link>
          ))
        )}
      </SidebarSection>

      {/* Communities — only shown when the user has actually created some */}
      {communities.length > 0 && (
        <>
          <SidebarSection id="communities" title="Communities">
            {communities.map((c) => {
              const fav = !!favorites[c.slug];
              return (
                <div
                  key={c.slug}
                  className="group flex items-center gap-3 rounded-[4px] px-4 py-2 transition-colors hover:bg-surface/60"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-caption font-bold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <Link
                    href={`/communities/${c.slug}`}
                    onClick={onNavigate}
                    className="min-w-0 flex-1 truncate text-body-sm text-foreground"
                  >
                    b/{c.slug}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setFavorites((prev) => ({ ...prev, [c.slug]: !prev[c.slug] }))}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={fav ? `Remove ${c.name} from favorites` : `Add ${c.name} to favorites`}
                    aria-pressed={fav}
                  >
                    <Star className={cn('h-4 w-4', fav && 'fill-primary text-primary')} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </SidebarSection>
        </>
      )}


      {/* Resources — collapsible, links into the /info page */}
      <SidebarSection id="resources" title="Resources">
        {RESOURCE_LINKS.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            onClick={onNavigate}
            className="flex items-center gap-1.5 rounded-[4px] px-4 py-1.5 text-body-sm text-foreground transition-colors hover:bg-surface"
          >
            {r.label}
            {r.beta && (
              <span className="rounded-[4px] bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Beta
              </span>
            )}
          </Link>
        ))}

        <hr className="mx-4 my-1.5 border-border" />

        <Link
          href={RESOURCE_BEST.href}
          onClick={onNavigate}
          className="rounded-[4px] px-4 py-1.5 text-body-sm text-foreground transition-colors hover:bg-surface"
        >
          {RESOURCE_BEST.label}
        </Link>

        <hr className="mx-4 my-1.5 border-border" />

        {RESOURCE_LEGAL.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            onClick={onNavigate}
            className="rounded-[4px] px-4 py-1.5 text-body-sm text-foreground transition-colors hover:bg-surface"
          >
            {r.label}
          </Link>
        ))}
      </SidebarSection>

      {/* Copyright */}
      <p className="mt-auto px-4 py-4 text-caption text-muted-foreground">
        Localys, Inc. © 2026. All rights reserved.
      </p>
    </div>
  );
}
