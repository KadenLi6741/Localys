import { supabase } from './client';

/**
 * Localys Manager data layer (Phase 5B).
 *
 * Every function here is scoped to a single business OWNER (owner_id = the
 * logged-in user). Reads/writes go through Supabase RLS, so a user can only ever
 * see and edit their own business data. Functions degrade gracefully (return
 * empty/zero rather than throwing) so the Manager never shows a blank screen.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManagerBusiness {
  id: string;
  owner_id: string;
  business_name: string;
  business_type?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  contact?: string | null;
  profile_picture_url?: string | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  business_hours?: unknown;
}

export interface ManagerOverview {
  totalViews: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: number;
  avgRating: number | null;
  reviewCount: number;
  awaitingReplies: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  kind: 'order' | 'review';
  title: string;
  subtitle: string;
  amount?: number;
  rating?: number;
  at: string;
}

export interface OwnerReviewReply {
  id: string;
  review_id: string;
  reply_text: string;
  created_at: string;
}

export interface OwnerReview {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  reviewerName: string;
  reply: OwnerReviewReply | null;
}

export interface OwnerVideo {
  id: string;
  caption: string | null;
  thumbnail_url: string | null;
  view_count: number;
  created_at: string;
}

export interface OwnerThread {
  id: string;
  text: string;
  star_rating: number | null;
  created_at: string;
  business_name: string | null;
}

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------

/** The owner's business row (select * so it works regardless of extra columns). */
export async function getOwnerBusiness(userId: string): Promise<ManagerBusiness | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ManagerBusiness;
}

// ---------------------------------------------------------------------------
// Dashboard overview
// ---------------------------------------------------------------------------

export async function getManagerOverview(
  userId: string,
  business: ManagerBusiness | null,
): Promise<ManagerOverview> {
  const businessId = business?.id;

  const [salesRes, videosRes, reviews] = await Promise.all([
    supabase
      .from('item_purchases')
      .select('id, item_name, price, status, purchased_at')
      .eq('seller_id', userId)
      .order('purchased_at', { ascending: false }),
    supabase.from('videos').select('view_count').eq('user_id', userId),
    getOwnerReviews(userId, businessId),
  ]);

  const sales = salesRes.data ?? [];
  const videos = videosRes.data ?? [];

  const totalViews = videos.reduce((sum, v) => sum + (v.view_count ?? 0), 0);
  const paid = sales.filter((s) => s.status === 'paid');
  const completed = sales.filter((s) => s.status === 'completed');
  const revenue = sales
    .filter((s) => s.status === 'paid' || s.status === 'completed')
    .reduce((sum, s) => sum + Number(s.price ?? 0), 0);

  const ratingValues = reviews.map((r) => r.rating).filter((n) => typeof n === 'number');
  const computedAvg =
    ratingValues.length > 0
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
      : null;
  const avgRating = computedAvg ?? (business?.average_rating ?? null);
  const reviewCount = reviews.length || business?.total_reviews || 0;
  const awaitingReplies = reviews.filter((r) => !r.reply).length;

  // Recent activity = newest orders + newest reviews, merged.
  const orderActivity: ActivityItem[] = sales.slice(0, 8).map((s) => ({
    id: `order-${s.id}`,
    kind: 'order',
    title: `Order · ${s.item_name}`,
    subtitle: s.status === 'paid' ? 'Awaiting pickup' : s.status,
    amount: Number(s.price ?? 0),
    at: s.purchased_at,
  }));
  const reviewActivity: ActivityItem[] = reviews.slice(0, 8).map((r) => ({
    id: `review-${r.id}`,
    kind: 'review',
    title: `New review · ${r.reviewerName}`,
    subtitle: r.text ? r.text.slice(0, 60) : 'Left a rating',
    rating: r.rating,
    at: r.created_at,
  }));
  const recentActivity = [...orderActivity, ...reviewActivity]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return {
    totalViews,
    totalOrders: sales.length,
    pendingOrders: paid.length,
    completedOrders: completed.length,
    revenue,
    avgRating,
    reviewCount,
    awaitingReplies,
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Reviews + replies
// ---------------------------------------------------------------------------

type RawReview = {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  user_id: string;
};

/**
 * The live DB uses one of two `reviews` schemas (008 = business_id + review_text,
 * 035 = item_id + content). We try both and merge — whichever exists returns
 * rows, the other fails silently. Mirrors lib/supabase/trust.ts.
 */
export async function getOwnerReviews(
  userId: string,
  businessId?: string,
): Promise<OwnerReview[]> {
  const raw = new Map<string, RawReview>();

  // 035 schema: reviews keyed by item_id (the owner's menu items).
  const { data: items } = await supabase.from('menu_items').select('id').eq('user_id', userId);
  const itemIds = (items ?? []).map((i) => i.id);
  if (itemIds.length > 0) {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, content, created_at, user_id')
      .in('item_id', itemIds);
    if (!error && data) {
      for (const r of data) {
        raw.set(r.id, {
          id: r.id,
          rating: r.rating,
          text: (r as { content?: string | null }).content ?? null,
          created_at: r.created_at,
          user_id: r.user_id,
        });
      }
    }
  }

  // 008 schema: reviews keyed by business_id.
  if (businessId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, review_text, created_at, user_id')
      .eq('business_id', businessId);
    if (!error && data) {
      for (const r of data) {
        raw.set(r.id, {
          id: r.id,
          rating: r.rating,
          text: (r as { review_text?: string | null }).review_text ?? null,
          created_at: r.created_at,
          user_id: r.user_id,
        });
      }
    }
  }

  const reviews = Array.from(raw.values());
  if (reviews.length === 0) return [];

  // Reviewer names.
  const reviewerIds = Array.from(new Set(reviews.map((r) => r.user_id).filter(Boolean)));
  const nameById = new Map<string, string>();
  if (reviewerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', reviewerIds);
    for (const p of profiles ?? []) {
      nameById.set(p.id, p.full_name || p.username || 'Customer');
    }
  }

  // Replies.
  const reviewIds = reviews.map((r) => r.id);
  const replyByReview = new Map<string, OwnerReviewReply>();
  const { data: replies } = await supabase
    .from('review_replies')
    .select('id, review_id, reply_text, created_at')
    .in('review_id', reviewIds);
  for (const rep of replies ?? []) {
    replyByReview.set(rep.review_id, rep as OwnerReviewReply);
  }

  return reviews
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      created_at: r.created_at,
      reviewerName: nameById.get(r.user_id) || 'Customer',
      reply: replyByReview.get(r.id) ?? null,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function replyToReview(args: {
  reviewId: string;
  businessId: string;
  ownerId: string;
  text: string;
}) {
  return supabase
    .from('review_replies')
    .insert({
      review_id: args.reviewId,
      business_id: args.businessId,
      owner_id: args.ownerId,
      reply_text: args.text.trim(),
    })
    .select('id, review_id, reply_text, created_at')
    .single();
}

export async function deleteReviewReply(replyId: string) {
  return supabase.from('review_replies').delete().eq('id', replyId);
}

// ---------------------------------------------------------------------------
// Content (videos + threads)
// ---------------------------------------------------------------------------

export async function getOwnerVideos(userId: string): Promise<OwnerVideo[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, caption, thumbnail_url, view_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as OwnerVideo[];
}

export async function deleteOwnerVideo(videoId: string) {
  return supabase.from('videos').delete().eq('id', videoId);
}

export async function updateOwnerVideoCaption(videoId: string, caption: string) {
  return supabase.from('videos').update({ caption }).eq('id', videoId);
}

export async function getOwnerThreads(userId: string): Promise<OwnerThread[]> {
  const { data, error } = await supabase
    .from('shoutouts')
    .select('id, text, star_rating, created_at, business_name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as OwnerThread[];
}

export async function deleteOwnerThread(threadId: string) {
  return supabase.from('shoutouts').delete().eq('id', threadId);
}

export async function updateOwnerThreadText(threadId: string, text: string) {
  return supabase.from('shoutouts').update({ text }).eq('id', threadId);
}
