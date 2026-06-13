import { supabase } from './client';

/**
 * Check rate limit for a user action.
 * @param userId - The user performing the action
 * @param actionType - Type of action ('review' | 'question' | 'message' | 'listing')
 * @param maxActions - Maximum number of actions allowed in the window
 * @param windowMinutes - Time window in minutes
 * @returns { allowed: boolean } - Whether the action is allowed
 */
export async function checkRateLimit(
  userId: string,
  actionType: 'review' | 'question' | 'message' | 'listing',
  maxActions: number,
  windowMinutes: number
): Promise<{ allowed: boolean }> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('user_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('created_at', windowStart);

    if (error) {
      // Fail open — allow the action if rate limit check fails
      console.error('Rate limit check error:', error);
      return { allowed: true };
    }

    if ((count ?? 0) >= maxActions) {
      // Flag the user for rate limiting
      await flagContent({
        flag_type: 'rate_limit',
        target_type: 'profile',
        target_id: userId,
        flagged_user_id: userId,
        reason: `Exceeded ${maxActions} ${actionType} actions in ${windowMinutes} minutes`,
        metadata: { action_type: actionType, count: count ?? 0, window_minutes: windowMinutes },
      });
      return { allowed: false };
    }

    // Record this action for future rate limit checks
    await supabase
      .from('user_rate_limits')
      .insert({ user_id: userId, action_type: actionType });

    return { allowed: true };
  } catch {
    // Fail open
    return { allowed: true };
  }
}

/**
 * Detect duplicate menu_item listings by title similarity.
 * Checks if there's an existing item with an identical or near-identical name
 * from the same business.
 */
export async function checkDuplicateListing(
  businessId: string,
  itemName: string
): Promise<{ isDuplicate: boolean; existingItemId?: string }> {
  try {
    const normalized = itemName.trim().toLowerCase();
    if (!normalized) return { isDuplicate: false };

    const { data } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('business_id', businessId);

    if (!data || data.length === 0) return { isDuplicate: false };

    for (const item of data) {
      const existingName = (item.name || '').trim().toLowerCase();
      if (existingName === normalized) {
        await flagContent({
          flag_type: 'duplicate_listing',
          target_type: 'menu_item',
          target_id: item.id,
          flagged_user_id: null,
          reason: `Duplicate listing name: "${itemName}"`,
          metadata: { business_id: businessId, existing_item_id: item.id },
        });
        return { isDuplicate: true, existingItemId: item.id };
      }
    }

    return { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}

/**
 * Detect fake/spam reviews: flag if a user posts more than 3 reviews
 * in a 30-minute window.
 */
export async function checkSpamReview(
  userId: string
): Promise<{ isSpam: boolean }> {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Check both review tables
    const [{ count: reviewCount1 }, { count: reviewCount2 }] = await Promise.all([
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thirtyMinAgo),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('rating', 'is', null)
        .gte('created_at', thirtyMinAgo),
    ]);

    const total = (reviewCount1 ?? 0) + (reviewCount2 ?? 0);

    if (total >= 3) {
      await flagContent({
        flag_type: 'spam_review',
        target_type: 'profile',
        target_id: userId,
        flagged_user_id: userId,
        reason: `User posted ${total} reviews in 30 minutes`,
        metadata: { review_count: total, window_minutes: 30 },
      });
      return { isSpam: true };
    }

    return { isSpam: false };
  } catch {
    return { isSpam: false };
  }
}

/**
 * Insert a content flag into the content_flags table.
 */
export async function flagContent(params: {
  flag_type: 'duplicate_listing' | 'spam_review' | 'fake_account' | 'rate_limit';
  target_type: 'menu_item' | 'review' | 'profile' | 'video';
  target_id: string;
  flagged_user_id: string | null;
  reason: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('content_flags')
      .insert({
        flag_type: params.flag_type,
        target_type: params.target_type,
        target_id: params.target_id,
        flagged_user_id: params.flagged_user_id,
        reason: params.reason,
        metadata: params.metadata || {},
      });

    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to flag content.') };
  }
}

/**
 * Update last_active_at for a user. Called on key interactions.
 */
export async function updateLastActive(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    // Silent — non-critical
  }
}
