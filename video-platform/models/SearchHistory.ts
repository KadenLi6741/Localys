/** Search history entry stored in the database */
export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  search_query: string;
  search_mode: 'businesses' | 'videos';
  created_at: string;
}

/** Auto-suggest result combining businesses, categories, and deals */
export interface AutoSuggestResult {
  type: 'business' | 'category' | 'deal';
  label: string;
  /** Profile ID for businesses, category slug for categories, coupon code for deals */
  value: string;
  /** Additional context (e.g. discount %, business type) */
  detail?: string;
  /** Profile picture URL for businesses */
  imageUrl?: string;
}
