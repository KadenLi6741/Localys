import { supabase } from './client';

export interface BusinessReview {
  id: string;
  content: string;
  rating: number;
  created_at: string;
  video_caption?: string;
  reviewer_name: string;
  reviewer_username: string;
  reviewer_avatar?: string;
}

export async function getBusinessReviews(sellerId: string, limit = 50) {
  // Step 1: get all video IDs belonging to this seller
  const { data: videos, error: videoError } = await supabase
    .from('videos')
    .select('id, caption')
    .eq('user_id', sellerId);

  if (videoError || !videos || videos.length === 0) {
    return { data: [], error: videoError };
  }

  const videoIds = videos.map((v) => v.id);
  const videoMap = new Map(videos.map((v) => [v.id, v.caption]));

  // Step 2: fetch comments with ratings on those videos
  const { data: comments, error: commentError } = await supabase
    .from('comments')
    .select('id, content, rating, created_at, video_id, user_id')
    .in('video_id', videoIds)
    .not('rating', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (commentError || !comments) {
    return { data: [], error: commentError };
  }

  if (comments.length === 0) return { data: [], error: null };

  // Step 3: fetch reviewer profiles
  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, username, profile_picture_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const reviews: BusinessReview[] = comments.map((c) => {
    const prof = profileMap.get(c.user_id);
    return {
      id: c.id,
      content: c.content,
      rating: c.rating as number,
      created_at: c.created_at,
      video_caption: videoMap.get(c.video_id) ?? undefined,
      reviewer_name: prof?.full_name || prof?.username || 'Anonymous',
      reviewer_username: prof?.username || '',
      reviewer_avatar: prof?.profile_picture_url ?? undefined,
    };
  });

  return { data: reviews, error: null };
}
