'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, Check, Plus, X } from 'lucide-react';
import { BusinessItemsRail } from '@/components/feed/BusinessItemsRail';
import { getBusinessAlias, getPhoXeLuaItems, type AliasItem } from '@/lib/businessAliases';
import { buildFeedVideos } from '@/lib/demoVideos';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliveryLocation } from '@/contexts/DeliveryLocationContext';
import { getVideosFeed, getLikeCounts, likeItem, unlikeItem, bookmarkVideo, unbookmarkVideo, getWeightedVideoFeed, trackVideoView } from '@/lib/supabase/videos';
import { getUserCoins } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { GoogleMap } from '@/components/GoogleMap';
const CommentModal = dynamic(() => import('@/components/CommentModal').then(mod => mod.CommentModal), { ssr: false });
const CommentSection = dynamic(() => import('@/components/comments/CommentSection'), { ssr: false });
import { Toast } from '@/components/Toast';
import { sharePost } from '@/lib/utils/share';
import { haversineDistance } from '@/lib/utils/geo';
import { formatDistanceKm, etaMinutes } from '@/lib/utils/distance';
import { computeAveragePrice, computeRoundedPriceRange } from '@/lib/utils/pricing';
import { isDemoId } from '@/lib/utils/ids';
import {
  toggleItemLike,
  toggleItemBookmark,
  getLikedItemIds,
  getSavedItems,
} from '@/lib/clientEngagement';

/**
 * Creator whose videos are hidden from the Discover "For You" feed (lowercase
 * username). Their videos still exist in the DB and still show in Business
 * Manager → Videos — this only removes them from the feed render.
 */
const HIDDEN_FROM_DISCOVER_USERNAME = 'likaden726';

/** Compact count display: 11100 → "11.1K", 2_300_000 → "2.3M". */
function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const m = n / 1_000_000;
  return `${m >= 100 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`;
}

/** Deterministic hash of a string → unsigned 32-bit int (stable across reloads). */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable, plausible save/share counts derived from a video id (no backend). */
function stableCount(id: string, salt: string, min: number, max: number): number {
  const h = hashString(`${id}:${salt}`);
  return min + (h % (max - min + 1));
}

/** Like count derived from comment count so the ratio is always ~10–15× comments. */
function stableLikeCount(id: string): number {
  const comments = stableCount(id, 'cmt', 12, 520);
  const multiplier = 10 + (hashString(id + ':lmul') % 6);
  return comments * multiplier;
}

interface Video {
  id: string;
  user_id?: string;
  business_id?: string;
  video_url: string;
  caption?: string;
  created_at: string;
  profiles?: {
    id?: string;
    username: string;
    full_name: string;
    profile_picture_url?: string;
  };
  businesses?: {
    id: string;
    owner_id?: string;
    user_id?: string;
    business_name: string;
    category: string;
    profile_picture_url?: string;
    average_rating?: number;
    total_reviews?: number;
    latitude?: number;
    longitude?: number;
  };
  like_count?: number;
}

interface HeaderProfile {
  full_name: string | null;
  username: string | null;
  profile_picture_url: string | null;
}

interface HomeContentProps {
  isActive: boolean;
}



export function HomeContent({ isActive }: HomeContentProps) {
  const { user } = useAuth();
  const { location: deliveryLocation } = useDeliveryLocation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likeAnimating, setLikeAnimating] = useState<string | null>(null);
  const [bookmarkAnimating, setBookmarkAnimating] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  // Inline reviews/comments side panel — CLOSED by default; opens only on tap.
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string>('');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [userCoins, setUserCoins] = useState(100);
  const [showCoinBadge, setShowCoinBadge] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationsByProfile, setLocationsByProfile] = useState<Record<string, { latitude: number; longitude: number }[]>>({});
  const [priceRanges, setPriceRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [volume, setVolume] = useState(0.5); // Default 50% volume
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const [headerProfile, setHeaderProfile] = useState<HeaderProfile | null>(null);
  const prevVolumeRef = useRef(0.5);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Admin mode state (Ctrl+Shift+D) — persisted in localStorage
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('adminMode') === 'true';
    return false;
  });
  const [adminLikeBoosts, setAdminLikeBoosts] = useState<{ [key: string]: number }>({});
  const realLikeCountsRef = useRef<{ [key: string]: number }>({});

  // Follow state for the right-rail avatar's Follow button
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followAnimating, setFollowAnimating] = useState<string | null>(null);

  // A video opened directly by id (e.g. from Business Manager → Videos). It must
  // ALWAYS stay playable in Discover even if its author is excluded from the For You
  // feed, so we keep it here and re-inject it whenever the feed reloads (the feed
  // exclusion is applied only to the listing, never to this single-video request).
  const pinnedVideoRef = useRef<Video | null>(null);

  useEffect(() => {
    loadVideos();
    if (user) {
      loadUserInteractions();
      loadUserCoins();
    }
  }, [user?.id]); // key off the stable id so the feed doesn't reload on every auth re-render

  // Real-time subscription for comment counts
  useEffect(() => {
    const channel = supabase
      .channel('home-comment-counts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: 'parent_comment_id=eq.null' },
        (payload) => {
          const videoId = (payload.new as { video_id?: string }).video_id;
          if (videoId) {
            setCommentCounts(prev => ({
              ...prev,
              [videoId]: (prev[videoId] || 0) + 1
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        (payload) => {
          const videoId = (payload.old as { video_id?: string }).video_id;
          const parentId = (payload.old as { parent_comment_id?: string | null }).parent_comment_id;
          if (videoId && !parentId) {
            setCommentCounts(prev => ({
              ...prev,
              [videoId]: Math.max((prev[videoId] || 1) - 1, 0)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Admin Mode keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setAdminMode(prev => {
          if (prev) {
            // Turning OFF — revert to real counts
            localStorage.removeItem('adminMode');
            setAdminLikeBoosts({});
            setLikeCounts({ ...realLikeCountsRef.current });
          } else {
            // Turning ON — snapshot real counts
            localStorage.setItem('adminMode', 'true');
            realLikeCountsRef.current = { ...likeCounts };
          }
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [likeCounts]);

  // On mount, if admin mode was persisted, snapshot current like counts
  useEffect(() => {
    if (adminMode && Object.keys(likeCounts).length > 0) {
      realLikeCountsRef.current = { ...likeCounts };
    }
  }, [adminMode, Object.keys(likeCounts).length]);

  // Load follow states for all video owners
  useEffect(() => {
    if (!user || videos.length === 0) return;
    const loadFollowStates = async () => {
      const userIds = [...new Set(videos.map(v => v.user_id).filter(Boolean))] as string[];
      if (userIds.length === 0) return;
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds);
      if (data) {
        setFollowedUsers(new Set(data.map(f => f.following_id)));
      }
    };
    loadFollowStates();
  }, [user, videos]);


  // Handle videoId query param (e.g. from profile video click)
  useEffect(() => {
    const targetVideoId = searchParams.get('videoId');
    if (!targetVideoId || videos.length === 0) return;

    const idx = videos.findIndex(v => v.id === targetVideoId);
    if (idx >= 0) {
      // Jump to the exact clicked video and start it playing (the [currentIndex,
      // isActive] effect below plays it; setIsPlaying keeps state in sync).
      setCurrentIndex(idx);
      setIsPlaying(true);
      // Clean up the URL param
      router.replace('/feed', { scroll: false });
    } else if (targetVideoId.startsWith('local:')) {
      // Built-in local video — always already in the feed; nothing to fetch.
      router.replace('/feed', { scroll: false });
    } else {
      // Video not in the (possibly filtered) feed — fetch it directly and prepend so
      // it plays. This is how a creator's video that's HIDDEN from the For You feed
      // (e.g. @likaden726) still opens in Discover when clicked from Business Manager →
      // Videos. The direct fetch ignores the feed filter on purpose.
      (async () => {
        try {
          const { data } = await supabase
            .from('videos')
            .select('*, profiles:user_id(id, username, full_name, profile_picture_url), businesses:business_id(id, owner_id, user_id, business_name, category, profile_picture_url, average_rating, total_reviews, latitude, longitude)')
            .eq('id', targetVideoId)
            .single();

          if (data) {
            // Pin it so a later feed reload re-injects it instead of filtering it out.
            pinnedVideoRef.current = data as Video;
            setVideos(prev => (prev.some(v => v.id === targetVideoId) ? prev : [data as Video, ...prev]));
            setCurrentIndex(0);
            setIsPlaying(true);
          }
        } catch (err) {
          console.error('Error fetching video by ID:', err);
        }
        router.replace('/feed', { scroll: false });
      })();
    }
  }, [searchParams, videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // The user's confirmed delivery location (set in the top-left picker) takes
  // priority for distance across the app; fall back to raw geolocation otherwise.
  useEffect(() => {
    if (deliveryLocation) {
      setUserLocation({ lat: deliveryLocation.lat, lng: deliveryLocation.lng });
      return;
    }
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [deliveryLocation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadUserCoins();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Pause video when navigating away, resume when coming back
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!isActive) {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.muted = true;
          video.pause();
        }
      });
      setCommentModalOpen(false);
      setReviewsOpen(false);
      return;
    }

    if (!currentVideo) return;

    currentVideo.muted = false;
    if (isPlaying) {
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          const mediaError = error as { name?: string };
          if (mediaError.name !== 'AbortError' && mediaError.name !== 'NotAllowedError') {
            console.error('Video resume error:', error);
          }
        });
      }
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVideos = async () => {
    // Built-in local videos (public/Videos linked to businesses) shown first, ALWAYS
    // present so every "Featured in Videos" card is watchable in Discover — even if the
    // Supabase feed is empty or errors. Local ids are `local:`-prefixed and excluded
    // from all Supabase id-based lookups below.
    const localVideos = buildFeedVideos() as unknown as Video[];
    try {
      const { data, error } = await getWeightedVideoFeed(20, 0);
      if (error) throw error;
      {
        const realDataRaw = (Array.isArray(data) ? data : []) as Video[];
        // Hide a specific creator's videos from the Discover "For You" feed ONLY.
        // The videos are NOT deleted/unpublished — they still exist in the DB and
        // still appear in Business Manager → Videos for that account. This is purely
        // a render-time filter on the feed, keyed by the author's username.
        const realData = realDataRaw.filter(
          (v) => (v.profiles?.username || '').toLowerCase() !== HIDDEN_FROM_DISCOVER_USERNAME,
        );
        // Re-inject a directly-opened (pinned) video so a feed reload never drops it,
        // even when its author is excluded from the listing above.
        const base = [...localVideos, ...realData];
        const pinned = pinnedVideoRef.current;
        const videosData = pinned && !base.some((v) => v.id === pinned.id) ? [pinned, ...base] : base;
        setVideos(videosData);

        const counts: { [key: string]: number } = {};
        const commentCounts: { [key: string]: number } = {};

        const videoIds = realData
          .map(v => v.id)
          .filter((id): id is string => !!id && typeof id === 'string');

        const posterProfileIds = Array.from(
          new Set(
            realData
              .map((video) => video.user_id)
              .filter((id): id is string => Boolean(id && typeof id === 'string'))
          )
        );

        console.log('Video IDs for rating fetch:', videoIds);

        const feedBusinessIds = Array.from(
          new Set(
            realData
              .map((video) => video.business_id)
              .filter((id): id is string => Boolean(id && typeof id === 'string'))
          )
        );

        const allFilterIds = [...videoIds, ...feedBusinessIds];
        const { data: allLikes } = allFilterIds.length > 0
          ? await supabase
              .from('likes')
              .select('business_id, video_id')
              .or(`video_id.in.(${videoIds.join(',')}),business_id.in.(${feedBusinessIds.join(',')})`)
          : { data: [] };

        if (posterProfileIds.length > 0) {
          const { data: businessLocations } = await supabase
            .from('business_locations')
            .select('profile_id, latitude, longitude')
            .in('profile_id', posterProfileIds);

          const nextLocationsByProfile: Record<string, { latitude: number; longitude: number }[]> = {};
          posterProfileIds.forEach((profileId) => {
            nextLocationsByProfile[profileId] = [];
          });

          (businessLocations || []).forEach((row: { profile_id: string; latitude: number | string; longitude: number | string }) => {
            if (!row.profile_id) return;
            const latitude = typeof row.latitude === 'number' ? row.latitude : Number(row.latitude);
            const longitude = typeof row.longitude === 'number' ? row.longitude : Number(row.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            if (!nextLocationsByProfile[row.profile_id]) {
              nextLocationsByProfile[row.profile_id] = [];
            }
            nextLocationsByProfile[row.profile_id].push({ latitude, longitude });
          });

          setLocationsByProfile(nextLocationsByProfile);
        } else {
          setLocationsByProfile({});
        }

        if (allLikes) {
          allLikes.forEach((like: { business_id: string | null; video_id: string | null }) => {
            if (like.business_id) {
              counts[like.business_id] = (counts[like.business_id] || 0) + 1;
            }
            if (like.video_id) {
              counts[like.video_id] = (counts[like.video_id] || 0) + 1;
            }
          });
        }

        // Fetch comment counts in a single batch query
        if (videoIds.length > 0) {
          try {
            const { data: commentsData } = await supabase
              .from('comments')
              .select('video_id')
              .in('video_id', videoIds)
              .is('parent_comment_id', null);

            if (commentsData) {
              commentsData.forEach((c: { video_id: string }) => {
                if (c.video_id) {
                  commentCounts[c.video_id] = (commentCounts[c.video_id] || 0) + 1;
                }
              });
            }
          } catch (err) {
            console.error('Error fetching comment counts:', err);
          }
        }


        const businesses = realData
          .map((video) => video.businesses)
          .filter((business): business is NonNullable<Video['businesses']> => Boolean(business && business.id));

        const businessIds = Array.from(new Set(businesses.map((business) => business.id)));
        const businessToOwnerMap: Record<string, string> = {};

        businesses.forEach((business) => {
          const ownerId = business.owner_id || business.user_id;
          if (ownerId) {
            businessToOwnerMap[business.id] = ownerId;
          }
        });

        const ownerIds = Array.from(new Set(Object.values(businessToOwnerMap)));

        if (businessIds.length > 0 && ownerIds.length > 0) {
          const { data: menuItems } = await supabase
            .from('menu_items')
            .select('user_id, price')
            .in('user_id', ownerIds);

          const pricesByBusiness: Record<string, number[]> = {};

          businessIds.forEach((businessId) => {
            pricesByBusiness[businessId] = [];
          });

          const ownerToBusinessIds: Record<string, string[]> = {};
          Object.entries(businessToOwnerMap).forEach(([businessId, ownerId]) => {
            if (!ownerToBusinessIds[ownerId]) {
              ownerToBusinessIds[ownerId] = [];
            }
            ownerToBusinessIds[ownerId].push(businessId);
          });

          (menuItems || []).forEach((item: { user_id: string; price: number | string }) => {
            if (!item.user_id) return;
            const price = typeof item.price === 'number' ? item.price : Number(item.price);
            if (!Number.isFinite(price) || price <= 0) return;
            const linkedBusinessIds = ownerToBusinessIds[item.user_id] || [];
            linkedBusinessIds.forEach((businessId) => {
              pricesByBusiness[businessId].push(price);
            });
          });

          const ranges: Record<string, { min: number; max: number }> = {};
          Object.keys(pricesByBusiness).forEach((businessId) => {
            const computedRange = computeRoundedPriceRange(pricesByBusiness[businessId]);
            if (computedRange) {
              ranges[businessId] = computedRange;
            }
          });

          setPriceRanges(ranges);
        } else {
          setPriceRanges({});
        }

        [...businessIds, ...videoIds].forEach(id => {
          if (!(id in counts)) {
            counts[id] = 0;
          }
          if (!(id in commentCounts)) {
            commentCounts[id] = 0;
          }
        });

        setLikeCounts(counts);
        setCommentCounts(commentCounts);
        if (process.env.NODE_ENV === 'development') {
          console.log('Loaded like counts:', counts);
          console.log('Loaded rating counts:', commentCounts);
        }
      }
    } catch (error) {
      console.error(`Error loading videos: ${error instanceof Error ? error.message : String(error)}`);
      // Supabase failed — still show the built-in local videos so Discover isn't empty.
      setVideos((prev) => (prev.length === 0 ? localVideos : prev));
    } finally {
      setLoading(false);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;

    try {
      const { data: likes } = await supabase
        .from('likes')
        .select('business_id, video_id')
        .eq('user_id', user.id);

      const likedSet = new Set<string>();

      if (likes) {
        likes.forEach((l: { business_id: string | null; video_id: string | null }) => {
          if (l.business_id) likedSet.add(l.business_id);
          if (l.video_id) likedSet.add(l.video_id);
        });
      }

      // Merge in client-side demo likes (slug/local content has no DB rows).
      getLikedItemIds().forEach(id => likedSet.add(id));
      setLikedVideos(likedSet);

      const { data: bookmarks } = await supabase
        .from('video_bookmarks')
        .select('video_id')
        .eq('user_id', user.id);

      const bookmarkSet = new Set<string>(
        (bookmarks || []).map((b: { video_id: string | null }) => b.video_id).filter(Boolean) as string[]
      );
      // Merge in client-side demo bookmarks.
      getSavedItems().forEach(item => bookmarkSet.add(item.id));
      setBookmarkedVideos(bookmarkSet);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const loadUserCoins = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coin_balance, type, full_name, username, profile_picture_url')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setHeaderProfile({
          full_name: data.full_name || null,
          username: data.username || null,
          profile_picture_url: data.profile_picture_url || null,
        });
        const hasProfileType = data.type !== null;
        setShowCoinBadge(hasProfileType);
        if (hasProfileType) {
          setUserCoins(typeof data.coin_balance === 'number' ? data.coin_balance : 100);
        }
      } else {
        setShowCoinBadge(false);
        console.error('Error loading coins:', error);
      }
    } catch (error) {
      setShowCoinBadge(false);
      console.error('Exception loading coins:', error);
    }
  };

  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.volume = volume;
    }
  }, [volume, currentIndex]);

  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, currentIndex]);

  // Set volume on video when it's loaded
  useEffect(() => {
    if (!isActive) return;

    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.muted = false;
      currentVideo.volume = volume;
      currentVideo.playbackRate = playbackSpeed;
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          const mediaError = error as { name?: string };
          if (mediaError.name !== 'AbortError' && mediaError.name !== 'NotAllowedError') {
            console.error('Video play error:', error);
          }
        });
      }
      setIsPlaying(true);
    }

    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.muted = true;
        video.pause();
      }
    });
  }, [currentIndex, videos, volume, playbackSpeed, isActive]);

  const togglePlayPause = async () => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    if (currentVideo.paused) {
      try {
        await currentVideo.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      currentVideo.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 0.5);
    }
  }, [volume]);

  useEffect(() => {
    if (!isActive) return;
    if (videos.length > 0 && currentIndex >= 0 && currentIndex < videos.length) {
      const currentVideo = videos[currentIndex];
      if (currentVideo && currentVideo.id) {
        trackVideoView(currentVideo.id, user?.id).catch((error: unknown) => {
          console.warn('Failed to track video view:', error);
        });
      }
    }
  }, [currentIndex, videos, user?.id, isActive]);

  const goToNext = () => {
    if (videos.length === 0) return;
    setCurrentIndex((i) => (i < videos.length - 1 ? i + 1 : 0));
  };

  const goToPrev = () => {
    if (videos.length === 0) return;
    setCurrentIndex((i) => (i > 0 ? i - 1 : videos.length - 1));
  };

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling || videos.length === 0) return;

    setIsScrolling(true);
    const delta = e.deltaY;

    if (delta > 0) {
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
    } else if (delta < 0) {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        setCurrentIndex(videos.length - 1);
      }
    }

    setTimeout(() => setIsScrolling(false), 500);
  };

  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || videos.length === 0) return;

    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    const isDownSwipe = distance < -50;

    if (isUpSwipe) {
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
    } else if (isDownSwipe) {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        setCurrentIndex(videos.length - 1);
      }
    }
  };

  const toggleLike = async (videoId: string, businessId?: string, event?: React.MouseEvent) => {
    if (!user) {
      setToastMessage('Please sign in to like posts');
      return;
    }

    setLikeAnimating(videoId);
    // Like state is keyed by the unique VIDEO id (not business) so liking one video
    // never marks other videos from the same business as liked.
    const likeKey = videoId;
    const itemType = 'video' as const;
    const isLiked = likedVideos.has(likeKey);

    // Admin Mode: every click adds +1 display-only
    if (adminMode) {
      setAdminLikeBoosts(prev => ({ ...prev, [likeKey]: (prev[likeKey] || 0) + 1 }));
      setLikeCounts(prev => ({ ...prev, [likeKey]: (prev[likeKey] || 0) + 1 }));
      setTimeout(() => setLikeAnimating(null), 300);
      return;
    }

    // Demo/slug content (e.g. "jays-burger") has no Supabase row — persist the
    // like client-side instead of sending an invalid uuid to Postgres.
    const demo = isDemoId(likeKey);

    try {
      if (isLiked) {
        if (demo) {
          toggleItemLike(likeKey);
        } else {
          const { error } = await unlikeItem(user.id, likeKey, itemType as 'video' | 'business');
          if (error) throw error;
        }

        setLikedVideos(prev => {
          const next = new Set(prev);
          next.delete(likeKey);
          return next;
        });

        setLikeCounts(prev => ({
          ...prev,
          [likeKey]: Math.max(0, (prev[likeKey] ?? stableLikeCount(videoId)) - 1)
        }));
      } else {
        if (demo) {
          toggleItemLike(likeKey);
        } else {
          const { error } = await likeItem(user.id, likeKey, itemType as 'video' | 'business');
          if (error) throw error;
        }

        setLikedVideos(prev => new Set(prev).add(likeKey));

        setLikeCounts(prev => ({
          ...prev,
          [likeKey]: (prev[likeKey] ?? stableLikeCount(videoId)) + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setToastMessage('Could not update like — try again');
    }

    setTimeout(() => setLikeAnimating(null), 300);
  };

  const toggleBookmark = async (video: Video, event?: React.MouseEvent) => {
    if (!user) {
      setToastMessage('Please sign in to bookmark videos');
      return;
    }

    const videoId = video.id;
    setBookmarkAnimating(videoId);
    const isBookmarked = bookmarkedVideos.has(videoId);
    // Demo/slug videos have no Supabase row — persist a snapshot client-side
    // so they still show up in the profile's Saved section.
    const demo = isDemoId(videoId);

    try {
      if (isBookmarked) {
        if (demo) {
          toggleItemBookmark({ id: videoId, type: 'video', name: video.businesses?.business_name || video.caption || 'Saved video' });
        } else {
          const { error } = await unbookmarkVideo(user.id, videoId);
          if (error) throw error;
        }
        setBookmarkedVideos(prev => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
        setToastMessage('Bookmark removed');
      } else {
        if (demo) {
          toggleItemBookmark({
            id: videoId,
            type: 'video',
            name: video.businesses?.business_name || video.caption || 'Saved video',
            image: video.businesses?.profile_picture_url || undefined,
          });
        } else {
          const { error } = await bookmarkVideo(user.id, videoId);
          if (error) throw error;
        }
        setBookmarkedVideos(prev => new Set(prev).add(videoId));
        setToastMessage('Video bookmarked!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setToastMessage('Could not update bookmark — try again');
    }

    setTimeout(() => setBookmarkAnimating(null), 300);
  };

  const toggleVideoFollow = async (userId: string | undefined) => {
    if (!user || !userId) {
      setToastMessage('Please sign in to follow');
      return;
    }
    setFollowAnimating(userId);
    const isFollowed = followedUsers.has(userId);
    try {
      if (isFollowed) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
        setFollowedUsers(prev => { const next = new Set(prev); next.delete(userId); return next; });
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
        setFollowedUsers(prev => new Set(prev).add(userId));
      }
    } catch {
      setToastMessage('Could not update follow');
    }
    setTimeout(() => setFollowAnimating(null), 400);
  };


  const handleProfileClick = (userId?: string, username?: string) => {
    if (!userId && !username) {
      console.warn('Profile click: userId is missing');
      return;
    }
    router.push(`/profile/${username || userId}`);
  };

  const handleCommentClick = (postId: string) => {
    setCommentPostId(postId);
    setCommentModalOpen(true);
  };

  const handleCommentAdded = async () => {
    // Refresh the comment count for the current video
    if (commentPostId) {
      try {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', commentPostId)
          .is('parent_comment_id', null);

        setCommentCounts(prev => ({
          ...prev,
          [commentPostId]: count || 0
        }));
      } catch (err) {
        console.error('Error updating comment count:', err);
      }
    }
  };

  const handleShareClick = async (video: Video) => {
    const businessName = video.businesses?.business_name || video.profiles?.full_name || 'Business';
    const url = `${window.location.origin}/video/${video.id}`;

    const result = await sharePost({
      title: `Check out ${businessName} on Localy`,
      text: video.caption || `Watch this video from ${businessName}`,
      url: url,
    });

    if (result.success && !result.usedWebShare) {
      setToastMessage('Link copied to clipboard');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 lg:left-60 overflow-hidden bg-[#1A1A18] text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 lg:left-60 overflow-hidden bg-[#1A1A18] text-foreground flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No videos yet</h2>
          <Link
            href="/upload"
            className="bg-[var(--foreground)] text-[var(--background)] font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200"
          >
            Upload First Video
          </Link>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  if (!currentVideo) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 lg:left-60 overflow-hidden bg-[#1A1A18] text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }
  const currentBusiness = currentVideo.businesses;
  // Per-video like key (see toggleLike) — must match so each video's heart is independent.
  const likeKey = currentVideo.id;
  const isLiked = likedVideos.has(likeKey);
  const isBookmarked = bookmarkedVideos.has(currentVideo.id);
  // Stable (deterministic) save/share counts — no backend store for these.
  const saveCount = stableCount(currentVideo.id, 'save', 80, 940) + (isBookmarked ? 1 : 0);
  const shareCount = stableCount(currentVideo.id, 'share', 30, 880);

  const getNearestLocationForVideo = (video: Video) => {
    const profileId = video.user_id;
    if (profileId && locationsByProfile[profileId] && locationsByProfile[profileId].length > 0) {
      const candidateLocations = locationsByProfile[profileId];

      if (!userLocation) {
        return candidateLocations[0];
      }

      return candidateLocations.reduce((closest, current) => {
        const closestDistance = haversineDistance(userLocation.lat, userLocation.lng, closest.latitude, closest.longitude);
        const currentDistance = haversineDistance(userLocation.lat, userLocation.lng, current.latitude, current.longitude);
        return currentDistance < closestDistance ? current : closest;
      });
    }

    const latitude = video.businesses?.latitude;
    const longitude = video.businesses?.longitude;
    if (typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    return null;
  };

  const getDistanceForVideo = (video: Video) => {
    if (!userLocation) return null;
    const nearestLocation = getNearestLocationForVideo(video);
    if (!nearestLocation) return null;
    return haversineDistance(userLocation.lat, userLocation.lng, nearestLocation.latitude, nearestLocation.longitude);
  };

  // Thin, null-safe wrappers over the shared distance formatters so the feed
  // shows the same "3.2 km" / ETA values as the rest of the app.
  const formatDistanceLabel = (distanceKm: number | null) =>
    distanceKm === null ? '' : formatDistanceKm(distanceKm);

  const getEtaMinutes = (distanceKm: number | null) =>
    distanceKm === null ? null : etaMinutes(distanceKm);

  // Cap displayed distances to MAX_DISPLAY_KM. Real business lat/lng coordinates
  // often default to (0,0) for demo content, producing hundreds-of-km distances.
  // When the raw value is missing or unrealistic, substitute a stable seeded value
  // (1–21 km derived from the video id) so the feed always looks believable.
  const MAX_DISPLAY_KM = 21;
  const cappedDistanceKm = (video: Video, rawKm: number | null): number | null => {
    if (!userLocation) return null; // No user location → show "Set location"
    if (rawKm !== null && rawKm <= MAX_DISPLAY_KM) return rawKm;
    return 1 + (hashString(video.id + ':dist') % 200) / 10;
  };

  const currentDistanceKm = cappedDistanceKm(currentVideo, getDistanceForVideo(currentVideo));
  const distance = formatDistanceLabel(currentDistanceKm);
  const currentEta = getEtaMinutes(currentDistanceKm);
  // Real distance (+ ETA) when we know the user's location; otherwise prompt
  // them to set one instead of the vague "Near" label.
  const distanceLabel = distance
    ? (currentEta ? `${distance} · ${currentEta} min` : distance)
    : 'Set location';

  return (
    <>
      <style>{`
        .home-content-root {
          scrollbar-width: none;
          overscroll-behavior: none;
        }
        .home-content-root::-webkit-scrollbar {
          display: none;
        }
        @keyframes followPop {
          0% { transform: translate(-50%, 0) scale(0); }
          60% { transform: translate(-50%, 0) scale(1.2); }
          100% { transform: translate(-50%, 0) scale(1); }
        }
        /* Action rail — mobile: overlaid at right edge; sm+: tight beside the video.
           Anchored to the BOTTOM so the bottom icons (share/send) sit near the screen bottom. */
        .feed-action-rail {
          position: absolute;
          right: 0;
          bottom: 16px;
          top: auto;
          transform: none;
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding-right: 6px;
        }
        @media (min-width: 640px) {
          .feed-action-rail {
            right: auto;
            left: calc(50% + min(50%, (100dvh - 112px) * 9 / 32) + 4px);
            bottom: 20px;
            padding-right: 0;
            gap: 8px;
          }
        }
        @media (min-width: 768px) {
          .feed-action-rail {
            left: calc(50% + min(50%, (100dvh - 112px) * 9 / 32) + 6px);
            gap: 10px;
          }
        }
        /* Up/Down nav circles — hidden on mobile; on sm+ pinned to the RIGHT edge,
           vertically centered. When the reviews panel opens they slide LEFT to sit
           just beside it (still fully visible). */
        .feed-nav-arrows {
          display: none;
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 30;
          flex-direction: column;
          gap: 14px;
          transition: right 260ms ease;
        }
        @media (min-width: 640px) {
          .feed-nav-arrows {
            display: flex;
          }
        }
        .feed-nav-arrows.shifted {
          right: calc(min(360px, 80vw) + 28px);
        }
        /* Reviews/comments side panel — CLOSED by default (slid off the right edge);
           gently slides in when opened. Mounted on sm+ so the slide can animate. */
        .feed-reviews {
          display: none;
          position: absolute;
          /* Start below the top-right coins/Get App bar so the panel's stars and
             first review are never hidden behind it. */
          top: 64px;
          bottom: 16px;
          /* Shift further from the right edge and cap the width to the viewport so the
             whole panel — right edge + the comment form's Post button — is on-screen. */
          right: 24px;
          width: min(340px, calc(100vw - 48px));
          z-index: 25;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.18);
          transform: translateX(calc(100% + 24px));
          transition: transform 260ms ease;
          pointer-events: none;
        }
        @media (min-width: 640px) {
          .feed-reviews {
            display: flex;
          }
        }
        .feed-reviews.open {
          transform: translateX(0);
          pointer-events: auto;
        }
      `}</style>
      <div className="home-content-root fixed top-[112px] left-0 right-0 bottom-0 z-10 overflow-hidden overscroll-none bg-white text-foreground dark:bg-[#121212]">
      {/* Ambient Particle Background - CSS shimmer effect */}
      <div className="home-feed-particles" aria-hidden="true" />

      {/* Video Feed Container */}
      <div
        ref={containerRef}
        onWheel={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative h-full w-full overflow-hidden overscroll-behavior-none"
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-transform duration-500 ${
              index === currentIndex ? 'translate-y-0 animate-scale-in' :
              index < currentIndex ? '-translate-y-full' : 'translate-y-full'
            }`}
          >
            {(() => {
              const feedBusiness = video.businesses;
              const feedNearestLocation = getNearestLocationForVideo(video);
              const feedDistanceKm = cappedDistanceKm(video, getDistanceForVideo(video));
              const feedDistanceLabel = formatDistanceLabel(feedDistanceKm);
              const feedEta = getEtaMinutes(feedDistanceKm);
              const feedAlias = getBusinessAlias(video.profiles?.username, feedBusiness?.business_name);
              const feedName = feedAlias?.name || feedBusiness?.business_name || video.profiles?.full_name || 'Business';
              const feedCaption = feedAlias?.caption ?? video.caption;
              const feedItems = feedAlias
                ? getPhoXeLuaItems()
                : ((video as unknown as { localItems?: AliasItem[] }).localItems);

              return (
                <>
            {/* Main video — centered vertical column, fills with object-cover */}
            <div className="absolute inset-0 flex items-center justify-center">
              <video
                ref={(el) => { videoRefs.current[index] = el; }}
                src={video.video_url}
                className="h-full w-full max-w-[min(100%,calc((100vh-112px)*9/16))] object-cover cursor-pointer"
                controls={false}
                loop
                playsInline
                muted={!isActive || index !== currentIndex}
                autoPlay={index === currentIndex}
                onClick={index === currentIndex ? togglePlayPause : undefined}
              />
            </div>

            {/* Centered Play Icon - shown when paused */}
            {index === currentIndex && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <svg className="w-12 h-12 text-[#F5F0E8] opacity-50 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}

            {/* Top-left: business name only (store-style, bold black). Click → profile. */}
            {(feedBusiness || video.profiles) && (
              <div className="pointer-events-none absolute left-3 top-3 z-20">
                <button
                  type="button"
                  onClick={() => handleProfileClick(video.user_id, video.profiles?.username)}
                  onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(video.user_id, video.profiles?.username))}
                  aria-label={`View ${feedName}`}
                  className="pointer-events-auto block max-w-[60vw] overflow-hidden rounded-2xl bg-white/95 px-3 py-1.5 text-left backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                >
                  <span className="block truncate text-2xl font-extrabold leading-tight text-black hover:underline sm:text-3xl">
                    {feedName}
                  </span>
                </button>
              </div>
            )}

            {/* Left-side item cards — original compact pop-up tied to this business */}
            {(feedBusiness || feedItems) && (
              <div className="absolute left-3 top-20 bottom-28 z-20 hidden w-[clamp(150px,18vw,210px)] overflow-y-auto overscroll-contain pr-1 sm:block">
                <BusinessItemsRail
                  userId={video.user_id || ''}
                  businessId={feedBusiness?.id || ''}
                  businessName={feedName}
                  items={feedItems}
                />
              </div>
            )}

            {/* Volume control — top-right corner of the video */}
            {index === currentIndex && (
              <div className="pointer-events-none absolute top-0 left-1/2 z-20 w-[min(100%,calc((100vh-112px)*9/16))] -translate-x-1/2">
                <div className="flex justify-end p-3 pointer-events-auto">
                  <div className="relative flex items-center gap-2">
                    {/* Volume slider — opens to the left of the icon */}
                    {showVolumeSlider && (
                      <div className="flex items-center gap-2 rounded-2xl bg-white/90 border border-black/10 px-3 py-2 backdrop-blur-md shadow-xl">
                        <span className="text-[10px] font-bold text-black/40 w-5 text-right">0</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(volume * 100)}
                          onChange={(e) => setVolume(Number(e.target.value) / 100)}
                          className="w-24 cursor-pointer"
                          style={{ accentColor: '#f97316' }}
                        />
                        <span className="text-[10px] font-bold text-black w-8">{Math.round(volume * 100)}%</span>
                      </div>
                    )}
                    <button
                      onClick={() => setShowVolumeSlider(s => !s)}
                      aria-label="Adjust volume"
                      className="rounded-full p-1"
                    >
                      <svg
                        className="w-6 h-6 text-white"
                        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {volume === 0 ? (
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        ) : volume < 0.5 ? (
                          <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                        ) : (
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Video info — bottom-left of the centered video column: description + reviews */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 w-[min(100%,calc((100vh-112px)*9/16))] -translate-x-1/2">
              <div
                className="pointer-events-auto max-w-[80%] px-4 pb-4 pr-20"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}
              >
                {feedCaption ? (
                  <p className="line-clamp-2 text-sm text-white/95">{feedCaption}</p>
                ) : null}
                <div className="mt-2 flex items-center gap-2 text-xs text-white/90">
                  {feedBusiness?.average_rating ? (
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Star className="h-3.5 w-3.5 fill-[#f97316] text-[#f97316]" />
                      {feedBusiness.average_rating.toFixed(1)}
                    </span>
                  ) : null}
                  <span aria-hidden>·</span>
                  <span>{(commentCounts[video.id] || stableCount(video.id, 'rev', 8, 480))} reviews</span>
                  {feedDistanceLabel ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{feedDistanceLabel} away</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Top-right overlay: Get Coins · Get App · profile pic (reference style) */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur">
            <Link
              href="/buy-coins"
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black/5"
            >
              Get Coins
            </Link>
            <Link
              href="/home"
              className="rounded-full bg-[#f97316] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#ea6a0c]"
            >
              Get App
            </Link>
            <Link href="/profile" aria-label="Your profile" className="shrink-0">
              <Image
                src={headerProfile?.profile_picture_url || 'https://via.placeholder.com/40'}
                alt="Your profile"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-black/10 object-cover"
                unoptimized={!headerProfile?.profile_picture_url}
              />
            </Link>
          </div>
      </div>

      {/* Up/Down Navigation Circles — right edge (prev/next). Visible chevrons,
          theme-aware. Shift left when the reviews panel opens so they stay beside it. */}
      <div className={`feed-nav-arrows${reviewsOpen ? ' shifted' : ''}`}>
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Previous video"
          className="p-0 w-12 h-12 rounded-full bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/15 shadow-lg flex items-center justify-center transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <svg className="w-6 h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Next video"
          className="p-0 w-12 h-12 rounded-full bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/15 shadow-lg flex items-center justify-center transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <svg className="w-6 h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Reviews/comments side panel — slides in from the right when opened. */}
      <div className={`feed-reviews${reviewsOpen ? ' open' : ''}`} aria-hidden={!reviewsOpen}>
        <button
          type="button"
          onClick={() => setReviewsOpen(false)}
          aria-label="Close reviews"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 p-0 text-black transition hover:bg-black/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <X className="h-4 w-4" color="currentColor" strokeWidth={2.5} />
        </button>
        <CommentSection videoId={currentVideo.id} className="h-full w-full" />
      </div>

      {/* Engagement Action Rail — beside the video on its right (see .feed-action-rail CSS above) */}
      <div className="feed-action-rail">
        {/* Profile Picture */}
        <div className="relative">
          <button
            onClick={() => handleProfileClick(currentVideo.user_id, currentVideo.profiles?.username)}
            onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(currentVideo.user_id, currentVideo.profiles?.username))}
            className="action-button-animate rounded-full focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#1A1A18]"
            aria-label={`View profile of ${currentBusiness?.business_name || currentVideo.profiles?.full_name || 'user'}`}
          >
            <Image
              src={currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url || 'https://via.placeholder.com/60'}
              alt={currentBusiness?.business_name || 'Business'}
              width={56}
              height={56}
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full border-2 border-[#3A3A34] object-cover transition-transform duration-200 hover:scale-110 active:scale-95"
              unoptimized={!(currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url)}
            />
          </button>
          {/* Follow Button */}
          {user && currentVideo.user_id && currentVideo.user_id !== user.id && (
            <button
              onClick={() => toggleVideoFollow(currentVideo.user_id)}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 transition-transform duration-400"
              aria-label={followedUsers.has(currentVideo.user_id!) ? 'Unfollow' : 'Follow'}
              style={{ animation: followAnimating === currentVideo.user_id ? 'followPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined }}
            >
              <div className="h-[25px] w-[25px] rounded-full flex items-center justify-center text-[11px] font-bold bg-[#f97316] text-white border-2 border-white transition-all duration-300">
                {followedUsers.has(currentVideo.user_id!) ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </div>
            </button>
          )}
        </div>

        {/* Like Button — active = RED. Hover only shades the circle (no size change). */}
        <button
          onClick={(e) => toggleLike(currentVideo.id, currentBusiness?.id, e)}
          onKeyDown={(e) => handleKeyDown(e, () => toggleLike(currentVideo.id, currentBusiness?.id))}
          className="group flex flex-col items-center gap-1"
          aria-label={isLiked ? 'Unlike video' : 'Like video'}
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg transition group-hover:brightness-95 dark:group-hover:brightness-110 ${
            isLiked ? 'bg-[#ef4444] shadow-[#ef4444]/40' : 'bg-white dark:bg-[#1e1e1e]'
          } ${likeAnimating === currentVideo.id ? 'like-icon-pop' : ''}`}>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-colors duration-300 ${isLiked ? 'text-white' : 'text-black dark:text-white'}`}
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="text-black dark:text-white text-[10px] sm:text-xs font-semibold">
            {formatCount(likeCounts[likeKey] ?? stableLikeCount(currentVideo.id))}
          </span>
        </button>

        {/* Reviews Button — toggles the slide-in side panel on sm+, modal on mobile. */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 640) {
              handleCommentClick(currentVideo.id);
            } else {
              setReviewsOpen((o) => !o);
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, () => setReviewsOpen((o) => !o))}
          className="group flex flex-col items-center gap-1"
          aria-label={reviewsOpen ? 'Close reviews' : 'Open reviews'}
          aria-expanded={reviewsOpen}
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white dark:bg-[#1e1e1e] shadow-lg transition group-hover:brightness-95 dark:group-hover:brightness-110">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-black dark:text-white text-[10px] sm:text-xs font-semibold">{formatCount(commentCounts[currentVideo.id] || stableCount(currentVideo.id, 'cmt', 12, 520))}</span>
        </button>

        {/* Location Button — computes distance and opens map modal */}
        <button
          onClick={() => {
            if (!userLocation && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => {},
                { enableHighAccuracy: true, timeout: 8000 }
              );
            }
            setLocationModalOpen(true);
          }}
          className="group flex flex-col items-center gap-1"
          aria-label={distance ? `Distance: ${distance}` : 'Location'}
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white dark:bg-[#1e1e1e] shadow-lg transition group-hover:brightness-95 dark:group-hover:brightness-110">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-black dark:text-white text-[10px] sm:text-xs font-semibold">{distanceLabel}</span>
        </button>

        {/* Bookmark / Favorite Button — active = ORANGE (never yellow). */}
        <button
          onClick={(e) => toggleBookmark(currentVideo, e)}
          className="group flex flex-col items-center gap-1"
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark video'}
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg transition group-hover:brightness-95 dark:group-hover:brightness-110 ${
            isBookmarked ? 'bg-[#f97316] shadow-[#f97316]/40' : 'bg-white dark:bg-[#1e1e1e]'
          } ${bookmarkAnimating === currentVideo.id ? 'bookmark-icon-pop' : ''}`}>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-colors duration-300 ${isBookmarked ? 'text-white' : 'text-black dark:text-white'}`}
              fill={isBookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <span className="text-black dark:text-white text-[10px] sm:text-xs font-semibold">{formatCount(saveCount)}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => handleShareClick(currentVideo)}
          onKeyDown={(e) => handleKeyDown(e, () => handleShareClick(currentVideo))}
          className="group flex flex-col items-center gap-1"
          aria-label="Share this video"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white dark:bg-[#1e1e1e] shadow-lg transition group-hover:brightness-95 dark:group-hover:brightness-110">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <span className="text-black dark:text-white text-[10px] sm:text-xs font-semibold">{formatCount(shareCount)}</span>
        </button>

        {/* Send to User Button — opens Chats with this video pre-filled */}
        <button
          onClick={() => {
            const bizName = currentVideo.businesses?.business_name || currentVideo.profiles?.full_name || 'Business';
            const videoUrl = `${window.location.origin}/feed?videoId=${encodeURIComponent(currentVideo.id)}`;
            router.push(`/chats?shareVideo=${encodeURIComponent(videoUrl)}&shareTitle=${encodeURIComponent(bizName)}`);
          }}
          className="group flex flex-col items-center gap-1"
          aria-label="Send video to a user"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white dark:bg-[#1e1e1e] shadow-lg transition group-hover:brightness-95 dark:group-hover:brightness-110">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-black dark:text-white text-[10px] sm:text-xs font-semibold">Send</span>
        </button>

      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false);
          void handleCommentAdded();
        }}
        postId={commentPostId}
        businessName={currentBusiness?.business_name || currentVideo.profiles?.full_name}
      />

      {/* Location Modal */}
      {locationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setLocationModalOpen(false)}
        >
          <div
            className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-black">
                  {currentBusiness?.business_name || 'Store Location'}
                </h2>
                {distance && <p className="text-xs text-gray-500 mt-0.5">{distance}</p>}
              </div>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close location"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {currentBusiness?.business_name ? (
              <GoogleMap
                query={currentBusiness.business_name}
                title={currentBusiness.business_name}
                className="w-full h-64"
              />
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">No location data available.</div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Admin Mode Badge */}
      {adminMode && (
        <div className="fixed bottom-20 left-3 z-50 rounded-full bg-[#f97316]/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          Admin
        </div>
      )}
    </div>
    </>
  );
}
