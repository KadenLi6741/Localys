import { supabase } from './client';
import type { Profile, Business, ProfileUpdateData, BusinessUpdateData, BusinessHours } from '../../models/Profile';

export type { Profile, Business, ProfileUpdateData, BusinessUpdateData, BusinessHours };

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
    
    // Parse business_hours if it's a string
    if (data && data.business_hours && typeof data.business_hours === 'string') {
      data.business_hours = JSON.parse(data.business_hours);
    }
    
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
    console.log('updateBusinessInfo called with:', { businessId, updates }); // DEBUG
    
    // Ensure business_hours is properly formatted as JSONB
    const processedUpdates = {
      ...updates,
      business_hours: updates.business_hours ? JSON.parse(JSON.stringify(updates.business_hours)) : null,
    };
    
    console.log('Processed updates:', processedUpdates); // DEBUG
    
    const { data, error } = await supabase
      .from('businesses')
      .update(processedUpdates)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('updateBusinessInfo error:', error); // DEBUG
      console.error('Error code:', error.code); // DEBUG
      console.error('Error details:', error.details); // DEBUG
      return { data: null, error };
    }
    
    console.log('updateBusinessInfo success:', data); // DEBUG
    console.log('Updated business_hours:', data?.business_hours); // DEBUG
    return { data, error: null };
  } catch (error: any) {
    console.error('updateBusinessInfo exception:', error); // DEBUG
    return { data: null, error };
  }
}

/**
 * Create a new business for a user
 */
export async function createBusiness(userId: string) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: userId,
        business_name: '',
        business_type: 'general',
        business_hours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
          saturday: { open: '10:00', close: '16:00' },
          sunday: { closed: true },
        },
      })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Ensure user has a business record, create if missing
 */
export async function ensureUserBusiness(userId: string) {
  try {
    // Check if business exists
    const { data: existing, error: checkError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .single();

    // If business exists, return it
    if (!checkError && existing) {
      // Parse business_hours if it's a string
      if (existing.business_hours && typeof existing.business_hours === 'string') {
        existing.business_hours = JSON.parse(existing.business_hours);
      }
      return { data: existing, error: null };
    }

    // If business doesn't exist, create one
    if (checkError?.code === 'PGRST116') {
      return await createBusiness(userId);
    }

    // If different error, return it
    if (checkError) return { data: null, error: checkError };

    return { data: existing, error: null };
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

// ============================================
// MENU SYSTEM
// ============================================

export interface MenuItem {
  id: string;
  menu_id: string;
  user_id: string;
  item_name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  user_id: string;
  business_id?: string;
  menu_name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  menu_items?: MenuItem[];
}

export interface MenuCreateData {
  menu_name: string;
  description?: string;
  category?: string;
  business_id?: string;
}

export interface MenuUpdateData {
  menu_name?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

export interface MenuItemCreateData {
  item_name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
}

export interface MenuItemUpdateData {
  item_name?: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  is_available?: boolean;
}

/**
 * Get the primary menu for a user (their first/only menu)
 * Since each restaurant should have only one menu, this returns the user's main menu
 */
export async function getUserMenu(userId: string) {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select(`
        id,
        user_id,
        business_id,
        menu_name,
        description,
        category,
        is_active,
        created_at,
        updated_at,
        menu_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Handle the specific error when no rows are found
    if (error && error.code === 'PGRST116') {
      return { data: null, error: null }; // No menu exists, but it's not an error
    }

    if (error) {
      console.error('Error fetching menu:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception fetching menu:', error);
    return { data: null, error };
  }
}

/**
 * Get all menus for a user
 */
export async function getUserMenus(userId: string) {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select(`
        id,
        user_id,
        business_id,
        menu_name,
        description,
        category,
        is_active,
        created_at,
        updated_at,
        menu_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching menus:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception fetching menus:', error);
    return { data: null, error };
  }
}

/**
 * Get a single menu with all its items
 */
export async function getMenuById(menuId: string) {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select(`
        id,
        user_id,
        business_id,
        menu_name,
        description,
        category,
        is_active,
        created_at,
        updated_at,
        menu_items(*)
      `)
      .eq('id', menuId)
      .single();

    if (error) {
      console.error('Error fetching menu:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception fetching menu:', error);
    return { data: null, error };
  }
}

/**
 * Create a new menu for a user
 */
export async function createMenu(userId: string, menuData: MenuCreateData) {
  try {
    if (!userId || !menuData.menu_name) {
      const validationError = new Error('User ID and menu name are required');
      console.error('Validation error:', validationError);
      return { data: null, error: validationError };
    }

    const { data, error } = await supabase
      .from('menus')
      .insert({
        user_id: userId,
        menu_name: menuData.menu_name,
        description: menuData.description || '',
        category: menuData.category || 'General',
        business_id: menuData.business_id || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating menu - Details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error,
      });
      return { 
        data: null, 
        error: new Error(error.message || 'Failed to create menu. Please check that the menus table exists and RLS policies are configured.') 
      };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception creating menu:', {
      message: error.message,
      stack: error.stack,
      error,
    });
    return { data: null, error };
  }
}

/**
 * Update an existing menu
 */
export async function updateMenu(menuId: string, menuData: MenuUpdateData) {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (menuData.menu_name) updateData.menu_name = menuData.menu_name;
    if (menuData.description !== undefined) updateData.description = menuData.description;
    if (menuData.category) updateData.category = menuData.category;
    if (menuData.is_active !== undefined) updateData.is_active = menuData.is_active;

    const { data, error } = await supabase
      .from('menus')
      .update(updateData)
      .eq('id', menuId)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception updating menu:', error);
    return { data: null, error };
  }
}

/**
 * Delete a menu and all its items
 */
export async function deleteMenu(menuId: string) {
  try {
    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId);

    if (error) {
      console.error('Error deleting menu:', error);
      return { data: null, error };
    }

    return { data: { success: true }, error: null };
  } catch (error: any) {
    console.error('Exception deleting menu:', error);
    return { data: null, error };
  }
}

/**
 * Add an item to a menu
 */
export async function addMenuItemToMenu(menuId: string, userId: string, itemData: MenuItemCreateData) {
  try {
    if (!menuId || !userId || !itemData.item_name || itemData.price === undefined) {
      const validationError = new Error('Menu ID, user ID, item name, and price are required');
      console.error('Validation error:', validationError);
      return { data: null, error: validationError };
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        menu_id: menuId,
        user_id: userId,
        item_name: itemData.item_name,
        description: itemData.description || '',
        price: itemData.price,
        category: itemData.category || null,
        image_url: itemData.image_url || null,
        is_available: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding menu item - Details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error,
      });
      return { 
        data: null, 
        error: new Error(error.message || 'Failed to add menu item') 
      };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception adding menu item:', {
      message: error.message,
      stack: error.stack,
      error,
    });
    return { data: null, error };
  }
}

/**
 * Update a menu item
 */
export async function updateMenuItem(itemId: string, itemData: MenuItemUpdateData) {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (itemData.item_name) updateData.item_name = itemData.item_name;
    if (itemData.description !== undefined) updateData.description = itemData.description;
    if (itemData.price !== undefined) updateData.price = itemData.price;
    if (itemData.category !== undefined) updateData.category = itemData.category;
    if (itemData.image_url !== undefined) updateData.image_url = itemData.image_url;
    if (itemData.is_available !== undefined) updateData.is_available = itemData.is_available;

    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception updating menu item:', error);
    return { data: null, error };
  }
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(itemId: string) {
  try {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting menu item:', error);
      return { data: null, error };
    }

    return { data: { success: true }, error: null };
  } catch (error: any) {
    console.error('Exception deleting menu item:', error);
    return { data: null, error };
  }
}

/**
 * Get all menu items for a menu
 */
export async function getMenuItems(menuId: string) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching menu items:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception fetching menu items:', error);
    return { data: null, error };
  }
}

/**
 * Upload a menu item image to Supabase Storage
 */
export async function uploadMenuItemImage(file: File, userId: string, menuId: string) {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { data: null, error: new Error('Please select an image file') };
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return { data: null, error: new Error('Image must be less than 5MB') };
    }

    // Extract extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      return { data: null, error: new Error('Invalid image format. Allowed: jpg, jpeg, png, gif, webp') };
    }

    // Generate unique filename
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const fileName = `menu-items/${userId}/${menuId}/${uniqueId}.${fileExt}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { data: null, error: new Error('Failed to upload image') };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
  } catch (error: any) {
    console.error('Menu item image upload exception:', error);
    return { data: null, error };
  }
}

// ============================================
// ORDERS SYSTEM
// ============================================

/**
 * Get user's coin purchase history
 */
export async function getUserCoinPurchases(userId: string) {
  try {
    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('coin_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coin purchases:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      // Return empty array on error to prevent breaking the UI
      return { data: [], error: null };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Exception fetching coin purchases:', {
      message: error.message,
      stack: error.stack,
      error
    });
    // Return empty array on error to prevent breaking the UI
    return { data: [], error: null };
  }
}
/**
 * Get all businesses with their average ratings
 */
export async function getBusinessesWithRatings() {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        business_name,
        category,
        average_rating,
        total_reviews,
        profile_picture_url,
        latitude,
        longitude,
        owner_id
      `)
      .order('average_rating', { ascending: false });

    if (error) {
      console.error('Error fetching businesses with ratings:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Exception fetching businesses with ratings:', error);
    return { data: [], error };
  }
}

/**
 * Get a specific business with its average rating and photos
 */
export async function getBusinessWithRatings(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        business_name,
        category,
        average_rating,
        total_reviews,
        profile_picture_url,
        latitude,
        longitude,
        owner_id,
        business_hours,
        business_type,
        description
      `)
      .eq('id', businessId)
      .single();

    if (error && error.code === 'PGRST116') {
      return { data: null, error: null };
    }

    if (error) {
      console.error('Error fetching business with ratings:', error);
      return { data: null, error };
    }

    // Parse business_hours if it's a string
    if (data && data.business_hours && typeof data.business_hours === 'string') {
      data.business_hours = JSON.parse(data.business_hours);
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception fetching business with ratings:', error);
    return { data: null, error };
  }
}

/**
 * Get the average rating for a specific business using the SQL function
 */
export async function getBusinessAverageRating(businessId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_business_average_rating', { p_business_id: businessId });

    if (error) {
      console.error('Error getting business average rating:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (error: any) {
    console.error('Exception getting business average rating:', error);
    return { data: null, error };
  }
}

/**
 * Get all business average ratings using the SQL function
 */
export async function getAllBusinessAverageRatings() {
  try {
    const { data, error } = await supabase
      .rpc('get_all_business_ratings');

    if (error) {
      console.error('Error getting all business average ratings:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Exception getting all business average ratings:', error);
    return { data: [], error };
  }
}

/**
 * Manually update all business ratings based on their comments
 * This can be useful if you need to recalculate ratings outside of the trigger
 */
export async function updateAllBusinessRatings() {
  try {
    const { data, error } = await supabase
      .rpc('update_business_ratings');

    if (error) {
      console.error('Error updating all business ratings:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Exception updating business ratings:', error);
    return { data: null, error };
  }
}
/**
 * Get item purchases where user is the buyer
 */
export async function getUserItemPurchases(userId: string) {
  try {
    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('item_purchases')
      .select('*')
      .eq('buyer_id', userId)
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching item purchases:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      // Return empty array on error to prevent breaking the UI
      return { data: [], error: null };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Exception fetching item purchases:', {
      message: error.message,
      stack: error.stack,
      error
    });
    // Return empty array on error to prevent breaking the UI
    return { data: [], error: null };
  }
}

/**
 * Get item sales where user is the seller (for business)
 */
export async function getBusinessItemSales(userId: string) {
  try {
    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('item_purchases')
      .select('*')
      .eq('seller_id', userId)
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching business sales:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      // Return empty array on error to prevent breaking the UI
      return { data: [], error: null };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Exception fetching business sales:', {
      message: error.message,
      stack: error.stack,
      error
    });
    // Return empty array on error to prevent breaking the UI
    return { data: [], error: null };
  }
}