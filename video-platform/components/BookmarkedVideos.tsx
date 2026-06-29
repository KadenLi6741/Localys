'use client';

/**
 * BookmarkedVideos — grid of videos the user has saved/bookmarked.
 * Purpose: Renders on a user's own profile to show their saved videos. Bookmarks are private, so it
 *   only loads them when the logged-in user is viewing their own profile; otherwise it shows nothing.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

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

// Loads and displays the bookmarked-videos grid for the given profile owner.
export function BookmarkedVideos({ userId }: BookmarkedVideosProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarkedVideos();
  }, [userId]);

  // Fetches saved videos — but only for the owner. Bookmarks are private, so viewing someone
  // else's profile (or being logged out) returns an empty list rather than exposing their saves.
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
      } else if (data) {
        setVideos(data as Video[]);
      }
    } catch {
      setError('An error occurred while loading bookmarks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No bookmarked videos yet</p>
        <p className="text-gray-400 text-xs mt-1">Bookmark videos from the feed to see them here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {videos.map((video) => (
        <Link
          key={video.id}
          href={`/video/${video.id}`}
          className="group relative overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-700">
            {video.video_url && (
              <video
                src={video.video_url}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                muted
              />
            )}
            <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-colors duration-300" />
          </div>

          <div className="p-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {video.businesses?.business_name || video.profiles?.full_name || 'Video'}
            </h3>
            {video.caption && (
              <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mt-0.5">
                {video.caption}
              </p>
            )}
            {video.businesses && (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                {video.businesses.average_rating && (
                  <>
                    <span>{video.businesses.average_rating.toFixed(1)}</span>
                    <span>·</span>
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
