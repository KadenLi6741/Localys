'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getVideosFeed, getLikeCounts, likeItem, unlikeItem, bookmarkVideo, unbookmarkVideo, getWeightedVideoFeed, trackVideoView } from '@/lib/supabase/videos';
import { getUserCoins } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import { CommentModal } from '@/components/CommentModal';
import { Toast } from '@/components/Toast';
import { sharePost } from '@/lib/utils/share';

interface Video {
  id: string;
  user_id?: string;
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
    business_name: string;
    category: string;
    profile_picture_url?: string;
    average_rating?: number;
    total_reviews?: number;
    latitude?: number;
    longitude?: number;
  };
  like_count?: number; // Add like count to video
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
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Load videos from Supabase
  useEffect(() => {
    loadVideos();
    if (user) {
      loadUserInteractions();
      loadUserCoins();
    }
  }, [user]);

  // Reload coins when page becomes visible (user returns from upload)
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
        
        // Build like counts for all items (businesses and video IDs)
        const counts: { [key: string]: number } = {};
        const commentCounts: { [key: string]: number } = {};
        
        const videoIds = videosData
          .map(v => v.id)
          .filter((id): id is string => !!id && typeof id === 'string');
        
        console.log('Video IDs for comment fetch:', videoIds);

        // Fetch all likes
        const { data: allLikes } = await supabase
          .from('likes')
          .select('business_id, video_id');

        if (allLikes) {
          allLikes.forEach((like: any) => {
            if (like.business_id) {
              counts[like.business_id] = (counts[like.business_id] || 0) + 1;
            }
            if (like.video_id) {
              counts[like.video_id] = (counts[like.video_id] || 0) + 1;
            }
          });
        }

        // Fetch comment counts for all videos
        // TODO: Fix null value issue in videoIds array
        console.log('Skipping comment fetch due to null value issues');
        // if (videoIds && videoIds.length > 0) {
        //   console.log('Fetching comments for video IDs:', videoIds);
        //   const { data: allComments, error: commentsError } = await supabase
        //     .from('comments')
        //     .select('video_id')
        //     .eq('parent_comment_id', null)
        //     .in('video_id', videoIds);
        //
        //   if (commentsError) {
        //     const errMsg = commentsError instanceof Error 
        //       ? commentsError.message 
        //       : (commentsError as any)?.message
        //         ? (commentsError as any).message
        //         : JSON.stringify(commentsError);
        //     console.error('Error fetching comments:', errMsg, commentsError);
        //   }
        //
        //   if (allComments) {
        //     console.log('Fetched comments:', allComments.length);
        //     allComments.forEach((comment: any) => {
        //       if (comment.video_id) {
        //         commentCounts[comment.video_id] = (commentCounts[comment.video_id] || 0) + 1;
        //       }
        //     });
        //   }
        // } else {
        //   console.warn('No valid video IDs to fetch comments for');
        // }

        // Initialize all items with 0 if not yet in counts
        const businessIds = Array.from(new Set(videosData.map(v => v.businesses?.id).filter(Boolean))) as string[];
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
          console.log('Loaded comment counts:', commentCounts);
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
      // Load likes (both business_id and video_id)
      const { data: likes } = await supabase
        .from('likes')
        .select('business_id, video_id')
        .eq('user_id', user.id);

      const likedSet = new Set<string>();

      if (likes) {
        likes.forEach((l: any) => {
          if (l.business_id) likedSet.add(l.business_id);
          if (l.video_id) likedSet.add(l.video_id);
        });
      }

      setLikedVideos(likedSet);
      if (process.env.NODE_ENV === 'development') {
        console.log('Loaded liked items:', Array.from(likedSet));
      }

      // Load video bookmarks
      const { data: bookmarks } = await supabase
        .from('video_bookmarks')
        .select('video_id')
        .eq('user_id', user.id);
      
      if (bookmarks) {
        setBookmarkedVideos(new Set(bookmarks.map((b: any) => b.video_id).filter(Boolean)));
      }
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const loadUserCoins = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await getUserCoins(user.id);
      console.log('loadUserCoins - fetched data:', data, 'error:', error);
      if (!error && data !== null) {
        console.log('Setting userCoins to:', data);
        setUserCoins(data);
      } else {
        console.error('Error loading coins:', error);
      }
    } catch (error) {
      console.error('Exception loading coins:', error);
    }
  };

  // Handle video autoplay when scrolling
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: any) => {
          // Silently handle common autoplay errors (power saving, media removed, etc.)
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.error('Video play error:', error);
          }
        });
      }
    }

    // Pause other videos
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
      }
    });
  }, [currentIndex, videos]);

  // Track video view when video becomes visible
  useEffect(() => {
    if (videos.length > 0 && currentIndex >= 0 && currentIndex < videos.length) {
      const currentVideo = videos[currentIndex];
      if (currentVideo && currentVideo.id) {
        // Track view with user ID if logged in, otherwise without
        trackVideoView(currentVideo.id, user?.id).catch((error: any) => {
          console.warn('Failed to track video view:', error);
        });
      }
    }
  }, [currentIndex, videos, user?.id]);

  // Handle scroll to change videos
  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling || videos.length === 0) return;
    
    setIsScrolling(true);
    const delta = e.deltaY;

    if (delta > 0) {
      // Scroll down - go to next video or loop to beginning
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0); // Loop back to top
      }
    } else if (delta < 0) {
      // Scroll up - go to previous video or loop to end
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        setCurrentIndex(videos.length - 1); // Loop to bottom
      }
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

    if (isUpSwipe) {
      // Swipe up - go to next video or loop to beginning
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0); // Loop back to top
      }
    } else if (isDownSwipe) {
      // Swipe down - go to previous video or loop to end
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        setCurrentIndex(videos.length - 1); // Loop to bottom
      }
    }
  };

  // Toggle like
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
        // Unlike
        const { error } = await unlikeItem(user.id, likeKey, itemType as 'video' | 'business');
        if (error) throw error;
        
        setLikedVideos(prev => {
          const next = new Set(prev);
          next.delete(likeKey);
          return next;
        });

        // Decrement like count
        setLikeCounts(prev => ({
          ...prev,
          [likeKey]: Math.max(0, (prev[likeKey] || 0) - 1)
        }));
      } else {
        // Like
        const { error } = await likeItem(user.id, likeKey, itemType as 'video' | 'business');
        if (error) throw error;
        
        setLikedVideos(prev => new Set(prev).add(likeKey));

        // Increment like count
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

  // Toggle bookmark
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

  // Navigate to profile page
  const handleProfileClick = (userId?: string) => {
    if (!userId) {
      console.warn('Profile click: userId is missing');
      return;
    }
    router.push(`/profile/${userId}`);
  };

  // Open comment modal
  const handleCommentClick = (postId: string) => {
    setCommentPostId(postId);
    setCommentModalOpen(true);
  };

  // Handle share
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

  // Handle keyboard events for accessibility
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
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
  if (!currentVideo) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading video...</p>
        </div>
      </div>
    );
  }
  const currentBusiness = currentVideo.businesses;
  const likeKey = currentBusiness?.id || currentVideo.id;
  const isLiked = likedVideos.has(likeKey);
  const isBookmarked = bookmarkedVideos.has(currentVideo.id);

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
              <button
                onClick={() => handleProfileClick(video.user_id)}
                onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(video.user_id))}
                className="text-left focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/80 rounded"
                aria-label={`View profile of ${currentBusiness?.business_name || video.profiles?.full_name || 'Business'}`}
              >
                <h2 className="text-2xl font-bold text-white mb-2 hover:underline">
                  {currentBusiness?.business_name || video.profiles?.full_name || 'Business'}
                </h2>
              </button>
              <p className="text-white/80 text-sm mb-2">{video.caption || ''}</p>
              <div className="flex items-center gap-4 text-white/90 text-sm">
                {currentBusiness?.average_rating && (
                  <>
                    <span>⭐ {currentBusiness.average_rating.toFixed(1)}</span>
                    <span>•</span>
                  </>
                )}
                <span>{commentCounts[video.id] || 0} reviews</span>
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

      {/* Left Side - Logo and Coins */}
      <div className="absolute top-0 left-0 z-20 p-4 space-y-3">
        <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
          <h1 className="text-xl font-bold text-white">Localy</h1>
        </div>
        
        {/* Coin Balance */}
        <div className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/50 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <div>
            <div className="text-xs text-white/70">Coins</div>
            <div className="text-xl font-bold text-yellow-300">{userCoins}</div>
          </div>
        </div>
      </div>

      {/* Right Side - Interaction Buttons */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-6 pr-4">
        {/* Profile Picture */}
        <div className="relative">
          <button
            onClick={() => handleProfileClick(currentVideo.user_id)}
            onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(currentVideo.user_id))}
            className="focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black rounded-full"
            aria-label={`View profile of ${currentBusiness?.business_name || currentVideo.profiles?.full_name || 'user'}`}
          >
            <img
              src={currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url || 'https://via.placeholder.com/60'}
              alt={currentBusiness?.business_name || 'Business'}
              className="w-14 h-14 rounded-full border-2 border-white object-cover hover:scale-110 transition-transform duration-200 active:scale-95"
            />
          </button>
        </div>

        {/* Like Button - show for all videos */}
        <button
          onClick={() => toggleLike(currentVideo.id, currentBusiness?.id)}
          onKeyDown={(e) => handleKeyDown(e, () => toggleLike(currentVideo.id, currentBusiness?.id))}
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
          <span className="text-white text-xs font-semibold">
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
        <button
          onClick={() => toggleBookmark(currentVideo.id)}
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

        {/* Share Button */}
        <button 
          onClick={() => handleShareClick(currentVideo)}
          onKeyDown={(e) => handleKeyDown(e, () => handleShareClick(currentVideo))}
          className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95"
          aria-label="Share this post"
        >
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

      {/* Comment Modal */}
      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        postId={commentPostId}
        businessName={currentBusiness?.business_name || currentVideo.profiles?.full_name}
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
