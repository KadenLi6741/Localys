'use client';

import { useState, useEffect, useRef } from 'react'; // useRef kept for 3-dot menu
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getOrCreateOneToOneChat } from '@/lib/supabase/messaging';
import { getUserBusiness, getBusinessLocations, getUserMenu, Business, BusinessHours, BusinessLocation } from '@/lib/supabase/profiles';
import { MenuList } from '@/components/MenuList';
import { PostedVideos } from '@/components/PostedVideos';
import { StorePage, type StoreMenu, type StoreItem } from '@/components/store/StorePage';
import storeMenus from '@/data/store-menus.json';
import { getBusinessAlias } from '@/lib/businessAliases';
import { getDemoStoreBySlug } from '@/lib/demoStores';

const BusinessLocationMap = dynamic(
  () => import('@/components/BusinessLocationMap'),
  {
    ssr: false,
    loading: () => <div className="h-[300px] bg-white/5 animate-pulse rounded-t-none" />,
  }
);

interface Profile {
  id: string;
  username: string;
  full_name: string;
  profile_picture_url?: string;
  bio?: string;
  type?: string | null;
}

export default function UserProfilePage() {
  return (
    <ProtectedRoute>
      <UserProfileContent />
    </ProtectedRoute>
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build a StoreMenu from Supabase items for stores without a public/menu folder. */
function buildFallbackMenu(business: Business, items: any[]): StoreMenu {
  const mapped: StoreItem[] = (items || []).map((it, i) => ({
    id: it.id || `${business.owner_id}-${i}`,
    name: it.item_name,
    price: Number(it.price) || 0,
    description: it.description || '',
    image: it.image_url || undefined,
    category: it.category || 'Menu',
    likePct: 85 + (i % 14),
    likeCount: 10 + (i % 40),
  }));
  const categories: string[] = [];
  for (const it of mapped) if (!categories.includes(it.category)) categories.push(it.category);
  return {
    slug: '', banner: business.profile_picture_url || null,
    rating: 4.7, ratingCount: '500+', address: 'Toronto, ON',
    availability: 'Available today', hoursLabel: 'Mon–Sun 9:00 a.m. – 9:00 p.m.', deliveryTime: '20 min',
    reviews: [], categories,
    featuredIds: mapped.slice(0, 8).map((m) => m.id),
    pickedIds: mapped.slice(8, 14).map((m) => m.id),
    items: mapped,
  };
}

type StoreExtras = { phone?: string; businessHours?: Record<string, { open?: string; close?: string; closed?: boolean }> };
const STORE_EXTRAS: Record<string, StoreExtras> = {
  "Amy's Fish & Chips": {
    phone: '1 (416) 281-4532',
    businessHours: {
      monday: { closed: true }, tuesday: { open: '11:00', close: '20:30' },
      wednesday: { open: '11:00', close: '20:30' }, thursday: { open: '11:00', close: '20:30' },
      friday: { open: '11:00', close: '21:00' }, saturday: { open: '11:00', close: '21:00' },
      sunday: { open: '12:00', close: '19:00' },
    },
  },
  'Holy Smoke Barbecue': {
    phone: '1 (905) 476-8810',
    businessHours: {
      monday: { closed: true }, tuesday: { open: '12:00', close: '21:00' },
      wednesday: { open: '12:00', close: '21:00' }, thursday: { open: '12:00', close: '21:00' },
      friday: { open: '12:00', close: '22:00' }, saturday: { open: '11:00', close: '22:00' },
      sunday: { open: '11:00', close: '20:00' },
    },
  },
  'Pho Nga Son': {
    phone: '1 (416) 751-3297',
    businessHours: {
      monday: { open: '10:00', close: '21:00' }, tuesday: { open: '10:00', close: '21:00' },
      wednesday: { open: '10:00', close: '21:00' }, thursday: { open: '10:00', close: '21:00' },
      friday: { open: '10:00', close: '22:00' }, saturday: { open: '10:00', close: '22:00' },
      sunday: { open: '10:30', close: '21:00' },
    },
  },
  'Express Mart Kingston Road': {
    phone: '1 (416) 267-0944',
    businessHours: {
      monday: { open: '07:00', close: '23:00' }, tuesday: { open: '07:00', close: '23:00' },
      wednesday: { open: '07:00', close: '23:00' }, thursday: { open: '07:00', close: '23:00' },
      friday: { open: '07:00', close: '23:00' }, saturday: { open: '08:00', close: '23:00' },
      sunday: { open: '08:00', close: '22:00' },
    },
  },
  'K1 Floral Studio': {
    phone: '1 (647) 723-5501',
    businessHours: {
      monday: { open: '09:00', close: '18:00' }, tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' }, thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '19:00' }, saturday: { open: '09:00', close: '17:00' },
      sunday: { closed: true },
    },
  },
  'Flowers Gifts and Balloons': {
    phone: '1 (905) 883-2167',
    businessHours: {
      monday: { open: '09:30', close: '17:30' }, tuesday: { open: '09:30', close: '17:30' },
      wednesday: { open: '09:30', close: '17:30' }, thursday: { open: '09:30', close: '17:30' },
      friday: { open: '09:30', close: '18:00' }, saturday: { open: '10:00', close: '15:00' },
      sunday: { closed: true },
    },
  },
  'Waterford Convenience': {
    phone: '1 (416) 292-7340',
    businessHours: {
      monday: { open: '06:00', close: '22:00' }, tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' }, thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' }, saturday: { open: '07:00', close: '22:00' },
      sunday: { open: '08:00', close: '21:00' },
    },
  },
  'Razi Pharmacy': {
    phone: '1 (905) 889-4418',
    businessHours: {
      monday: { open: '09:00', close: '18:00' }, tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' }, thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' }, saturday: { open: '10:00', close: '16:00' },
      sunday: { closed: true },
    },
  },
  'Ambrosia Thornhills': {
    phone: '1 (905) 771-2639',
    businessHours: {
      monday: { open: '10:00', close: '20:00' }, tuesday: { open: '10:00', close: '20:00' },
      wednesday: { open: '10:00', close: '20:00' }, thursday: { open: '10:00', close: '20:00' },
      friday: { open: '10:00', close: '21:00' }, saturday: { open: '10:00', close: '20:00' },
      sunday: { open: '11:00', close: '18:00' },
    },
  },
  'Ashario Pets North York': {
    phone: '1 (647) 948-3352',
    businessHours: {
      monday: { open: '10:00', close: '19:00' }, tuesday: { open: '10:00', close: '19:00' },
      wednesday: { open: '10:00', close: '19:00' }, thursday: { open: '10:00', close: '19:00' },
      friday: { open: '10:00', close: '19:00' }, saturday: { open: '09:00', close: '18:00' },
      sunday: { open: '11:00', close: '17:00' },
    },
  },
  'Comfort Air HVAC': {
    phone: '1 (905) 841-6087',
    businessHours: {
      monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' }, saturday: { open: '09:00', close: '13:00' },
      sunday: { closed: true },
    },
  },
  'Reliable Flow Plumbing': {
    phone: '1 (416) 743-9250',
    businessHours: {
      monday: { open: '07:00', close: '18:00' }, tuesday: { open: '07:00', close: '18:00' },
      wednesday: { open: '07:00', close: '18:00' }, thursday: { open: '07:00', close: '18:00' },
      friday: { open: '07:00', close: '18:00' }, saturday: { open: '08:00', close: '15:00' },
      sunday: { closed: true },
    },
  },
  'GreenScape Landscaping': {
    phone: '1 (905) 896-5413',
    businessHours: {
      monday: { open: '07:00', close: '17:00' }, tuesday: { open: '07:00', close: '17:00' },
      wednesday: { open: '07:00', close: '17:00' }, thursday: { open: '07:00', close: '17:00' },
      friday: { open: '07:00', close: '17:00' }, saturday: { open: '08:00', close: '14:00' },
      sunday: { closed: true },
    },
  },
  'Summit Home Renovations': {
    phone: '1 (416) 667-2894',
    businessHours: {
      monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '16:00' }, saturday: { open: '09:00', close: '14:00' },
      sunday: { closed: true },
    },
  },
  'Sharp Fade Barbershop': {
    phone: '1 (647) 352-6710',
    businessHours: {
      monday: { closed: true }, tuesday: { open: '10:00', close: '19:00' },
      wednesday: { open: '10:00', close: '19:00' }, thursday: { open: '10:00', close: '19:00' },
      friday: { open: '10:00', close: '19:00' }, saturday: { open: '09:00', close: '18:00' },
      sunday: { open: '11:00', close: '16:00' },
    },
  },
  'Polished Nail Studio': {
    phone: '1 (905) 770-4882',
    businessHours: {
      monday: { open: '10:00', close: '19:00' }, tuesday: { open: '10:00', close: '19:00' },
      wednesday: { open: '10:00', close: '19:00' }, thursday: { open: '10:00', close: '19:00' },
      friday: { open: '10:00', close: '20:00' }, saturday: { open: '09:00', close: '19:00' },
      sunday: { open: '11:00', close: '17:00' },
    },
  },
  'Serenity Massage Therapy': {
    phone: '1 (416) 504-3176',
    businessHours: {
      monday: { open: '10:00', close: '20:00' }, tuesday: { open: '10:00', close: '20:00' },
      wednesday: { open: '10:00', close: '20:00' }, thursday: { open: '10:00', close: '20:00' },
      friday: { open: '10:00', close: '20:00' }, saturday: { open: '10:00', close: '18:00' },
      sunday: { open: '11:00', close: '17:00' },
    },
  },
  'Peak Personal Training': {
    phone: '1 (647) 498-7224',
    businessHours: {
      monday: { open: '06:00', close: '21:00' }, tuesday: { open: '06:00', close: '21:00' },
      wednesday: { open: '06:00', close: '21:00' }, thursday: { open: '06:00', close: '21:00' },
      friday: { open: '06:00', close: '21:00' }, saturday: { open: '07:00', close: '18:00' },
      sunday: { open: '08:00', close: '17:00' },
    },
  },
  'Sparkle Home Cleaning': {
    phone: '1 (905) 832-5691',
    businessHours: {
      monday: { open: '08:00', close: '18:00' }, tuesday: { open: '08:00', close: '18:00' },
      wednesday: { open: '08:00', close: '18:00' }, thursday: { open: '08:00', close: '18:00' },
      friday: { open: '08:00', close: '18:00' }, saturday: { open: '09:00', close: '16:00' },
      sunday: { closed: true },
    },
  },
  'ClearWash Pressure Washing': {
    phone: '1 (416) 748-2093',
    businessHours: {
      monday: { open: '08:00', close: '18:00' }, tuesday: { open: '08:00', close: '18:00' },
      wednesday: { open: '08:00', close: '18:00' }, thursday: { open: '08:00', close: '18:00' },
      friday: { open: '08:00', close: '18:00' }, saturday: { open: '08:00', close: '16:00' },
      sunday: { closed: true },
    },
  },
  'FreshCoat Painting': {
    phone: '1 (905) 761-3847',
    businessHours: {
      monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' }, saturday: { open: '09:00', close: '14:00' },
      sunday: { closed: true },
    },
  },
};

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

function UserProfileContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const identifier = params.userId as string;
  const isUUID = UUID_REGEX.test(identifier);
  const menuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>([]);
  const [storeMenu, setStoreMenu] = useState<StoreMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingLoading, setMessagingLoading] = useState(false);

  // 3-dot menu state
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'sage' | 'red' | 'amber'>('sage');

  // Average rating state
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (identifier) {
      loadProfile();
    }
  }, [identifier]);

  useEffect(() => {
    if (profile?.type) {
      loadBusiness();
      loadLocations();
    } else {
      setBusiness(null);
      setBusinessLocations([]);
    }
  }, [profile?.type]);

  // Resolve the Uber-Eats store menu for ANY business-type profile. Prefer the
  // folder-driven manifest (by business name, full name, or slug==username), else
  // fall back to the store's Supabase items. Robust to a missing `businesses` row.
  useEffect(() => {
    if (!profile?.type) { setStoreMenu(null); return; }
    const all = storeMenus as Record<string, StoreMenu>;
    // Aliased business (e.g. cp9xssw59 → Pho Xe Lua): use the canonical demo store menu.
    const alias = getBusinessAlias(profile.username, business?.business_name);
    if (alias && all[alias.manifestKey]) {
      const aliasMenu = all[alias.manifestKey];
      const extras = STORE_EXTRAS[alias.name];
      setStoreMenu(extras ? { ...aliasMenu, ...extras } : aliasMenu);
      return;
    }
    const manifest =
      (business?.business_name && all[business.business_name]) ||
      (profile.full_name && all[profile.full_name]) ||
      Object.values(all).find((m) => m.slug === profile.username);
    if (manifest) {
      const storeKey =
        (business?.business_name && all[business.business_name] ? business.business_name : null) ||
        (profile.full_name && all[profile.full_name] ? profile.full_name : null) ||
        Object.keys(all).find((k) => all[k].slug === profile.username) || '';
      const extras = STORE_EXTRAS[storeKey];
      setStoreMenu(extras ? { ...manifest, ...extras } : manifest);
      return;
    }
    let active = true;
    (async () => {
      const { data: menu } = await getUserMenu(profile.id);
      const biz = business || ({ owner_id: profile.id, business_name: profile.full_name } as Business);
      if (active) setStoreMenu(buildFallbackMenu(biz, (menu as any)?.menu_items || []));
    })();
    return () => { active = false; };
  }, [business, profile]);

  useEffect(() => {
    if (profile && user) {
      loadAverageRating();
    }
  }, [profile, user]);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const loadAverageRating = async () => {
    if (!profile) return;
    // Get all videos by this user, then compute avg rating from comments with ratings
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('user_id', profile.id);
    if (!videos || videos.length === 0) return;

    const videoIds = videos.map(v => v.id);
    const { data: ratings } = await supabase
      .from('comments')
      .select('rating')
      .in('video_id', videoIds)
      .not('rating', 'is', null);

    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
      setAvgRating(Math.round((sum / ratings.length) * 10) / 10);
      setTotalReviews(ratings.length);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profile?.username || identifier}`;
    try {
      await navigator.clipboard.writeText(url);
      setToastColor('sage');
      setToastMessage('Profile link copied!');
    } catch {
      setToastColor('red');
      setToastMessage('Failed to copy link');
    }
  };

  const handleReport = async () => {
    if (!user || !profile || !reportReason) return;
    setReportLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: profile.id,
          reason: reportReason,
          description: reportDescription || null,
        });
      if (error) throw error;
      setToastColor('sage');
      setToastMessage('Report submitted. Thank you.');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch {
      setToastColor('red');
      setToastMessage('Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!user || !profile) return;
    const confirmed = window.confirm(`Block @${profile.username}? You won't see their content anymore.`);
    if (!confirmed) return;
    try {
      await supabase
        .from('blocks')
        .insert({ blocker_id: user.id, blocked_id: profile.id });
      setToastColor('amber');
      setToastMessage(`@${profile.username} has been blocked`);
      setTimeout(() => router.push('/feed'), 1200);
    } catch {
      setToastColor('red');
      setToastMessage('Failed to block user');
    }
  };

  const loadLocations = async () => {
    if (!profile) return;
    const { data } = await getBusinessLocations(profile.id);
    setBusinessLocations(data ?? []);
  };

  const loadProfile = async () => {
    try {
      const query = supabase
        .from('profiles')
        .select('id, username, full_name, profile_picture_url, bio, type');

      const { data, error } = isUUID
        ? await query.eq('id', identifier).single()
        : await query.eq('username', identifier).single();

      if (error) throw error;
      setProfile(data);

      // Redirect UUID URLs to username URLs
      if (isUUID && data?.username) {
        router.replace(`/profile/${data.username}`);
        return;
      }
    } catch (error) {
      // Built-in demo store with no Supabase profile (e.g. /profile/jays-burger):
      // synthesize a profile so the manifest store page renders.
      const demo = getDemoStoreBySlug(identifier);
      if (demo) {
        setProfile({ id: demo.slug, username: demo.slug, full_name: demo.manifestKey, type: demo.type });
      } else {
        console.error('Error loading profile:', error);
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBusiness = async () => {
    try {
      if (!profile) return;
      const { data, error } = await getUserBusiness(profile.id);

      console.log('Business fetch result:', { data, error }); // DEBUG

      if (!error && data) {
        // getUserBusiness returns an array; take the first entry
        const biz = Array.isArray(data) ? data[0] : data;
        if (biz) {
          // Parse business_hours if it's a string
          if (biz.business_hours && typeof biz.business_hours === 'string') {
            biz.business_hours = JSON.parse(biz.business_hours);
          }
          console.log('Business after parsing:', biz); // DEBUG
          setBusiness(biz);
        } else {
          setBusiness(null);
        }
      } else {
        setBusiness(null);
      }
    } catch (error) {
      console.error('Business load error:', error); // DEBUG
      // Business doesn't exist, which is fine
      setBusiness(null);
    }
  };

  const handleMessageClick = async () => {
    if (!user || !profile) return;
    
    setMessagingLoading(true);
    try {
      console.log('Starting chat with user:', profile.id);
      const { data, error } = await getOrCreateOneToOneChat(user.id, profile.id);
      
      if (error) {
        console.error('Chat creation error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert(`Failed to start conversation: ${errorMsg}`);
        return;
      }
      
      if (data && data.id) {
        console.log('Chat created/found successfully:', data.id);
        router.push(`/chats/${data.id}`);
      } else {
        console.error('No chat data returned:', data);
        alert('Failed to create or get chat');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setMessagingLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile && profile.id === user.id) {
      router.push('/profile');
    }
  }, [user, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-4">Profile Not Found</h2>
          <p className="text-gray-500 mb-6">{error || 'This profile does not exist.'}</p>
          <Link
            href="/feed"
            className="bg-[#f97316] text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Business profiles render the Uber-Eats-style store page (white, no follow),
  // regardless of whether the `businesses` row loaded — keyed off profile.type.
  if (profile.type) {
    if (!storeMenu) return <div className="min-h-screen bg-white" />;
    const storeAlias = getBusinessAlias(profile.username, business?.business_name);
    return <StorePage storeName={storeAlias?.name || business?.business_name || profile.full_name} sellerId={profile.id} menu={storeMenu} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg transition-all duration-300 ${
          toastColor === 'sage' ? 'bg-[#f97316] text-white' :
          toastColor === 'red' ? 'bg-[#E05C3A] text-white' :
          'bg-[#f97316] text-black'
        }`}>
          {toastMessage}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Report @{profile.username}</h3>
            <div className="space-y-3">
              {REPORT_REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${reportReason === r.value ? 'bg-[#f97316]/20 border border-[#f97316]/40' : 'bg-background border border-border hover:border-[#f97316]/30'}`}>
                  <input type="radio" name="reason" value={r.value} checked={reportReason === r.value} onChange={() => setReportReason(r.value)} className="accent-[#f97316]" />
                  <span className="text-sm text-foreground">{r.label}</span>
                </label>
              ))}
              <textarea
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                placeholder="Additional details (optional)"
                rows={3}
                maxLength={500}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#f97316]/50 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowReportModal(false)} className="flex-1 bg-muted text-foreground rounded-lg py-2.5 text-sm hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={handleReport} disabled={!reportReason || reportLoading} className="flex-1 bg-[#E05C3A] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#E05C3A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {reportLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-card rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">{profile.username || 'Profile'}</h1>
          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-card rounded-full transition-colors"
              aria-label="More options"
            >
              <svg className="w-6 h-6 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[180px] z-20">
                <button
                  onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                  className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-[#f97316]/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-[#E05C3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Report User
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleBlock(); }}
                  className="w-full text-left px-4 py-3 text-sm text-[#E05C3A] hover:bg-[#E05C3A]/10 transition-colors flex items-center gap-3 border-t border-border"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Block User
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="p-6 pb-32">
        <div className="flex flex-col items-center mb-6">
          <img
            src={profile.profile_picture_url || 'https://via.placeholder.com/120'}
            alt={profile.full_name}
            className="w-32 h-32 rounded-full ring-2 ring-[#f97316]/40 object-cover mb-4"
          />
          <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
          <p className="text-foreground/60 mb-1">@{profile.username}</p>

          {profile.bio && (
            <p className="text-foreground/80 text-center max-w-md mb-2">{profile.bio}</p>
          )}
          
          {/* Average Rating */}
          {avgRating !== null && (
            <p className="text-foreground text-sm mb-4">
              {avgRating} <span className="text-muted-foreground">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</span>
            </p>
          )}

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3 mt-2">
            {/* Message Button */}
            <button
              onClick={handleMessageClick}
              disabled={messagingLoading}
              className="bg-[#f97316] text-black font-semibold px-5 py-2 rounded-lg hover:bg-[#f97316]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {messagingLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </>
              )}
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="border-2 border-border text-foreground p-2 rounded-lg hover:bg-card transition-colors"
              aria-label="Share profile"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Business Location Map */}
        {businessLocations.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Location{businessLocations.length > 1 ? 's' : ''}
            </h3>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <BusinessLocationMap
                locations={businessLocations}
                businessName={profile.full_name}
              />
            </div>
          </div>
        )}

        {/* Menu / Services Section (business only) */}
        {profile.type && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {profile.type === 'service' ? 'Services' : 'Menu'}
            </h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <MenuList userId={profile.id} isOwnProfile={false} />
            </div>
          </div>
        )}

        {/* Videos Section */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Videos</h3>
          <div className="bg-card border border-border rounded-lg p-6">
            <PostedVideos userId={profile.id} isOwnProfile={false} />
          </div>
        </div>
      </div>

      {/* Bottom Navigation Hotbar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/50 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around py-3">
          <Link href="/feed" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/' ? 'text-foreground' : 'text-foreground/60'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className={`text-xs ${pathname === '/' ? 'text-foreground' : 'text-foreground/60'}`}>Home</span>
          </Link>
          <Link href="/feed" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/feed' ? 'text-foreground' : 'text-foreground/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className={`text-xs ${pathname === '/feed' ? 'text-foreground' : 'text-foreground/60'}`}>Discover</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${pathname === '/upload' ? 'bg-[#f97316]' : 'bg-[#f97316]/20'}`}>
              <svg className={`w-6 h-6 ${pathname === '/upload' ? 'text-black' : 'text-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
          <Link href="/chats" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/chats' ? 'text-foreground' : 'text-foreground/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className={`text-xs ${pathname === '/chats' ? 'text-foreground' : 'text-foreground/60'}`}>Chats</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname?.startsWith('/profile') ? 'text-foreground' : 'text-foreground/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={`text-xs ${pathname?.startsWith('/profile') ? 'text-foreground' : 'text-foreground/60'}`}>Profile</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
