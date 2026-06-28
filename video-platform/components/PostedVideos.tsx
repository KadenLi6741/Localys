'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
const PromotionModal = dynamic(() => import('@/components/PromotionModal').then(mod => mod.PromotionModal), { ssr: false });
import { getUserCoins } from '@/lib/supabase/profiles';

interface PostedVideo {
  id: string;
  video_url: string;
  caption?: string;
  created_at: string;
  boost_value?: number;
  coins_spent_on_promotion?: number;
  likes: number;
  comments: number;
  views: number;
}

interface PostedVideosProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function PostedVideos({ userId, isOwnProfile = true }: PostedVideosProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<PostedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [promotingVideoId, setPromotingVideoId] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState(0);

  useEffect(() => {
    loadPostedVideos();
    if (isOwnProfile) {
      getUserCoins(userId).then(({ data }) => setUserCoins(data ?? 0));
    }
  }, [userId, isOwnProfile]);

  const loadPostedVideos = async () => {
    try {
      setLoading(true);
      const { data: userVideos, error: videosError } = await supabase
        .from('videos')
        .select('id, video_url, caption, created_at, boost_value, coins_spent_on_promotion, view_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      if (!userVideos || userVideos.length === 0) { setVideos([]); return; }

      const { data: allLikes } = await supabase.from('likes').select('video_id');
      const likesMap: { [key: string]: number } = {};
      if (allLikes) {
        allLikes.forEach((like: any) => {
          if (like.video_id) likesMap[like.video_id] = (likesMap[like.video_id] || 0) + 1;
        });
      }

      const videoIds = userVideos.map(v => v.id);
      let allComments: any[] = [];
      try {
        if (videoIds.length > 0) {
          const { data } = await supabase.from('comments').select('id, video_id').in('video_id', videoIds).is('parent_comment_id', null);
          if (data && data.length > 0) allComments = data;
        }
      } catch { /* silently fail */ }

      if (allComments.length === 0 && videoIds.length > 0) {
        try {
          const { data } = await supabase.from('comments').select('id, video_id').is('parent_comment_id', null);
          if (data) allComments = data.filter((c: any) => videoIds.includes(c.video_id));
        } catch { /* silently fail */ }
      }

      const commentsMap: { [key: string]: number } = {};
      allComments.forEach((c: any) => {
        if (c.video_id) commentsMap[c.video_id] = (commentsMap[c.video_id] || 0) + 1;
      });

      setVideos(userVideos.map((video: any) => ({
        ...video,
        likes: likesMap[video.id] || 0,
        comments: commentsMap[video.id] || 0,
        views: video.view_count || 0,
      })));
    } catch (error) {
      console.error('Error loading posted videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video? This cannot be undone.')) return;
    try {
      setDeletingVideoId(videoId);
      const { error } = await supabase.from('videos').delete().eq('id', videoId);
      if (error) throw error;
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setDeletingVideoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No videos posted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <div
          key={video.id}
          className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800"
        >
          <div className="flex gap-4 p-4">
            {/* Thumbnail */}
            <div
              className="flex-shrink-0 w-20 h-20 cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
              onClick={() => router.push(`/feed?videoId=${video.id}`)}
            >
              <video src={video.video_url} className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
                {video.caption || 'Untitled Video'}
              </h4>
              <p className="text-xs text-gray-400 mb-2">
                {new Date(video.created_at).toLocaleDateString()}
              </p>

              <div className="flex gap-3 text-xs text-gray-500">
                <span>{video.views} views</span>
                <span>{video.likes} likes</span>
                <span>{video.comments} comments</span>
              </div>

              {/* Boosted state: borderless black label */}
              {video.boost_value && video.boost_value > 1 && (
                <p className="mt-1.5 text-xs font-semibold text-gray-900 dark:text-white">
                  Boosted {video.boost_value.toFixed(1)}x
                </p>
              )}
            </div>

            {/* Action buttons */}
            {isOwnProfile && (
              <div className="flex flex-col justify-center gap-2 ml-1 shrink-0">
                <button
                  onClick={() => setPromotingVideoId(video.id)}
                  className="bg-[#f97316] hover:opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity"
                >
                  Boost
                </button>
                <button
                  onClick={() => deleteVideo(video.id)}
                  disabled={deletingVideoId === video.id}
                  className="bg-black hover:opacity-80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40"
                >
                  {deletingVideoId === video.id ? '...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {isOwnProfile && (
        <PromotionModal
          isOpen={promotingVideoId !== null}
          onClose={() => setPromotingVideoId(null)}
          videoId={promotingVideoId || ''}
          userCoins={userCoins}
          onSuccess={(newBoost, coinsSpent, remainingCoins) => {
            setUserCoins(remainingCoins);
            setVideos(prev =>
              prev.map(v =>
                v.id === promotingVideoId
                  ? { ...v, boost_value: newBoost, coins_spent_on_promotion: (v.coins_spent_on_promotion || 0) + coinsSpent }
                  : v
              )
            );
          }}
        />
      )}
    </div>
  );
}
