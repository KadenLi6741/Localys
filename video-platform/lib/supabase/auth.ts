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
    username: sanitizedUsername || (email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) : fallbackUsername),
  };

  const firstAttempt = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

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

  return supabase
    .from('profiles')
    .upsert(
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

    const emailRedirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/verified`
      : undefined;

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

    const hasNoIdentities =
      Array.isArray(authData.user.identities) &&
      authData.user.identities.length === 0;

    if (hasNoIdentities) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    if (authData.session) {
      const { error: profileError } = await ensureOwnProfile({
        id: authData.user.id,
        email: normalizedEmail,
        name,
        username,
      });

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        throw profileError;
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
 * Get current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
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

