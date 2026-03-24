import { supabase } from './client';

export async function getAnalyticsSummary(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    const { data: videos } = await supabase
      .from('videos')
      .select('view_count, coins_spent_on_promotion')
      .eq('user_id', userId);

    const { count: promotionCount } = await supabase
      .from('promotion_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const totalCoinsSpent = (videos || []).reduce((sum, v) => sum + (v.coins_spent_on_promotion || 0), 0);
    const totalViews = (videos || []).reduce((sum, v) => sum + (v.view_count || 0), 0);
    const promotedVideoCount = (videos || []).filter(v => (v.coins_spent_on_promotion || 0) > 0).length;

    return {
      data: {
        totalCoinsSpent,
        totalViews,
        viewsPerCoin: totalCoinsSpent > 0 ? Math.round((totalViews / totalCoinsSpent) * 10) / 10 : 0,
        currentBalance: profile?.coin_balance || 0,
        totalPromotions: promotionCount || 0,
        totalVideosPromoted: promotedVideoCount,
      },
      error: null,
    };
  } catch {
    return { data: null, error: null };
  }
}

export async function getPromotionHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('promotion_history')
      .select(`
        id,
        video_id,
        coins_spent,
        previous_boost,
        new_boost,
        created_at,
        videos:video_id (
          caption,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: null };
    }
    return { data: data || [], error: null };
  } catch {
    return { data: [], error: null };
  }
}

export async function getPromotedVideoStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id, caption, thumbnail_url, view_count, boost_value, coins_spent_on_promotion, last_promoted_at, created_at')
      .eq('user_id', userId)
      .gt('coins_spent_on_promotion', 0)
      .order('coins_spent_on_promotion', { ascending: false });

    if (error) {
      return { data: [], error: null };
    }
    return { data: data || [], error: null };
  } catch {
    return { data: [], error: null };
  }
}

export async function getSpendingTimeline(userId: string) {
  try {
    const { data, error } = await supabase
      .from('promotion_history')
      .select('coins_spent, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: null };
    }
    return { data: data || [], error: null };
  } catch {
    return { data: [], error: null };
  }
}

export async function getVideoViewsTimeline(userId: string) {
  try {
    const { data: userVideos, error: videosError } = await supabase
      .from('videos')
      .select('id')
      .eq('user_id', userId);

    if (videosError || !userVideos || userVideos.length === 0) {
      return { data: [], error: null };
    }

    const videoIds = userVideos.map(v => v.id);

    const { data: views, error: viewsError } = await supabase
      .from('video_views')
      .select('created_at')
      .in('video_id', videoIds)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (viewsError) {
      return { data: [], error: null };
    }

    return { data: views || [], error: null };
  } catch {
    return { data: [], error: null };
  }
}
