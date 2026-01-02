import { supabase } from './client';

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'videos';

export interface ProfileUpdateData {
  full_name?: string;
  username?: string;
  bio?: string;
  profile_picture_url?: string;
}

export interface BusinessUpdateData {
  business_name?: string;
}

/**
 * Upload profile picture to Supabase Storage
 */
export async function uploadProfilePicture(file: File, userId: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `profile-pictures/${userId}/${Date.now()}.${fileExt}`;

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
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update user profile in profiles table
 */
export async function updateProfile(userId: string, updates: ProfileUpdateData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get user's business (if they own one)
 */
export async function getUserBusiness(userId: string) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .single();

    // If no business found, return null instead of error
    if (error && error.code === 'PGRST116') {
      return { data: null, error: null };
    }

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update user's business information
 */
export async function updateBusinessInfo(businessId: string, updates: BusinessUpdateData) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
