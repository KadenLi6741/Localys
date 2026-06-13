'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Search,
  Bell,
  Coins,
  Plus,
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import { getUserCoins } from '@/lib/supabase/profiles';
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

/* Search filter options (backbone — selections feed the /search navigation). */
const FILTER_CATEGORIES = ['All', 'Food', 'Retail', 'Service'];
const FILTER_DISTANCES = ['Nearby', '5 km', '10 km', '25 km', 'Any'];
const FILTER_PRICES = ['$', '$$', '$$$', 'Any'];
const FILTER_RATINGS = ['Any', '3+', '4+', '4.5+'];
const FILTER_SORTS = ['Relevance', 'Rating', 'Distance', 'Newest'];

/** One row of pill-chips inside the expanding search filter panel. */
function FilterChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'rounded-[4px] border px-2.5 py-1 text-caption font-semibold transition-colors',
              value === opt
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:bg-surface hover:text-foreground'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [coins, setCoins] = useState<number | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);

  // Expanding search state
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [fCategory, setFCategory] = useState('All');
  const [fDistance, setFDistance] = useState('Any');
  const [fPrice, setFPrice] = useState('Any');
  const [fRating, setFRating] = useState('Any');
  const [fSort, setFSort] = useState('Relevance');

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
        if (!cancelled) setProfile(data as HeaderProfile | null);
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

  if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') return null;

  const initial = (profile?.full_name || profile?.username || user?.email || 'U')
    .charAt(0)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const submitSearch = () => {
    setSearchOpen(false);
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  };

  // Reddit-style circular hover highlight for icon-only actions.
  const iconBtn =
    'inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
            'flex h-10 items-center gap-2 rounded-[4px] border bg-surface px-3 transition-colors',
            searchOpen ? 'border-primary' : 'border-border hover:border-primary/50'
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
            className="h-full w-full min-w-0 bg-transparent text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Find anything"
          />
        </div>

        {/* Filter panel — appears on focus, collapses on blur/click-away */}
        {searchOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-[4px] border border-border bg-popover p-4 shadow-[inset_0_0_0_1px_var(--border)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FilterChipRow label="Category" options={FILTER_CATEGORIES} value={fCategory} onChange={setFCategory} />
              <FilterChipRow label="Distance" options={FILTER_DISTANCES} value={fDistance} onChange={setFDistance} />
              <FilterChipRow label="Price" options={FILTER_PRICES} value={fPrice} onChange={setFPrice} />
              <FilterChipRow label="Rating" options={FILTER_RATINGS} value={fRating} onChange={setFRating} />
              <div className="sm:col-span-2">
                <FilterChipRow label="Sort by" options={FILTER_SORTS} value={fSort} onChange={setFSort} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-[4px] border border-border px-4 py-1.5 text-body-sm font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSearch}
                className="rounded-[4px] bg-primary px-4 py-1.5 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Points pill → Challenges & Rewards */}
        <Link
          href="/challenges"
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-body-sm font-bold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${coins ?? 0} points — open challenges and rewards`}
        >
          <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="tabular-nums">{coins ?? '—'}</span>
        </Link>

        {/* Advertise */}
        <button
          type="button"
          className={cn(iconBtn, 'group relative hidden sm:inline-flex')}
          aria-label="Advertise on Locally"
        >
          <Megaphone className="h-5 w-5" />
          <span
            className="pointer-events-none absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-[4px] border border-border bg-popover px-2 py-1 text-caption text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            role="tooltip"
          >
            Advertise on Locally
          </span>
        </button>

        {/* Create */}
        <Link
          href="/upload"
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-body-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Create a post"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span className="hidden md:inline">Create</span>
        </Link>

        {/* Notifications */}
        <button type="button" onClick={togglePanel} className={cn(iconBtn, 'relative')} aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-[4px] bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-0.5 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-body-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open profile menu"
          >
            {profile?.profile_picture_url ? (
              <Image
                src={profile.profile_picture_url}
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span aria-hidden="true">{initial}</span>
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
            <DropdownMenuItem onSelect={() => router.push('/challenges')}>
              <Trophy className="mr-2 h-4 w-4" aria-hidden="true" /> Achievements
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
            <DropdownMenuItem>
              <Globe className="mr-2 h-4 w-4" aria-hidden="true" /> Language
              <span className="ml-auto text-caption text-muted-foreground">English</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/analytics')}>
              <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" /> Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/profile#orders')}>Order history</DropdownMenuItem>
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
