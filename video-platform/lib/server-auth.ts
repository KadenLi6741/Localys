import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

type AuthSuccess = { user: User; error: null };
type AuthFailure = { user: null; error: NextResponse };

/**
 * Reads the Authorization: Bearer <token> header and verifies it with Supabase.
 * Returns the verified User on success, or a ready-to-return NextResponse on failure.
 *
 * Usage in API routes:
 *   const auth = await getAuthenticatedUser(request);
 *   if (auth.error) return auth.error;
 *   const userId = auth.user.id; // trusted — verified server-side
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // Use the anon key client — getUser() validates the JWT against Supabase Auth.
  // The service role key is intentionally NOT used here.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Invalid or expired session. Please sign in again.' },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}
