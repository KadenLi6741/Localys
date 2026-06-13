import { supabase } from './client';
import type { SearchHistoryEntry, AutoSuggestResult } from '../../models/SearchHistory';
import { validateSearchQuery, sanitizeText } from '../utils/validation';

/**
 * Save a search query to the user's history.
 * Uses upsert: if the same query+mode exists, refreshes the timestamp.
 */
export async function saveSearchHistory(
  userId: string,
  query: string,
  mode: 'businesses' | 'videos' = 'businesses'
): Promise<{ error: Error | null }> {
  try {
    const cleaned = sanitizeText(query);
    const validation = validateSearchQuery(cleaned);
    if (!validation.valid) {
      return { error: new Error(validation.error) };
    }

    // Upsert: on conflict (user_id, lower(trim(search_query)), search_mode) update created_at
    const { error } = await supabase
      .from('search_history')
      .upsert(
        {
          user_id: userId,
          search_query: cleaned,
          search_mode: mode,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,search_query,search_mode' }
      );

    if (error) {
      // If upsert conflict handling isn't supported, try delete + insert
      if (error.code === '42P10' || error.message?.includes('conflict')) {
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', userId)
          .ilike('search_query', cleaned)
          .eq('search_mode', mode);

        const { error: insertError } = await supabase
          .from('search_history')
          .insert({
            user_id: userId,
            search_query: cleaned,
            search_mode: mode,
          });

        if (insertError) return { error: new Error(insertError.message) };
        return { error: null };
      }
      return { error: new Error(error.message) };
    }

    // Prune to keep only last 10 entries per user+mode
    const { data: allEntries } = await supabase
      .from('search_history')
      .select('id')
      .eq('user_id', userId)
      .eq('search_mode', mode)
      .order('created_at', { ascending: false });

    if (allEntries && allEntries.length > 10) {
      const idsToDelete = allEntries.slice(10).map(e => e.id);
      await supabase
        .from('search_history')
        .delete()
        .in('id', idsToDelete);
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to save search history.') };
  }
}

/**
 * Get the user's recent search history (last 10).
 */
export async function getSearchHistory(
  userId: string,
  mode?: 'businesses' | 'videos'
): Promise<{ data: SearchHistoryEntry[]; error: Error | null }> {
  try {
    let query = supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (mode) {
      query = query.eq('search_mode', mode);
    }

    const { data, error } = await query;

    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data as SearchHistoryEntry[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Failed to load search history.') };
  }
}

/**
 * Delete a single search history entry.
 */
export async function deleteSearchHistoryEntry(
  entryId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to delete search entry.') };
  }
}

/**
 * Clear all search history for a user.
 */
export async function clearSearchHistory(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to clear search history.') };
  }
}

/**
 * Auto-suggest: query businesses, categories, and active coupons by prefix.
 * Returns top 5 combined results.
 */
export async function getAutoSuggestions(
  query: string
): Promise<{ data: AutoSuggestResult[]; error: Error | null }> {
  try {
    const cleaned = sanitizeText(query);
    if (!cleaned || cleaned.length < 1) {
      return { data: [], error: null };
    }

    const results: AutoSuggestResult[] = [];
    const prefix = `%${cleaned}%`;

    // 1. Business name matches (top 3)
    const { data: businesses } = await supabase
      .from('profiles')
      .select('id, full_name, username, profile_picture_url, type')
      .in('type', ['food', 'retail', 'service'])
      .or(`full_name.ilike.${prefix},username.ilike.${prefix},bio.ilike.${prefix}`)
      .limit(3);

    if (businesses) {
      for (const b of businesses) {
        results.push({
          type: 'business',
          label: b.full_name || b.username,
          value: b.id,
          detail: b.type ? `${b.type.charAt(0).toUpperCase() + b.type.slice(1)}` : undefined,
          imageUrl: b.profile_picture_url || undefined,
        });
      }
    }

    // 2. Category matches
    const categories = ['Food', 'Retail', 'Service', 'Cafes', 'Pizza', 'Mexican', 'Asian',
      'Bakery', 'Italian', 'Japanese', 'Korean', 'Indian', 'Thai', 'Vietnamese',
      'Seafood', 'BBQ', 'Vegan', 'Halal', 'Dessert', 'Coffee'];

    const matchedCategories = categories
      .filter(c => c.toLowerCase().includes(cleaned.toLowerCase()))
      .slice(0, 2);

    for (const cat of matchedCategories) {
      results.push({
        type: 'category',
        label: cat,
        value: cat.toLowerCase(),
        detail: 'Category',
      });
    }

    // 3. Active coupon/deal matches (top 2)
    const { data: coupons } = await supabase
      .from('coupons')
      .select('id, code, discount_percentage, discount_amount')
      .eq('is_active', true)
      .ilike('code', prefix)
      .limit(2);

    if (coupons) {
      for (const c of coupons) {
        const discountLabel = c.discount_percentage
          ? `${c.discount_percentage}% off`
          : c.discount_amount
            ? `$${c.discount_amount} off`
            : 'Deal';
        results.push({
          type: 'deal',
          label: c.code,
          value: c.code,
          detail: discountLabel,
        });
      }
    }

    return { data: results.slice(0, 5), error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Unable to fetch suggestions.') };
  }
}
