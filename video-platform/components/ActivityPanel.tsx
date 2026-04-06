'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import { supabase } from '@/lib/supabase/client';
import { getUserBusiness } from '@/lib/supabase/profiles';

interface ActivityItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  isBusinessUser: boolean;
  actionText: string;
  videoId?: string;
  timestamp: string;
  isFollowingBack?: boolean;
}

type FilterType = 'all' | 'likes' | 'comments' | 'mentions' | 'followers';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Activity' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'mentions', label: 'Mentions & Tags' },
  { key: 'followers', label: 'Followers' },
];

function getTimeGroup(dateStr: string): string {
  const diffDays = (Date.now() - new Date(dateStr).getTime()) / 86400000;
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'This Month';
  return 'Previous';
}

function formatTimestamp(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const LAST_SEEN_KEY = 'activity_last_seen_at';

export function ActivityPanel() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOpen, closePanel, setUnreadCount } = useActivity();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myVideoIdsRef = useRef<string[]>([]);
  const myBusinessIdRef = useRef<string | null>(null);
  const myUsernameRef = useRef<string>('');
  const isOpenRef = useRef(isOpen);

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  // Load activity when panel opens
  useEffect(() => {
    if (isOpen && user) {
      loadActivity();
      markAsRead();
    }
  }, [isOpen, user]);

  // Setup on mount
  useEffect(() => {
    if (!user) return;

    const setup = async () => {
      const { data: videos } = await supabase
        .from('videos')
        .select('id')
        .eq('user_id', user.id);
      myVideoIdsRef.current = videos?.map(v => v.id) ?? [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      myUsernameRef.current = profile?.username ?? '';

      const { data: bizData } = await getUserBusiness(user.id);
      const biz = Array.isArray(bizData) ? bizData[0] : bizData;
      myBusinessIdRef.current = biz?.id ?? null;

      await computeUnreadCount();
      setupSubscriptions();
    };

    setup();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  const computeUnreadCount = async () => {
    if (!user) return;
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    if (!lastSeen) {
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      setUnreadCount(0);
      return;
    }

    let count = 0;

    const { count: fc } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id)
      .gt('created_at', lastSeen);
    count += fc ?? 0;

    if (myVideoIdsRef.current.length > 0) {
      const { count: cc } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .in('video_id', myVideoIdsRef.current)
        .neq('user_id', user.id)
        .gt('created_at', lastSeen);
      count += cc ?? 0;

      const { count: vlc } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .in('video_id', myVideoIdsRef.current)
        .neq('user_id', user.id)
        .gt('created_at', lastSeen);
      count += vlc ?? 0;
    }

    if (myBusinessIdRef.current) {
      const { count: blc } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', myBusinessIdRef.current)
        .neq('user_id', user.id)
        .gt('created_at', lastSeen);
      count += blc ?? 0;
    }

    setUnreadCount(count);
  };

  const setupSubscriptions = () => {
    if (!user) return;

    const channel = supabase.channel('activity-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'follows',
        filter: `following_id=eq.${user.id}`,
      }, () => {
        setUnreadCount(c => c + 1);
        if (isOpenRef.current) loadActivity();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      }, (payload) => {
        const rec = payload.new as any;
        if (rec.user_id !== user.id && myVideoIdsRef.current.includes(rec.video_id)) {
          setUnreadCount(c => c + 1);
          if (isOpenRef.current) loadActivity();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'likes',
      }, (payload) => {
        const rec = payload.new as any;
        if (rec.user_id === user.id) return;
        const isMyVid = rec.video_id && myVideoIdsRef.current.includes(rec.video_id);
        const isMyBiz = rec.business_id && rec.business_id === myBusinessIdRef.current;
        if (isMyVid || isMyBiz) {
          setUnreadCount(c => c + 1);
          if (isOpenRef.current) loadActivity();
        }
      })
      .subscribe();

    channelRef.current = channel;
  };

  const markAsRead = () => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setUnreadCount(0);
  };

  const loadActivity = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const myVideoIds = myVideoIdsRef.current;
      const myBusinessId = myBusinessIdRef.current;
      const myUsername = myUsernameRef.current;

      // Fetch likes (video-level)
      let videoLikes: any[] = [];
      if (myVideoIds.length > 0) {
        const { data } = await supabase
          .from('likes')
          .select('id, user_id, video_id, created_at')
          .in('video_id', myVideoIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        videoLikes = data ?? [];
      }

      // Fetch likes (business-level)
      let businessLikes: any[] = [];
      if (myBusinessId) {
        const { data } = await supabase
          .from('likes')
          .select('id, user_id, business_id, created_at')
          .eq('business_id', myBusinessId)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        businessLikes = data ?? [];
      }

      // Dedup likes by id
      const allLikesMap = new Map<string, any>();
      [...videoLikes, ...businessLikes].forEach(l => allLikesMap.set(l.id, l));
      const allLikes = Array.from(allLikesMap.values());

      // Fetch comments on my videos
      let commentsData: any[] = [];
      if (myVideoIds.length > 0) {
        const { data } = await supabase
          .from('comments')
          .select('id, user_id, video_id, content, created_at')
          .in('video_id', myVideoIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        commentsData = data ?? [];
      }

      // Fetch follows
      const { data: followsData } = await supabase
        .from('follows')
        .select('id, follower_id, created_at')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch mentions
      let mentionsData: any[] = [];
      if (myUsername) {
        const { data } = await supabase
          .from('comments')
          .select('id, user_id, video_id, content, created_at')
          .ilike('content', `%@${myUsername}%`)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        const commentIds = new Set(commentsData.map(c => c.id));
        mentionsData = (data ?? []).filter(m => !commentIds.has(m.id));
      }

      // Collect user IDs & fetch profiles
      const userIds = new Set<string>();
      allLikes.forEach(l => userIds.add(l.user_id));
      commentsData.forEach(c => userIds.add(c.user_id));
      (followsData ?? []).forEach(f => userIds.add(f.follower_id));
      mentionsData.forEach(m => userIds.add(m.user_id));

      let profileMap = new Map<string, any>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_picture_url, type')
          .in('id', Array.from(userIds));
        profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      }

      // Check follow-back status
      const followerIds = (followsData ?? []).map(f => f.follower_id);
      let followingBackSet = new Set<string>();
      if (followerIds.length > 0) {
        const { data: fb } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', followerIds);
        followingBackSet = new Set((fb ?? []).map(f => f.following_id));
      }

      // Assemble items
      const items: ActivityItem[] = [];

      allLikes.forEach(l => {
        const p = profileMap.get(l.user_id);
        if (!p) return;
        items.push({
          id: `like-${l.id}`,
          type: 'like',
          userId: l.user_id,
          username: p.username,
          fullName: p.full_name,
          avatarUrl: p.profile_picture_url,
          isBusinessUser: !!p.type,
          actionText: 'liked your video',
          videoId: l.video_id || undefined,
          timestamp: l.created_at,
        });
      });

      commentsData.forEach(c => {
        const p = profileMap.get(c.user_id);
        if (!p) return;
        const truncated = c.content?.length > 40 ? c.content.slice(0, 40) + '\u2026' : c.content;
        items.push({
          id: `comment-${c.id}`,
          type: 'comment',
          userId: c.user_id,
          username: p.username,
          fullName: p.full_name,
          avatarUrl: p.profile_picture_url,
          isBusinessUser: !!p.type,
          actionText: `commented: \u201C${truncated}\u201D`,
          videoId: c.video_id,
          timestamp: c.created_at,
        });
      });

      (followsData ?? []).forEach(f => {
        const p = profileMap.get(f.follower_id);
        if (!p) return;
        items.push({
          id: `follow-${f.id}`,
          type: 'follow',
          userId: f.follower_id,
          username: p.username,
          fullName: p.full_name,
          avatarUrl: p.profile_picture_url,
          isBusinessUser: !!p.type,
          actionText: 'started following you',
          timestamp: f.created_at,
          isFollowingBack: followingBackSet.has(f.follower_id),
        });
      });

      mentionsData.forEach(m => {
        const p = profileMap.get(m.user_id);
        if (!p) return;
        items.push({
          id: `mention-${m.id}`,
          type: 'mention',
          userId: m.user_id,
          username: p.username,
          fullName: p.full_name,
          avatarUrl: p.profile_picture_url,
          isBusinessUser: !!p.type,
          actionText: 'mentioned you in a comment',
          videoId: m.video_id,
          timestamp: m.created_at,
        });
      });

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleFollowBack = async (targetUserId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });
      setActivities(prev =>
        prev.map(a =>
          a.type === 'follow' && a.userId === targetUserId
            ? { ...a, isFollowingBack: true }
            : a
        )
      );
    } catch {
      // silently fail
    }
  };

  const handleItemClick = (item: ActivityItem) => {
    if (item.videoId) {
      closePanel();
      router.push(`/video/${item.videoId}`);
    } else if (item.type === 'follow') {
      closePanel();
      router.push(`/profile/${item.username}`);
    }
  };

  // Filter
  const filtered = activities.filter(a => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'likes') return a.type === 'like';
    if (activeFilter === 'comments') return a.type === 'comment';
    if (activeFilter === 'mentions') return a.type === 'mention';
    if (activeFilter === 'followers') return a.type === 'follow';
    return true;
  });

  // Group by time
  const groups: { label: string; items: ActivityItem[] }[] = [];
  const groupMap = new Map<string, ActivityItem[]>();
  filtered.forEach(item => {
    const g = getTimeGroup(item.timestamp);
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(item);
  });
  ['This Week', 'This Month', 'Previous'].forEach(label => {
    const items = groupMap.get(label);
    if (items?.length) groups.push({ label, items });
  });

  if (!user) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full md:w-[35%] md:min-w-[360px] bg-[#1A1A18] border-l border-[#3A3A34] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-[#3A3A34]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#F5F0E8] text-2xl font-bold">Activity</h2>
            <button
              onClick={closePanel}
              className="p-2 hover:bg-[#242420] rounded-full transition-colors"
              aria-label="Close activity panel"
            >
              <svg className="w-6 h-6 text-[#F5F0E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Chips */}
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.activity-chips::-webkit-scrollbar { display: none; }`}</style>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 ${
                  activeFilter === f.key
                    ? 'bg-[#F5A623] text-black'
                    : 'border border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623]/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5A623]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <svg className="w-12 h-12 text-[#6BAF7A] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-[#F5F0E8] font-medium mb-1">No activity yet</p>
              <p className="text-[#9E9A90] text-sm text-center">Your likes, comments and followers will appear here</p>
            </div>
          ) : (
            <div className="py-2">
              {groups.map(group => (
                <div key={group.label}>
                  {/* Group Header */}
                  <div className="flex items-center gap-3 px-5 py-3">
                    <span className="text-[#F5F0E8]/60 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-[#3A3A34]" />
                  </div>

                  {/* Items */}
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#242420] transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 ${
                        item.isBusinessUser ? 'ring-2 ring-[#F5A623]' : 'ring-1 ring-[#3A3A34]'
                      }`}>
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#242420] flex items-center justify-center text-[#9E9A90] text-sm font-medium">
                            {item.fullName?.[0] || '?'}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="text-[#F5F0E8] font-bold">{item.username}</span>{' '}
                          <span className="text-[#9E9A90]">{item.actionText}</span>
                        </p>
                        <p className="text-[#9E9A90] text-xs mt-0.5">{formatTimestamp(item.timestamp)}</p>
                      </div>

                      {/* Right side */}
                      {item.type === 'follow' && !item.isFollowingBack ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFollowBack(item.userId); }}
                          className="shrink-0 border border-[#F5A623] text-[#F5A623] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#F5A623]/10 transition-colors"
                        >
                          Follow Back
                        </button>
                      ) : item.videoId ? (
                        <div className="w-10 h-10 rounded-lg bg-[#242420] border border-[#3A3A34] flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-[#9E9A90]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
