'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getVideosFeed } from '@/lib/supabase/videos';
import { supabase } from '@/lib/supabase/client';

interface Video {
  id: string;
  video_url: string;
  caption?: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    profile_picture_url?: string;
  };
  businesses?: {
    id: string;
    business_name: string;
    category: string;
    profile_picture_url?: string;
    average_rating?: number;
    total_reviews?: number;
    latitude?: number;
    longitude?: number;
  };
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likeAnimating, setLikeAnimating] = useState<string | null>(null);
  const [bookmarkAnimating, setBookmarkAnimating] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Load videos from Supabase
  useEffect(() => {
    loadVideos();
    if (user) {
      loadUserInteractions();
    }
  }, [user]);

  const loadVideos = async () => {
    try {
      const { data, error } = await getVideosFeed(20, 0);
      if (error) throw error;
      if (data) {
        setVideos(data as Video[]);
      }
    } catch (error) {
      console.error(`Error loading videos: ${error instanceof Error ? error.message : String(error)}`);
      // Fallback to empty array if Supabase is not configured
    } finally {
      setLoading(false);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;
    
    try {
      // Load likes
      const { data: likes } = await supabase
        .from('likes')
        .select('business_id')
        .eq('user_id', user.id);
      
      if (likes) {
        setLikedVideos(new Set(likes.map((l: any) => l.business_id).filter(Boolean)));
      }

      // Load bookmarks
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('business_id')
        .eq('user_id', user.id);
      
      if (bookmarks) {
        setBookmarkedVideos(new Set(bookmarks.map((b: any) => b.business_id).filter(Boolean)));
      }
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  // Handle video autoplay when scrolling
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.play().catch(console.error);
    }

    // Pause other videos
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
      }
    });
  }, [currentIndex, videos]);

  // Handle scroll to change videos
  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling || videos.length === 0) return;
    
    setIsScrolling(true);
    const delta = e.deltaY;

    if (delta > 0 && currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (delta < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    setTimeout(() => setIsScrolling(false), 500);
  };

  // Handle touch swipe for mobile
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

    if (isUpSwipe && currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (isDownSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Toggle like
  const toggleLike = async (videoId: string, businessId?: string) => {
    if (!user || !businessId) return;

    setLikeAnimating(videoId);
    const isLiked = likedVideos.has(businessId);

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', businessId);
        setLikedVideos(prev => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: user.id, business_id: businessId });
        setLikedVideos(prev => new Set(prev).add(businessId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }

    setTimeout(() => setLikeAnimating(null), 300);
  };

  // Toggle bookmark
  const toggleBookmark = async (videoId: string, businessId?: string) => {
    if (!user || !businessId) return;

    setBookmarkAnimating(videoId);
    const isBookmarked = bookmarkedVideos.has(businessId);

    try {
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', businessId);
        setBookmarkedVideos(prev => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, business_id: businessId });
        setBookmarkedVideos(prev => new Set(prev).add(businessId));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }

    setTimeout(() => setBookmarkAnimating(null), 300);
  };

  if (loading) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No videos yet</h2>
          <Link
            href="/upload"
            className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-all duration-200"
          >
            Upload First Video
          </Link>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  const currentBusiness = currentVideo.businesses;
  const isLiked = currentBusiness?.id ? likedVideos.has(currentBusiness.id) : false;
  const isBookmarked = currentBusiness?.id ? bookmarkedVideos.has(currentBusiness.id) : false;

  // Calculate distance (simplified - would use actual user location in production)
  const distance = currentBusiness?.latitude && currentBusiness?.longitude 
    ? '0.5 km' // Placeholder - would calculate actual distance
    : '';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
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
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              src={video.video_url}
              className="h-full w-full object-cover"
              loop
              muted
              playsInline
              autoPlay={index === currentIndex}
            />
            
            {/* Business Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-24">
              <h2 className="text-2xl font-bold text-white mb-2">
                {currentBusiness?.business_name || video.profiles?.full_name || 'Business'}
              </h2>
              <p className="text-white/80 text-sm mb-2">{video.caption || ''}</p>
              <div className="flex items-center gap-4 text-white/90 text-sm">
                {currentBusiness?.average_rating && (
                  <>
                    <span>⭐ {currentBusiness.average_rating.toFixed(1)}</span>
                    <span>•</span>
                  </>
                )}
                <span>{currentBusiness?.total_reviews || 0} verified reviews</span>
                {distance && (
                  <>
                    <span>•</span>
                    <span>{distance} away</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Left Side - Logo Only (Search removed) */}
      <div className="absolute top-0 left-0 z-20 p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
          <h1 className="text-xl font-bold text-white">Localy</h1>
        </div>
      </div>

      {/* Right Side - Interaction Buttons */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-6 pr-4">
        {/* Profile Picture */}
        <div className="relative">
          <img
            src={currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url || 'https://via.placeholder.com/60'}
            alt={currentBusiness?.business_name || 'Business'}
            className="w-14 h-14 rounded-full border-2 border-white object-cover cursor-pointer hover:scale-110 transition-transform duration-200 active:scale-95"
          />
        </div>

        {/* Like Button */}
        {currentBusiness?.id && (
          <button
            onClick={() => toggleLike(currentVideo.id, currentBusiness.id)}
            className="flex flex-col items-center gap-1 transition-transform duration-200 active:scale-95"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              isLiked ? 'bg-red-500' : 'bg-white/20 backdrop-blur-md'
            } ${likeAnimating === currentVideo.id ? 'scale-125' : ''}`}>
              <svg
                className={`w-6 h-6 text-white transition-all duration-300 ${
                  likeAnimating === currentVideo.id ? 'scale-150' : ''
                }`}
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </button>
        )}

        {/* Reviews Button */}
        <button className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all duration-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold">{currentBusiness?.total_reviews || 0}</span>
        </button>

        {/* Location Button */}
        {distance && (
          <button className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all duration-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-white text-xs font-semibold">{distance}</span>
          </button>
        )}

        {/* Bookmark Button */}
        {currentBusiness?.id && (
          <button
            onClick={() => toggleBookmark(currentVideo.id, currentBusiness.id)}
            className="flex flex-col items-center gap-1 transition-transform duration-200 active:scale-95"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              isBookmarked ? 'bg-yellow-500' : 'bg-white/20 backdrop-blur-md'
            } ${bookmarkAnimating === currentVideo.id ? 'scale-125' : ''}`}>
              <svg
                className={`w-6 h-6 text-white transition-all duration-300 ${
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
        )}

        {/* Share Button */}
        <button className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all duration-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
        </button>
      </div>

      {/* Bottom Navigation Hotbar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around py-3">
          <Link href="/" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/' ? 'text-white' : 'text-white/60'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className={`text-xs ${pathname === '/' ? 'text-white' : 'text-white/60'}`}>Home</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/search' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className={`text-xs ${pathname === '/search' ? 'text-white' : 'text-white/60'}`}>Search</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${pathname === '/upload' ? 'bg-white' : 'bg-white/20'}`}>
              <svg className={`w-6 h-6 ${pathname === '/upload' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
          <Link href="/chats" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/chats' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className={`text-xs ${pathname === '/chats' ? 'text-white' : 'text-white/60'}`}>Chats</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/profile' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={`text-xs ${pathname === '/profile' ? 'text-white' : 'text-white/60'}`}>Profile</span>
          </Link>
        </div>
      </div>

      {/* Video Index Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1">
          <span className="text-white text-sm">
            {currentIndex + 1} / {videos.length}
          </span>
        </div>
      </div>
    </div>
  );
}
