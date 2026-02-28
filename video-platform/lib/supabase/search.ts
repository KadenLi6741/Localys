import { supabase } from './client';
import { cacheGet, cacheSet } from '../cache';
import { haversineDistance } from '../utils/geo';
import { computeRoundedPriceRange } from '../utils/pricing';
import type { SearchMode, SearchFilters } from '../../models/Search';

export type { SearchMode, SearchFilters };

/**
 * Semantic keyword mapping for food search
 * Maps common search terms to related terms for broader matching
 */
const SEMANTIC_MAP: Record<string, string[]> = {
  noodle: ['pho', 'ramen', 'spaghetti', 'pasta', 'udon', 'soba', 'lo mein', 'chow mein', 'pad thai', 'laksa', 'noodle'],
  pho: ['pho', 'noodle', 'vietnamese', 'soup'],
  ramen: ['ramen', 'noodle', 'japanese', 'soup'],
  pasta: ['pasta', 'spaghetti', 'fettuccine', 'penne', 'linguine', 'italian', 'noodle'],
  spaghetti: ['spaghetti', 'pasta', 'italian', 'noodle'],
  udon: ['udon', 'noodle', 'japanese', 'soup'],
  rice: ['rice', 'fried rice', 'biryani', 'risotto', 'sushi', 'poke', 'bibimbap'],
  sushi: ['sushi', 'sashimi', 'japanese', 'rice', 'maki', 'nigiri'],
  bread: ['bread', 'bakery', 'baguette', 'sourdough', 'croissant', 'pastry'],
  pizza: ['pizza', 'italian', 'flatbread', 'calzone'],
  burger: ['burger', 'hamburger', 'cheeseburger', 'fast food', 'american'],
  coffee: ['coffee', 'espresso', 'latte', 'cappuccino', 'cafe', 'mocha', 'americano'],
  tea: ['tea', 'boba', 'bubble tea', 'matcha', 'chai', 'bbt'],
  boba: ['boba', 'bubble tea', 'bbt', 'tea', 'milk tea', 'taro'],
  chinese: ['chinese', 'dim sum', 'dumpling', 'wonton', 'szechuan', 'cantonese'],
  japanese: ['japanese', 'sushi', 'ramen', 'udon', 'tempura', 'teriyaki', 'izakaya'],
  korean: ['korean', 'bbq', 'bibimbap', 'kimchi', 'bulgogi', 'tteokbokki'],
  mexican: ['mexican', 'taco', 'burrito', 'quesadilla', 'enchilada', 'salsa'],
  italian: ['italian', 'pasta', 'pizza', 'risotto', 'gelato', 'tiramisu'],
  indian: ['indian', 'curry', 'naan', 'biryani', 'tandoori', 'masala'],
  thai: ['thai', 'pad thai', 'curry', 'tom yum', 'satay', 'green curry'],
  vietnamese: ['vietnamese', 'pho', 'banh mi', 'spring roll', 'bun'],
  dessert: ['dessert', 'cake', 'ice cream', 'pastry', 'gelato', 'pie', 'cookie', 'brownie'],
  breakfast: ['breakfast', 'brunch', 'pancake', 'waffle', 'eggs', 'bacon', 'toast'],
  seafood: ['seafood', 'fish', 'shrimp', 'lobster', 'crab', 'oyster', 'salmon'],
  steak: ['steak', 'beef', 'ribeye', 'filet', 'grill', 'bbq'],
  salad: ['salad', 'healthy', 'greens', 'bowl', 'vegan'],
  soup: ['soup', 'pho', 'ramen', 'chowder', 'stew', 'broth', 'bisque'],
  sandwich: ['sandwich', 'sub', 'wrap', 'panini', 'deli', 'hoagie'],
  taco: ['taco', 'mexican', 'burrito', 'quesadilla', 'taqueria'],
  curry: ['curry', 'indian', 'thai', 'japanese curry', 'masala'],
  dumpling: ['dumpling', 'gyoza', 'wonton', 'momo', 'pierogi', 'chinese'],
  bbq: ['bbq', 'barbecue', 'grill', 'smoked', 'ribs', 'brisket'],
  vegan: ['vegan', 'plant-based', 'vegetarian', 'healthy', 'salad'],
  halal: ['halal', 'mediterranean', 'middle eastern', 'kebab'],
  brunch: ['brunch', 'breakfast', 'mimosa', 'benedict', 'french toast'],
};

/**
 * Expand a search query using semantic keyword mapping
 */
export function expandSearchQuery(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const terms = new Set<string>([normalizedQuery]);

  const words = normalizedQuery.split(/\s+/);
  for (const word of words) {
    const related = SEMANTIC_MAP[word];
    if (related) {
      related.forEach((term) => terms.add(term));
    }
  }

  return Array.from(terms);
}

/**
 * AI-assisted search abstraction layer
 * This can be extended to call actual AI services (e.g., DeepSeek)
 */
export async function aiAssistedSearch(filters: SearchFilters) {
  return filters;
}

function geometricMean(values: number[]): number | null {
  if (!values.length) return null;
  const safeValues = values.filter((value) => value > 0);
  if (!safeValues.length) return null;
  const logSum = safeValues.reduce((sum, value) => sum + Math.log(value), 0);
  return Math.exp(logSum / safeValues.length);
}

async function getBusinessMetrics(businessIds: string[]) {
  const uniqueBusinessIds = [...new Set(businessIds.filter(Boolean))].sort();

  if (!uniqueBusinessIds.length) {
    return {} as Record<string, { average_rating: number | null; total_reviews: number; price_range_min: number | null; price_range_max: number | null }>;
  }

  const cacheKey = `business-metrics:${uniqueBusinessIds.join(',')}`;
  const cached = cacheGet<Record<string, { average_rating: number | null; total_reviews: number; price_range_min: number | null; price_range_max: number | null }>>(cacheKey);
  if (cached) return cached;

  const businessMetricsMap: Record<string, {
    average_rating: number | null;
    total_reviews: number;
    price_range_min: number | null;
    price_range_max: number | null;
  }> = {};

  const businessIdSet = new Set(uniqueBusinessIds);

  for (const businessId of uniqueBusinessIds) {
    businessMetricsMap[businessId] = {
      average_rating: null,
      total_reviews: 0,
      price_range_min: null,
      price_range_max: null,
    };
  }

  const [videosByBusinessRes, videosByUserRes, menuItemsRes] = await Promise.all([
    supabase
      .from('videos')
      .select('id, business_id, user_id')
      .in('business_id', uniqueBusinessIds),
    supabase
      .from('videos')
      .select('id, business_id, user_id')
      .in('user_id', uniqueBusinessIds),
    supabase
      .from('menu_items')
      .select('user_id, price, category')
      .in('user_id', uniqueBusinessIds)
      .ilike('category', 'main'),
  ]);

  const videoBusinessMap: Record<string, string> = {};
  const videosByBusiness = videosByBusinessRes.data || [];
  const videosByUser = videosByUserRes.data || [];

  for (const video of videosByBusiness) {
    if (!video.id) continue;
    const ownerId = video.business_id;
    if (ownerId && businessIdSet.has(ownerId)) {
      videoBusinessMap[video.id] = ownerId;
    }
  }

  for (const video of videosByUser) {
    if (!video.id) continue;
    if (videoBusinessMap[video.id]) continue;
    const ownerId = video.business_id && businessIdSet.has(video.business_id)
      ? video.business_id
      : video.user_id;
    if (ownerId && businessIdSet.has(ownerId)) {
      videoBusinessMap[video.id] = ownerId;
    }
  }

  const videoIds = Object.keys(videoBusinessMap);

  if (videoIds.length > 0) {
    const { data: commentRatings } = await supabase
      .from('comments')
      .select('video_id, rating')
      .in('video_id', videoIds)
      .not('rating', 'is', null);

    const ratingsByBusiness: Record<string, number[]> = {};

    for (const businessId of uniqueBusinessIds) {
      ratingsByBusiness[businessId] = [];
    }

    for (const row of commentRatings || []) {
      const businessId = row.video_id ? videoBusinessMap[row.video_id] : undefined;
      const rating = typeof row.rating === 'number' ? row.rating : Number(row.rating);
      if (!businessId || !Number.isFinite(rating) || rating <= 0) continue;
      ratingsByBusiness[businessId].push(rating);
    }

    for (const businessId of uniqueBusinessIds) {
      const ratings = ratingsByBusiness[businessId] || [];
      const gm = geometricMean(ratings);
      businessMetricsMap[businessId].average_rating = gm !== null ? Number(gm.toFixed(2)) : null;
      businessMetricsMap[businessId].total_reviews = ratings.length;
    }
  }

  const pricesByBusiness: Record<string, number[]> = {};
  for (const businessId of uniqueBusinessIds) {
    pricesByBusiness[businessId] = [];
  }

  for (const item of menuItemsRes.data || []) {
    const businessId = item.user_id;
    const price = typeof item.price === 'number' ? item.price : Number(item.price);
    if (!businessId || !businessIdSet.has(businessId) || !Number.isFinite(price)) continue;
    pricesByBusiness[businessId].push(price);
  }

  for (const businessId of uniqueBusinessIds) {
    const priceRange = computeRoundedPriceRange(pricesByBusiness[businessId]);
    if (priceRange) {
      businessMetricsMap[businessId].price_range_min = priceRange.min;
      businessMetricsMap[businessId].price_range_max = priceRange.max;
    }
  }

  cacheSet(cacheKey, businessMetricsMap, 5 * 60 * 1000); // 5 min TTL
  return businessMetricsMap;
}

/**
 * Search videos with semantic expansion
 */
export async function searchVideos(filters: SearchFilters) {
  const interpretedFilters = await aiAssistedSearch(filters);

  const { data, error } = await supabase
    .from('videos')
    .select('id, user_id, video_url, caption, created_at, business_id, boost_value, coins_spent_on_promotion, last_promoted_at, view_count')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Search query error:', error);
    return { data: [], error };
  }

  // Batch-fetch referenced profiles to avoid N+1
  const userIds = [...new Set((data || []).map((v: any) => v.user_id).filter(Boolean))];
  const businessIds = [...new Set((data || []).map((v: any) => v.business_id).filter(Boolean))];

  const authorProfileMap: Record<string, any> = {};
  const businessProfileMap: Record<string, any> = {};

  // Explicit author lookup: videos.user_id -> profiles.id
  if (userIds.length > 0) {
    const { data: authorProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, profile_picture_url')
      .in('id', userIds);

    if (authorProfiles) {
      for (const profile of authorProfiles) {
        authorProfileMap[profile.id] = profile;
      }
    }
  }

  if (businessIds.length > 0) {
    const { data: businessProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, profile_picture_url, type, category, latitude, longitude, average_rating, total_reviews, price_range_min, price_range_max')
      .in('id', businessIds);

    if (businessProfiles) {
      for (const profile of businessProfiles) {
        businessProfileMap[profile.id] = profile;
      }
    }
  }

  const businessMetricsMap = await getBusinessMetrics(businessIds);

  const results = (data || []).map((video: any) => {
    const userProfile = video.user_id ? authorProfileMap[video.user_id] : null;
    const bizProfile = video.business_id ? businessProfileMap[video.business_id] : null;
    const bizMetrics = video.business_id ? businessMetricsMap[video.business_id] : null;
    return {
      ...video,
      profiles: userProfile ? {
        id: userProfile.id,
        username: userProfile.username,
        full_name: userProfile.full_name,
        profile_picture_url: userProfile.profile_picture_url,
      } : null,
      businesses: bizProfile ? {
        id: bizProfile.id,
        business_name: bizProfile.full_name || bizProfile.username,
        category: bizProfile.type || bizProfile.category,
        profile_picture_url: bizProfile.profile_picture_url,
        latitude: bizProfile.latitude,
        longitude: bizProfile.longitude,
        average_rating: bizMetrics?.average_rating ?? bizProfile.average_rating ?? null,
        total_reviews: bizMetrics?.total_reviews ?? bizProfile.total_reviews ?? 0,
        price_range_min: bizMetrics?.price_range_min ?? bizProfile.price_range_min ?? null,
        price_range_max: bizMetrics?.price_range_max ?? bizProfile.price_range_max ?? null,
      } : null,
    };
  });

  let filteredResults = results;

  if (interpretedFilters.query) {
    const expandedTerms = expandSearchQuery(interpretedFilters.query);
    filteredResults = filteredResults.filter((video) => {
      if (video.caption) {
        const captionLower = video.caption.toLowerCase();
        if (expandedTerms.some(term => captionLower.includes(term.toLowerCase()))) {
          return true;
        }
      }
      if (video.businesses?.business_name) {
        const businessNameLower = video.businesses.business_name.toLowerCase();
        if (expandedTerms.some(term => businessNameLower.includes(term.toLowerCase()))) {
          return true;
        }
      }
      if (video.profiles?.full_name) {
        const fullNameLower = video.profiles.full_name.toLowerCase();
        if (expandedTerms.some(term => fullNameLower.includes(term.toLowerCase()))) {
          return true;
        }
      }
      return false;
    });
  }

  if (interpretedFilters.category) {
    filteredResults = filteredResults.filter((video) => {
      if (video.businesses?.category) {
        return video.businesses.category === interpretedFilters.category;
      }
      return false;
    });
  }

  if (interpretedFilters.minRating) {
    filteredResults = filteredResults.filter((video) => {
      return video.businesses?.average_rating && video.businesses.average_rating >= interpretedFilters.minRating!;
    });
  }

  if (interpretedFilters.priceMin !== undefined || interpretedFilters.priceMax !== undefined) {
    filteredResults = filteredResults.filter((video) => {
      if (!video.businesses) return false;
      const minPrice = video.businesses.price_range_min || 0;
      const maxPrice = video.businesses.price_range_max || 1000;
      const filterMin = interpretedFilters.priceMin || 0;
      const filterMax = interpretedFilters.priceMax || 1000;
      return !(maxPrice < filterMin || minPrice > filterMax);
    });
  }

  const rankedResults = rankSearchResults(filteredResults, interpretedFilters);
  return { data: rankedResults, error: null };
}

/**
 * Search businesses directly with semantic expansion and advanced filters
 */
export async function searchBusinesses(filters: SearchFilters) {
  const interpretedFilters = await aiAssistedSearch(filters);

  let query = supabase
    .from('profiles')
    .select('id, full_name, username, profile_picture_url, type, category, bio, latitude, longitude, average_rating, total_reviews, price_range_min, price_range_max')
    .in('type', ['food', 'retail', 'service']);

  if (interpretedFilters.query) {
    const expandedTerms = expandSearchQuery(interpretedFilters.query);
    const orFilter = expandedTerms
      .map(term => `full_name.ilike.%${term}%,username.ilike.%${term}%,bio.ilike.%${term}%`)
      .join(',');
    query = query.or(orFilter);
  }

  const { data, error } = await query
    .limit(50);

  if (error) {
    console.error('Business search error:', error);
  }

  let filteredResults = (data || []).map((profile: any) => ({
    ...profile,
    category: profile.type || profile.category,
    business_name: profile.full_name || profile.username,
    is_profile: true,
    profiles: {
      full_name: profile.full_name,
      username: profile.username,
      profile_picture_url: profile.profile_picture_url,
    },
  }));

  const businessMetricsMap = await getBusinessMetrics(filteredResults.map((biz: any) => biz.id));
  filteredResults = filteredResults.map((biz: any) => {
    const metrics = businessMetricsMap[biz.id];
    if (!metrics) return biz;
    return {
      ...biz,
      average_rating: metrics.average_rating ?? biz.average_rating ?? null,
      total_reviews: metrics.total_reviews ?? biz.total_reviews ?? 0,
      price_range_min: metrics.price_range_min ?? biz.price_range_min ?? null,
      price_range_max: metrics.price_range_max ?? biz.price_range_max ?? null,
    };
  });

  if (interpretedFilters.category) {
    filteredResults = filteredResults.filter(biz => (biz.type || biz.category) === interpretedFilters.category);
  }

  if (interpretedFilters.minRating) {
    filteredResults = filteredResults.filter(biz => (biz.average_rating || 0) >= interpretedFilters.minRating!);
  }

  if (interpretedFilters.priceMin !== undefined || interpretedFilters.priceMax !== undefined) {
    filteredResults = filteredResults.filter((biz: any) => {
      const minPrice = biz.price_range_min || 0;
      const maxPrice = biz.price_range_max || 1000;
      const filterMin = interpretedFilters.priceMin || 0;
      const filterMax = interpretedFilters.priceMax || 1000;
      return !(maxPrice < filterMin || minPrice > filterMax);
    });
  }

  if (
    interpretedFilters.maxDistance &&
    interpretedFilters.latitude !== undefined &&
    interpretedFilters.longitude !== undefined
  ) {
    filteredResults = filteredResults.filter((biz: any) => {
      if (!biz.latitude || !biz.longitude) return true;
      const dist = haversineDistance(
        interpretedFilters.latitude!,
        interpretedFilters.longitude!,
        biz.latitude,
        biz.longitude
      );
      return dist <= interpretedFilters.maxDistance!;
    });
  }

  const rankedResults = rankBusinessResults(filteredResults, interpretedFilters);
  return { data: rankedResults, error: null };
}

/**
 * Rank video search results by relevance
 */
function rankSearchResults(results: any[], filters: SearchFilters) {
  return results.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.businesses?.average_rating) scoreA += a.businesses.average_rating * 10;
    if (b.businesses?.average_rating) scoreB += b.businesses.average_rating * 10;

    if (a.boost_value) scoreA += a.boost_value * 5;
    if (b.boost_value) scoreB += b.boost_value * 5;

    if (a.view_count) scoreA += Math.log1p(a.view_count);
    if (b.view_count) scoreB += Math.log1p(b.view_count);

    if (a.created_at) scoreA += new Date(a.created_at).getTime() / 1000000;
    if (b.created_at) scoreB += new Date(b.created_at).getTime() / 1000000;

    return scoreB - scoreA;
  });
}

/**
 * Rank business search results by relevance
 */
function rankBusinessResults(results: any[], filters: SearchFilters) {
  return results.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.average_rating) scoreA += a.average_rating * 20;
    if (b.average_rating) scoreB += b.average_rating * 20;

    if (a.total_reviews) scoreA += Math.min(a.total_reviews, 50);
    if (b.total_reviews) scoreB += Math.min(b.total_reviews, 50);

    if (filters.latitude && filters.longitude) {
      if (a.latitude && a.longitude) {
        const distA = haversineDistance(filters.latitude, filters.longitude, a.latitude, a.longitude);
        scoreA += Math.max(0, 50 - distA);
      }
      if (b.latitude && b.longitude) {
        const distB = haversineDistance(filters.latitude, filters.longitude, b.latitude, b.longitude);
        scoreB += Math.max(0, 50 - distB);
      }
    }

    return scoreB - scoreA;
  });
}
