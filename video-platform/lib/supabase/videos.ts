import { supabase } from './client';

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'videos';

export interface VideoMetadata {
  id?: string;
  user_id: string;
  business_id?: string;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  business_name?: string;
  category?: 'food' | 'retail' | 'services';
  created_at?: string;
}
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

// eslint-disable no-console
export async function getVideosFeed(limit = 20, offset = 0) {
  const { data: videosRaw, error: videosError } = await supabase
    .from('videos')
    .select(`
      id,
      user_id,
      video_url,
      caption,
      created_at,
      business_id
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (videosError) {
    // Log full error with detailed information
    const errorMsg = `Supabase error - Message: ${videosError?.message || 'unknown'}, Code: ${videosError?.code || 'unknown'}, Details: ${videosError?.details || 'none'}, Hint: ${videosError?.hint || 'none'}`;
    console.error(errorMsg);

    // Log Supabase client config (without revealing secrets)
    const configMsg = `Supabase config - hasUrl: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}, hasKey: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    console.error(configMsg);

    return { data: null, error: videosError };
  }

  const videosList: any[] = videosRaw || [];

  // Fetch user profiles for all videos
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
    
    // Logic to determine if we need to sign the URL
    let pathForSigning = null;

    if (url && typeof url === 'string') {
      if (!url.startsWith('http')) {
        // Case A: It's a raw storage path (e.g. "user/video.mp4")
        pathForSigning = url;
      } else if (url.includes('/storage/v1/object/public/')) {
        // Case B: It's a Supabase Public URL, but bucket might be private.
        // We try to extract the path and sign it just in case.
        // Format: .../storage/v1/object/public/{bucket}/{path}
        try {
          const urlObj = new URL(url);
          const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
          if (match && match[1]) {
            pathForSigning = decodeURIComponent(match[1]);
          }
        } catch (e) {
          // invalid url, ignore
        }
      }
    }

    if (pathForSigning) {
      try {
        const { data: signed, error: signedErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(pathForSigning, 60 * 60); // 1 hour
        if (!signedErr && signed?.signedUrl) {
          url = signed.signedUrl;
        } else {
          console.warn('createSignedUrl failed for', pathForSigning, signedErr);
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
// eslint-enable no-console

export async function getVideoById(videoId: string) {
  const { data: video, error } = await supabase
    .from('videos')
    .select(`
      *,
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

  if (video.business_id) {
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', video.business_id)
      .single();
    
    if (business) {
      video.businesses = business;
    }
  }

  // Sign URL 
  if (video.video_url && !video.video_url.startsWith('http')) {
     const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(video.video_url, 60 * 60);
     if (signed?.signedUrl) video.video_url = signed.signedUrl;
  }

  return { data: video, error: null };
}

export async function uploadVideoFile(file: File, userId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) return { data: null, error };

  // Get public URL
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
    
    // Initialize all to 0
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

// Re-export list to help static analyzers and ensure named exports are explicit
// (explicit export list removed — functions are exported where declared)





