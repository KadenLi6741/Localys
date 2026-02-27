export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  bio?: string;
  profile_picture_url?: string;
  coin_balance?: number;
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
  average_rating?: number | null;
  total_reviews?: number;
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
}
