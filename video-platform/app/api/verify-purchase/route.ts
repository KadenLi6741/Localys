import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

function generateConfirmationNumber(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${random}${new Date().getTime().toString(36).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  const confirmationNumber = generateConfirmationNumber();

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        {
          success: false,
          confirmationNumber,
          message: 'Payment verification is not configured on server',
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey);

    const sessionId = request.nextUrl.searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        confirmationNumber,
        message: 'Missing session_id',
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({
        success: false,
        confirmationNumber,
        message: 'Session not found',
      });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        confirmationNumber,
        message: `Payment is not completed (status: ${session.payment_status})`,
      });
    }

    const userId = session.metadata?.userId;
    const coins = parseInt(session.metadata?.coins || '0');

    if (!userId || !coins) {
      return NextResponse.json({
        success: false,
        confirmationNumber,
        message: 'Missing purchase metadata',
      });
    }

    const result = await processCoinPurchase(userId, coins, sessionId, session.amount_total ?? null);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          confirmationNumber,
          message: result.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      confirmationNumber,
      coinsAdded: coins,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json({
      success: false,
      confirmationNumber,
      message: 'Failed to verify payment',
    });
  }
}

async function processCoinPurchase(userId: string, coins: number, sessionId: string, amountCents: number | null) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      console.error('Supabase environment variables are missing; skipping coin processing');
      return { success: false, message: 'Supabase service role is not configured', alreadyProcessed: false };
    }

    // Check if already processed
    const { data: existing } = await supabase
      .from('coin_purchases')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existing) {
      console.log(`Order already processed for session ${sessionId}`);
      return { success: true, message: 'Already processed', alreadyProcessed: true };
    }

    // Get current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { success: false, message: 'Failed to fetch profile', alreadyProcessed: false };
    }

    const newBalance = (profile?.coin_balance || 0) + coins;

    // Update balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ coin_balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return { success: false, message: 'Failed to update coin balance', alreadyProcessed: false };
    }

    const { error: purchaseError } = await supabase.from('coin_purchases').insert({
      user_id: userId,
      coins,
      amount_cents: amountCents,
      stripe_session_id: sessionId,
      created_at: new Date().toISOString(),
    });

    if (purchaseError) {
      console.error('Error inserting coin purchase record:', purchaseError);
    }

    console.log(`Order processed: +${coins} coins for user ${userId}`);
    return { success: true, message: 'Processed', alreadyProcessed: false };
  } catch (error) {
    console.error('Error in background processing:', error);
    return { success: false, message: 'Unexpected processing error', alreadyProcessed: false };
  }
}
