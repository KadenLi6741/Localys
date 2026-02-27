import { supabase } from './client';
import type { SignUpData, SignInData } from '../../models/Auth';

export type { SignUpData, SignInData };

/**
 * Sign up a new user
 * Creates auth user and profile in public.profiles table
 */
export async function signUp({ email, password, name, username, accountType, businessType }: SignUpData) {
  try {
    if (accountType === 'business' && !businessType) {
      throw new Error('Business type is required for business accounts');
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // Create profile using server-side API to bypass RLS policy
    const profileResponse = await fetch('/api/auth/create-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: authData.user.id,
        email,
        full_name: name,
        username,
      }),
    });

    if (!profileResponse.ok) {
      const errorData = await profileResponse.json();
      console.error('Profile creation failed:', errorData);
      throw new Error(errorData.error || 'Failed to create profile');
    }

    // If business account, create business record
    if (accountType === 'business' && businessType) {
      const { error: businessError } = await supabase
        .from('businesses')
        .insert({
          owner_id: authData.user.id,
          business_name: name || username,
          business_type: businessType,
          business_hours: {
            monday: { open: '09:00', close: '17:00' },
            tuesday: { open: '09:00', close: '17:00' },
            wednesday: { open: '09:00', close: '17:00' },
            thursday: { open: '09:00', close: '17:00' },
            friday: { open: '09:00', close: '17:00' },
            saturday: { open: '10:00', close: '16:00' },
            sunday: { closed: true },
          },
        });

      if (businessError) {
        console.warn('Business creation failed:', businessError);
        // Don't throw - business creation failure shouldn't block signup
      }
    }

    // Create welcome coupon for new user
    const { data: couponData, error: couponError } = await createWelcomeCoupon(authData.user.id);
    if (couponError) {
      console.warn('Failed to create welcome coupon:', couponError);
      // Don't throw - coupon creation failure shouldn't block signup
    } else {
      console.log('Welcome coupon created:', couponData);
    }

    return { data: authData, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Sign in existing user
 */
export async function signIn({ email, password }: SignInData) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current session with improved error handling for refresh token issues
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // If it's a refresh token error, clear the session
      if (error.message?.includes('refresh token') || error.message?.includes('Refresh Token')) {
        console.warn('Refresh token issue detected, clearing session:', error.message);
        // Clear corrupted session data
        try {
          localStorage.removeItem('sb-dbqkpcwnzteljwxjoudj-auth-token');
        } catch (e) {
          // Ignore localStorage errors
        }
        return { session: null, error: null };
      }
      return { session, error };
    }
    
    return { session, error };
  } catch (error: any) {
    console.error('Unexpected error in getSession:', error);
    // Return null session on any error to prevent app from breaking
    return { session: null, error };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

