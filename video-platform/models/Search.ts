/**
 * Search.ts — TypeScript types for search mode and filters.
 * Purpose: Defines what can be searched (videos vs businesses) and the filter options, shared by the
 *   search data layer and UI. Types only — no runtime code.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export type SearchMode = 'videos' | 'businesses';

export interface SearchFilters {
  query?: string;
  category?: 'food' | 'retail' | 'service';
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
