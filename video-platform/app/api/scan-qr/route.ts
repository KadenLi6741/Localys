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
    const { qrToken, businessId } = await request.json();

    if (!qrToken || !businessId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: preorder, error: fetchError } = await supabase
      .from('preorders')
      .select(`
        *,
        preorder_items(*),
        restaurant_tables(label, section),
        profiles!preorders_customer_id_fkey(full_name, username, profile_picture_url)
      `)
      .eq('qr_token', qrToken)
      .single();

    if (fetchError || !preorder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (preorder.business_id !== businessId) {
      return NextResponse.json({ error: 'Order does not belong to this restaurant' }, { status: 403 });
    }

    if (!['confirmed', 'preparing', 'ready'].includes(preorder.status)) {
      return NextResponse.json({
        error: `Cannot check in: order status is "${preorder.status}"`,
        preorder: {
          ...preorder,
          customer: preorder.profiles,
          restaurant_table: preorder.restaurant_tables,
        },
      }, { status: 400 });
    }

    await supabase
      .from('preorders')
      .update({
        status: 'arrived',
        arrived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', preorder.id);

    if (preorder.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({ status: 'occupied' })
        .eq('id', preorder.table_id);
    }

    return NextResponse.json({
      success: true,
      preorder: {
        ...preorder,
        status: 'arrived',
        arrived_at: new Date().toISOString(),
        customer: preorder.profiles,
        restaurant_table: preorder.restaurant_tables,
      },
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    return NextResponse.json({ error: 'Failed to process QR scan' }, { status: 500 });
  }
}
