/**
 * Video.ts — TypeScript types for video metadata.
 * Purpose: Defines the shape of a video record (url, caption, owning user/business, category, etc.)
 *   used by the upload flow, feed and video data layer. Types only — no runtime code.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

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
