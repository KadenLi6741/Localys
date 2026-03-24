'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ShoutoutCard, type Shoutout, type ShoutoutComment } from '@/components/explore/ShoutoutCard';
import { CreateShoutoutModal } from '@/components/explore/CreateShoutoutModal';
import { haversineDistance } from '@/lib/utils/geo';
import { Toast } from '@/components/Toast';

const TAGS = [
  { id: 'hidden-gem', label: '#HiddenGem' },
  { id: 'cheap-eats', label: '#CheapEats' },
  { id: 'must-visit', label: '#MustVisit' },
  { id: 'new-spot', label: '#NewSpot' },
  { id: 'great-service', label: '#GreatService' },
];

const TIME_FILTERS = [
  { id: 'latest', label: 'Latest' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

const PAGE_SIZE = 10;

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
    <div className="min-h-screen bg-transparent pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6">

        {/* ===== TOP SECTION: Create a Shoutout ===== */}
        <div
          className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-2xl p-4 mb-6"
          style={{ animation: 'fadeInUp 0.3s ease-out' }}
        >
          <div className="mb-3">
            <h1 className="text-2xl font-bold text-[var(--color-cream)]">Explore</h1>
            <p className="text-xs text-[var(--color-body-text)] mt-0.5">Discover &amp; shoutout amazing local businesses</p>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-3 mb-3">
            {userProfile?.profile_picture_url ? (
              <Image
                src={userProfile.profile_picture_url}
                alt={userProfile.username}
                width={36}
                height={36}
                unoptimized
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[var(--color-charcoal-lighter-plus)] flex items-center justify-center shrink-0">
                <span className="text-sm text-[var(--color-body-text)]">
                  {userProfile?.username?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 text-left bg-[var(--color-charcoal)] border border-[var(--color-charcoal-lighter-plus)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-body-text)] hover:border-[#F5A623]/40 transition-colors"
            >
              Shoutout a local business...
            </button>
          </div>

        </div>

        {/* ===== BOTTOM SECTION: Shoutout Feed ===== */}
        <div>
          {/* Filter bar */}
          <div
            className="flex flex-col gap-3 mb-5"
            style={{ animation: 'fadeInUp 0.3s ease-out 0.1s both' }}
          >
            {/* Time filters */}
            <div className="flex gap-2 w-full">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTimeFilter(f.id)}
                  className={`flex-1 text-center px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                    timeFilter === f.id
                      ? 'bg-[#F5A623] text-black'
                      : 'bg-[var(--color-charcoal-light)] text-[var(--color-body-text)] hover:text-[var(--color-cream)] border border-[var(--color-charcoal-lighter-plus)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tag filters */}
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    setTagFilter(tagFilter === tag.id ? null : tag.id);
                    setQuickTag(null);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all duration-200 ${
                    tagFilter === tag.id
                      ? 'bg-[#F5A623] text-black'
                      : 'bg-[var(--color-charcoal-light)] text-[var(--color-body-text)] hover:text-[var(--color-cream)] border border-[var(--color-charcoal-lighter-plus)]'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          {loading && shoutouts.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-charcoal-lighter-plus)]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-24 bg-[var(--color-charcoal-lighter-plus)] rounded" />
                      <div className="h-2 w-16 bg-[var(--color-charcoal-lighter-plus)] rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-3/4 bg-[var(--color-charcoal-lighter-plus)] rounded mb-2" />
                  <div className="h-3 w-1/2 bg-[var(--color-charcoal-lighter-plus)] rounded" />
                </div>
              ))}
            </div>
          ) : shoutouts.length === 0 ? (
            /* Empty state */
            <div className="text-center py-16" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
              <svg className="w-12 h-12 mx-auto mb-4 text-[#6BAF7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-[var(--color-cream)] font-semibold mb-2">No shoutouts yet</p>
              <p className="text-sm text-[var(--color-body-text)] mb-4">Be the first to shoutout an amazing local business!</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2.5 bg-[#F5A623] text-black font-semibold rounded-xl hover:bg-[#F5A623]/90 transition-all active:scale-[0.98]"
              >
                Create First Shoutout
              </button>
            </div>
          ) : filteredShoutouts.length === 0 ? (
            <div className="text-center py-16" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
              <p className="text-[var(--color-cream)] font-semibold mb-2">No shoutouts nearby</p>
              <p className="text-sm text-[var(--color-body-text)] mb-4">Try switching to #Everywhere to see all shoutouts</p>
              <button
                onClick={() => setDistanceFilter(null)}
                className="px-6 py-2.5 bg-[#F5A623] text-black font-semibold rounded-xl hover:bg-[#F5A623]/90 transition-all active:scale-[0.98]"
              >
                Show All Shoutouts
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {filteredShoutouts.map((shoutout, i) => (
                  <ShoutoutCard
                    key={shoutout.id}
                    shoutout={shoutout}
                    index={i}
                    onLike={handleLike}
                    onComment={handleLoadComments}
                    comments={commentsByShoutout[shoutout.id] || []}
                    loadingComments={loadingComments[shoutout.id] || false}
                    onLoadComments={handleLoadComments}
                    onSubmitComment={handleSubmitComment}
                    onLikeComment={handleLikeComment}
                    currentUserId={user?.id || null}
                    onEdit={handleEditShoutout}
                    onDelete={handleDeleteShoutout}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2.5 bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] text-[var(--color-cream)] font-semibold rounded-xl hover:bg-[var(--color-charcoal-lighter)] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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
