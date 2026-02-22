import { supabase } from './client';
import type { SignUpData, SignInData } from '../../models/Auth';

export type { SignUpData, SignInData };

/**
 * Sign up a new user
 * Creates auth user and profile in public.profiles table
 */
export async function signUp({ email, password, name, username }: SignUpData) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: name,
        username,
      });

    if (profileError) {
      console.error('Profile creation failed:', profileError);
      throw profileError;
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
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

