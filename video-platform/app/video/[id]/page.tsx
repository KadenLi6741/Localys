'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { likeItem, unlikeItem, getLikeCounts } from '@/lib/supabase/videos';
import { CommentModal } from '@/components/CommentModal';
import Link from 'next/link';

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
    business_name: string;
    profile_picture_url: string;
  };
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const videoId = params?.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    loadVideo();
  }, [videoId, user]);

  const loadVideo = async () => {
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

      let enrichedVideo = { ...videoData };

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
          .select('id, business_name, profile_picture_url')
          .eq('id', videoData.business_id)
          .single();
        if (business) {
          enrichedVideo.businesses = business;
        }
      }

      setVideo(enrichedVideo);

      if (videoData.business_id) {
        const { data: counts } = await getLikeCounts([videoData.business_id]);
        if (counts && typeof counts === 'object') {
          setLikeCount((counts as any)[videoData.business_id] || 0);
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
    } catch (err: any) {
      console.error('Error loading video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="relative bg-black aspect-video flex items-center justify-center">
            <video
              src={video.video_url}
              controls
              className="w-full h-full object-contain"
              autoPlay
            />
          </div>

          {/* Video Info */}
          <div className="p-6 space-y-4">
            {/* Caption */}
            <p className="text-white text-lg">{video.caption}</p>

            {/* Creator Info */}
            <div className="flex items-center gap-3">
              <img
                src={creatorImage}
                alt={creatorName}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="text-white font-semibold">{creatorName}</p>
                <p className="text-gray-400 text-sm">
                  {new Date(video.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

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
