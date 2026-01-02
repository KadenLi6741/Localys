import { supabase } from './client';

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

/**
 * Get all videos for feed
 */
export async function getVideosFeed(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        full_name,
        profile_picture_url
      ),
      businesses:business_id (
        id,
        business_name,
        category,
        profile_picture_url,
        latitude,
        longitude,
        average_rating,
        total_reviews
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, error };
}

/**
 * Get video by ID
 */
export async function getVideoById(videoId: string) {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        full_name,
        profile_picture_url
      ),
      businesses:business_id (
        *
      )
    `)
    .eq('id', videoId)
    .single();

  return { data, error };
}

/**
 * Upload video file to Supabase Storage
 */
export async function uploadVideoFile(file: File, userId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) return { data: null, error };

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName);

  return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
}




