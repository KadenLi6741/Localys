import { z, ZodType } from 'zod';
import { NextResponse } from 'next/server';

// --- Payment schemas ---

// userId is NOT included — the server reads it from the auth token.
export const CoinCheckoutSchema = z.object({
  packageId: z.enum(['starter', 'pro', 'premium']),
});

// buyerId and itemPrice are NOT included — server reads buyerId from auth token
// and looks up prices from the database.
export const ItemCheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        // Accept DB UUIDs AND demo-store manifest ids (e.g. "jays-burger-0"). The
        // server still resolves the authoritative price (DB row or manifest), so a
        // non-UUID id never lets the client dictate a price.
        itemId:          z.string().min(1).max(120),
        itemName:        z.string().min(1).max(200),
        // Demo-store items carry relative paths ("/Menu/...") not absolute URLs, and
        // the image is display-only (not used to build the Stripe request), so accept
        // any short string rather than requiring a URL.
        itemImage:       z.string().max(500).optional().nullable(),
        // Accept UUID seller ids AND demo-store slugs (e.g. "jays-burger").
        sellerId:        z.string().min(1).max(120),
        quantity:        z.number().int().min(1).max(99),
        specialRequests: z.string().max(500).optional().nullable(),
      })
    )
    .min(1, 'At least one item is required')
    .max(50, 'Too many items'),
  couponCode:    z.string().max(50).optional().nullable(),
  promoCode:     z.string().max(50).optional().nullable(),
  scheduledAt:   z.string().datetime().optional().nullable(),
  groupOrderId:  z.string().uuid().optional().nullable(),
  // How the order is fulfilled: picked up at the store, a dine-in reservation, or
  // delivered. Defaults to 'delivery' on the server when omitted.
  fulfillment:   z.enum(['pickup', 'delivery', 'reservation']).optional().nullable(),
  // Reservation details (only when fulfillment === 'reservation'). Kept small so
  // the whole object stays well under Stripe's 500-char metadata limit.
  reservation:   z.object({
    party:    z.number().int().min(1).max(50),
    time:     z.string().datetime(),
    comments: z.string().max(300).optional().nullable(),
  }).optional().nullable(),
});

export const VerifyItemPurchaseSchema = z.object({
  sessionId: z.string().min(10).max(300),
});

// --- User content schemas ---

export const ProfileUpdateSchema = z.object({
  full_name: z.string().max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username must be lowercase letters, numbers, and underscores only')
    .optional(),
  bio: z.string().max(500).optional(),
});

export const CommentSchema = z.object({
  content:           z.string().min(1).max(2000),
  video_id:          z.string().uuid(),
  parent_comment_id: z.string().uuid().optional().nullable(),
  rating:            z.number().int().min(1).max(5).optional().nullable(),
});

// --- Helper ---

export function parseBody<T>(
  schema: ZodType<T>,
  body: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request', fields: result.error.flatten().fieldErrors },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
