import { supabase } from './client';

/**
 * Supabase access for allergen data (see supabase/20260629_allergens.sql).
 *
 * All reads are demo-safe: they return empty on any error (missing migration,
 * no network) so the UI falls back to the curated/auto-detected data in
 * lib/allergens.ts and the app never breaks.
 */

/** Curated per-store allergen tags, grouped as { slug: [allergenKey, ...] }. */
export async function getCuratedStoreAllergens(): Promise<Record<string, string[]>> {
  try {
    const { data, error } = await supabase
      .from('store_allergens')
      .select('store_slug, allergen_key');
    if (error || !data) return {};
    const map: Record<string, string[]> = {};
    for (const row of data as { store_slug: string; allergen_key: string }[]) {
      (map[row.store_slug] ||= []).push(row.allergen_key);
    }
    return map;
  } catch {
    return {};
  }
}

/** The allergen keys a user has flagged. Returns [] when signed out / on error. */
export async function getUserAllergies(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('user_allergies')
      .select('allergen_key')
      .eq('user_id', userId);
    if (error || !data) return [];
    return (data as { allergen_key: string }[]).map((r) => r.allergen_key);
  } catch {
    return [];
  }
}

/**
 * Replace a user's allergy selections with `keys`. Diffs against current rows
 * so we only insert/delete what changed. Returns { error } (never throws).
 */
export async function setUserAllergies(userId: string, keys: string[]): Promise<{ error: Error | null }> {
  if (!userId) return { error: new Error('Not signed in') };
  try {
    const current = await getUserAllergies(userId);
    const next = new Set(keys);
    const toAdd = keys.filter((k) => !current.includes(k));
    const toRemove = current.filter((k) => !next.has(k));

    if (toRemove.length) {
      const { error } = await supabase
        .from('user_allergies')
        .delete()
        .eq('user_id', userId)
        .in('allergen_key', toRemove);
      if (error) return { error: new Error(error.message) };
    }
    if (toAdd.length) {
      const { error } = await supabase
        .from('user_allergies')
        .insert(toAdd.map((allergen_key) => ({ user_id: userId, allergen_key })));
      // 23505 = row already present → treat as success
      if (error && error.code !== '23505') return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}
