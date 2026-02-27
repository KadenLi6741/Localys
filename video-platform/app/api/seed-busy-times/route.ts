import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const { error } = await supabase.rpc('seed_busy_times', {
      p_business_id: businessId,
    });

    if (error) {
      console.error('Error seeding busy times:', error);
      return NextResponse.json({ error: 'Failed to seed busy times' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seed busy times error:', error);
    return NextResponse.json({ error: 'Failed to seed busy times' }, { status: 500 });
  }
}
