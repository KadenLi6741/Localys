import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { generateToken } from '@/lib/verification';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { VerifyItemPurchaseSchema, parseBody } from '@/lib/schemas';
import { getAuthenticatedUser } from '@/lib/server-auth';
import storeMenus from '@/data/store-menus.json';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OrderResult {
  orderId: string;
  token: string;
  itemName: string;
  price: number;
  quantity: number;
  scheduledAt: string | null;
  specialRequests: string | null;
}

/** Trusted prices for built-in demo-store items (ids like "jays-burger-0"). */
const MANIFEST_PRICES: Map<string, { name: string; price: number }> = (() => {
  const map = new Map<string, { name: string; price: number }>();
  const stores = storeMenus as Record<string, { items?: { id: string; name: string; price: number }[] }>;
  for (const store of Object.values(stores)) {
    for (const it of store.items ?? []) {
      if (it?.id && typeof it.price === 'number') map.set(it.id, { name: it.name, price: it.price });
    }
  }
  return map;
})();

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function generateConfirmationNumber(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${random}${new Date().getTime().toString(36).toUpperCase()}`;
}

/** Real item names / quantities / amounts from the expanded Stripe line items. */
interface StripeLine { name: string; qty: number; unit: number }
function extractLines(session: Stripe.Checkout.Session): StripeLine[] {
  const data = session.line_items?.data ?? [];
  return data.map((li) => {
    const product = li.price && typeof li.price.product !== 'string'
      ? (li.price.product as Stripe.Product)
      : null;
    const qty = li.quantity ?? 1;
    const lineTotal = (li.amount_total ?? 0) / 100; // dollars (post-discount, incl. qty)
    return {
      name: li.description || product?.name || 'Item',
      qty,
      unit: qty > 0 ? lineTotal / qty : lineTotal,
    };
  });
}

/**
 * Demo-safe fallback: read any order rows already saved for this Stripe session
 * (e.g. inserted by the webhook) so the confirmation still shows real data when
 * the live Stripe lookup fails.
 */
async function ordersFromDb(sessionId: string, userId: string): Promise<OrderResult[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('item_purchases')
    .select('id, item_name, price, quantity, verification_token, scheduled_at, special_requests')
    .eq('stripe_session_id', sessionId)
    .eq('buyer_id', userId);
  return (data ?? []).map((r) => ({
    orderId: r.id,
    token: r.verification_token || generateToken(r.id),
    itemName: r.item_name || 'Item',
    price: typeof r.price === 'number' ? r.price : 0,
    quantity: r.quantity ?? 1,
    scheduledAt: r.scheduled_at ?? null,
    specialRequests: r.special_requests ?? null,
  }));
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(`verifyPurchase:${ip}`, RATE_LIMITS.verifyPurchase);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  // Auth
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('[verify-item-purchase] STRIPE_SECRET_KEY not set');
    return NextResponse.json({ error: 'Payment system unavailable' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseBody(VerifyItemPurchaseSchema, body);
  if (!parsed.success) return parsed.response;
  const { sessionId } = parsed.data;

  // Everything below is wrapped so a thrown error is always logged (message +
  // stack) and returned as clean JSON — never a bare unhandled 500.
  try {
    const stripe = new Stripe(stripeKey);

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'line_items.data.price.product'],
      });
    } catch (error) {
      // Stripe lookup failed (demo/local session id, network, etc.). Fall back to
      // any saved order rows so the confirmation still shows real data.
      console.error(
        '[verify-item-purchase] Stripe session retrieval failed:',
        error instanceof Error ? `${error.message}\n${error.stack}` : error,
      );
      const fallback = await ordersFromDb(sessionId, userId);
      if (fallback.length > 0) {
        const total = fallback.reduce((s, o) => s + o.price * o.quantity, 0);
        return NextResponse.json({
          success: true,
          confirmationNumber: generateConfirmationNumber(),
          orders: fallback,
          total,
          fallback: true,
        });
      }
      return NextResponse.json({ error: 'Payment session not found' }, { status: 404 });
    }

    if (!session.metadata) {
      return NextResponse.json({ error: 'Payment session not found' }, { status: 404 });
    }

    // Verify this session belongs to the authenticated user
    if (session.metadata.buyerId !== userId) {
      console.warn(`[verify-item-purchase] User ${userId} attempted to claim session owned by ${session.metadata.buyerId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const confirmationNumber = generateConfirmationNumber();
    const metadata = session.metadata;
    const couponCode = metadata.couponCode || null;
    const discountPercentage = parseInt(metadata.discountPercentage || '0');
    const scheduledAt = metadata.scheduledAt || null; // buyer-chosen pickup/delivery time
    const stripeLines = extractLines(session);
    // Authoritative total straight from Stripe (cents → dollars).
    const sessionTotal = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;

    // Multi-item format
    if (metadata.items && metadata.buyerId) {
      let rawItems: { id: string; name?: string; sid?: string; price?: number; qty?: number; sr?: string }[];
      try {
        rawItems = JSON.parse(metadata.items);
      } catch {
        return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
      }

      const orders: OrderResult[] = [];
      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const line = stripeLines[i];
        // Resolve name/price/qty: metadata first (written by checkout-item), then the
        // real Stripe line item, then the manifest — so we never return 0 / "Unknown".
        const manifest = MANIFEST_PRICES.get(item.id);
        const resolvedName = item.name || line?.name || manifest?.name || item.id;
        const resolvedPrice = (typeof item.price === 'number' && item.price > 0)
          ? item.price
          : (line && line.unit > 0 ? line.unit : (manifest?.price ?? 0));
        const resolvedQty = item.qty && item.qty > 0 ? item.qty : (line?.qty ?? 1);
        const resolvedSellerId = item.sid || metadata.sellerId || item.id;

        const result = await processPurchase(
          item.id, resolvedSellerId, userId, resolvedName, resolvedPrice, resolvedQty,
          sessionId, couponCode, discountPercentage, scheduledAt, item.sr || null,
        );
        if (result) orders.push(result);
      }

      const total = sessionTotal ?? orders.reduce((s, o) => s + o.price * o.quantity, 0);
      return NextResponse.json({ success: true, confirmationNumber, orders, total });
    }

    // Legacy single-item format
    const { itemId, sellerId, itemName, itemPrice } = metadata;
    if (itemId && sellerId && itemName && itemPrice) {
      const line = stripeLines[0];
      const manifest = MANIFEST_PRICES.get(itemId);
      const resolvedName = itemName || line?.name || manifest?.name || itemId;
      const resolvedPrice = parseFloat(itemPrice) || (line?.unit ?? 0) || manifest?.price || 0;
      const resolvedQty = line?.qty ?? 1;
      const result = await processPurchase(
        itemId, sellerId, userId, resolvedName, resolvedPrice, resolvedQty,
        sessionId, couponCode, discountPercentage, scheduledAt, metadata.specialRequests || null,
      );
      const total = sessionTotal ?? (result ? result.price * result.quantity : 0);
      return NextResponse.json({
        success: true,
        confirmationNumber,
        orders: result ? [result] : [],
        total,
      });
    }

    return NextResponse.json({ success: true, confirmationNumber, orders: [], total: sessionTotal ?? 0 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[verify-item-purchase] Processing error:', msg, error instanceof Error ? error.stack : '');
    return NextResponse.json({ error: 'Failed to process purchase', detail: msg }, { status: 500 });
  }
}

async function processPurchase(
  itemId: string,
  sellerId: string,
  buyerId: string,
  itemName: string,
  itemPrice: number,
  quantity: number,
  sessionId: string,
  couponCode: string | null,
  discountPercentage: number,
  scheduledAt: string | null,
  specialRequests: string | null,
): Promise<OrderResult | null> {
  // Demo/built-in store items have non-UUID ids (e.g. "jays-burger-0").
  // Inserting a non-UUID into a Supabase uuid column throws — return a synthetic
  // result instead so the confirmation page always has order details.
  if (!UUID_RE.test(itemId)) {
    const orderId = `demo-${sessionId.slice(-12)}-${itemId}`.slice(0, 80);
    const token = generateToken(orderId);
    const paidPrice = discountPercentage > 0
      ? Math.max(0, itemPrice - itemPrice * (discountPercentage / 100))
      : itemPrice;
    console.log(`[verify-item-purchase] Demo item "${itemId}" — synthetic order ${orderId}`);
    return { orderId, token, itemName, price: paidPrice, quantity, scheduledAt, specialRequests };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  // Idempotency check — webhook may have already processed this
  const { data: existing } = await supabase
    .from('item_purchases')
    .select('id, verification_token, quantity, scheduled_at, special_requests')
    .eq('stripe_session_id', sessionId)
    .eq('item_id', itemId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[verify-item-purchase] Already recorded session ${sessionId} item ${itemId}`);
    return {
      orderId: existing[0].id,
      token: existing[0].verification_token || generateToken(existing[0].id),
      itemName,
      price: itemPrice,
      quantity: existing[0].quantity ?? quantity,
      scheduledAt: existing[0].scheduled_at ?? scheduledAt,
      specialRequests: existing[0].special_requests ?? specialRequests,
    };
  }

  const originalPrice = itemPrice;
  const paidPrice = discountPercentage > 0
    ? Math.max(0, originalPrice - originalPrice * (discountPercentage / 100))
    : originalPrice;

  const { data: inserted, error } = await supabase
    .from('item_purchases')
    .insert({
      item_id: itemId,
      seller_id: sellerId,
      buyer_id: buyerId,
      item_name: itemName,
      price: paidPrice,
      quantity,
      ...(couponCode && {
        original_price: originalPrice,
        coupon_code: couponCode,
        discount_percentage: discountPercentage,
      }),
      ...(scheduledAt && { scheduled_at: scheduledAt }),
      ...(specialRequests && { special_requests: specialRequests }),
      stripe_session_id: sessionId,
      status: 'paid',
      purchased_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[verify-item-purchase] Insert error:', error.message);
    throw error;
  }

  const token = generateToken(inserted.id);
  await supabase
    .from('item_purchases')
    .update({ verification_token: token })
    .eq('id', inserted.id);

  return { orderId: inserted.id, token, itemName, price: paidPrice, quantity, scheduledAt, specialRequests };
}
