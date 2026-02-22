import type { SearchFilters } from '../models/Search';
import {
  expandSearchQuery,
  aiAssistedSearch,
  searchVideos,
  searchBusinesses,
} from '../lib/supabase/search';

export class SearchService {
  async searchVideos(filters: SearchFilters) {
    return searchVideos(filters);
  }

  async searchBusinesses(filters: SearchFilters) {
    return searchBusinesses(filters);
  }

  expandSearchQuery(query: string): string[] {
    return expandSearchQuery(query);
  }

  async aiAssistedSearch(filters: SearchFilters) {
    return aiAssistedSearch(filters);
  }
}

export const searchService = new SearchService();
