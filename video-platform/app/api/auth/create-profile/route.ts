import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to create a user profile during signup
 * Uses service role key to bypass RLS policies
 * This is called server-side to avoid RLS issues with newly created auth users
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await request.json();
    const { id, email, full_name, username } = body;

    if (!id || !email || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: id, email, username' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS policy for signup
    // First, check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single();

    let data, error;

    if (existingProfile) {
      // Update existing profile (user reconnecting with same ID)
      const result = await supabase
        .from('profiles')
        .update({
          email,
          full_name,
          username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();
      
      data = result.data;
      error = result.error;
    } else {
      // Insert new profile
      const result = await supabase
        .from('profiles')
        .insert({
          id,
          email,
          full_name,
          username,
        })
        .select();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Profile creation/update failed:', error);
      
      // Check if it's a unique constraint violation
      let userFriendlyError = error.message;
      if (error.code === '23505') { // PostgreSQL unique violation code
        if (error.message?.includes('email')) {
          userFriendlyError = 'This email is already registered. Please use a different email or sign in instead.';
        } else if (error.message?.includes('username')) {
          userFriendlyError = 'This username is already taken. Please choose a different username.';
        }
      }
      
      return NextResponse.json(
        { error: userFriendlyError || 'Failed to create profile' },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
