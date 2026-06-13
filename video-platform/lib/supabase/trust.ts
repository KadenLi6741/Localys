import { supabase } from './client';
import { calculateTrustScore } from '@/lib/utils/trust';
import type {
  BusinessTrustScoreSnapshot,
  BusinessVerificationStatus,
  ContentFlag,
  TrustMetrics,
} from '@/models/Trust';

type BusinessRecord = {
  id: string;
  average_rating: number | null;
  total_reviews: number | null;
  verification_status?: BusinessVerificationStatus | null;
};

type RatingRow = {
  rating: number | null;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

const DEFAULT_TRUST_METRICS: TrustMetrics = {
  avgResponseTimeMinutes: null,
  responseTimeLabel: 'No data yet',
  lastActiveAt: null,
  lastActiveLabel: 'Unknown',
  orderCompletionRate: null,
  completedOrders: 0,
  totalOrders: 0,
};

export async function getTrustMetrics(
  userId: string
): Promise<{ data: TrustMetrics; error: Error | null }> {
  try {
    const [responseTime, lastActive, orderRate] = await Promise.all([
      computeAvgResponseTime(userId),
      getLastActive(userId),
      computeOrderCompletionRate(userId),
    ]);

    return {
      data: {
        ...responseTime,
        ...lastActive,
        ...orderRate,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: DEFAULT_TRUST_METRICS,
      error: err instanceof Error ? err : new Error('Failed to load trust metrics.'),
    };
  }
}

export async function getBusinessTrustScoreSnapshot(
  userId: string
): Promise<{ data: BusinessTrustScoreSnapshot | null; error: Error | null }> {
  try {
    const business = await getBusinessRecord(userId);

    const [
      ratingMetrics,
      trustMetricsResult,
      flagsResult,
    ] = await Promise.all([
      getRatingMetrics(userId, business),
      getTrustMetrics(userId),
      getActiveFraudFlags(userId),
    ]);

    if (trustMetricsResult.error) {
      throw trustMetricsResult.error;
    }

    if (flagsResult.error) {
      throw flagsResult.error;
    }

    const metrics = {
      verificationStatus: normalizeVerificationStatus(business?.verification_status),
      isVerified: normalizeVerificationStatus(business?.verification_status) === 'verified',
      avgRating: ratingMetrics.avgRating,
      reviewCount: ratingMetrics.reviewCount,
      orderCompletionRate: trustMetricsResult.data.orderCompletionRate,
      completedOrders: trustMetricsResult.data.completedOrders,
      totalOrders: trustMetricsResult.data.totalOrders,
      avgResponseTimeMinutes: trustMetricsResult.data.avgResponseTimeMinutes,
      responseTimeLabel: trustMetricsResult.data.responseTimeLabel,
      activeFraudFlags: flagsResult.data.length,
    };

    const result = calculateTrustScore(metrics);
    const warningMessage = buildWarningMessage(flagsResult.data);

    return {
      data: {
        metrics,
        result,
        suspiciousActivityDetected: flagsResult.data.length > 0,
        warningMessage,
        flags: flagsResult.data,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to load business trust score.'),
    };
  }
}

async function getBusinessRecord(userId: string): Promise<BusinessRecord | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, average_rating, total_reviews, verification_status')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();

  if (!error) {
    return data;
  }

  // Backward compatibility: older DBs or stale API schema cache may not expose
  // newly-added columns immediately.
  if (isMissingBusinessColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('businesses')
      .select('id, verification_status')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle();

    if (!fallbackError) {
      if (!fallbackData) {
        return null;
      }

      return {
        id: fallbackData.id,
        average_rating: null,
        total_reviews: 0,
        verification_status: fallbackData.verification_status as BusinessVerificationStatus | null,
      };
    }

    if (isMissingBusinessColumnError(fallbackError)) {
      const { data: finalFallbackData, error: finalFallbackError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

      if (finalFallbackError) {
        throw new Error(finalFallbackError.message);
      }

      if (!finalFallbackData) {
        return null;
      }

      return {
        id: finalFallbackData.id,
        average_rating: null,
        total_reviews: 0,
        verification_status: 'unverified',
      };
    }

    throw new Error(fallbackError.message);
  }

  throw new Error(error.message);
}

function isMissingBusinessColumnError(error: { code?: string; message?: string }) {
  const message = error.message ?? '';

  if (error.code !== '42703' && error.code !== 'PGRST204') {
    return false;
  }

  return (
    message.includes('businesses.average_rating') ||
    message.includes('businesses.total_reviews') ||
    message.includes('businesses.verification_status') ||
    message.includes("could not find the 'average_rating' column") ||
    message.includes("could not find the 'total_reviews' column") ||
    message.includes("could not find the 'verification_status' column") ||
    message.includes("could not find the 'updated_at' column") ||
    message.includes("could not find the 'created_at' column") ||
    message.includes('column average_rating does not exist') ||
    message.includes('column total_reviews does not exist') ||
    message.includes('column verification_status does not exist') ||
    message.includes('column businesses.updated_at does not exist') ||
    message.includes('column businesses.created_at does not exist')
  );
}

async function getRatingMetrics(
  userId: string,
  business: BusinessRecord | null
): Promise<{ avgRating: number | null; reviewCount: number }> {
  const [menuItemsResult, videosResult] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id')
      .eq('user_id', userId),
    supabase
      .from('videos')
      .select('id')
      .eq('user_id', userId),
  ]);

  if (menuItemsResult.error) {
    throw new Error(menuItemsResult.error.message);
  }

  if (videosResult.error) {
    throw new Error(videosResult.error.message);
  }

  const menuItemIds = (menuItemsResult.data ?? []).map((item) => item.id);
  const videoIds = (videosResult.data ?? []).map((video) => video.id);

  const ratings: number[] = [];
  const reviewsResult = await getReviewRatings(menuItemIds, business?.id);

  if (reviewsResult.error) {
    throw reviewsResult.error;
  }

  for (const row of reviewsResult.data) {
    if (typeof row.rating === 'number') {
      ratings.push(row.rating);
    }
  }

  if (videoIds.length > 0) {
    const commentsResult = await supabase
      .from('comments')
      .select('rating')
      .in('video_id', videoIds)
      .not('rating', 'is', null);

    if (commentsResult.error) {
      throw new Error(commentsResult.error.message);
    }

    for (const row of commentsResult.data ?? []) {
      if (typeof row.rating === 'number') {
        ratings.push(row.rating);
      }
    }
  }

  if (ratings.length > 0) {
    const total = ratings.reduce((sum, rating) => sum + rating, 0);
    return {
      avgRating: Math.round((total / ratings.length) * 100) / 100,
      reviewCount: ratings.length,
    };
  }

  if (business?.average_rating !== null && business?.average_rating !== undefined) {
    return {
      avgRating: business.average_rating,
      reviewCount: business.total_reviews ?? 0,
    };
  }

  return {
    avgRating: null,
    reviewCount: 0,
  };
}

async function getReviewRatings(
  menuItemIds: string[],
  businessId?: string
): Promise<{ data: RatingRow[]; error: Error | null }> {
  if (menuItemIds.length > 0) {
    const byItemResult = await supabase
      .from('reviews')
      .select('rating')
      .in('item_id', menuItemIds);

    if (!byItemResult.error) {
      return { data: (byItemResult.data ?? []) as RatingRow[], error: null };
    }

    // Some deployments use the older reviews schema keyed by business_id.
    if (!isMissingReviewsColumnOrTable(byItemResult.error, 'item_id')) {
      return { data: [], error: new Error(byItemResult.error.message) };
    }
  }

  if (businessId) {
    const byBusinessResult = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', businessId);

    if (!byBusinessResult.error) {
      return { data: (byBusinessResult.data ?? []) as RatingRow[], error: null };
    }

    // If neither reviews schema is present, don't hard-fail trust score.
    if (isMissingReviewsColumnOrTable(byBusinessResult.error, 'business_id')) {
      return { data: [], error: null };
    }

    return { data: [], error: new Error(byBusinessResult.error.message) };
  }

  return { data: [], error: null };
}

function isMissingReviewsColumnOrTable(
  error: SupabaseErrorLike,
  column: 'item_id' | 'business_id'
) {
  const message = error.message ?? '';

  if (error.code === '42P01') {
    return message.includes('reviews');
  }

  if (error.code !== '42703' && error.code !== 'PGRST204') {
    return false;
  }

  return (
    message.includes(`reviews.${column}`) ||
    message.includes(`column ${column} does not exist`) ||
    message.includes(`column reviews.${column} does not exist`) ||
    message.includes(`could not find the '${column}' column`)
  );
}

async function getActiveFraudFlags(
  userId: string
): Promise<{ data: ContentFlag[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('content_flags')
      .select('id, flag_type, target_type, target_id, flagged_user_id, reason, metadata, status, created_at')
      .eq('flagged_user_id', userId)
      .in('status', ['pending', 'reviewed', 'actioned'])
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? []) as ContentFlag[],
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Failed to load suspicious activity flags.'),
    };
  }
}

async function computeAvgResponseTime(
  userId: string
): Promise<Pick<TrustMetrics, 'avgResponseTimeMinutes' | 'responseTimeLabel'>> {
  try {
    const { data: memberships, error: membershipError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    if (membershipError) {
      throw membershipError;
    }

    if (!memberships || memberships.length === 0) {
      return { avgResponseTimeMinutes: null, responseTimeLabel: 'No messages yet' };
    }

    const chatIds = memberships.map((membership) => membership.chat_id);

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: true })
      .limit(500);

    if (messagesError) {
      throw messagesError;
    }

    if (!messages || messages.length < 2) {
      return { avgResponseTimeMinutes: null, responseTimeLabel: 'No messages yet' };
    }

    const responseTimes: number[] = [];
    const chatMessages = new Map<string, typeof messages>();

    for (const message of messages) {
      if (!chatMessages.has(message.chat_id)) {
        chatMessages.set(message.chat_id, []);
      }

      chatMessages.get(message.chat_id)?.push(message);
    }

    for (const [, chat] of chatMessages) {
      for (let index = 1; index < chat.length; index += 1) {
        const previous = chat[index - 1];
        const current = chat[index];

        if (previous.sender_id !== userId && current.sender_id === userId) {
          const diffMs = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
          const diffMinutes = diffMs / (1000 * 60);

          if (diffMinutes > 0 && diffMinutes <= 1440) {
            responseTimes.push(diffMinutes);
          }
        }
      }
    }

    if (responseTimes.length === 0) {
      return { avgResponseTimeMinutes: null, responseTimeLabel: 'No response data yet' };
    }

    const avgMinutes = Math.round(
      responseTimes.reduce((sum, minutes) => sum + minutes, 0) / responseTimes.length
    );

    return {
      avgResponseTimeMinutes: avgMinutes,
      responseTimeLabel: formatResponseTime(avgMinutes),
    };
  } catch {
    return { avgResponseTimeMinutes: null, responseTimeLabel: 'Unable to calculate' };
  }
}

function formatResponseTime(minutes: number): string {
  if (minutes < 1) return 'Responds instantly';
  if (minutes < 5) return 'Responds in a few minutes';
  if (minutes < 60) return `Responds in about ${minutes} minutes`;
  if (minutes < 1440) {
    const hours = Math.round(minutes / 60);
    return `Responds in about ${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return 'Responds within a day';
}

async function getLastActive(
  userId: string
): Promise<Pick<TrustMetrics, 'lastActiveAt' | 'lastActiveLabel'>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_active_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    if (!data?.last_active_at) {
      return { lastActiveAt: null, lastActiveLabel: 'Unknown' };
    }

    return {
      lastActiveAt: data.last_active_at,
      lastActiveLabel: formatLastActive(data.last_active_at),
    };
  } catch {
    return { lastActiveAt: null, lastActiveLabel: 'Unknown' };
  }
}

function formatLastActive(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'Active now';
  if (minutes < 5) return 'Active just now';
  if (minutes < 60) return `Last active ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Last active yesterday';
  if (days < 7) return `Last active ${days} days ago`;

  return `Last active ${Math.floor(days / 7)}w ago`;
}

async function computeOrderCompletionRate(
  userId: string
): Promise<Pick<TrustMetrics, 'orderCompletionRate' | 'completedOrders' | 'totalOrders'>> {
  try {
    const relevantStatuses = ['pending', 'paid', 'completed', 'cancelled', 'failed'];

    const [{ count: totalCount, error: totalError }, { count: completedCount, error: completedError }] =
      await Promise.all([
        supabase
          .from('item_purchases')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', userId)
          .in('status', relevantStatuses),
        supabase
          .from('item_purchases')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', userId)
          .eq('status', 'completed'),
      ]);

    if (totalError) {
      throw totalError;
    }

    if (completedError) {
      throw completedError;
    }

    const totalOrders = totalCount ?? 0;
    const completedOrders = completedCount ?? 0;

    if (totalOrders === 0) {
      return {
        orderCompletionRate: null,
        completedOrders: 0,
        totalOrders: 0,
      };
    }

    return {
      orderCompletionRate: Math.round((completedOrders / totalOrders) * 100),
      completedOrders,
      totalOrders,
    };
  } catch {
    return {
      orderCompletionRate: null,
      completedOrders: 0,
      totalOrders: 0,
    };
  }
}

function normalizeVerificationStatus(
  status: BusinessVerificationStatus | null | undefined
): BusinessVerificationStatus {
  if (status === 'pending' || status === 'verified' || status === 'rejected') {
    return status;
  }

  return 'unverified';
}

function buildWarningMessage(flags: ContentFlag[]) {
  if (flags.length === 0) {
    return null;
  }

  const latestFlag = flags[0];
  const reason = latestFlag.reason?.trim();

  if (reason) {
    return `Suspicious activity detected: ${reason}`;
  }

  return `Suspicious activity detected: ${flags.length} active flag${flags.length === 1 ? '' : 's'} found.`;
}
