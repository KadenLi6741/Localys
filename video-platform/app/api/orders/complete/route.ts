/**
 * API route: POST /api/orders/complete — mark an order fulfilled after a merchant scans its QR.
 * Purpose: The redemption endpoint for in-person pickup. It verifies the order's signed token (so only a
 *   genuine QR can complete an order) and updates the order status. Runs with the Supabase service role
 *   because it acts on the merchant's behalf via the verified token, not a logged-in session.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/verification';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { orderId, token } = body;

    if (!orderId || !token) {
      return NextResponse.json({ error: 'Missing orderId or token' }, { status: 400 });
    }

    // Verify the HMAC token
    if (!verifyToken(orderId, token)) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
    }

    // Fetch the order
    const { data: order, error: fetchError } = await supabase
      .from('item_purchases')
      .select('id, item_name, price, status, seller_id, buyer_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ error: 'Order already completed', order }, { status: 409 });
    }

    if (order.status !== 'paid') {
      return NextResponse.json({ error: `Order status is '${order.status}', expected 'paid'` }, { status: 400 });
    }

    // Update status to completed
    const { error: updateError } = await supabase
      .from('item_purchases')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error completing order:', updateError);
      return NextResponse.json({ error: 'Failed to complete order' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        item_name: order.item_name,
        price: order.price,
        status: 'completed',
      },
    });
  } catch (error) {
    console.error('Order completion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
