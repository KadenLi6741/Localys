/**
 * supabase/auth.ts — authentication data-access layer (sign up, sign in, profile bootstrap).
 * Purpose: Wraps Supabase auth calls and ensures a matching profile row exists for each user (creating
 *   a sanitised fallback username and a welcome coupon on first sign-up). Keeps auth side-effects in one
 *   place so the AuthContext/UI stay simple.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

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
export async function signUp({ email, password, name, username, accountType, businessType, captchaToken }: SignUpData) {
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
        captchaToken,
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
export async function signIn({ identifier, password, captchaToken }: SignInData) {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    return { data: null, error: new Error('Email is required') };
  }

  const resolvedEmail = normalizedIdentifier.toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
    options: captchaToken ? { captchaToken } : undefined,
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
 * Sign in with Google (OAuth). Uses the existing browser client so the PKCE
 * code_verifier is stored in localStorage and the /auth/callback page can finish
 * the exchange with this same client.
 */
export async function signInWithGoogle(next?: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  });
}

/**
 * Ensure a profiles row exists for the currently authenticated user.
 * Reuses ensureOwnProfile; account_type falls back to the DB default ('customer').
 * Used by the OAuth callback for first-time Google sign-ins.
 */
export async function ensureProfileForCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('No authenticated user') };
  }
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return ensureOwnProfile({
    id: user.id,
    email: user.email ?? null,
    name: (metadata.full_name as string | undefined) ?? (metadata.name as string | undefined) ?? null,
    username: (metadata.username as string | undefined) ?? null,
  });
}

/**
 * Apply a session that was held server-side during the login email-code step.
 * Called only AFTER a valid verification code (emailed code or 77777 backup) so
 * the browser becomes logged in at this point and not before. Also syncs the
 * user's profile row, mirroring the behavior of the direct password sign-in.
 */
export async function applyVerifiedSession(accessToken: string, refreshToken: string) {
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (!error && data.user) {
    try {
      await ensureProfileForCurrentUser();
    } catch (profileError) {
      console.warn('Profile sync after code verification failed:', profileError);
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
 * True when an auth error is the "stale/missing refresh token" case that happens
 * for logged-out users or after cookies/localStorage were cleared. We treat this
 * as "no user" rather than a real error so the app doesn't crash or spam console.
 */
function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /invalid refresh token|refresh token not found/i.test(message);
}

/**
 * Best-effort local cleanup of a stale Supabase session (clears stored
 * cookies/localStorage for this client without a network round-trip).
 */
async function clearStaleSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore — this is best-effort cleanup of already-invalid state.
  }
}

/**
 * Get current session.
 *
 * A logged-out user (or one whose cookies/localStorage were cleared or expired)
 * can have a stale refresh token, which makes supabase throw/return
 * "Invalid Refresh Token: Refresh Token Not Found". We swallow that specific
 * case: clear the stale session and report "no session" so the landing page
 * loads normally for signed-out users without a scary console error.
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearStaleSession();
        return { session: null, error: null };
      }
      return { session, error };
    }

    return { session, error: null };
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearStaleSession();
      return { session: null, error: null };
    }
    return { session: null, error: error as Error };
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
export async function resetPasswordForEmail(email: string, captchaToken?: string) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken });
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

