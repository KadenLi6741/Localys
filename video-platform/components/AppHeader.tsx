'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Search,
  Coins,
  Plus,
  Bell,
  Megaphone,
  Menu,
  Settings,
  Trophy,
  Sun,
  Moon,
  Globe,
  User,
  BarChart3,
  LogOut,
  Star,
  Store,
  Check,
} from 'lucide-react';

/** A few languages surfaced in the header switcher (full list on the profile page). */
const HEADER_LANGS: Language[] = ['en', 'es', 'fr', 'de', 'zh'];
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGES, type Language } from '@/lib/translations';
import { getUserCoins } from '@/lib/supabase/profiles';
import { searchBusinesses } from '@/lib/supabase/search';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HeaderProfile {
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
}

/** One business returned by the live search (shape from searchBusinesses). */
interface BusinessResult {
  id: string;
  username: string | null;
  business_name: string | null;
  category: string | null;
  profile_picture_url: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  price_range_min: number | null;
  price_range_max: number | null;
  isAccount?: boolean;
}

const DISTANCE_MAX_KM = 50; // slider ceiling; max = "Any distance"

/**
 * Reddit-style fixed top bar: Locally logo (left), expanding search with a
 * filter panel on focus (center), and the right cluster — points pill,
 * Advertise, Create, Notifications, Profile dropdown.
 */
export function AppHeader({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { togglePanel, unreadCount } = useActivity();
  const { resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [coins, setCoins] = useState<number | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Expanding search state
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Live results + filters
  const [results, setResults] = useState<BusinessResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState<'all' | 'food' | 'retail' | 'service'>('all');
  const [accountType, setAccountType] = useState<'all' | 'business' | 'user'>('all');
  const [priceMax, setPriceMax] = useState(100); // 100 = no price cap
  const [minRating, setMinRating] = useState(0); // 0 = any rating
  const [maxDistanceKm, setMaxDistanceKm] = useState(DISTANCE_MAX_KM); // ceiling = any
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserCoins(user.id).then(({ data }) => {
      if (!cancelled) setCoins(data ?? 0);
    });
    supabase
      .from('profiles')
      .select('username, full_name, profile_picture_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile(data as HeaderProfile | null);
          setAvatarError(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Collapse the search filter panel on click-away (Reddit behavior).
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  // Best-effort geolocation so the distance filter can apply (no prompt nag).
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  // Live search — debounced, queries real data, never navigates.
  //  • Empty query  → lists every business (a browse/directory).
  //  • Typed query  → username/name substring match across businesses AND
  //    regular user accounts (case-insensitive).
  // Filters (category / account-type / rating / distance / price) refine it.
  // All state writes happen inside the debounce callback (not synchronously in
  // the effect body) so the search runs as an external-data sync.
  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim();
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);

      const filters = {
        query: q || undefined,
        category: category !== 'all' ? category : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        priceMax: priceMax < 100 ? priceMax : undefined,
        maxDistance: coords && maxDistanceKm < DISTANCE_MAX_KM ? maxDistanceKm : undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };

      // Businesses (skipped when filtering to user accounts only).
      const bizPromise =
        accountType === 'user'
          ? Promise.resolve({ data: [] as Record<string, unknown>[] })
          : searchBusinesses(filters);

      // Regular user accounts (type is null) — only when actually typing.
      const userPromise =
        q.length >= 1 && accountType !== 'business'
          ? supabase
              .from('profiles')
              .select('id, username, full_name, profile_picture_url, type')
              .is('type', null)
              .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
              .limit(10)
          : Promise.resolve({ data: [] as Record<string, unknown>[] });

      const [bizRes, userRes] = await Promise.all([bizPromise, userPromise]);
      if (cancelled) return;

      const businesses = ((bizRes.data ?? []) as BusinessResult[]).map((b) => ({ ...b, isAccount: false }));
      const users = ((userRes.data ?? []) as Record<string, unknown>[]).map((u) => ({
        id: u.id as string,
        username: (u.username as string) ?? null,
        business_name: (u.full_name as string) ?? (u.username as string) ?? null,
        category: 'Account',
        profile_picture_url: (u.profile_picture_url as string) ?? null,
        average_rating: null,
        total_reviews: null,
        price_range_min: null,
        price_range_max: null,
        isAccount: true,
      }));

      setResults([...businesses, ...users].slice(0, 25));
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchOpen, category, accountType, priceMax, minRating, maxDistanceKm, coords]);

  if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') return null;

  const initial = (profile?.full_name || profile?.username || user?.email || 'U')
    .charAt(0)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Open a business profile from a live result.
  const goToBusiness = (b: BusinessResult) => {
    setSearchOpen(false);
    setQuery('');
    router.push(`/profile/${b.username || b.id}`);
  };

  // Inline-only search — never navigates to a separate page. Enter / the Search
  // pill opens the top live result if there is one; otherwise the live results
  // dropdown stays open as you type.
  const submitSearch = () => {
    if (results.length > 0) {
      goToBusiness(results[0]);
    }
  };

  // Icon-only actions: full-contrast foreground icon, orange on hover, with a
  // subtle (low-emphasis) surface highlight.
  const iconBtn =
    'inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card px-3 md:gap-4 md:px-4">
      {/* Left: menu (mobile) + logo */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onMenuOpen}
          className={cn(iconBtn, 'lg:hidden')}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 px-1" aria-label="Locally home">
          <Image src="/logo.png" alt="" width={30} height={30} className="rounded-[4px]" />
          <span className="hidden text-subheading font-bold text-primary sm:inline">Locally</span>
        </Link>
      </div>

      {/* Center: expanding search */}
      <div ref={searchRef} className="relative mx-auto min-w-0 flex-1 max-w-[640px]">
        <div
          className={cn(
            'relative flex h-10 items-center rounded-full border bg-surface transition-colors',
            searchOpen ? 'border-primary' : 'border-border hover:border-primary/50'
          )}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch();
              if (e.key === 'Escape') setSearchOpen(false);
            }}
            placeholder="Find anything"
            /* pl clears the magnifier, pr clears the Search button so text never runs underneath */
            className="h-full w-full min-w-0 bg-transparent pl-10 pr-[92px] text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Find anything"
          />
          {/* Always-visible, right-anchored Search pill */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={submitSearch}
            className="absolute right-1 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-caption font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
          </button>
        </div>

        {/* Live results + filters — opaque panel below the bar, high z-index
            so it floats cleanly over page content without bleed-through. */}
        {searchOpen && (
          <div className="absolute left-0 right-0 top-full z-[70] mt-1 overflow-hidden rounded-[4px] border border-border bg-popover shadow-[inset_0_0_0_1px_var(--border)]">
            {/* Filters — each in its own full-width row so nothing overlaps and
                all five rating stars stay fully clickable. */}
            <div className="flex flex-col gap-4 border-b border-border p-3">
              {/* Category */}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {([['all', 'All'], ['food', 'Food'], ['retail', 'Retail'], ['service', 'Services']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCategory(val)}
                      className={cn(
                        'rounded-[4px] border px-2.5 py-1 text-caption font-semibold transition-colors',
                        category === val
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:bg-surface hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account type — business vs user */}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {([['all', 'All'], ['business', 'Businesses'], ['user', 'People']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAccountType(val)}
                      className={cn(
                        'rounded-[4px] border px-2.5 py-1 text-caption font-semibold transition-colors',
                        accountType === val
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:bg-surface hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price slider */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max price</span>
                  <span className="text-caption font-bold text-foreground tabular-nums">
                    {priceMax >= 100 ? 'Any' : `$${priceMax}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-[4px] bg-surface-2 accent-primary"
                  aria-label="Maximum price filter"
                />
              </div>

              {/* Rating stars */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Min rating</span>
                  <button
                    type="button"
                    onClick={() => setMinRating(0)}
                    className="text-caption font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {minRating > 0 ? 'Clear' : 'Any'}
                  </button>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setMinRating(star === minRating ? 0 : star)}
                      aria-label={`At least ${star} stars`}
                      aria-pressed={minRating >= star}
                    >
                      <Star
                        className={cn(
                          'h-5 w-5 transition-colors',
                          minRating >= star ? 'fill-primary text-primary' : 'text-muted-foreground',
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance slider */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Distance</span>
                  <span className="text-caption font-bold text-foreground tabular-nums">
                    {maxDistanceKm >= DISTANCE_MAX_KM ? 'Any' : `${maxDistanceKm} km`}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={DISTANCE_MAX_KM}
                  step={1}
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-[4px] bg-surface-2 accent-primary disabled:opacity-40"
                  aria-label="Maximum distance filter"
                  disabled={!coords}
                />
                {!coords && (
                  <p className="mt-1 text-[10px] text-muted-foreground">Enable location to filter by distance</p>
                )}
              </div>
            </div>

            {/* Live results (empty query lists every business as a directory) */}
            <div className="max-h-80 overflow-y-auto p-1">
              {!query.trim() && (
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Browse all businesses
                </p>
              )}
              {searching && results.length === 0 ? (
                <p className="px-3 py-4 text-center text-caption text-muted-foreground">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-4 text-center text-caption text-muted-foreground">
                  {query.trim() ? `No results match “${query.trim()}”` : 'No businesses found'}
                </p>
              ) : (
                results.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => goToBusiness(b)}
                    className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left transition-colors hover:bg-surface"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                      {b.profile_picture_url ? (
                        <Image
                          src={b.profile_picture_url}
                          alt=""
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Store className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-semibold text-foreground">
                        {b.business_name || b.username}
                      </span>
                      <span className="flex items-center gap-2 text-caption text-muted-foreground">
                        {b.category && <span className="capitalize">{b.category}</span>}
                        {b.average_rating != null && (
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
                            {Number(b.average_rating).toFixed(1)}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Points pill → Rewards (coupons + coin shop) */}
        <Link
          href="/rewards"
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-body-sm font-bold text-foreground transition-colors hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${coins ?? 0} coins — open rewards`}
        >
          <Coins className="h-4 w-4 text-foreground" aria-hidden="true" />
          <span className="tabular-nums text-foreground">{coins ?? '—'}</span>
        </Link>

        {/* Advertise — lucide icon, exact same approach as the working Create button */}
        <button
          type="button"
          className={cn(iconBtn, 'group relative')}
          aria-label="Advertise on Locally"
        >
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          <span
            className="pointer-events-none absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-[4px] border border-border bg-popover px-2 py-1 text-caption text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            role="tooltip"
          >
            Advertise on Locally
          </span>
        </button>

        {/* Create — choose Post or Community */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-body-sm font-semibold text-foreground transition-colors hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Create"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="hidden md:inline">Create</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => router.push('/upload')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Create Post
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/communities/new')}>
              <Store className="mr-2 h-4 w-4" aria-hidden="true" /> Create Community
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications — lucide bell, exact same approach as the working Create button */}
        <button type="button" onClick={togglePanel} className={cn(iconBtn, 'relative')} aria-label="Notifications">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-[4px] bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative ml-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-body-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open profile menu"
          >
            {/* Initials base — always present, so the avatar is never an empty/grey box. */}
            <span aria-hidden="true">{initial}</span>
            {/* Image overlays the initials only when it loads successfully. */}
            {profile?.profile_picture_url && !avatarError && (
              <Image
                src={profile.profile_picture_url}
                alt=""
                width={40}
                height={40}
                className="absolute inset-0 h-full w-full rounded-full object-cover"
                onError={() => setAvatarError(true)}
                unoptimized
              />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>@{profile?.username || 'account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" aria-hidden="true" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/rewards')}>
              <Trophy className="mr-2 h-4 w-4" aria-hidden="true" /> Rewards &amp; Achievements
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
              }}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Display mode
              <span className="ml-auto text-caption text-muted-foreground">
                {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 normal-case text-foreground">
              <Globe className="h-4 w-4" aria-hidden="true" /> Language
            </DropdownMenuLabel>
            {HEADER_LANGS.map((code) => (
              <DropdownMenuItem
                key={code}
                onSelect={(e) => {
                  e.preventDefault();
                  setLanguage(code);
                }}
                className={cn(language === code && 'text-primary')}
              >
                {LANGUAGES[code].nativeName}
                {language === code && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden="true" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/analytics')}>
              <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" /> Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/orders')}>Order history</DropdownMenuItem>
            <DropdownMenuSeparator />
            {user ? (
              <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Log out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => router.push('/login')}>Sign in</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
