import { supabase } from './client';

/**
 * Supabase access for Localy Lists — user-curated sets of restaurants, each with
 * an optional shareable "order combo" (see supabase/20260629_collections.sql).
 *
 * All reads are demo-safe: they return [] / null on any error (missing migration,
 * no network, signed out) so the UI shows empty states instead of crashing.
 */

const STORAGE_BUCKET = 'avatars'; // reuse the existing public bucket (see profiles.ts)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export interface ComboItem {
  name: string;
  price?: number;
}

export interface CollectionEntry {
  id: string;
  collection_id: string;
  store_slug: string;
  restaurant_name: string;
  restaurant_image_url: string | null;
  combo_title: string | null;
  combo_body: string | null;
  combo_items: ComboItem[];
  combo_image_urls: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  author_name: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_posted: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithEntries extends Collection {
  collection_entries: CollectionEntry[];
}

const SELECT_WITH_ENTRIES =
  '*, collection_entries(id, collection_id, store_slug, restaurant_name, restaurant_image_url, combo_title, combo_body, combo_items, combo_image_urls, sort_order, created_at, updated_at)';

/** Normalize a raw row's nested entries (sorted) so callers get a stable shape. */
function normalize(row: Record<string, unknown>): CollectionWithEntries {
  const rawEntries = (row.collection_entries as unknown[] | undefined) ?? [];
  const entries: CollectionEntry[] = rawEntries
    .map((e) => normalizeEntry(e))
    .sort((a, b) => a.sort_order - b.sort_order);
  return { ...(row as unknown as Collection), collection_entries: entries };
}

// ----- Reads -------------------------------------------------------------------------

/** The signed-in user's own lists (newest first), with their entries. */
export async function getMyCollections(userId: string): Promise<CollectionWithEntries[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('collections')
      .select(SELECT_WITH_ENTRIES)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(normalize);
  } catch {
    return [];
  }
}

/** Lists posted to the homepage (newest first), with their entries. */
export async function getPostedCollections(limit = 12): Promise<CollectionWithEntries[]> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select(SELECT_WITH_ENTRIES)
      .eq('is_posted', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(normalize);
  } catch {
    return [];
  }
}

/** A single list with its entries, or null if not found / not visible. */
export async function getCollectionById(id: string): Promise<CollectionWithEntries | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('collections')
      .select(SELECT_WITH_ENTRIES)
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return normalize(data);
  } catch {
    return null;
  }
}

// ----- Collection writes -------------------------------------------------------------

export async function createCollection(
  userId: string,
  authorName: string | null,
  fields: { title: string; description?: string | null; cover_image_url?: string | null },
): Promise<{ data: Collection | null; error: Error | null }> {
  if (!userId) return { data: null, error: new Error('Not signed in') };
  try {
    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: userId,
        author_name: authorName,
        title: fields.title,
        description: fields.description ?? null,
        cover_image_url: fields.cover_image_url ?? null,
      })
      .select('*')
      .single();
    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as Collection, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function updateCollection(
  id: string,
  patch: Partial<Pick<Collection, 'title' | 'description' | 'cover_image_url' | 'is_posted'>>,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('collections')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    return { error: error ? new Error(error.message) : null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function deleteCollection(id: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    return { error: error ? new Error(error.message) : null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// ----- Entry writes ------------------------------------------------------------------

export async function addEntry(
  collectionId: string,
  restaurant: { store_slug: string; restaurant_name: string; restaurant_image_url?: string | null },
): Promise<{ data: CollectionEntry | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('collection_entries')
      .insert({
        collection_id: collectionId,
        store_slug: restaurant.store_slug,
        restaurant_name: restaurant.restaurant_name,
        restaurant_image_url: restaurant.restaurant_image_url ?? null,
      })
      .select('*')
      .single();
    if (error) return { data: null, error: new Error(error.message) };
    return { data: normalizeEntry(data), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function updateEntry(
  entryId: string,
  patch: Partial<Pick<CollectionEntry, 'combo_title' | 'combo_body' | 'combo_items' | 'combo_image_urls' | 'sort_order'>>,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('collection_entries')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', entryId);
    return { error: error ? new Error(error.message) : null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function removeEntry(entryId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('collection_entries').delete().eq('id', entryId);
    return { error: error ? new Error(error.message) : null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

function normalizeEntry(e: unknown): CollectionEntry {
  const entry = e as CollectionEntry;
  return {
    ...entry,
    combo_items: Array.isArray(entry.combo_items) ? entry.combo_items : [],
    combo_image_urls: Array.isArray(entry.combo_image_urls) ? entry.combo_image_urls : [],
  };
}

// ----- Likes -------------------------------------------------------------------------

/** Ids of posted lists the user has liked. */
export async function getLikedCollectionIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('collection_likes')
      .select('collection_id')
      .eq('user_id', userId);
    if (error || !data) return [];
    return (data as { collection_id: string }[]).map((r) => r.collection_id);
  } catch {
    return [];
  }
}

/** Toggle the user's like on a list. Returns the new liked state. */
export async function toggleCollectionLike(
  collectionId: string,
  userId: string,
  currentlyLiked: boolean,
): Promise<{ liked: boolean; error: Error | null }> {
  if (!userId) return { liked: currentlyLiked, error: new Error('Not signed in') };
  try {
    if (currentlyLiked) {
      const { error } = await supabase
        .from('collection_likes')
        .delete()
        .eq('collection_id', collectionId)
        .eq('user_id', userId);
      if (error) return { liked: currentlyLiked, error: new Error(error.message) };
      return { liked: false, error: null };
    }
    const { error } = await supabase
      .from('collection_likes')
      .insert({ collection_id: collectionId, user_id: userId });
    // 23505 = already liked → treat as success
    if (error && error.code !== '23505') return { liked: currentlyLiked, error: new Error(error.message) };
    return { liked: true, error: null };
  } catch (error) {
    return { liked: currentlyLiked, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// ----- Image upload ------------------------------------------------------------------

/**
 * Upload a list cover / combo photo to the public `avatars` bucket (same pattern as
 * uploadMenuItemImage in profiles.ts). Returns the public URL.
 */
export async function uploadCollectionImage(
  file: File,
  userId: string,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (!file.type.startsWith('image/')) {
      return { url: null, error: new Error('Please select an image file') };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { url: null, error: new Error('Image must be less than 5MB') };
    }
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
      return { url: null, error: new Error(`Invalid image format. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`) };
    }
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const fileName = `collections/${userId}/${uniqueId}.${fileExt}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (error) return { url: null, error: new Error('Failed to upload image') };

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
