/**
 * Profile.ts — TypeScript types for user and business profiles.
 * Purpose: Defines Profile/Business shapes plus their update payloads and business-hours type, shared
 *   by the profiles data layer, dashboard and profile pages. Types only — no runtime code.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  bio?: string;
  profile_picture_url?: string;
  coin_balance?: number;
  type?: string | null;
  /** Localy Premium subscription state (see supabase/*_premium.sql). */
  is_premium?: boolean;
  premium_until?: string | null;
  stripe_customer_id?: string | null;
}

export interface BusinessHours {
  [day: string]: {
    open?: string;
    close?: string;
    closed?: boolean;
  };
}

export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  profile_picture_url?: string;
  business_type?: string;
  business_hours?: BusinessHours;
  custom_messages?: string[];
  phone?: string;
  address?: string;
  misc_info?: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  username?: string;
  bio?: string;
  profile_picture_url?: string;
}

export interface BusinessUpdateData {
  business_name?: string;
  business_type?: string;
  custom_messages?: string[];
  business_hours?: BusinessHours;
  phone?: string;
  address?: string;
  misc_info?: string;
}
