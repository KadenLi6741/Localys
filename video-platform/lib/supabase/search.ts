import { supabase } from './client';

export interface SearchFilters {
  query?: string;
  category?: 'food' | 'retail' | 'services';
  minRating?: number;
  maxDistance?: number; // in km
  priceMin?: number;
  priceMax?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * AI-assisted search abstraction layer
 * This can be extended to call actual AI services (e.g., DeepSeek)
 */
export async function aiAssistedSearch(filters: SearchFilters) {
  // For now, this is a clean abstraction that can be extended
  // When AI is connected, this function will:
  // 1. Send query to AI service
  // 2. Get interpreted intent (keywords, location, category)
  // 3. Rank results by relevance
  // 4. Return enhanced search results

  // Placeholder: Return filters as-is for now
  return filters;
}

/**
 * Search videos and businesses
 */
export async function searchVideos(filters: SearchFilters) {
  // First, get AI interpretation (when connected)
  const interpretedFilters = await aiAssistedSearch(filters);

  let query = supabase
    .from('videos')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        full_name,
        profile_picture_url
      ),
      businesses:business_id (
        id,
        business_name,
        category,
        profile_picture_url,
        latitude,
        longitude,
        average_rating,
        total_reviews,
        price_range_min,
        price_range_max
      )
    `);

  // Apply text search
  if (interpretedFilters.query) {
    query = query.or(`caption.ilike.%${interpretedFilters.query}%,business_name.ilike.%${interpretedFilters.query}%`);
  }

  // Apply category filter
  if (interpretedFilters.category) {
    query = query.eq('businesses.category', interpretedFilters.category);
  }

  // Apply rating filter
  if (interpretedFilters.minRating) {
    query = query.gte('businesses.average_rating', interpretedFilters.minRating);
  }

  // Apply price range filter
  if (interpretedFilters.priceMin !== undefined) {
    query = query.gte('businesses.price_range_min', interpretedFilters.priceMin);
  }
  if (interpretedFilters.priceMax !== undefined) {
    query = query.lte('businesses.price_range_max', interpretedFilters.priceMax);
  }

  // Apply location filter (if coordinates provided)
  if (interpretedFilters.latitude && interpretedFilters.longitude && interpretedFilters.maxDistance) {
    // Note: This is a simplified distance filter
    // For production, use PostGIS or calculate distance in application
    // For now, we'll filter by approximate bounding box
    const latDelta = interpretedFilters.maxDistance / 111; // ~111 km per degree
    const lngDelta = interpretedFilters.maxDistance / (111 * Math.cos(interpretedFilters.latitude * Math.PI / 180));
    
    query = query
      .gte('businesses.latitude', interpretedFilters.latitude - latDelta)
      .lte('businesses.latitude', interpretedFilters.latitude + latDelta)
      .gte('businesses.longitude', interpretedFilters.longitude - lngDelta)
      .lte('businesses.longitude', interpretedFilters.longitude + lngDelta);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  // Rank results by relevance (when AI is connected, this will be enhanced)
  const rankedResults = rankSearchResults(data || [], interpretedFilters);

  return { data: rankedResults, error };
}

/**
 * Rank search results by relevance
 * This will be enhanced when AI is connected
 */
function rankSearchResults(results: any[], filters: SearchFilters) {
  return results.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Boost by rating
    if (a.businesses?.average_rating) scoreA += a.businesses.average_rating * 10;
    if (b.businesses?.average_rating) scoreB += b.businesses.average_rating * 10;

    // Boost by recency
    if (a.created_at) scoreA += new Date(a.created_at).getTime() / 1000000;
    if (b.created_at) scoreB += new Date(b.created_at).getTime() / 1000000;

    return scoreB - scoreA;
  });
}




