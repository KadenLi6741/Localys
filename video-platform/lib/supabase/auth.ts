import { supabase } from './client';
import type { SignUpData, SignInData } from '../../models/Auth';
import { createWelcomeCoupon } from './coupons';

export type { SignUpData, SignInData };

type EnsureProfileInput = {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
};

async function ensureOwnProfile({ id, email, name, username }: EnsureProfileInput) {
  const fallbackUsername = `user_${id.replace(/-/g, '').slice(0, 8)}`;
  const sanitizedUsername = username
    ?.toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);

  const profileEmail = email && email.trim().length > 0 ? email : `${id}@localy.invalid`;
  const profilePayload = {
    id,
    email: profileEmail,
    full_name: name ?? null,
    username:
      sanitizedUsername ||
      (email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) : fallbackUsername),
  };

  const firstAttempt = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });

  if (!firstAttempt.error) {
    return firstAttempt;
  }

  const isUsernameConflict =
    firstAttempt.error.code === '23505' &&
    (firstAttempt.error.message.includes('profiles_username_key') ||
      firstAttempt.error.message.toLowerCase().includes('username'));

  if (!isUsernameConflict) {
    return firstAttempt;
  }

  return supabase.from('profiles').upsert(
    {
      ...profilePayload,
      username: `${fallbackUsername}_${id.replace(/-/g, '').slice(0, 4)}`,
    },
    { onConflict: 'id' }
  );
}

/**
 * Sign up a new user
 * Creates auth user and profile in public.profiles table
 */
export async function signUp({ email, password, name, username, accountType, businessType }: SignUpData) {
  try {
    if (accountType === 'business' && !businessType) {
      throw new Error('Business type is required for business accounts');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const emailRedirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/verified` : undefined;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: name,
          username,
          account_type: accountType,
          business_type: businessType ?? null,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // If Supabase returned a user with no identities it can indicate a conflict / existing account
    const hasNoIdentities =
      Array.isArray(authData.user.identities) && authData.user.identities.length === 0;

    if (hasNoIdentities) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    // Prefer server-side creation of profile (bypass RLS) when running in browser and endpoint exists.
    // Fallback to client-side ensureOwnProfile if server endpoint fails or we're in a server environment.
    let profileCreated = false;

    if (typeof window !== 'undefined') {
      try {
        const profileResponse = await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: authData.user.id,
            email: normalizedEmail,
            name,
            username,
          }),
        });

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json().catch(() => ({}));
          console.warn('Profile creation via server endpoint failed:', errorData);
          // fall through to client-side ensureOwnProfile fallback
        } else {
          profileCreated = true;
        }
      } catch (err) {
        console.warn('Error calling server profile creation endpoint:', err);
        // fall through to client-side ensureOwnProfile fallback
      }
    }

    if (!profileCreated) {
      // Attempt to create/update the profile client-side (ensureOwnProfile handles username conflicts).
      const { error: profileError } = await ensureOwnProfile({
        id: authData.user.id,
        email: normalizedEmail,
        name,
        username,
      });

      if (profileError) {
        console.error('Profile creation failed (client fallback):', profileError);
        throw profileError;
      }
    }

    // If business account, attempt to create business record (non-blocking)
    if (accountType === 'business' && businessType) {
      try {
        const { error: businessError } = await supabase.from('businesses').insert({
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
          // don't throw - business creation failure shouldn't block signup
        }
      } catch (err) {
        console.warn('Unexpected error creating business record:', err);
      }
    }

    // Create welcome coupon for new user (non-blocking)
    try {
      const { data: couponData, error: couponError } = await createWelcomeCoupon(authData.user.id);
      if (couponError) {
        console.warn('Failed to create welcome coupon:', couponError);
      } else {
        console.log('Welcome coupon created:', couponData);
      }
    } catch (err) {
      console.warn('Unexpected error creating welcome coupon:', err);
    }

    return { data: authData, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Sign in existing user
 */
export async function signIn({ identifier, password }: SignInData) {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    return { data: null, error: new Error('Email or username is required') };
  }

  let resolvedEmail = normalizedIdentifier.toLowerCase();

  if (!normalizedIdentifier.includes('@')) {
    const normalizedUsername = normalizedIdentifier.toLowerCase();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (profileError) {
      return { data: null, error: profileError };
    }

    if (!profile?.email) {
      return { data: null, error: new Error('Invalid login credentials') };
    }

    resolvedEmail = profile.email.trim().toLowerCase();
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  });

  if (!error && data.user) {
    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: profileError } = await ensureOwnProfile({
      id: data.user.id,
      email: data.user.email ?? resolvedEmail,
      name: (metadata.full_name as string | undefined) ?? null,
      username: (metadata.username as string | undefined) ?? null,
    });

    if (profileError) {
      console.warn('Profile sync on sign-in failed:', profileError);
    }
  }

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
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

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
 * Send password reset email
 */
export async function resetPasswordForEmail(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { data, error };
}

/**
 * Update user password (used after reset link callback)
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}