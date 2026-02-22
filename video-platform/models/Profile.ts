export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  bio?: string;
  profile_picture_url?: string;
}

export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  latitude: number;
  longitude: number;
  category?: string;
  profile_picture_url?: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  username?: string;
  bio?: string;
  profile_picture_url?: string;
}

export interface BusinessUpdateData {
  business_name?: string;
}
