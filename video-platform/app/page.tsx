'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getVideosFeed, getLikeCounts, likeItem, unlikeItem, bookmarkVideo, unbookmarkVideo, getWeightedVideoFeed, trackVideoView } from '@/lib/supabase/videos';
import { getVideoAverageRating } from '@/lib/supabase/comments';
import { getUserCoins } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import { CommentModal } from '@/components/CommentModal';
import { Toast } from '@/components/Toast';
import { sharePost } from '@/lib/utils/share';
import { AppBottomNav } from '@/components/AppBottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { haversineDistance } from '@/lib/utils/geo';
import { computeAveragePrice, computeRoundedPriceRange } from '@/lib/utils/pricing';

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

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

function HomeContent() {
  const { user } = useAuth();
  const router = useRouter();
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
  const [commentPostId, setCommentPostId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [userCoins, setUserCoins] = useState(100);
  const [showCoinBadge, setShowCoinBadge] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationsByProfile, setLocationsByProfile] = useState<Record<string, { latitude: number; longitude: number }[]>>({});
  const [priceRanges, setPriceRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [volume, setVolume] = useState(0.5); // Default 50% volume
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVideos();
    if (user) {
      loadUserInteractions();
      loadUserCoins();
    }
  }, [user]);

  useEffect(() => {
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
  }, []);

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

  const loadVideos = async () => {
    try {
      const { data, error } = await getWeightedVideoFeed(20, 0);
      if (error) throw error;
      if (data) {
        const videosData = data as Video[];
        setVideos(videosData);
        
        const counts: { [key: string]: number } = {};
        const commentCounts: { [key: string]: number } = {};
        
        const videoIds = videosData
          .map(v => v.id)
          .filter((id): id is string => !!id && typeof id === 'string');

        const posterProfileIds = Array.from(
          new Set(
            videosData
              .map((video) => video.user_id)
              .filter((id): id is string => Boolean(id && typeof id === 'string'))
          )
        );
        
        console.log('Video IDs for rating fetch:', videoIds);

        const feedBusinessIds = Array.from(
          new Set(
            videosData
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

        // Fetch rating counts for each video
        for (const videoId of videoIds) {
          try {
            const { data: ratingData } = await getVideoAverageRating(videoId);
            commentCounts[videoId] = ratingData?.total_rated_comments || 0;
          } catch (err) {
            console.error(`Error fetching ratings for video ${videoId}:`, err);
            commentCounts[videoId] = 0;
          }
        }

       
        const businesses = videosData
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

      setLikedVideos(likedSet);
      if (process.env.NODE_ENV === 'development') {
        console.log('Loaded liked items:', Array.from(likedSet));
      }

      const { data: bookmarks } = await supabase
        .from('video_bookmarks')
        .select('video_id')
        .eq('user_id', user.id);
      
      if (bookmarks) {
        setBookmarkedVideos(new Set(bookmarks.map((b: { video_id: string | null }) => b.video_id).filter(Boolean) as string[]));
      }
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const loadUserCoins = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coin_balance, type')
        .eq('id', user.id)
        .single();

      if (!error && data) {
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

  // Set volume on video when it's loaded
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.volume = volume;
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          const mediaError = error as { name?: string };
          if (mediaError.name !== 'AbortError' && mediaError.name !== 'NotAllowedError') {
            console.error('Video play error:', error);
          }
        });
      }
    }

    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
      }
    });
  }, [currentIndex, videos]);

  useEffect(() => {
    if (videos.length > 0 && currentIndex >= 0 && currentIndex < videos.length) {
      const currentVideo = videos[currentIndex];
      if (currentVideo && currentVideo.id) {
        trackVideoView(currentVideo.id, user?.id).catch((error: unknown) => {
          console.warn('Failed to track video view:', error);
        });
      }
    }
  }, [currentIndex, videos, user?.id]);

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

  const toggleLike = async (videoId: string, businessId?: string) => {
    if (!user) {
      setToastMessage('Please sign in to like posts');
      return;
    }

    setLikeAnimating(videoId);
    const likeKey = businessId || videoId;
    const itemType = businessId ? 'business' : 'video';
    const isLiked = likedVideos.has(likeKey);

    try {
      if (isLiked) {
        const { error } = await unlikeItem(user.id, likeKey, itemType as 'video' | 'business');
        if (error) throw error;
        
        setLikedVideos(prev => {
          const next = new Set(prev);
          next.delete(likeKey);
          return next;
        });

        setLikeCounts(prev => ({
          ...prev,
          [likeKey]: Math.max(0, (prev[likeKey] || 0) - 1)
        }));
      } else {
        const { error } = await likeItem(user.id, likeKey, itemType as 'video' | 'business');
        if (error) throw error;
        
        setLikedVideos(prev => new Set(prev).add(likeKey));

        setLikeCounts(prev => ({
          ...prev,
          [likeKey]: (prev[likeKey] || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setToastMessage('Could not update like — try again');
    }

    setTimeout(() => setLikeAnimating(null), 300);
  };

  const toggleBookmark = async (videoId: string) => {
    if (!user) {
      setToastMessage('Please sign in to bookmark videos');
      return;
    }

    setBookmarkAnimating(videoId);
    const isBookmarked = bookmarkedVideos.has(videoId);

    try {
      if (isBookmarked) {
        const { error } = await unbookmarkVideo(user.id, videoId);
        if (error) throw error;
        setBookmarkedVideos(prev => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
        setToastMessage('Bookmark removed');
      } else {
        const { error } = await bookmarkVideo(user.id, videoId);
        if (error) throw error;
        setBookmarkedVideos(prev => new Set(prev).add(videoId));
        setToastMessage('Video bookmarked!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setToastMessage('Could not update bookmark — try again');
    }

    setTimeout(() => setBookmarkAnimating(null), 300);
  };

  const handleProfileClick = (userId?: string) => {
    if (!userId) {
      console.warn('Profile click: userId is missing');
      return;
    }
    router.push(`/profile/${userId}`);
  };

  const handleCommentClick = (postId: string) => {
    setCommentPostId(postId);
    setCommentModalOpen(true);
  };

  const handleCommentAdded = async () => {
    // Refresh the rating count for the current video
    if (commentPostId) {
      try {
        const { data: ratingData } = await getVideoAverageRating(commentPostId);
        setCommentCounts(prev => ({
          ...prev,
          [commentPostId]: ratingData?.total_rated_comments || 0
        }));
      } catch (err) {
        console.error('Error updating rating count:', err);
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
      <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground flex items-center justify-center">
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
      <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }
  const currentBusiness = currentVideo.businesses;
  const likeKey = currentBusiness?.id || currentVideo.id;
  const isLiked = likedVideos.has(likeKey);
  const isBookmarked = bookmarkedVideos.has(currentVideo.id);

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

  const formatDistanceLabel = (distanceKm: number | null) => {
    if (distanceKm === null) return '';
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
    return `${distanceKm.toFixed(1)} km`;
  };

  const getEtaMinutes = (distanceKm: number | null) => {
    if (distanceKm === null) return null;
    return Math.max(4, Math.round((distanceKm / 35) * 60));
  };

  const currentDistanceKm = getDistanceForVideo(currentVideo);
  const distance = formatDistanceLabel(currentDistanceKm);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Video Feed Container */}
      <div
        ref={containerRef}
        onWheel={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative h-full w-full"
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-transform duration-500 ${
              index === currentIndex ? 'translate-y-0' : 
              index < currentIndex ? '-translate-y-full' : 'translate-y-full'
            }`}
          >
            {(() => {
              const feedBusiness = video.businesses;
              const feedNearestLocation = getNearestLocationForVideo(video);
              const feedDistanceKm = getDistanceForVideo(video);
              const feedDistanceLabel = formatDistanceLabel(feedDistanceKm);
              const feedEta = getEtaMinutes(feedDistanceKm);

              return (
                <>
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              src={video.video_url}
              className="h-full w-full object-contain"
              controls
              loop
              playsInline
              autoPlay={index === currentIndex}
            />
            
            {/* Business Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-24">
              <button
                onClick={() => handleProfileClick(video.user_id)}
                onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(video.user_id))}
                className="text-left focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/80 rounded"
                aria-label={`View profile of ${feedBusiness?.business_name || video.profiles?.full_name || 'Business'}`}
              >
                <h2 className="text-2xl font-bold text-white mb-2 hover:underline">
                  {feedBusiness?.business_name || video.profiles?.full_name || 'Business'}
                </h2>
              </button>
              <p className="text-white/80 text-sm mb-2">{video.caption || ''}</p>
              <div className="flex items-center gap-4 text-white/90 text-sm">
                {feedBusiness?.average_rating && (
                  <>
                    <span>⭐ {feedBusiness.average_rating.toFixed(1)}</span>
                    <span>•</span>
                  </>
                )}
                <span>{commentCounts[video.id] || 0} reviews</span>
                {feedDistanceLabel && (
                  <>
                    <span>•</span>
                    <span>{feedDistanceLabel} away</span>
                  </>
                )}
              </div>

            </div>

            {feedBusiness && (
              <div className="absolute left-0 top-1/2 z-20 -translate-y-1/2 pl-2 sm:pl-3">
                <div className="group flex items-center">
                  <div className="rounded-r-xl border border-white/30 bg-black/60 p-2 sm:p-3 backdrop-blur-md">
                    <span className="text-base sm:text-xl" aria-hidden="true">📍</span>
                    <span className="sr-only">Business quick info</span>
                  </div>

                  <div className="ml-1 sm:ml-2 w-0 overflow-hidden rounded-xl border border-white/20 bg-black/45 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:w-[220px] group-hover:opacity-100 group-focus-within:w-[220px] group-focus-within:opacity-100 sm:group-hover:w-[260px] sm:group-focus-within:w-[260px]">
                    <div className="p-2 sm:p-3">
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                        <div className="rounded-lg bg-white/10 px-2 py-2">
                          <p className="text-white/70">Avg Price</p>
                          <p className="text-white font-semibold">
                            {feedBusiness.id && priceRanges[feedBusiness.id]
                              ? (() => {
                                  const avgPrice = computeAveragePrice(priceRanges[feedBusiness.id]);
                                  return avgPrice ? `~$${avgPrice}` : '—';
                                })()
                              : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/10 px-2 py-2">
                          <p className="text-white/70">Distance</p>
                          <p className="text-white font-semibold">{feedDistanceLabel || 'Use GPS'}</p>
                        </div>
                        <div className="rounded-lg bg-white/10 px-2 py-2">
                          <p className="text-white/70">ETA</p>
                          <p className="text-white font-semibold">{feedEta !== null ? `${feedEta} min` : '—'}</p>
                        </div>
                      </div>

                      <div className="mt-1.5 sm:mt-2 flex gap-1.5 sm:gap-2">
                        <a
                          href={feedNearestLocation
                            ? `https://www.google.com/maps/dir/?api=1&destination=${feedNearestLocation.latitude},${feedNearestLocation.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(feedBusiness.business_name)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-blue-300 text-blue-950 text-[10px] sm:text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-blue-200"
                        >
                          Directions
                        </a>
                        <Link
                          href={`/profile/${feedBusiness.id}`}
                          className="rounded-lg bg-white/15 border border-white/20 text-white text-[10px] sm:text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1.5"
                        >
                          Menu
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Left Side - Logo and Coins */}
      <div className="absolute top-0 left-0 z-20 p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-overlay)] px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm backdrop-blur-md">
          <h1 className="text-base sm:text-lg md:text-xl font-bold">Localy</h1>
        </div>
        <ThemeToggle />

        {/* Coin Balance */}
        {showCoinBadge && (
          <div className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/50 rounded-lg px-2 py-2 sm:px-4 sm:py-3 flex items-center gap-2">
            <span className="text-lg sm:text-2xl">🪙</span>
            <div>
              <div className="text-[10px] sm:text-xs text-white/70">Coins</div>
              <div className="text-base sm:text-xl font-bold text-yellow-300">{userCoins}</div>
            </div>
          </div>
        )}
      </div>

      {/* Top Right - Volume Control Bar */}
      <div className="absolute top-0 right-0 z-20 p-2 sm:p-3 md:p-4">
        <div className="flex min-w-max items-center gap-2 sm:gap-3 rounded-xl bg-[var(--surface-overlay)] px-2 py-2 sm:px-4 sm:py-3 shadow-sm backdrop-blur-md">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-[var(--foreground)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.04v8.05c1.48-.75 2.5-2.27 2.5-4.01zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
            className="h-2 w-20 sm:w-28 md:w-40 cursor-pointer rounded-lg bg-[var(--surface-2)] accent-blue-500 outline-none focus:outline-none"
            aria-label="Volume slider"
          />
        </div>
      </div>

      {/* Right Side - Interaction Buttons */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 pr-2 sm:gap-3 md:gap-4 md:pr-4">
        {/* Profile Picture */}
        <div className="relative">
          <button
            onClick={() => handleProfileClick(currentVideo.user_id)}
            onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(currentVideo.user_id))}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
            aria-label={`View profile of ${currentBusiness?.business_name || currentVideo.profiles?.full_name || 'user'}`}
          >
            <Image
              src={currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url || 'https://via.placeholder.com/60'}
              alt={currentBusiness?.business_name || 'Business'}
              width={56}
              height={56}
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full border-2 border-[var(--border-color)] object-cover transition-transform duration-200 hover:scale-110 active:scale-95"
              unoptimized={!(currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url)}
            />
          </button>
        </div>

        {/* Like Button - show for all videos */}
        <button
          onClick={() => toggleLike(currentVideo.id, currentBusiness?.id)}
          onKeyDown={(e) => handleKeyDown(e, () => toggleLike(currentVideo.id, currentBusiness?.id))}
          className="flex flex-col items-center gap-1 transition-transform duration-200 active:scale-95"
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            isLiked ? 'bg-red-500' : 'border border-[var(--border-color)] bg-[var(--surface-overlay)] backdrop-blur-md'
          } ${likeAnimating === currentVideo.id ? 'scale-125' : ''}`}>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white transition-all duration-300 ${
                likeAnimating === currentVideo.id ? 'scale-150' : ''
              }`}
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-white text-[10px] sm:text-xs font-semibold">
            {likeCounts[likeKey] || 0}
          </span>
        </button>

        {/* Reviews Button */}
        <button
          onClick={() => handleCommentClick(currentVideo.id)}
          onKeyDown={(e) => handleKeyDown(e, () => handleCommentClick(currentVideo.id))}
          className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95"
          aria-label="Add a comment"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-overlay)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--surface-2)]">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-[10px] sm:text-xs font-semibold">{currentBusiness?.total_reviews || 0}</span>
        </button>

        {/* Location Button */}
        {distance && (
          <button className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-overlay)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--surface-2)]">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-white text-[10px] sm:text-xs font-semibold">{distance}</span>
          </button>
        )}

        {/* Bookmark Button */}
        <button
          onClick={() => toggleBookmark(currentVideo.id)}
          className="flex flex-col items-center gap-1 transition-transform duration-200 active:scale-95"
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            isBookmarked ? 'bg-yellow-500' : 'border border-[var(--border-color)] bg-[var(--surface-overlay)] backdrop-blur-md'
          } ${bookmarkAnimating === currentVideo.id ? 'scale-125' : ''}`}>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white transition-all duration-300 ${
                bookmarkAnimating === currentVideo.id ? 'scale-150' : ''
              }`}
              fill={isBookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
        </button>

        {/* Share Button */}
        <button
          onClick={() => handleShareClick(currentVideo)}
          onKeyDown={(e) => handleKeyDown(e, () => handleShareClick(currentVideo))}
          className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95"
          aria-label="Share this post"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-overlay)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--surface-2)]">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
        </button>
      </div>

      <AppBottomNav />

      {/* Comment Modal */}
      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        postId={commentPostId}
        businessName={currentBusiness?.business_name || currentVideo.profiles?.full_name}
        onCommentAdded={handleCommentAdded}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
}
