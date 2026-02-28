'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { likeItem, unlikeItem, getLikeCounts } from '@/lib/supabase/videos';
import { CommentModal } from '@/components/CommentModal';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { haversineDistance } from '@/lib/utils/geo';

interface Video {
  id: string;
  caption: string;
  video_url: string;
  user_id?: string;
  business_id?: string;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    profile_picture_url: string;
  };
  businesses?: {
    id: string;
    owner_id: string;
    business_name: string;
    profile_picture_url: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    average_rating?: number;
    total_reviews?: number;
    custom_messages?: string[];
  };
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const videoId = params?.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadVideo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) {
        setError('Video not found');
        return;
      }

      const enrichedVideo = { ...videoData };

      if (videoData.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_picture_url')
          .eq('id', videoData.user_id)
          .single();
        if (profile) {
          enrichedVideo.profiles = profile;
        }
      }

      if (videoData.business_id) {
        const { data: business } = await supabase
          .from('businesses')
          .select('id, owner_id, business_name, profile_picture_url, category, latitude, longitude, average_rating, total_reviews, custom_messages')
          .eq('id', videoData.business_id)
          .single();
        if (business) {
          enrichedVideo.businesses = business;
        }

        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('price')
          .eq('user_id', videoData.business_id)
          .ilike('category', 'main');

        const prices = (menuItems || [])
          .map((item: { price: number | string }) => (typeof item.price === 'number' ? item.price : Number(item.price)))
          .filter((price: number) => Number.isFinite(price) && price > 0);

        if (prices.length > 0) {
          setPriceRange({
            min: Math.floor(Math.min(...prices)),
            max: Math.ceil(Math.max(...prices)),
          });
        } else {
          setPriceRange(null);
        }
      } else {
        setPriceRange(null);
      }

      setVideo(enrichedVideo);

      if (videoData.business_id) {
        const { data: counts } = await getLikeCounts([videoData.business_id]);
        if (counts && typeof counts === 'object') {
          const typedCounts = counts as Record<string, number>;
          setLikeCount(typedCounts[videoData.business_id] || 0);
        }
      } else {
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', videoId);
        setLikeCount(count || 0);
      }

      if (user) {
        const likeKey = videoData.business_id || videoId;
        const { data: userLike } = await supabase
          .from('likes')
          .select('*')
          .eq(videoData.business_id ? 'business_id' : 'video_id', likeKey)
          .eq('user_id', user.id)
          .single();
        setLiked(!!userLike);
      }
    } catch (err) {
      console.error('Error loading video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [videoId, user]);

  useEffect(() => {
    if (!videoId) return;
    loadVideo();
  }, [videoId, loadVideo]);

  const handleToggleLike = async () => {
    if (!user || !video) return;

    try {
      const likeKey = video.business_id || video.id;
      const itemType = video.business_id ? 'business' : 'video';

      if (liked) {
        await unlikeItem(user.id, likeKey, itemType);
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await likeItem(user.id, likeKey, itemType);
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleCommentClick = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setCommentModalOpen(true);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const distanceKm = useMemo(() => {
    if (!video?.businesses?.latitude || !video.businesses.longitude || !userCoords) return null;
    return haversineDistance(
      userCoords.lat,
      userCoords.lng,
      video.businesses.latitude,
      video.businesses.longitude
    );
  }, [video?.businesses?.latitude, video?.businesses?.longitude, userCoords]);

  const estimatedMinutes = useMemo(() => {
    if (distanceKm === null) return null;
    return Math.max(4, Math.round((distanceKm / 35) * 60));
  }, [distanceKm]);

  const distanceLabel = useMemo(() => {
    if (distanceKm === null) return null;
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
    return `${distanceKm.toFixed(1)} km`;
  }, [distanceKm]);

  const priceSignal = useMemo(() => {
    if (!priceRange) return null;
    const average = (priceRange.min + priceRange.max) / 2;
    if (average < 15) return '$';
    if (average < 30) return '$$';
    if (average < 60) return '$$$';
    return '$$$$';
  }, [priceRange]);

  const handleSendQuickMessage = async (messageText: string) => {
    if (!user || !video?.businesses) {
      router.push('/login');
      return;
    }

    try {
      const businessOwnerId = video.businesses.owner_id;

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user_id.eq.${user.id},other_user_id.eq.${businessOwnerId}),and(user_id.eq.${businessOwnerId},other_user_id.eq.${user.id})`)
        .single();

      let conversationId: string;

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            other_user_id: businessOwnerId,
          })
          .select('id')
          .single();

        if (convError || !newConversation) {
          console.error('Failed to create conversation:', convError);
          return;
        }

        conversationId = newConversation.id;
      }

      // Send the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content: messageText,
        });

      if (messageError) {
        console.error('Failed to send message:', messageError);
        return;
      }

      // Navigate to chat
      router.push(`/chats/${conversationId}`);
    } catch (err) {
      console.error('Error sending quick message:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error || 'Video not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const creator = video.businesses || video.profiles;
  const creatorName = video.businesses?.business_name || video.profiles?.full_name || 'Unknown';
  const creatorImage = creator?.profile_picture_url || 'https://via.placeholder.com/60';
  const hasBusinessLocation = Boolean(video.businesses?.latitude && video.businesses?.longitude);
  const directionsUrl = hasBusinessLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${video.businesses!.latitude},${video.businesses!.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(creatorName)}`;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← Back
        </button>

        {/* Video Container */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Video Player */}
          <div className="relative bg-black aspect-video flex items-center justify-center group">
            <video
              src={video.video_url}
              controls
              className="w-full h-full object-contain"
              autoPlay
            />

            {/* Floating Message Buttons */}
            {video.businesses && video.businesses.custom_messages && video.businesses.custom_messages.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {video.businesses.custom_messages.map((message, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendQuickMessage(message)}
                    className="px-3 py-2 bg-blue-500/70 hover:bg-blue-600/70 text-white text-sm rounded-lg backdrop-blur-sm transition-all hover:scale-105"
                  >
                    💬 {message}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="p-6 space-y-4">
            {/* Caption */}
            <p className="text-white text-lg">{video.caption}</p>

            {/* Creator Info */}
            <div className="flex items-center gap-3">
              <Image
                src={creatorImage}
                alt={creatorName}
                width={48}
                height={48}
                unoptimized
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="text-white font-semibold">{creatorName}</p>
                <p className="text-gray-400 text-sm">
                  {new Date(video.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {video.businesses && (
              <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold">Restaurant Snapshot</p>
                  {video.businesses.category && (
                    <span className="text-xs uppercase tracking-wide text-gray-300 bg-gray-700 px-2 py-1 rounded-full">
                      {video.businesses.category}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gray-900/80 p-3">
                    <p className="text-xs text-gray-400">{t('video.info.price')}</p>
                    <p className="text-white font-semibold">
                      {priceRange ? `${priceSignal} · $${priceRange.min}-$${priceRange.max}` : '—'}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-900/80 p-3">
                    <p className="text-xs text-gray-400">{t('video.info.distance')}</p>
                    <p className="text-white font-semibold">{distanceLabel || 'Tap GPS below'}</p>
                  </div>

                  <div className="rounded-lg bg-gray-900/80 p-3">
                    <p className="text-xs text-gray-400">{t('video.info.eta')}</p>
                    <p className="text-white font-semibold">{estimatedMinutes ? `${estimatedMinutes} min` : '—'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={requestLocation}
                    disabled={isLocating}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm rounded-lg transition"
                  >
                    {isLocating ? 'Locating...' : '📍 Use GPS'}
                  </button>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition"
                  >
                    {t('video.info.get_directions')}
                  </a>

                  <Link
                    href={`/profile/${video.businesses.id}`}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                  >
                    {t('video.info.view_menu')}
                  </Link>
                </div>

                {(video.businesses.average_rating || video.businesses.total_reviews) && (
                  <p className="text-sm text-gray-300">
                    ⭐ {video.businesses.average_rating?.toFixed(1) || '—'} · {video.businesses.total_reviews || 0} reviews
                  </p>
                )}
              </div>
            )}

            {/* Interaction Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-700">
              {/* Like Button */}
              <button
                onClick={handleToggleLike}
                disabled={!user}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  liked
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {likeCount}
              </button>

              {/* Comment Button */}
              <button
                onClick={handleCommentClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comment
              </button>

              {/* Share Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`);
                  alert('Link copied to clipboard!');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.339 10.053 12.052 7.998 15.468 7.998c3.416 0 6.130 2.055 6.784 5.344M9 19H5a2 2 0 01-2-2V7a2 2 0 012-2h4m0 0a8.001 8.001 0 018 8m0 0v4m0-11v-4m0 11H9m4 0h4" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      {video && (
        <CommentModal
          isOpen={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
          postId={video.id}
          businessName={creatorName}
        />
      )}
    </div>
  );
}
