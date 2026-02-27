import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await request.json();
    const { items, businessId, customerId, scheduledTime, tableId, orderType, notes } = body;

    if (!items?.length || !businessId || !customerId || !scheduledTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, upfront_payment_pct, business_name')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const upfrontPct = business.upfront_payment_pct ?? 100;
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const chargeAmount = Math.round(subtotal * (upfrontPct / 100) * 100) / 100;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let orderCode = 'ORD-';
    for (let i = 0; i < 6; i++) {
      orderCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const qrToken = crypto.randomUUID();

    const { data: preorder, error: preorderError } = await supabase
      .from('preorders')
      .insert({
        order_code: orderCode,
        qr_token: qrToken,
        business_id: businessId,
        customer_id: customerId,
        table_id: tableId || null,
        order_type: orderType || 'dine-in',
        scheduled_time: scheduledTime,
        subtotal,
        upfront_pct: upfrontPct,
        amount_paid: 0,
        amount_remaining: subtotal,
        status: 'pending_payment',
        notes: notes || null,
      })
      .select()
      .single();

    if (preorderError) {
      console.error('Error creating preorder:', preorderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const preorderItems = items.map((item: any) => ({
      preorder_id: preorder.id,
      menu_item_id: item.menuItemId,
      item_name: item.name,
      item_price: item.price,
      quantity: item.quantity,
      special_instructions: item.specialInstructions || null,
    }));

    await supabase.from('preorder_items').insert(preorderItems);

    if (chargeAmount <= 0) {
      await supabase
        .from('preorders')
        .update({
          status: 'confirmed',
          amount_paid: 0,
          amount_remaining: subtotal,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', preorder.id);

      if (tableId) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'reserved' })
          .eq('id', tableId);
      }

      return NextResponse.json({
        preorderId: preorder.id,
        orderCode,
        qrToken,
        noPaymentRequired: true,
      });
    }

    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: `Pre-order from ${business.business_name}`,
        },
        unit_amount: Math.round(item.price * (upfrontPct / 100) * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/preorder-success?session_id={CHECKOUT_SESSION_ID}&preorder_id=${preorder.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/preorder/${businessId}?canceled=true`,
      metadata: {
        preorderId: preorder.id,
        businessId,
        customerId,
        orderCode,
        type: 'preorder',
      },
    });

    if (!session?.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    await supabase
      .from('preorders')
      .update({ stripe_session_id: session.id })
      .eq('id', preorder.id);

    return NextResponse.json({
      url: session.url,
      preorderId: preorder.id,
      orderCode,
    });
  } catch (error) {
    console.error('Checkout preorder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
