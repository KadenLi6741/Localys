import { supabase } from './client';
import { cacheGet, cacheSet, cacheInvalidate } from '../cache';
import type { VideoMetadata } from '../../models/Video';

export type { VideoMetadata };

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'videos';

/**
 * Upload video metadata to Supabase
 */
export async function uploadVideoMetadata(metadata: VideoMetadata) {
  const { data, error } = await supabase
    .from('videos')
    .insert(metadata)
    .select()
    .single();

  return { data, error };
}

export async function getVideosFeed(limit = 20, offset = 0) {
  const { data: videosRaw, error: videosError } = await supabase
    .from('videos')
    .select(`
      id,
      user_id,
      video_url,
      caption,
      created_at,
      business_id,
      view_count
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (videosError) {
    const errorMsg = `Supabase error - Message: ${videosError?.message || 'unknown'}, Code: ${videosError?.code || 'unknown'}, Details: ${videosError?.details || 'none'}, Hint: ${videosError?.hint || 'none'}`;
    console.error(errorMsg);

    const configMsg = `Supabase config - hasUrl: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}, hasKey: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    console.error(configMsg);

    return { data: null, error: videosError };
  }

  const videosList: any[] = videosRaw || [];

  const userIds = Array.from(
    new Set(videosList.map(v => v.user_id).filter(Boolean))
  );

  let profilesMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        profile_picture_url
      `)
      .in('id', userIds);

    if (!profilesError && profiles) {
      profilesMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
    }
  }

  const businessIds = Array.from(
    new Set(videosList.map(v => v.business_id).filter(Boolean))
  );

  let businessesMap: Record<string, any> = {};
  if (businessIds.length > 0) {
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select(`
        id,
        business_name,
        category,
        profile_picture_url,
        latitude,
        longitude,
        average_rating,
        total_reviews
      `)
      .in('id', businessIds);

    if (businessesError) {
      console.warn('getVideosFeed businesses fetch warning:', businessesError);
    } else if (businesses) {
      businessesMap = Object.fromEntries(businesses.map((b: any) => [b.id, b]));
    }
  }

  const videos = await Promise.all(videosList.map(async (v: any) => {
    let url = v.video_url;
    
    let pathForSigning = null;

    if (url && typeof url === 'string') {
      if (!url.startsWith('http')) {
        pathForSigning = url;
      } else if (url.includes('/storage/v1/object/public/')) {
        try {
          const urlObj = new URL(url);
          const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
          if (match && match[1]) {
            pathForSigning = decodeURIComponent(match[1]);
          }
        } catch (e) {
        }
      }
    }

    if (pathForSigning) {
      try {
        const cacheKey = `signed-url:${STORAGE_BUCKET}:${pathForSigning}`;
        const cached = cacheGet<string>(cacheKey);
        if (cached) {
          url = cached;
        } else {
          const { data: signed, error: signedErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(pathForSigning, 60 * 60); // 1 hour
          if (!signedErr && signed?.signedUrl) {
            url = signed.signedUrl;
            cacheSet(cacheKey, url, 55 * 60 * 1000); // 55 min TTL
          } else {
            console.warn('createSignedUrl failed for', pathForSigning, signedErr);
          }
        }
      } catch (e) {
        console.error('Error creating signed url for', pathForSigning, e);
      }
    }

    return {
      ...v,
      video_url: url,
      profiles: v.user_id ? profilesMap[v.user_id] ?? null : null,
      businesses: v.business_id ? businessesMap[v.business_id] ?? null : null,
    };
  }));

  return { data: videos, error: null };
}

export async function getVideoById(videoId: string) {
  const { data: video, error } = await supabase
    .from('videos')
    .select(`
      id, user_id, video_url, caption, created_at, business_id, view_count, boost_value, coins_spent_on_promotion, last_promoted_at,
      profiles:user_id (
        id,
        username,
        full_name,
        profile_picture_url
      )
    `)
    .eq('id', videoId)
    .single();

  if (error) return { data: null, error };

  const videoWithBusiness: any = { ...video };

  if (video.business_id) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, business_name, business_type, category, profile_picture_url, average_rating, total_reviews, latitude, longitude')
      .eq('id', video.business_id)
      .single();

    if (business) {
      videoWithBusiness.businesses = business;
    }
  }

  if (videoWithBusiness.video_url && !videoWithBusiness.video_url.startsWith('http')) {
    const cacheKey = `signed-url:${STORAGE_BUCKET}:${videoWithBusiness.video_url}`;
    const cached = cacheGet<string>(cacheKey);
    if (cached) {
      videoWithBusiness.video_url = cached;
    } else {
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(videoWithBusiness.video_url, 60 * 60);
      if (signed?.signedUrl) {
        videoWithBusiness.video_url = signed.signedUrl;
        cacheSet(cacheKey, signed.signedUrl, 55 * 60 * 1000);
      }
    }
  }

  return { data: videoWithBusiness, error: null };
}

export async function uploadVideoFile(file: File, userId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) return { data: null, error };

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
}

/**
 * Get like count for a business/video
 */
export async function getLikeCount(businessId: string) {
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    if (error) {
      console.error('Error fetching like count:', error);
      return { data: 0, error };
    }

    return { data: count || 0, error: null };
  } catch (error: any) {
    console.error('Exception fetching like count:', error);
    return { data: 0, error };
  }
}

/**
 * Get like counts for multiple businesses
 */
export async function getLikeCounts(businessIds: string[]) {
  try {
    const counts: { [key: string]: number } = {};
    
    businessIds.forEach(id => {
      counts[id] = 0;
    });

    if (businessIds.length === 0) {
      return { data: counts, error: null };
    }

    const { data, error } = await supabase
      .from('likes')
      .select('business_id')
      .in('business_id', businessIds);

    if (error) {
      console.error('Error fetching like counts:', error);
      return { data: counts, error };
    }

    if (data) {
      data.forEach((like: any) => {
        if (like.business_id in counts) {
          counts[like.business_id]++;
        }
      });
    }

    return { data: counts, error: null };
  } catch (error: any) {
    console.error('Exception fetching like counts:', error);
    return { data: {}, error };
  }
}

/**
 * Like a business/video
 */
export async function likeVideo(userId: string, businessId: string) {
  try {
    const { data, error } = await supabase
      .from('likes')
      .insert({ user_id: userId, business_id: businessId })
      .select()
      .single();

    if (error) {
      console.error('Error liking video:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception liking video:', error);
    return { data: null, error };
  }
}

/**
 * Unlike a business/video
 */
export async function unlikeVideo(userId: string, businessId: string) {
  try {
    const { data, error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', businessId);

    if (error) {
      console.error('Error unliking video:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception unliking video:', error);
    return { data: null, error };
  }
}

/**
 * Like a video or business (flexible - works with either video_id or business_id)
 */
export async function likeItem(userId: string, itemId: string, itemType: 'video' | 'business' = 'video') {
  try {
    const insertData = { user_id: userId };
    if (itemType === 'business') {
      (insertData as any).business_id = itemId;
    } else {
      (insertData as any).video_id = itemId;
    }

    const { data, error } = await supabase
      .from('likes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error(`Error liking ${itemType}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`Exception liking ${itemType}:`, error);
    return { data: null, error };
  }
}

/**
 * Unlike a video or business (flexible - works with either video_id or business_id)
 */
export async function unlikeItem(userId: string, itemId: string, itemType: 'video' | 'business' = 'video') {
  try {
    let query = supabase
      .from('likes')
      .delete()
      .eq('user_id', userId);

    if (itemType === 'business') {
      query = query.eq('business_id', itemId);
    } else {
      query = query.eq('video_id', itemId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error unliking ${itemType}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`Exception unliking ${itemType}:`, error);
    return { data: null, error };
  }
}

/**
 * Bookmark a video
 */
export async function bookmarkVideo(userId: string, videoId: string) {
  try {
    const { data, error } = await supabase
      .from('video_bookmarks')
      .insert({ user_id: userId, video_id: videoId })
      .select()
      .single();

    if (error) {
      console.error('Error bookmarking video:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception bookmarking video:', error);
    return { data: null, error };
  }
}

/**
 * Unbookmark a video
 */
export async function unbookmarkVideo(userId: string, videoId: string) {
  try {
    const { data, error } = await supabase
      .from('video_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('video_id', videoId);

    if (error) {
      console.error('Error unbookmarking video:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception unbookmarking video:', error);
    return { data: null, error };
  }
}

/**
 * Get user's bookmarked videos
 */
export async function getUserBookmarkedVideos(userId: string, limit = 20, offset = 0) {
  try {
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('video_bookmarks')
      .select('video_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError);
      return { data: null, error: bookmarksError };
    }

    if (!bookmarks || bookmarks.length === 0) {
      return { data: [], error: null };
    }

    const videoIds = bookmarks.map((b: any) => b.video_id);

    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        user_id,
        video_url,
        caption,
        created_at,
        business_id,
        view_count
      `)
      .in('id', videoIds);

    if (videosError) {
      console.error('Error fetching bookmarked video details:', videosError);
      return { data: null, error: videosError };
    }

    let profilesMap: { [key: string]: any } = {};
    let businessesMap: { [key: string]: any } = {};

    const userIds = Array.from(new Set(videos?.map((v: any) => v.user_id).filter(Boolean))) as string[];
    const businessIds = Array.from(new Set(videos?.map((v: any) => v.business_id).filter(Boolean))) as string[];

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_picture_url')
        .in('id', userIds);

      if (!profilesError && profiles) {
        profilesMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
      }
    }

    if (businessIds.length > 0) {
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('id, owner_id, business_name, category, profile_picture_url, average_rating, total_reviews, latitude, longitude')
        .in('id', businessIds);

      if (!businessesError && businesses) {
        businessesMap = Object.fromEntries(businesses.map((b: any) => [b.id, b]));
      }
    }

    const enrichedVideos = videos?.map((v: any) => ({
      ...v,
      profiles: profilesMap[v.user_id] || null,
      businesses: businessesMap[v.business_id] || null,
    })) || [];

    return { data: enrichedVideos, error: null };
  } catch (error: any) {
    console.error('Exception getting bookmarked videos:', error);
    return { data: null, error };
  }
}

/**
 * Constants for promotion system
 */
const MIN_COINS_TO_PROMOTE = 10;
const MAX_COINS_TO_PROMOTE = 500;
const BOOST_MULTIPLIER = 0.2; // 10 coins = 2 boost increase (10 * 0.2)
const MAX_BOOST_VALUE = 100;
const PROMOTION_COOLDOWN_HOURS = 24;

/**
 * Promote a video by spending coins
 * Returns new boost value and remaining coins
 */
export async function promoteVideo(userId: string, videoId: string, coinsTospend: number) {
  try {
    if (coinsTospend < MIN_COINS_TO_PROMOTE || coinsTospend > MAX_COINS_TO_PROMOTE) {
      return { 
        data: null, 
        error: new Error(`Coins must be between ${MIN_COINS_TO_PROMOTE} and ${MAX_COINS_TO_PROMOTE}`) 
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return { data: null, error: new Error('Could not fetch user profile') };
    }

    console.log(`User balance: ${profile.coin_balance}, trying to spend: ${coinsTospend}`);

    if (profile.coin_balance < coinsTospend) {
      console.error(`Insufficient coins: ${profile.coin_balance} < ${coinsTospend}`);
      return { data: null, error: new Error(`Insufficient coins. You have ${profile.coin_balance} coins but need ${coinsTospend}`) };
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('boost_value, coins_spent_on_promotion, last_promoted_at')
      .eq('id', videoId)
      .single();

    if (videoError) {
      console.error('Video error:', videoError);
      return { data: null, error: videoError };
    }

    const newBalance = profile.coin_balance - coinsTospend;
    const { error: updateBalanceError } = await supabase
      .from('profiles')
      .update({ coin_balance: newBalance })
      .eq('id', userId);

    if (updateBalanceError) {
      console.error('Balance update error:', updateBalanceError);
      return { data: null, error: updateBalanceError };
    }

    console.log(`Successfully deducted ${coinsTospend} coins. New balance: ${newBalance}`);

    const lastPromoted = video?.last_promoted_at ? new Date(video.last_promoted_at) : null;
    const now = new Date();
    if (lastPromoted) {
      const hoursSincePromotion = (now.getTime() - lastPromoted.getTime()) / (1000 * 60 * 60);
      if (hoursSincePromotion < PROMOTION_COOLDOWN_HOURS) {
      }
    }

    const currentBoost = video?.boost_value || 1;
    const newBoost = Math.min(currentBoost + (coinsTospend * BOOST_MULTIPLIER), MAX_BOOST_VALUE);
    const totalCoinsSpent = (video?.coins_spent_on_promotion || 0) + coinsTospend;

    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({
        boost_value: newBoost,
        coins_spent_on_promotion: totalCoinsSpent,
        last_promoted_at: now.toISOString()
      })
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('Video update error:', updateError);
      return { data: null, error: updateError };
    }

    await supabase
      .from('promotion_history')
      .insert({
        user_id: userId,
        video_id: videoId,
        coins_spent: coinsTospend,
        previous_boost: currentBoost,
        new_boost: newBoost
      });

    console.log(`Promotion successful. New boost: ${newBoost}, Remaining coins: ${newBalance}`);

    return { 
      data: { 
        newBoost, 
        totalCoinsSpent,
        remainingCoins: newBalance
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Exception promoting video:', error);
    return { data: null, error };
  }
}

/**
 * Get boost value for a video
 */
export async function getVideoBoost(videoId: string) {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('boost_value, coins_spent_on_promotion')
      .eq('id', videoId)
      .single();

    if (error) return { data: null, error };
    return { data: data || { boost_value: 1, coins_spent_on_promotion: 0 }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Generate weighted random feed
 * Videos with higher boost values have higher probability of appearing
 */
export async function getWeightedVideoFeed(limit = 20, offset = 0) {
  try {
    const allVideosCacheKey = 'weighted-feed:all-videos';
    let allVideos = cacheGet<any[]>(allVideosCacheKey);

    if (!allVideos) {
      const { data, error: videosError } = await supabase
        .from('videos')
        .select(`
          id,
          user_id,
          video_url,
          caption,
          created_at,
          business_id,
          boost_value,
          view_count
        `)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      if (!data || data.length === 0) {
        return { data: [], error: null };
      }
      allVideos = data;
      cacheSet(allVideosCacheKey, allVideos, 2 * 60 * 1000); // 2 min TTL
    }

    const weightedPool: string[] = [];
    allVideos.forEach((video: any) => {
      const boost = video.boost_value || 1;
      const weight = Math.ceil(boost * 20);
      for (let i = 0; i < weight; i++) {
        weightedPool.push(video.id);
      }
    });

    const selectedVideoIds = new Set<string>();
    const maxAttempts = limit * 5;
    let attempts = 0;

    while (selectedVideoIds.size < Math.min(limit, allVideos.length) && attempts < maxAttempts) {
      const randomIndex = Math.floor(Math.random() * weightedPool.length);
      selectedVideoIds.add(weightedPool[randomIndex]);
      attempts++;
    }

    const selectedVideos = allVideos.filter((v: any) => selectedVideoIds.has(v.id));

    if (selectedVideos.length === 0) {
      return { data: [], error: null };
    }

    let profilesMap: { [key: string]: any } = {};
    let businessesMap: { [key: string]: any } = {};

    const userIds = Array.from(new Set(selectedVideos.map((v: any) => v.user_id).filter(Boolean))) as string[];
    const businessIds = Array.from(new Set(selectedVideos.map((v: any) => v.business_id).filter(Boolean))) as string[];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, profile_picture_url')
        .in('id', userIds);

      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
      }
    }

    if (businessIds.length > 0) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, owner_id, business_name, business_type, category, profile_picture_url, average_rating, total_reviews, price_range_min, price_range_max, latitude, longitude')
        .in('id', businessIds);

      if (businesses) {
        businessesMap = Object.fromEntries(businesses.map((b: any) => [b.id, b]));
      }
    }

    const enrichedVideos = selectedVideos.map((v: any) => {
      return {
        ...v,
        profiles: profilesMap[v.user_id] || null,
        businesses: businessesMap[v.business_id] || null,
      };
    });

    return { data: enrichedVideos, error: null };
  } catch (error: any) {
    console.error('Exception generating weighted feed:', error);
    return { data: null, error };
  }
}

/**
 * Track a video view and increment the view count
 * @param videoId - The ID of the video being viewed
 * @param userId - Optional user ID (if logged in)
 * @param ipAddress - Optional IP address (useful for tracking anonymous views)
 * @returns true if the view was counted, false if already viewed recently (cooldown)
 */
export async function trackVideoView(
  videoId: string,
  userId?: string,
  ipAddress?: string
) {
  try {
    const { data, error } = await supabase.rpc(
      'increment_video_view_count',
      {
        p_video_id: videoId,
        p_user_id: userId || null,
        p_ip_address: ipAddress || null,
      }
    );

    if (error) {
      console.error('Error tracking video view:', error);
      return { success: false, error };
    }

    return { success: data === true, error: null };
  } catch (error: any) {
    console.error('Exception tracking video view:', error);
    return { success: false, error };
  }
}

