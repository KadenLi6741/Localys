'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase/client';
import { EditableProfilePicture } from '@/components/EditableProfilePicture';
import { LanguageSettings } from '@/components/LanguageSettings';
import { SideCards } from '@/components/SideCards';
import {
  uploadProfilePicture,
  updateProfile,
  Profile,
  ProfileUpdateData,
  MAX_PROFILE_PICTURE_SIZE,
  BYTES_TO_MB,
} from '@/lib/supabase/profiles';
import { OrderHistory } from '@/components/OrderHistory';
import { RankSection } from '@/components/RankSection';
import { getUserCoins } from '@/lib/supabase/profiles';
import { getUserBookmarkedVideos } from '@/lib/supabase/videos';
import { getSavedItems, getLikedItemIds, getLikedMenuItems, subscribeEngagement, type LikedMenuItem } from '@/lib/clientEngagement';
import { getUserLikedItems } from '@/lib/supabase/likedItems';
import { isDemoId } from '@/lib/utils/ids';
import { DEMO_VIDEOS, buildFeedVideos } from '@/lib/demoVideos';
import { ChevronRight, Store, DollarSign, MapPin, ShoppingBag, Heart, Trophy, Star, MessageCircle, Award, Play, Crown, ListChecks } from 'lucide-react';

// Demo feed (videos for slug/local content) keyed for quick enrichment of the
// profile Saved/Liked cards — same source the Home "Featured in Videos" cards use.
const DEMO_FEED = buildFeedVideos();
const DEMO_FEED_BY_ID = new Map(DEMO_FEED.map((f) => [f.id, f]));
const DEMO_FEED_BY_SLUG = new Map<string, (typeof DEMO_FEED)[number]>();
DEMO_FEED.forEach((f) => { if (!DEMO_FEED_BY_SLUG.has(f.business_id)) DEMO_FEED_BY_SLUG.set(f.business_id, f); });

// ── Badge system ──────────────────────────────────────────────────────────────
interface BadgeStats {
  purchases: number;
  bizCount: number;
  moneySpent: number;
  reviews: number;
}

const BADGE_DEFS = [
  { id: 'explorer',      Icon: MapPin,        name: 'Local Explorer',    desc: 'Joined Localy',                 check: (_: BadgeStats) => true },
  { id: 'first-order',   Icon: ShoppingBag,   name: 'First Order',       desc: 'Placed your first order',        check: (s: BadgeStats) => s.purchases >= 1 },
  { id: 'regular',       Icon: Store,         name: 'Regular',           desc: 'Supported 3+ businesses',        check: (s: BadgeStats) => s.bizCount >= 3 },
  { id: 'hero',          Icon: Heart,         name: 'Community Hero',    desc: 'Supported 5+ businesses',        check: (s: BadgeStats) => s.bizCount >= 5 },
  { id: 'legend',        Icon: Trophy,        name: 'Local Legend',      desc: 'Supported 10+ businesses',       check: (s: BadgeStats) => s.bizCount >= 10 },
  { id: '100club',       Icon: DollarSign,    name: '$100 Club',         desc: 'Spent $100+ in your community',  check: (s: BadgeStats) => s.moneySpent >= 100 },
  { id: '500club',       Icon: Star,          name: '$500 Club',         desc: 'Spent $500+ in your community',  check: (s: BadgeStats) => s.moneySpent >= 500 },
  { id: 'reviewer',      Icon: MessageCircle, name: 'Reviewer',          desc: 'Left your first review',         check: (s: BadgeStats) => s.reviews >= 1 },
  { id: 'top-reviewer',  Icon: Award,         name: 'Top Reviewer',      desc: 'Left 10+ reviews',               check: (s: BadgeStats) => s.reviews >= 10 },
] as const;

function BadgesSection({ userId }: { userId: string }) {
  const [stats, setStats] = useState<BadgeStats>({ purchases: 0, bizCount: 0, moneySpent: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: purchases }, { count: reviewCount }] = await Promise.all([
        supabase.from('item_purchases').select('seller_id, price').eq('buyer_id', userId),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      if (purchases) {
        const uniqueSellers = new Set(purchases.map((p: any) => p.seller_id));
        setStats({
          purchases: purchases.length,
          bizCount: uniqueSellers.size,
          moneySpent: purchases.reduce((s: number, p: any) => s + (p.price || 0), 0),
          reviews: reviewCount ?? 0,
        });
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2.5">Achievements</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {BADGE_DEFS.map(({ id, Icon, name, desc, check }) => {
          const earned = check(stats);
          return (
            <div
              key={id}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-colors ${
                earned ? 'border-[#f97316]/20 bg-[#f97316]/5' : 'border-gray-100 bg-gray-50 opacity-50'
              }`}
            >
              <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${earned ? 'bg-[#f97316]' : 'bg-gray-200'}`}>
                <Icon className={`h-3.5 w-3.5 ${earned ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold leading-none mb-0 truncate ${earned ? 'text-gray-900' : 'text-gray-400'}`}>{name}</p>
                <p className={`text-[10px] leading-none mb-0 mt-0.5 truncate ${earned ? 'text-gray-500' : 'text-gray-300'}`}>{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

// ── Saved / Liked section with toggle ─────────────────────────────────────────

/** Unified card shape: a video cover frame + business info, like Home featured cards. */
interface MediaCardData {
  id: string;
  videoUrl?: string;   // cover frame source (real video_url or local demo mp4)
  image?: string;      // banner/logo fallback
  title: string;       // business name
  subtitle?: string;   // caption / category
  rating?: number;
  reviews?: number;
}

interface LikedBusiness extends MediaCardData {
  slug: string;
}

type BookmarkedVideo = {
  id: string;
  video_url?: string | null;
  caption?: string | null;
  businesses?: {
    business_name?: string | null;
    profile_picture_url?: string | null;
    average_rating?: number | null;
    total_reviews?: number | null;
  } | null;
};

/** Card matching the Home "Featured in Videos" look: cover frame, name, caption, rating. */
function MediaCard({
  data, ctaLabel, onClick,
}: { data: MediaCardData; ctaLabel: string; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
  const showVideo = !!data.videoUrl && !coverFailed;

  const play = () => { const el = videoRef.current; if (el) { el.currentTime = 0; void el.play().catch(() => {}); } };
  const stop = () => { const el = videoRef.current; if (el) { el.pause(); el.currentTime = 0; } };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={showVideo ? play : undefined}
      onMouseLeave={showVideo ? stop : undefined}
      onFocus={showVideo ? play : undefined}
      onBlur={showVideo ? stop : undefined}
      className="group relative block aspect-[3/4] overflow-hidden rounded-xl border border-gray-200 bg-black text-left transition-transform active:scale-95 hover:border-[#f97316]/40 focus:outline-none focus:ring-2 focus:ring-[#f97316]"
      aria-label={`${ctaLabel}: ${data.title}`}
    >
      {/* Banner/logo as the base layer (also the fallback if no/failed video cover) */}
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-gray-900">
          <Heart className="h-6 w-6 text-[#f97316]" />
        </span>
      )}
      {/* Video cover frame on top (first frame via preload=metadata); hides on error */}
      {showVideo && (
        <video
          ref={videoRef}
          src={data.videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setCoverFailed(true)}
        />
      )}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <span className="pointer-events-none absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#f97316] text-white shadow">
        <Play className="h-3.5 w-3.5 fill-current" />
      </span>
      <span className="pointer-events-none absolute bottom-0 left-0 right-0 p-2 text-white">
        <span className="block truncate text-xs font-semibold">{data.title}</span>
        {data.subtitle ? <span className="block truncate text-[10px] text-white/85">{data.subtitle}</span> : null}
        {(data.rating != null || data.reviews != null) && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-white/90">
            {data.rating != null && (
              <>
                <Star className="h-3 w-3 fill-[#f97316] text-[#f97316]" />
                {data.rating.toFixed(1)}
              </>
            )}
            {data.reviews != null && <span>· {data.reviews} reviews</span>}
          </span>
        )}
        <span className="mt-0.5 block text-[10px] font-medium text-[#f97316]">{ctaLabel}</span>
      </span>
    </button>
  );
}

function SavedLikedSection({ userId }: { userId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'saved' | 'stores' | 'items'>('saved');

  // — Saved (videos) tab state —
  const [savedItems, setSavedItems] = useState<MediaCardData[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);

  // — Liked Stores tab state —
  const [likedBiz, setLikedBiz] = useState<LikedBusiness[]>([]);

  // — Liked Items tab state —
  const [likedItems, setLikedItems] = useState<LikedMenuItem[]>([]);

  // Saved VIDEOS only, and only those with real preview data (demo/local feed).
  // Supabase-only videos with no demo preview are skipped — no blank cards.
  const buildSavedList = (realVideos: BookmarkedVideo[]): MediaCardData[] => {
    const out: MediaCardData[] = [];
    const seen = new Set<string>();
    const pushFromFeed = (id: string) => {
      const feed = DEMO_FEED_BY_ID.get(id);
      if (!feed || seen.has(id)) return;
      seen.add(id);
      out.push({
        id,
        videoUrl: feed.video_url,
        image: feed.businesses.profile_picture_url,
        title: feed.businesses.business_name,
        subtitle: feed.caption,
        rating: feed.businesses.average_rating,
        reviews: feed.businesses.total_reviews,
      });
    };
    // Real bookmarked videos: only if they resolve to demo preview data.
    realVideos.forEach((v) => pushFromFeed(v.id));
    // Client-saved videos (type 'video') that resolve to demo preview data.
    getSavedItems().filter((d) => d.type === 'video').forEach((d) => pushFromFeed(d.id));
    return out;
  };

  // Load saved (bookmarked) videos
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await getUserBookmarkedVideos(userId);
      if (!active) return;
      setSavedItems(buildSavedList(data || []));
      setSavedLoading(false);
    };
    load();
    const unsub = subscribeEngagement(() => {
      getUserBookmarkedVideos(userId).then(({ data }) => {
        if (active) setSavedItems(buildSavedList(data || []));
      });
    });
    return () => { active = false; unsub(); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Liked STORES — client-only, previewable demo stores only (Supabase-only
  // businesses have no demo preview, so they are intentionally hidden).
  useEffect(() => {
    const buildLikedStores = (): LikedBusiness[] => {
      const out: LikedBusiness[] = [];
      const seen = new Set<string>();
      const demoBizSlugs = new Set(DEMO_VIDEOS.map((v) => v.businessSlug));
      // (a) liked business ids that are demo store slugs
      getLikedItemIds().filter((id) => isDemoId(id) && demoBizSlugs.has(id)).forEach((id) => {
        if (seen.has(id)) return;
        seen.add(id);
        const dv = DEMO_VIDEOS.find((v) => v.businessSlug === id);
        const feed = DEMO_FEED_BY_SLUG.get(id);
        if (dv) {
          out.push({
            id, slug: id, title: dv.businessName,
            videoUrl: feed?.video_url, image: feed?.businesses.profile_picture_url,
            subtitle: feed?.caption, rating: feed?.businesses.average_rating, reviews: feed?.businesses.total_reviews,
          });
        }
      });
      // (b) saved businesses (StorePage banner save) with a usable preview
      getSavedItems().filter((s) => s.type === 'business').forEach((s) => {
        if (seen.has(s.id)) return;
        const feed = DEMO_FEED_BY_SLUG.get(s.id);
        if (feed) {
          seen.add(s.id);
          out.push({
            id: s.id, slug: s.id, title: feed.businesses.business_name,
            videoUrl: feed.video_url, image: feed.businesses.profile_picture_url,
            subtitle: feed.caption, rating: feed.businesses.average_rating, reviews: feed.businesses.total_reviews,
          });
        } else if (s.image) {
          seen.add(s.id);
          out.push({ id: s.id, slug: s.href ? slugOf(s.href) : s.id, title: s.name, image: s.image });
        }
      });
      return out;
    };
    let active = true;
    const refresh = () => { if (active) setLikedBiz(buildLikedStores()); };
    const unsub = subscribeEngagement(refresh);
    Promise.resolve().then(refresh); // defer off the synchronous effect tick
    return () => { active = false; unsub(); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Liked ITEMS — real (liked_items table) merged with client demo snapshots.
  useEffect(() => {
    let active = true;
    const load = async () => {
      const real = await getUserLikedItems(userId);
      if (!active) return;
      const byId = new Map<string, LikedMenuItem>();
      real.forEach((r) => byId.set(r.id, r));
      getLikedMenuItems().forEach((c) => byId.set(c.id, c)); // client snapshot wins (latest)
      setLikedItems([...byId.values()]);
    };
    load();
    const unsub = subscribeEngagement(() => { if (active) load(); });
    return () => { active = false; unsub(); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (savedLoading) return null;

  return (
    <section className="mb-6">
      <h3 className="text-base font-semibold text-gray-900 mb-3">My Activity</h3>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 rounded-xl bg-gray-100 p-1">
        {([
          { key: 'saved', label: 'Saved' },
          { key: 'stores', label: 'Liked Stores' },
          { key: 'items', label: 'Liked Items' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        {tab === 'saved' && (
          savedItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing saved yet. Tap the bookmark on a video to save it here.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {savedItems.map((item) => (
                <MediaCard
                  key={item.id}
                  data={item}
                  ctaLabel="Watch video"
                  onClick={() => router.push(`/feed?videoId=${encodeURIComponent(item.id)}`)}
                />
              ))}
            </div>
          )
        )}

        {tab === 'stores' && (
          likedBiz.length === 0 ? (
            <p className="text-sm text-gray-500">
              No liked stores yet. Tap the heart on a business in Discover to add it here.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {likedBiz.map((biz) => (
                <MediaCard
                  key={biz.id}
                  data={biz}
                  ctaLabel="View store"
                  onClick={() => router.push(`/profile/${biz.slug}`)}
                />
              ))}
            </div>
          )
        )}

        {tab === 'items' && (
          likedItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              No liked items yet. Tap the heart on a menu item to add it here.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {likedItems.map((it) => (
                <ItemCard key={it.id} item={it} onClick={() => router.push(it.href || '/feed')} />
              ))}
            </div>
          )
        )}
      </div>
    </section>
  );
}

/** Helper: last path segment of a store href (e.g. "/profile/jays-burger" → "jays-burger"). */
function slugOf(href: string): string {
  const parts = href.split('?')[0].split('/').filter(Boolean);
  return parts[parts.length - 1] || href;
}

/** Compact liked-item card: image (→ store banner → placeholder), name, price, store. */
function ItemCard({ item, onClick }: { item: LikedMenuItem; onClick: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const bannerFallback = DEMO_FEED_BY_SLUG.get(slugOf(item.href || ''))?.businesses.profile_picture_url;
  const src = (!imgFailed && item.image) || bannerFallback;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition active:scale-95 hover:border-[#f97316]/40 focus:outline-none focus:ring-2 focus:ring-[#f97316]"
      aria-label={`View ${item.name}`}
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <span className="grid h-full w-full place-items-center"><Heart className="h-6 w-6 text-[#f97316]" /></span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-semibold text-gray-900">{item.name}</p>
        <p className="text-xs font-bold text-[#f97316]">${item.price.toFixed(2)}</p>
        {item.storeName ? <p className="truncate text-[10px] text-gray-500">{item.storeName}</p> : null}
      </div>
    </button>
  );
}

function ProfileContent() {
  const { user, signOut: contextSignOut } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Settings now lives on its own consolidated page. Honor the legacy
  // `/profile?tab=settings` link (still used by older bookmarks) by redirecting.
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'settings') {
      router.replace('/settings');
    }
  }, [router]);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await contextSignOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="w-full px-4 lg:px-12 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
          <LanguageSettings />
        </div>
      </div>

      {isEditMode ? (
        <ProfileEditForm
          profile={profile}
          user={user}
          onSave={async () => { await loadProfile(); setIsEditMode(false); }}
          onCancel={() => setIsEditMode(false)}
        />
      ) : (
        <>
          {user && <SideCards userId={user.id} />}
          <ProfileView
            profile={profile}
            user={user}
            onEditClick={() => setIsEditMode(true)}
            onSignOut={handleSignOut}
            onProfileUpdated={loadProfile}
          />
        </>
      )}
    </div>
  );
}

interface ProfileViewProps {
  profile: Profile | null;
  user: any;
  onEditClick: () => void;
  onSignOut: () => void;
  onProfileUpdated: () => void;
}

function ProfileView({ profile, user, onEditClick, onSignOut, onProfileUpdated }: ProfileViewProps) {
  const { t } = useTranslation();
  const [bizCount, setBizCount] = useState(0);
  const [moneySpent, setMoneySpent] = useState(0);
  const [points, setPoints] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const [{ data }, { data: coins }] = await Promise.all([
        supabase.from('item_purchases').select('seller_id, price').eq('buyer_id', user.id),
        getUserCoins(user.id),
      ]);
      if (data) {
        const uniqueSellers = new Set(data.map((p: any) => p.seller_id));
        setBizCount(uniqueSellers.size);
        setMoneySpent(data.reduce((s: number, p: any) => s + (p.price || 0), 0));
      }
      if (typeof coins === 'number') setPoints(coins);
      setStatsLoading(false);
    };
    load();
  }, [user?.id]);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="w-full px-4 lg:px-12 py-8 max-w-3xl mx-auto">
      {/* Profile header */}
      <div className="flex items-center gap-5 mb-5">
        <EditableProfilePicture
          userId={user.id}
          currentImageUrl={profile?.profile_picture_url}
          fullName={profile?.full_name}
          username={profile?.username}
          isOwnProfile={true}
          onImageUpdated={onProfileUpdated}
          className="w-24 h-24"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-0.5">
            {profile?.full_name || 'User'}
          </h2>
          <p className="text-gray-500 text-sm mb-1">@{profile?.username || 'username'}</p>
          {profile?.bio && <p className="text-gray-900 text-sm">{profile.bio}</p>}
          {memberSince && <p className="text-gray-400 text-xs mt-1">Member since {memberSince}</p>}
        </div>
      </div>

      {/* Rank / tier */}
      {!statsLoading && (
        <RankSection
          moneySpent={moneySpent}
          points={points}
          bizCount={bizCount}
          userName={profile?.full_name || profile?.username || 'You'}
        />
      )}

      {/* Impact stats */}
      {!statsLoading && (bizCount > 0 || moneySpent > 0) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2.5">Your Local Impact</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
                <Store className="h-3.5 w-3.5 text-[#f97316]" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none mb-0">{bizCount}</p>
                <p className="text-[10px] text-gray-500 leading-none mb-0 mt-0.5">
                  {bizCount === 1 ? 'business' : 'businesses'} supported
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-3.5 w-3.5 text-[#f97316]" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none mb-0">${moneySpent.toFixed(0)}</p>
                <p className="text-[10px] text-gray-500 leading-none mb-0 mt-0.5">kept in community</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      <BadgesSection userId={user.id} />

      {/* Edit Profile */}
      <button
        onClick={onEditClick}
        className="w-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-900 font-medium rounded-xl py-2.5 mb-6 transition-colors"
      >
        {t('profile.edit_profile')}
      </button>

      {/* Saved videos / Liked stores toggle */}
      <SavedLikedSection userId={user.id} />

      {/* Order History */}
      <section className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Order History</h3>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <OrderHistory userId={user.id} isBusiness={false} />
        </div>
      </section>

      {/* Settings */}
      <section className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{t('common.settings')}</h3>
        <div className="space-y-2">
          <Link
            href="/premium"
            className="flex items-center justify-between p-4 bg-white border border-[#f97316]/30 rounded-xl hover:bg-[#f97316]/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Crown className="w-4 h-4 text-[#f97316]" /> Localy Premium
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link
            href="/collections"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm text-gray-900">
              <ListChecks className="w-4 h-4 text-[#f97316]" /> Your Lists
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link
            href="/settings"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-900">Settings</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </section>

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium rounded-xl py-3 transition-colors mb-8"
      >
        {t('profile.sign_out')}
      </button>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 pb-8 text-center">
        <div className="flex items-center justify-center gap-6 mb-2">
          <a href="#" className="text-gray-400 text-xs hover:text-gray-700 transition-colors">Company</a>
          <a href="#" className="text-gray-400 text-xs hover:text-gray-700 transition-colors">Program</a>
          <a href="#" className="text-gray-400 text-xs hover:text-gray-700 transition-colors">Terms &amp; Policies</a>
        </div>
        <p className="text-gray-400 text-xs">2026 Localy</p>
      </div>
    </div>
  );
}

interface ProfileEditFormProps {
  profile: Profile | null;
  user: any;
  onSave: () => void;
  onCancel: () => void;
}

function ProfileEditForm({ profile, user, onSave, onCancel }: ProfileEditFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    profile?.profile_picture_url || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (profilePicturePreview?.startsWith('blob:')) URL.revokeObjectURL(profilePicturePreview);
    };
  }, [profilePicturePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      setError(`Image must be under ${MAX_PROFILE_PICTURE_SIZE / BYTES_TO_MB}MB`);
      return;
    }
    if (profilePicturePreview?.startsWith('blob:')) URL.revokeObjectURL(profilePicturePreview);
    setProfilePicture(file);
    setProfilePicturePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let profilePictureUrl = profile?.profile_picture_url;
      if (profilePicture) {
        const { data, error: uploadError } = await uploadProfilePicture(profilePicture, user.id);
        if (uploadError) throw new Error('Upload failed: ' + uploadError.message);
        if (data?.publicUrl) profilePictureUrl = data.publicUrl;
      }
      const updates: ProfileUpdateData = { full_name: fullName, username, bio };
      if (profilePictureUrl !== profile?.profile_picture_url) updates.profile_picture_url = profilePictureUrl;
      const { error: profileError } = await updateProfile(user.id, updates);
      if (profileError) throw new Error('Update failed: ' + profileError.message);
      setSuccess('Profile updated!');
      setTimeout(onSave, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile picture */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
              {profilePicturePreview ? (
                <img src={profilePicturePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                  {fullName?.[0] || username?.[0] || '?'}
                </div>
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-[#f97316] hover:opacity-90 rounded-full p-2 transition-opacity">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <p className="text-gray-500 text-sm">Tap the icon to change your photo</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors"
            placeholder="Your full name" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors"
            placeholder="username" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] resize-none transition-colors"
            placeholder="Tell people a bit about yourself" rows={3} />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">{error}</div>}
        {success && <div className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 text-sm">{success}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} disabled={loading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-900 rounded-xl py-3 font-medium transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#f97316] hover:opacity-90 text-white rounded-xl py-3 font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving...</>
            ) : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
