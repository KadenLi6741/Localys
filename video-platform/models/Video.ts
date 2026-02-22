export interface VideoMetadata {
  id?: string;
  user_id: string;
  business_id?: string;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  business_name?: string;
  category?: 'food' | 'retail' | 'services';
  created_at?: string;
}
