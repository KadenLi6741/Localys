/**
 * supabase/client.ts — the shared browser Supabase client.
 * Purpose: Creates the single Supabase instance the whole app imports for auth and database/storage
 *   access. Configured for PKCE auth with session persistence + auto-refresh. Throws at startup if the
 *   required env vars are missing, so misconfiguration fails loudly rather than silently.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

