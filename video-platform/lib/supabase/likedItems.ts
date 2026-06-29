import { supabase } from './client';
import { isDemoId } from '../utils/ids';

/**
 * Liked menu items backed by the `liked_items` table.
 *
 * Demo/seeded items use slug ids (e.g. "jays-burger-0") that are NOT valid
 * Supabase UUIDs, so they are handled entirely client-side
 * (lib/clientEngagement.ts) — these functions short-circuit on `isDemoId` to
 * avoid `invalid input syntax for type uuid`. Only real UUID items are written
 * to / read from Supabase.
 */

export interface LikedItemInput {
  id: string;
  name: string;
  price: number;
  image?: string;
  storeName: string;
  href: string;
}

export interface LikedItemRow {
  id: string;
  name: string;
  price: number;
  image?: string;
  storeName: string;
  href: string;
}

/** Persist a like for a real (UUID) item. Demo items are no-ops here. */
export async function likeMenuItem(userId: string, item: LikedItemInput) {
  if (isDemoId(item.id)) return { error: null };
  try {
    const { error } = await supabase.from('liked_items').insert({
      user_id: userId,
      item_id: item.id,
      name: item.name,
      price: item.price,
      image: item.image ?? null,
      store_id: null,
      store_name: item.storeName ?? null,
    });
    if (error && error.code !== '23505') {
      // 23505 = already liked (unique violation) → treat as success
      console.error('Error liking item:', error.message || error.details || error.code);
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (error) {
    console.error('Exception liking item:', error instanceof Error ? error.message : String(error));
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/** Remove a like for a real (UUID) item. Demo items are no-ops here. */
export async function unlikeMenuItem(userId: string, itemId: string) {
  if (isDemoId(itemId)) return { error: null };
  try {
    const { error } = await supabase
      .from('liked_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId);
    if (error) {
      console.error('Error unliking item:', error.message || error.details || error.code);
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (error) {
    console.error('Exception unliking item:', error instanceof Error ? error.message : String(error));
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/** Fetch a user's liked (real) items. Returns [] on any error (never throws). */
export async function getUserLikedItems(userId: string): Promise<LikedItemRow[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('liked_items')
      .select('item_id, name, price, image, store_name, store_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      if (error) console.error('Error fetching liked items:', error.message || error.code);
      return [];
    }
    return data.map((r: {
      item_id: string; name: string | null; price: number | null;
      image: string | null; store_name: string | null; store_id: string | null;
    }) => ({
      id: r.item_id,
      name: r.name || 'Item',
      price: typeof r.price === 'number' ? r.price : Number(r.price) || 0,
      image: r.image || undefined,
      storeName: r.store_name || '',
      href: '/feed',
    }));
  } catch (error) {
    console.error('Exception fetching liked items:', error instanceof Error ? error.message : String(error));
    return [];
  }
}
