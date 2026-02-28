import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { sessionId, preorderId } = await request.json();

    if (!sessionId || !preorderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const { data: preorder, error: fetchError } = await supabase
      .from('preorders')
      .select('*')
      .eq('id', preorderId)
      .single();

    if (fetchError || !preorder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (preorder.status !== 'pending_payment') {
      return NextResponse.json({
        success: true,
        orderCode: preorder.order_code,
        qrToken: preorder.qr_token,
        alreadyConfirmed: true,
      });
    }

    const chargeAmount = Math.round(preorder.subtotal * (preorder.upfront_pct / 100) * 100) / 100;

    await supabase
      .from('preorders')
      .update({
        status: 'confirmed',
        amount_paid: chargeAmount,
        amount_remaining: Math.round((preorder.subtotal - chargeAmount) * 100) / 100,
        stripe_session_id: session.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', preorderId);

    if (preorder.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({ status: 'reserved' })
        .eq('id', preorder.table_id);
    }

    return NextResponse.json({
      success: true,
      orderCode: preorder.order_code,
      qrToken: preorder.qr_token,
    });
  } catch (error) {
    console.error('Verify preorder error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
