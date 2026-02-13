'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserBookmarkedVideos } from '@/lib/supabase/videos';
import { useAuth } from '@/contexts/AuthContext';

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
  };
}

interface BookmarkedVideosProps {
  userId: string;
}

export function BookmarkedVideos({ userId }: BookmarkedVideosProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarkedVideos();
  }, [userId]);

  const loadBookmarkedVideos = async () => {
    if (!user || user.id !== userId) {
      setVideos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await getUserBookmarkedVideos(userId, 20, 0);
      
      if (fetchError) {
        setError('Failed to load bookmarks');
        console.error('Error loading bookmarked videos:', fetchError);
      } else if (data) {
        setVideos(data as Video[]);
      }
    } catch (err) {
      setError('An error occurred while loading bookmarks');
      console.error('Exception loading bookmarked videos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60">No bookmarked videos yet</p>
        <p className="text-white/40 text-sm mt-2">Bookmark videos from the feed to see them here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <Link
          key={video.id}
          href={`/video/${video.id}`}
          className="group relative overflow-hidden rounded-lg bg-black/20 border border-white/10 hover:border-white/30 transition-all duration-300"
        >
          <div className="aspect-video relative overflow-hidden bg-black">
            {video.video_url && (
              <video
                src={video.video_url}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                muted
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
          </div>
          
          <div className="p-3">
            <h3 className="font-semibold text-white text-sm truncate">
              {video.businesses?.business_name || video.profiles?.full_name || 'Video'}
            </h3>
            {video.caption && (
              <p className="text-white/70 text-xs line-clamp-2 mt-1">
                {video.caption}
              </p>
            )}
            {video.businesses && (
              <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
                {video.businesses.average_rating && (
                  <>
                    <span>⭐ {video.businesses.average_rating.toFixed(1)}</span>
                    <span>•</span>
                  </>
                )}
                <span>{video.businesses.total_reviews || 0} reviews</span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
