import { supabase } from './client';
import type { Profile, Business, ProfileUpdateData, BusinessUpdateData } from '../../models/Profile';

export type { Profile, Business, ProfileUpdateData, BusinessUpdateData };

const STORAGE_BUCKET = 'avatars';
export const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
export const BYTES_TO_MB = 1024 * 1024; // Conversion constant for bytes to megabytes
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

/**
 * Fetch a single profile by user ID
 * This function includes proper error handling for missing profiles
 */
export async function getProfileByUserId(userId: string) {
  try {
    if (!userId) {
      return { data: null, error: new Error('User ID is required') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username, full_name, bio, profile_picture_url')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return { data: null, error: null };
    }

    if (error) {
      console.error('Error fetching profile:', {
        message: error.message,
        code: error.code,
      });
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception fetching profile:', error);
    return { data: null, error };
  }
}

/**
 * Generate a unique ID for file naming
 * Uses crypto.randomUUID() when available, otherwise falls back to a timestamp-based ID
 */
function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}

/**
 * Upload profile picture to Supabase Storage
 */
export async function uploadProfilePicture(file: File, userId: string) {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      return { data: null, error: new Error('Invalid file name: no extension found') };
    }

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
      return { 
        data: null, 
        error: new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`) 
      };
    }

    const uniqueId = generateUniqueId();
    const fileName = `profile-pictures/${userId}/${uniqueId}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error('Storage upload error:', {
        message: error.message,
      });
      return { data: null, error };
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
  } catch (error: any) {
    console.error('Profile picture upload exception:', error);
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

    if (error) {
      console.error('Profile update error:', {
        message: error.message,
        code: error.code,
      });
      return { data: null, error };
    }
    return { data, error: null };
  } catch (error: any) {
    console.error('Profile update exception:', error);
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
/**
 * Get user's coin balance
 */
export async function getUserCoins(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (error) return { data: null, error };
    return { data: data?.coin_balance || 100, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Deduct coins from user account (for promotions)
 */
export async function deductCoins(userId: string, amount: number) {
  try {
    if (amount < 0) {
      return { data: null, error: new Error('Amount must be positive') };
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    const currentBalance = profile?.coin_balance || 100;
    if (currentBalance < amount) {
      return { data: null, error: new Error('Insufficient coins') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ coin_balance: currentBalance - amount })
      .eq('id', userId)
      .select('coin_balance')
      .single();

    if (error) return { data: null, error };
    return { data: data?.coin_balance, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Add coins to user account (admin/rewards)
 */
export async function addCoins(userId: string, amount: number) {
  try {
    if (amount < 0) {
      return { data: null, error: new Error('Amount must be positive') };
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    const currentBalance = profile?.coin_balance || 100;

    const { data, error } = await supabase
      .from('profiles')
      .update({ coin_balance: currentBalance + amount })
      .eq('id', userId)
      .select('coin_balance')
      .single();

    if (error) return { data: null, error };
    return { data: data?.coin_balance, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}