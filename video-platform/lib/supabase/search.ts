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
    .select('*');

  // Apply text search - search in caption
  if (interpretedFilters.query) {
    const searchTerm = `%${interpretedFilters.query}%`;
    query = query.ilike('caption', searchTerm);
  }

  // Apply category filter (if we have business_id)
  // Note: Category filtering would require joining with businesses table
  // For now, we filter after fetching related data

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Search query error:', error);
    return { data: [], error };
  }

  // Now fetch related data for each video
  const results = await Promise.all(
    (data || []).map(async (video: any) => {
      let enrichedVideo = { ...video };

      // Fetch profile if user_id exists
      if (video.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_picture_url')
          .eq('id', video.user_id)
          .single();
        if (profile) {
          enrichedVideo.profiles = profile;
        }
      }

      // Fetch business if business_id exists
      if (video.business_id) {
        console.log(`Fetching business data for video ${video.id} with business_id: ${video.business_id}`);
        try {
          const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', video.business_id);
          
          if (businessError) {
            console.error(`Error fetching business ${video.business_id}:`, businessError);
          } else if (businesses && businesses.length > 0) {
            const business = businesses[0];
            console.log(`Fetched business:`, business);
            enrichedVideo.businesses = {
              id: business.id,
              business_name: business.business_name,
              category: business.category,
              profile_picture_url: business.profile_picture_url,
              latitude: business.latitude,
              longitude: business.longitude,
              average_rating: business.average_rating,
              total_reviews: business.total_reviews,
              price_range_min: business.price_range_min,
              price_range_max: business.price_range_max,
            };
          } else {
            console.log(`No business found for business_id: ${video.business_id}`);
          }
        } catch (err) {
          console.error(`Exception fetching business ${video.business_id}:`, err);
        }
      }

      return enrichedVideo;
    })
  );

  // Filter results by category (if specified)
  let filteredResults = results;
  if (interpretedFilters.category) {
    console.log('Category filter active:', interpretedFilters.category);
    console.log('Total results before category filter:', results.length);
    
    filteredResults = results.filter(video => {
      // If video has a business, check the business category
      if (video.businesses?.category) {
        const match = video.businesses.category === interpretedFilters.category;
        console.log(`Video: ${video.businesses.business_name}, db_category: "${video.businesses.category}", filter_category: "${interpretedFilters.category}", match: ${match}`);
        return match;
      }
      // Personal videos don't have a category, so exclude them if category filter is active
      console.log(`Video ${video.id} has no business`);
      return false;
    });
    
    console.log('Results after category filter:', filteredResults.length);
  }

  // Apply rating filter
  if (interpretedFilters.minRating) {
    filteredResults = filteredResults.filter(video => {
      return video.businesses?.average_rating && video.businesses.average_rating >= interpretedFilters.minRating!;
    });
  }

  // Apply price range filter
  if (interpretedFilters.priceMin !== undefined || interpretedFilters.priceMax !== undefined) {
    filteredResults = filteredResults.filter(video => {
      if (!video.businesses) return false;
      const minPrice = video.businesses.price_range_min || 0;
      const maxPrice = video.businesses.price_range_max || 1000;
      
      const filterMin = interpretedFilters.priceMin || 0;
      const filterMax = interpretedFilters.priceMax || 1000;
      
      // Check if price range overlaps
      return !(maxPrice < filterMin || minPrice > filterMax);
    });
  }

  // Rank results by relevance (when AI is connected, this will be enhanced)
  const rankedResults = rankSearchResults(filteredResults, interpretedFilters);

  return { data: rankedResults, error: null };
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




