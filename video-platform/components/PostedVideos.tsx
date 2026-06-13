'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { getUserCoins } from '@/lib/supabase/profiles';

const PromotionModal = dynamic(
  () => import('@/components/PromotionModal').then((mod) => mod.PromotionModal),
  { ssr: false }
);

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

type VideoRow = {
  id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  boost_value: number | null;
  coins_spent_on_promotion: number | null;
  view_count: number | null;
};

type LikeRow = {
  video_id: string | null;
};

type CommentRow = {
  video_id: string | null;
};

function formatViewCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function getDisplayedViews(video: Pick<PostedVideo, 'views' | 'likes'>) {
  const safeViews = Number.isFinite(video.views) ? Math.max(0, video.views) : 0;
  const safeLikes = Number.isFinite(video.likes) ? Math.max(0, video.likes) : 0;
  return safeViews + safeLikes;
}

export function PostedVideos({ userId, isOwnProfile = true }: PostedVideosProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<PostedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [promotingVideoId, setPromotingVideoId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState(0);

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [videos, selectedVideoId]
  );

  const loadPostedVideos = useCallback(async () => {
    try {
      setLoading(true);

      const { data: userVideos, error: videosError } = await supabase
        .from('videos')
        .select('id, video_url, caption, created_at, boost_value, coins_spent_on_promotion, view_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      const typedVideos = (userVideos ?? []) as VideoRow[];
      if (typedVideos.length === 0) {
        setVideos([]);
        return;
      }

      const videoIds = typedVideos.map((video) => video.id);

      const [{ data: likesRows, error: likesError }, { data: commentsRows, error: commentsError }] =
        await Promise.all([
          supabase.from('likes').select('video_id').in('video_id', videoIds),
          supabase
            .from('comments')
            .select('video_id')
            .in('video_id', videoIds)
            .is('parent_comment_id', null),
        ]);

      if (likesError) throw likesError;
      if (commentsError) throw commentsError;

      const likesMap: Record<string, number> = {};
      for (const row of (likesRows ?? []) as LikeRow[]) {
        if (!row.video_id) continue;
        likesMap[row.video_id] = (likesMap[row.video_id] ?? 0) + 1;
      }

      const commentsMap: Record<string, number> = {};
      for (const row of (commentsRows ?? []) as CommentRow[]) {
        if (!row.video_id) continue;
        commentsMap[row.video_id] = (commentsMap[row.video_id] ?? 0) + 1;
      }

      const videosWithStats: PostedVideo[] = typedVideos.map((video) => ({
        id: video.id,
        video_url: video.video_url,
        caption: video.caption ?? undefined,
        created_at: video.created_at,
        boost_value: video.boost_value ?? undefined,
        coins_spent_on_promotion: video.coins_spent_on_promotion ?? undefined,
        likes: likesMap[video.id] ?? 0,
        comments: commentsMap[video.id] ?? 0,
        views: video.view_count ?? 0,
      }));

      setVideos(videosWithStats);
    } catch (error) {
      console.error('Error loading posted videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPostedVideos();
  }, [loadPostedVideos]);

  useEffect(() => {
    if (!isOwnProfile) return;

    getUserCoins(userId).then(({ data }) => setUserCoins(data ?? 0));
  }, [isOwnProfile, userId]);

  useEffect(() => {
    if (!selectedVideoId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedVideoId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedVideoId]);

  const deleteVideo = useCallback(
    async (videoId: string) => {
      if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
        return;
      }

      try {
        setDeletingVideoId(videoId);

        const { error } = await supabase
          .from('videos')
          .delete()
          .eq('id', videoId);

        if (error) throw error;

        setVideos((prev) => prev.filter((video) => video.id !== videoId));
        setSelectedVideoId((prev) => (prev === videoId ? null : prev));
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video. Please try again.');
      } finally {
        setDeletingVideoId(null);
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-tertiary)]">
        <p>No videos posted yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => setSelectedVideoId(video.id)}
            className="relative aspect-[9/16] overflow-hidden rounded-md bg-black/10 group text-left"
            aria-label={`Open video ${video.caption || video.id}`}
          >
            <video
              src={video.video_url}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              preload="metadata"
              muted
              playsInline
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="pointer-events-none absolute left-2 bottom-2 flex items-center gap-3 text-white">
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 5c5.5 0 9.7 4.1 11 6.9-1.3 2.8-5.5 6.9-11 6.9S2.3 14.7 1 11.9C2.3 9.1 6.5 5 12 5zm0 2.2a4.7 4.7 0 100 9.4 4.7 4.7 0 000-9.4z" />
                </svg>
                <span className="text-xs font-semibold">{formatViewCount(getDisplayedViews(video))}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5A4.5 4.5 0 016.5 4c1.74 0 3.41.81 4.5 2.09A5.9 5.9 0 0115.5 4 4.5 4.5 0 0120 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
                </svg>
                <span className="text-xs font-semibold">{formatViewCount(video.likes)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedVideoId(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#0F0F0F] text-white rounded-xl border border-white/10 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-sm font-medium truncate pr-4">
                {selectedVideo.caption || 'Video details'}
              </p>
              <button
                onClick={() => setSelectedVideoId(null)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close video details"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="bg-black">
                <video
                  src={selectedVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[72vh] object-contain"
                />
              </div>

              <div className="p-4 border-t lg:border-t-0 lg:border-l border-white/10 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/50">Views</p>
                  <p className="text-sm font-semibold">{getDisplayedViews(selectedVideo).toLocaleString()}</p>
                  <p className="text-xs text-white/60">
                    {new Date(selectedVideo.created_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => router.push(`/video/${selectedVideo.id}`)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Open Full Video Page
                </button>

                {isOwnProfile && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <p className="text-xs uppercase tracking-wide text-white/50">Owner Controls</p>

                    <button
                      onClick={() => setPromotingVideoId(selectedVideo.id)}
                      className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      Boost Video
                    </button>

                    <button
                      onClick={() => {
                        setSelectedVideoId(null);
                        router.push('/analytics');
                      }}
                      className="w-full bg-primary/20 hover:bg-primary/30 text-primary/20 text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      View Analytics
                    </button>

                    <button
                      onClick={() => deleteVideo(selectedVideo.id)}
                      disabled={deletingVideoId === selectedVideo.id}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingVideoId === selectedVideo.id ? 'Deleting...' : 'Delete Video'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isOwnProfile && (
        <PromotionModal
          isOpen={promotingVideoId !== null}
          onClose={() => setPromotingVideoId(null)}
          videoId={promotingVideoId || ''}
          userCoins={userCoins}
          onSuccess={(newBoost, coinsSpent, remainingCoins) => {
            setUserCoins(remainingCoins);
            setVideos((prev) =>
              prev.map((video) =>
                video.id === promotingVideoId
                  ? {
                      ...video,
                      boost_value: newBoost,
                      coins_spent_on_promotion: (video.coins_spent_on_promotion || 0) + coinsSpent,
                    }
                  : video
              )
            );
          }}
        />
      )}
    </>
  );
}
