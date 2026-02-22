export type SearchMode = 'videos' | 'businesses';

export interface SearchFilters {
  query?: string;
  category?: 'food' | 'retail' | 'services';
  minRating?: number;
  maxDistance?: number;
  priceMin?: number;
  priceMax?: number;
  latitude?: number;
  longitude?: number;
  cuisineType?: string;
  formality?: string;
  specialType?: string;
  dietary?: string[];
  features?: string[];
  amenities?: string[];
  payment?: string[];
  tags?: string[];
  openNow?: boolean;
}
