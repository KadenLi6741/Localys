'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ShoutoutCard, type Shoutout, type ShoutoutComment } from '@/components/explore/ShoutoutCard';
import { CreateShoutoutModal } from '@/components/explore/CreateShoutoutModal';
import { haversineDistance } from '@/lib/utils/geo';
import { Toast } from '@/components/Toast';

const TAGS = [
  { id: 'hidden-gem', label: 'Hidden Gem' },
  { id: 'cheap-eats', label: 'Cheap Eats' },
];

const TIME_FILTERS = [
  { id: 'latest', label: 'Latest' },
  { id: 'month', label: 'This Month' },
];

const PAGE_SIZE = 4;

export default function ExplorePage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingShoutout, setEditingShoutout] = useState<Shoutout | null>(null);

  // Feed state
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [timeFilter, setTimeFilter] = useState('latest');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [quickTag, setQuickTag] = useState<string | null>(null);

  // Comments cache
  const [commentsByShoutout, setCommentsByShoutout] = useState<Record<string, ShoutoutComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  // User profile for avatar
  const [userProfile, setUserProfile] = useState<{ profile_picture_url: string | null; username: string } | null>(null);

  // Distance filter
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [businessLocations, setBusinessLocations] = useState<Record<string, { latitude: number; longitude: number }>>({}); 
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!user) { setUserProfile(null); return; }
    supabase
      .from('profiles')
      .select('profile_picture_url, username')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setUserProfile(data);
      });
  }, [user]);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Load business locations for shoutouts
  useEffect(() => {
    const bizIds = [...new Set(shoutouts.map(s => s.business_id).filter(Boolean))] as string[];
    const missing = bizIds.filter(id => !(id in businessLocations));
    if (missing.length === 0) return;

    (async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, latitude, longitude')
        .in('id', missing);
      if (!data) return;
      const next = { ...businessLocations };
      data.forEach((b: { id: string; latitude: number | null; longitude: number | null }) => {
        if (b.latitude != null && b.longitude != null) {
          next[b.id] = { latitude: b.latitude, longitude: b.longitude };
        }
      });
      setBusinessLocations(next);
    })();
  }, [shoutouts]);

  const filteredShoutouts = useMemo(() => {
    if (distanceFilter == null || !userLocation) return shoutouts;
    return shoutouts.filter((s) => {
      if (!s.business_id) return false;
      const loc = businessLocations[s.business_id];
      if (!loc) return false;
      return haversineDistance(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude) <= distanceFilter;
    });
  }, [shoutouts, distanceFilter, userLocation, businessLocations]);

  const getTimeRange = useCallback(() => {
    const now = new Date();
    if (timeFilter === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (timeFilter === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }
    return null;
  }, [timeFilter]);

  const fetchShoutouts = useCallback(async (pageNum: number, reset = false) => {
    setLoading(true);

    let query = supabase
      .from('shoutouts')
      .select(`
        id, user_id, business_name, business_id, text, star_rating, tags, video_url, created_at,
        profiles!shoutouts_user_id_fkey(username, profile_picture_url),
        shoutout_photos(photo_url),
        shoutout_likes(user_id),
        shoutout_comments(id)
      `)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    const timeRange = getTimeRange();
    if (timeRange) {
      query = query.gte('created_at', timeRange);
    }

    const activeTag = tagFilter || quickTag;
    if (activeTag) {
      query = query.contains('tags', [activeTag]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shoutouts:', error);
      setLoading(false);
      return;
    }

    const mapped: Shoutout[] = (data || []).map((s: Record<string, unknown>) => {
      const profile = s.profiles as { username: string; profile_picture_url: string | null } | null;
      const photos = (s.shoutout_photos as { photo_url: string }[]) || [];
      const likes = (s.shoutout_likes as { user_id: string }[]) || [];
      const comments = (s.shoutout_comments as { id: string }[]) || [];

      return {
        id: s.id as string,
        user_id: s.user_id as string,
        username: profile?.username || 'Unknown',
        profile_picture_url: profile?.profile_picture_url || null,
        business_name: s.business_name as string,
        business_id: s.business_id as string | null,
        text: s.text as string,
        star_rating: s.star_rating as number | null,
        tags: (s.tags as string[]) || [],
        photos: photos.map((p) => p.photo_url),
        video_url: (s.video_url as string) || null,
        created_at: s.created_at as string,
        likes: likes.length,
        liked_by_me: user ? likes.some((l) => l.user_id === user.id) : false,
        comment_count: comments.length,
      };
    });

    if (reset) {
      setShoutouts(mapped);
    } else {
      setShoutouts((prev) => [...prev, ...mapped]);
    }
    setHasMore(mapped.length === PAGE_SIZE);
    setLoading(false);
  }, [user, getTimeRange, tagFilter, quickTag]);

  // Reload when filters change
  useEffect(() => {
    setPage(0);
    fetchShoutouts(0, true);
  }, [fetchShoutouts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchShoutouts(nextPage);
  };

  // Like a shoutout
  const handleLike = async (shoutoutId: string) => {
    if (!user) return;
    const existing = shoutouts.find((s) => s.id === shoutoutId);
    if (!existing) return;

    if (existing.liked_by_me) {
      await supabase.from('shoutout_likes').delete().eq('user_id', user.id).eq('shoutout_id', shoutoutId);
    } else {
      await supabase.from('shoutout_likes').insert({ user_id: user.id, shoutout_id: shoutoutId });
    }
    // Toggle local state
    setShoutouts((prev) =>
      prev.map((s) =>
        s.id === shoutoutId
          ? { ...s, liked_by_me: !s.liked_by_me, likes: s.liked_by_me ? s.likes - 1 : s.likes + 1 }
          : s
      )
    );
  };

  // Load comments for a shoutout
  const handleLoadComments = async (shoutoutId: string) => {
    setLoadingComments((prev) => ({ ...prev, [shoutoutId]: true }));
    const { data } = await supabase
      .from('shoutout_comments')
      .select(`
        id, user_id, shoutout_id, parent_comment_id, text, created_at,
        profiles!shoutout_comments_user_id_fkey(username, profile_picture_url),
        shoutout_comment_likes(user_id)
      `)
      .eq('shoutout_id', shoutoutId)
      .order('created_at', { ascending: true });

    const mapped: ShoutoutComment[] = (data || []).map((c: Record<string, unknown>) => {
      const profile = c.profiles as { username: string; profile_picture_url: string | null } | null;
      const likes = (c.shoutout_comment_likes as { user_id: string }[]) || [];
      return {
        id: c.id as string,
        user_id: c.user_id as string,
        username: profile?.username || 'Unknown',
        profile_picture_url: profile?.profile_picture_url || null,
        text: c.text as string,
        created_at: c.created_at as string,
        parent_comment_id: c.parent_comment_id as string | null,
        likes: likes.length,
        liked_by_me: user ? likes.some((l) => l.user_id === user.id) : false,
      };
    });

    setCommentsByShoutout((prev) => ({ ...prev, [shoutoutId]: mapped }));
    setLoadingComments((prev) => ({ ...prev, [shoutoutId]: false }));
  };

  // Submit a comment
  const handleSubmitComment = async (shoutoutId: string, text: string, parentId?: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('shoutout_comments')
      .insert({
        user_id: user.id,
        shoutout_id: shoutoutId,
        parent_comment_id: parentId || null,
        text,
      })
      .select('id, created_at')
      .single();

    if (data) {
      const newComment: ShoutoutComment = {
        id: data.id,
        user_id: user.id,
        username: userProfile?.username || 'You',
        profile_picture_url: userProfile?.profile_picture_url || null,
        text,
        created_at: data.created_at,
        parent_comment_id: parentId || null,
        likes: 0,
        liked_by_me: false,
      };
      setCommentsByShoutout((prev) => ({
        ...prev,
        [shoutoutId]: [...(prev[shoutoutId] || []), newComment],
      }));
      setShoutouts((prev) =>
        prev.map((s) => s.id === shoutoutId ? { ...s, comment_count: s.comment_count + 1 } : s)
      );
    }
  };

  // Like a comment
  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    // Find which shoutout this comment belongs to
    let shoutoutId = '';
    for (const [sid, comments] of Object.entries(commentsByShoutout)) {
      if (comments.some((c) => c.id === commentId)) { shoutoutId = sid; break; }
    }
    if (!shoutoutId) return;

    const comment = commentsByShoutout[shoutoutId]?.find((c) => c.id === commentId);
    if (!comment) return;

    if (comment.liked_by_me) {
      await supabase.from('shoutout_comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
    } else {
      await supabase.from('shoutout_comment_likes').insert({ user_id: user.id, comment_id: commentId });
    }

    setCommentsByShoutout((prev) => ({
      ...prev,
      [shoutoutId]: prev[shoutoutId].map((c) =>
        c.id === commentId
          ? { ...c, liked_by_me: !c.liked_by_me, likes: c.liked_by_me ? c.likes - 1 : c.likes + 1 }
          : c
      ),
    }));
  };

  // Submit a shoutout
  const handleSubmitShoutout = async (data: {
    business_name: string;
    business_id: string | null;
    text: string;
    tags: string[];
    star_rating: number | null;
    photos: File[];
    video: File | null;
    invite_to_localy: boolean;
  }) => {
    if (!user) return;
    setSubmitting(true);

    // EDIT MODE: update existing shoutout
    if (editingShoutout) {
      const { error } = await supabase
        .from('shoutouts')
        .update({
          business_name: data.business_name,
          business_id: data.business_id,
          text: data.text,
          tags: data.tags,
          star_rating: data.star_rating,
        })
        .eq('id', editingShoutout.id);

      if (error) {
        console.error('Error updating shoutout:', error);
        setSubmitting(false);
        return;
      }

      // Upload new photos if any
      const newPhotoUrls: string[] = [];
      for (const file of data.photos) {
        const ext = file.name.split('.').pop();
        const path = `shoutouts/${editingShoutout.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('shoutout-photos')
          .upload(path, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('shoutout-photos').getPublicUrl(path);
          newPhotoUrls.push(urlData.publicUrl);
        }
      }
      if (newPhotoUrls.length > 0) {
        await supabase.from('shoutout_photos').insert(
          newPhotoUrls.map((url) => ({ shoutout_id: editingShoutout.id, photo_url: url }))
        );
      }

      // Update local state
      setShoutouts((prev) =>
        prev.map((s) =>
          s.id === editingShoutout.id
            ? {
                ...s,
                business_name: data.business_name,
                business_id: data.business_id,
                text: data.text,
                tags: data.tags,
                star_rating: data.star_rating,
                photos: data.photos.length > 0 ? [...editingShoutout.photos, ...newPhotoUrls] : editingShoutout.photos,
              }
            : s
        )
      );

      setShowModal(false);
      setEditingShoutout(null);
      setSubmitting(false);
      return;
    }

    // Insert shoutout
    const { data: shoutout, error } = await supabase
      .from('shoutouts')
      .insert({
        user_id: user.id,
        business_name: data.business_name,
        business_id: data.business_id,
        text: data.text,
        tags: data.tags,
        star_rating: data.star_rating,
      })
      .select('id, created_at')
      .single();

    if (error || !shoutout) {
      console.error('Error creating shoutout:', error);
      setSubmitting(false);
      return;
    }

    // Upload photos
    const photoUrls: string[] = [];
    for (const file of data.photos) {
      const ext = file.name.split('.').pop();
      const path = `shoutouts/${shoutout.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('shoutout-photos')
        .upload(path, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('shoutout-photos')
          .getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }
    }

    // Insert photo records
    if (photoUrls.length > 0) {
      await supabase.from('shoutout_photos').insert(
        photoUrls.map((url) => ({ shoutout_id: shoutout.id, photo_url: url }))
      );
    }

    // Upload video if present
    let videoUrl: string | null = null;
    if (data.video) {
      const ext = data.video.name.split('.').pop();
      const path = `shoutouts/${shoutout.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('shoutout-videos')
        .upload(path, data.video);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('shoutout-videos')
          .getPublicUrl(path);
        videoUrl = urlData.publicUrl;
        await supabase.from('shoutouts').update({ video_url: videoUrl }).eq('id', shoutout.id);
      }
    }

    // Prepend to feed
    const newShoutout: Shoutout = {
      id: shoutout.id,
      user_id: user.id,
      username: userProfile?.username || 'You',
      profile_picture_url: userProfile?.profile_picture_url || null,
      business_name: data.business_name,
      business_id: data.business_id,
      text: data.text,
      star_rating: data.star_rating,
      tags: data.tags,
      photos: photoUrls,
      video_url: videoUrl,
      created_at: shoutout.created_at,
      likes: 0,
      liked_by_me: false,
      comment_count: 0,
    };

    setShoutouts((prev) => [newShoutout, ...prev]);
    setShowModal(false);
    setSubmitting(false);
  };

  // Delete a shoutout
  const handleDeleteShoutout = async (id: string) => {
    await supabase.from('shoutouts').delete().eq('id', id);
    setShoutouts((prev) => prev.filter((s) => s.id !== id));
  };

  // Open edit modal pre-filled
  const handleEditShoutout = (shoutout: Shoutout) => {
    setEditingShoutout(shoutout);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-8">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-8">

        {/* ===== HEADER ===== */}
        <div className="mb-8" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-light text-[#1A1A1A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Blogs</h1>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#1A1A1A]/90 transition-all active:scale-[0.98]"
            >
              Write a Shoutout
            </button>
          </div>
          <p className="text-sm text-[#6B6B65]">Discover and shoutout amazing local businesses</p>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="flex gap-2 mb-8" style={{ animation: 'fadeInUp 0.3s ease-out 0.1s both' }}>
          {TIME_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setTimeFilter(f.id); setTagFilter(null); setQuickTag(null); }}
              className={`flex-1 text-center px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                timeFilter === f.id && !tagFilter
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white text-[#6B6B65] hover:text-[#1A1A1A] border border-[#E8E8E4]'
              }`}
            >
              {f.label}
            </button>
          ))}
          {TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setTagFilter(tagFilter === tag.id ? null : tag.id);
                setQuickTag(null);
              }}
              className={`flex-1 text-center px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                tagFilter === tag.id
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white text-[#6B6B65] hover:text-[#1A1A1A] border border-[#E8E8E4]'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* ===== BLOG GRID ===== */}
        {loading && shoutouts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-[#F8F8F6] mb-3" />
                <div className="h-2 w-16 bg-[#F8F8F6] rounded mb-2" />
                <div className="h-3 w-3/4 bg-[#F8F8F6] rounded mb-2" />
                <div className="h-2 w-full bg-[#F8F8F6] rounded" />
              </div>
            ))}
          </div>
        ) : filteredShoutouts.length === 0 ? (
          <div className="text-center py-16" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
            <p className="text-[#1A1A1A] font-semibold mb-2">No posts yet</p>
            <p className="text-sm text-[#6B6B65] mb-4">Be the first to shoutout an amazing local business!</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2.5 bg-[#1A1A1A] text-white font-semibold hover:bg-[#1A1A1A]/90 transition-all active:scale-[0.98]"
            >
              Create First Shoutout
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredShoutouts.map((shoutout, i) => {
                const photoUrl = shoutout.photos?.[0] || null;
                const dateStr = new Date(shoutout.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const excerpt = shoutout.text.length > 100 ? shoutout.text.slice(0, 100) + '...' : shoutout.text;
                const isAuthor = user?.id === shoutout.user_id;

                return (
                  <article
                    key={shoutout.id}
                    className="group relative"
                    style={{ animation: `fadeInUp 0.3s ease-out ${0.05 * i}s both` }}
                  >
                    <Link href={`/explore/${shoutout.id}`} className="block cursor-pointer">
                    {/* 4:3 Photo */}
                    <div className="relative aspect-[4/3] bg-[#F8F8F6] overflow-hidden mb-3">
                      {photoUrl ? (
                        <Image
                          src={photoUrl}
                          alt={shoutout.business_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      ) : shoutout.video_url ? (
                        <video src={shoutout.video_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-[#E8E8E4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                      )}
                      {/* Tags overlay */}
                      {shoutout.tags.length > 0 && (
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {shoutout.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-[#1A1A1A] px-2 py-0.5">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-[11px] text-[#9E9A90] uppercase tracking-wider mb-1">{dateStr}</p>

                    {/* Title (business name) */}
                    <h3
                      className="text-lg font-light text-[#1A1A1A] mb-1 group-hover:text-[#1B5EA8] transition-colors"
                      style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    >
                      {shoutout.business_name}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-xs text-[#6B6B65] leading-relaxed">{excerpt}</p>

                    {/* Author */}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[#9E9A90]">
                      <span>By @{shoutout.username}</span>
                    </div>
                    </Link>

                    {/* Delete button — author only */}
                    {isAuthor && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm('Delete this blog post?')) {
                            handleDeleteShoutout(shoutout.id);
                          }
                        }}
                        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-white/80 backdrop-blur-sm text-[#E05C3A] hover:bg-white hover:text-[#E05C3A]/80 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Delete post"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => {
                  if (page > 0) {
                    const prevPage = page - 1;
                    setPage(prevPage);
                    fetchShoutouts(prevPage, true);
                  }
                }}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-medium border border-[#E8E8E4] text-[#1A1A1A] hover:bg-[#F8F8F6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-[#6B6B65]">Page {page + 1}</span>
              <button
                onClick={() => {
                  if (hasMore) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchShoutouts(nextPage, true);
                  }
                }}
                disabled={!hasMore}
                className="px-4 py-2 text-sm font-medium border border-[#E8E8E4] text-[#1A1A1A] hover:bg-[#F8F8F6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Create Shoutout Modal */}
      <CreateShoutoutModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingShoutout(null); }}
        onSubmit={handleSubmitShoutout}
        submitting={submitting}
        editData={editingShoutout ? {
          business_name: editingShoutout.business_name,
          business_id: editingShoutout.business_id,
          text: editingShoutout.text,
          tags: editingShoutout.tags,
          star_rating: editingShoutout.star_rating,
          photos: editingShoutout.photos,
          video_url: editingShoutout.video_url,
        } : null}
      />

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
