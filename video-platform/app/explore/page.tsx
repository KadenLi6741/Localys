'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { type Shoutout } from '@/components/explore/ShoutoutCard';
import { CreateShoutoutModal } from '@/components/explore/CreateShoutoutModal';
import { haversineDistance } from '@/lib/utils/geo';
import { Toast } from '@/components/Toast';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TAGS = [
  { id: 'hidden-gem', label: 'Hidden Gem' },
  { id: 'cheap-eats', label: 'Cheap Eats' },
];

/** Reddit-style sort tabs. */
const SORT_TABS = ['Best', 'Hot', 'New', 'Top', 'Rising'] as const;
type SortMode = (typeof SORT_TABS)[number];

/** Timeframes for the Top sort (maps to the server-side time filter). */
const TOP_TIMEFRAMES = [
  { id: 'latest', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: 'week', label: 'This week' },
];

const PAGE_SIZE = 10;

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

  // Filters / sorting
  const [sortMode, setSortMode] = useState<SortMode>('Best');
  const [timeFilter, setTimeFilter] = useState('latest');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [quickTag, setQuickTag] = useState<string | null>(null);

  // Per-post local UI state (downvotes and saves are visual-only for now)
  const [downvoted, setDownvoted] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // User profile for avatar
  const [userProfile, setUserProfile] = useState<{ profile_picture_url: string | null; username: string } | null>(null);

  // Distance filter
  const [distanceFilter] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [businessLocations, setBusinessLocations] = useState<Record<string, { latitude: number; longitude: number }>>({});
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!user) return;
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

  // Client-side ranking for the Reddit-style sort tabs. Ages are measured
  // relative to the newest post (pure — no clock reads during render).
  const sortedShoutouts = useMemo(() => {
    const list = [...filteredShoutouts];
    const newest = list.reduce((max, s) => Math.max(max, +new Date(s.created_at)), 0);
    const ageHours = (s: Shoutout) => (newest - new Date(s.created_at).getTime()) / 36e5;
    switch (sortMode) {
      case 'New':
        return list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      case 'Top':
        return list.sort((a, b) => b.likes - a.likes);
      case 'Hot':
        return list.sort(
          (a, b) => b.likes / Math.pow(ageHours(b) + 2, 1.5) - a.likes / Math.pow(ageHours(a) + 2, 1.5)
        );
      case 'Rising':
        return list.sort((a, b) => b.likes / (ageHours(b) + 1) - a.likes / (ageHours(a) + 1));
      case 'Best':
      default:
        return list.sort(
          (a, b) => b.likes * 2 + b.comment_count * 3 - (a.likes * 2 + a.comment_count * 3)
        );
    }
  }, [filteredShoutouts, sortMode]);

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

  // Reload when filters change; pagination resets once the new query lands.
  useEffect(() => {
    let stale = false;
    Promise.resolve()
      .then(() => (stale ? undefined : fetchShoutouts(0, true)))
      .then(() => {
        if (!stale) setPage(0);
      });
    return () => {
      stale = true;
    };
  }, [fetchShoutouts]);

  // Like a shoutout (powers the upvote arrow)
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

  const handleUpvote = (shoutoutId: string) => {
    setDownvoted((prev) => ({ ...prev, [shoutoutId]: false }));
    handleLike(shoutoutId);
  };

  const handleDownvote = (shoutoutId: string) => {
    const post = shoutouts.find((s) => s.id === shoutoutId);
    if (post?.liked_by_me) handleLike(shoutoutId); // remove the upvote first
    setDownvoted((prev) => ({ ...prev, [shoutoutId]: !prev[shoutoutId] }));
  };

  const handleShare = async (shoutoutId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/explore/${shoutoutId}`);
      setToastMessage('Link copied to clipboard');
    } catch {
      // Silently fail
    }
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
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-6">

        {/* ===== HEADER ===== */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-heading-sm font-bold text-foreground">Explore</h1>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-[4px] bg-primary px-4 py-2 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            Create Post
          </button>
        </div>

        {/* ===== SORT TABS (Reddit pattern) ===== */}
        <div className="mb-2 flex items-center gap-1 border-b border-border pb-2">
          {SORT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setSortMode(tab)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-body-sm font-semibold transition-colors',
                sortMode === tab
                  ? 'bg-surface text-primary'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              )}
              aria-pressed={sortMode === tab}
            >
              {tab}
            </button>
          ))}
          {sortMode === 'Top' && (
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="ml-1 rounded-[4px] border border-border bg-surface px-2 py-1.5 text-caption font-semibold text-foreground focus:outline-none focus:border-primary"
              aria-label="Top timeframe"
            >
              {TOP_TIMEFRAMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* ===== TAG FILTERS ===== */}
        <div className="mb-4 flex gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setTagFilter(tagFilter === tag.id ? null : tag.id);
                setQuickTag(null);
              }}
              className={cn(
                'rounded-[4px] border px-3 py-1 text-caption font-semibold transition-colors',
                tagFilter === tag.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-surface hover:text-foreground'
              )}
            >
              #{tag.label.replace(' ', '')}
            </button>
          ))}
        </div>

        {/* ===== POST FEED ===== */}
        {loading && shoutouts.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[4px] border border-border bg-card p-4">
                <div className="mb-2 h-3 w-40 rounded-[4px] bg-surface" />
                <div className="mb-2 h-5 w-3/4 rounded-[4px] bg-surface" />
                <div className="h-3 w-full rounded-[4px] bg-surface" />
              </div>
            ))}
          </div>
        ) : sortedShoutouts.length === 0 ? (
          <div className="rounded-[4px] border border-border bg-card py-16 text-center">
            <p className="mb-2 font-semibold text-foreground">No posts yet</p>
            <p className="mb-4 text-body-sm text-muted-foreground">Be the first to shoutout an amazing local business!</p>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-[4px] bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {sortedShoutouts.map((shoutout) => {
                const photoUrl = shoutout.photos?.[0] || null;
                const isAuthor = user?.id === shoutout.user_id;
                const isDown = !!downvoted[shoutout.id];
                const isSaved = !!saved[shoutout.id];
                const score = shoutout.likes - (isDown ? 1 : 0);
                const community = shoutout.tags[0] ? `b/${shoutout.tags[0].replace(/-/g, '')}` : 'b/local';

                return (
                  <article
                    key={shoutout.id}
                    className="flex overflow-hidden rounded-[4px] border border-border bg-card transition-colors hover:border-primary/40"
                  >
                    {/* Vote column */}
                    <div className="flex w-11 shrink-0 flex-col items-center gap-0.5 bg-surface/50 py-3">
                      <button
                        type="button"
                        onClick={() => handleUpvote(shoutout.id)}
                        className={cn(
                          'rounded-[4px] p-0.5 transition-colors hover:bg-surface',
                          shoutout.liked_by_me ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        )}
                        aria-label="Upvote"
                        aria-pressed={shoutout.liked_by_me}
                      >
                        <ArrowBigUp className={cn('h-6 w-6', shoutout.liked_by_me && 'fill-primary')} />
                      </button>
                      <span
                        className={cn(
                          'text-caption font-bold tabular-nums',
                          shoutout.liked_by_me ? 'text-primary' : isDown ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {score}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownvote(shoutout.id)}
                        className={cn(
                          'rounded-[4px] p-0.5 transition-colors hover:bg-surface',
                          isDown ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        )}
                        aria-label="Downvote"
                        aria-pressed={isDown}
                      >
                        <ArrowBigDown className={cn('h-6 w-6', isDown && 'fill-primary')} />
                      </button>
                    </div>

                    {/* Post body */}
                    <div className="min-w-0 flex-1 p-3">
                      {/* Meta row */}
                      <div className="mb-1.5 flex items-center gap-1.5 text-caption text-muted-foreground">
                        <span className="font-bold text-foreground">{community}</span>
                        <span>·</span>
                        <Link href={`/profile/${shoutout.user_id}`} className="hover:underline">
                          Posted by u/{shoutout.username}
                        </Link>
                        <span>·</span>
                        <span>{timeAgo(shoutout.created_at)}</span>
                        {shoutout.star_rating ? (
                          <>
                            <span>·</span>
                            <span className="text-warning">{'★'.repeat(shoutout.star_rating)}</span>
                          </>
                        ) : null}

                        {/* Author menu */}
                        {isAuthor && (
                          <div className="relative ml-auto">
                            <button
                              type="button"
                              onClick={() => setMenuOpenFor(menuOpenFor === shoutout.id ? null : shoutout.id)}
                              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                              aria-label="Post options"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuOpenFor === shoutout.id && (
                              <div className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-[4px] border border-border bg-popover">
                                <button
                                  onClick={() => { setMenuOpenFor(null); handleEditShoutout(shoutout); }}
                                  className="w-full px-3 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-surface"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setMenuOpenFor(null);
                                    if (confirm('Delete this post?')) handleDeleteShoutout(shoutout.id);
                                  }}
                                  className="w-full px-3 py-2 text-left text-body-sm text-destructive transition-colors hover:bg-surface"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Title + preview → detail page */}
                      <Link href={`/explore/${shoutout.id}`} className="block">
                        <h2 className="text-body font-semibold leading-snug text-foreground hover:text-primary">
                          {shoutout.business_name}
                        </h2>
                        <p className="mt-1 line-clamp-3 text-body-sm text-muted-foreground">{shoutout.text}</p>
                      </Link>

                      {/* Media */}
                      {photoUrl ? (
                        <Link href={`/explore/${shoutout.id}`} className="mt-2 block">
                          <div className="relative aspect-video overflow-hidden rounded-[4px] bg-surface">
                            <Image src={photoUrl} alt={shoutout.business_name} fill unoptimized className="object-cover" />
                          </div>
                        </Link>
                      ) : shoutout.video_url ? (
                        <div className="mt-2 overflow-hidden rounded-[4px] bg-black">
                          <video src={shoutout.video_url} className="max-h-96 w-full object-contain" controls muted playsInline />
                        </div>
                      ) : null}

                      {/* Footer actions */}
                      <div className="mt-2 flex items-center gap-1">
                        <Link
                          href={`/explore/${shoutout.id}`}
                          className="flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-caption font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                        >
                          <MessageSquare className="h-4 w-4" aria-hidden="true" />
                          {shoutout.comment_count} comments
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleShare(shoutout.id)}
                          className="flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-caption font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                          Share
                        </button>
                        <button
                          type="button"
                          onClick={() => setSaved((prev) => ({ ...prev, [shoutout.id]: !prev[shoutout.id] }))}
                          className={cn(
                            'flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-caption font-semibold transition-colors hover:bg-surface',
                            isSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                          )}
                          aria-pressed={isSaved}
                        >
                          <Bookmark className={cn('h-4 w-4', isSaved && 'fill-primary')} aria-hidden="true" />
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (page > 0) {
                    const prevPage = page - 1;
                    setPage(prevPage);
                    fetchShoutouts(prevPage, true);
                  }
                }}
                disabled={page === 0}
                className="rounded-[4px] border border-border px-4 py-2 text-body-sm font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-body-sm text-muted-foreground">Page {page + 1}</span>
              <button
                onClick={() => {
                  if (hasMore) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchShoutouts(nextPage, true);
                  }
                }}
                disabled={!hasMore}
                className="rounded-[4px] border border-border px-4 py-2 text-body-sm font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
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
