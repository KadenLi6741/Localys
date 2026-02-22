# Payment System Setup Guide

## Overview
Complete payment system with Stripe integration allowing users to purchase coins with 3 package options:
- **Starter**: 1000 coins for $10
- **Pro**: 2500 coins for $20 (Most Popular)
- **Premium**: 6000 coins for $50

## Setup Steps

### 1. Install Dependencies
✅ Already done: Stripe package installed

### 2. Set Up Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from the Dashboard > Developers > API Keys
3. Keep **Secret Key** private and never commit it

### 3. Set Environment Variables
Create or update your `.env.local` file with:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Set Up Stripe Webhook
1. Go to Stripe Dashboard > Developers > Webhooks
2. Create a new endpoint:
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
   - **Events**: Select `checkout.session.completed`
3. Copy the **Signing Secret** and add to `STRIPE_WEBHOOK_SECRET` in `.env.local`

For local testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 5. Run SQL Migrations
Execute these in your Supabase SQL editor:

**Migration 019 - Add coin_purchases table:**
```sql
CREATE TABLE IF NOT EXISTS public.coin_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user_id ON public.coin_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_created_at ON public.coin_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_stripe_session_id ON public.coin_purchases(stripe_session_id);

ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.coin_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_coin_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coin_purchases_updated_at
  BEFORE UPDATE ON public.coin_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coin_purchases_updated_at();
```

**Migration 020 - Fix comments RLS:**
```sql
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;

CREATE POLICY "Anyone can read comments"
  ON public.comments
  FOR SELECT
  USING (true);
```

### 6. Test the System

#### Development Testing
1. Start your app: `npm run dev`
2. Go to `/buy-coins` page
3. Click "Buy Now" on any package
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any future expiry and CVC works
6. Should redirect to success page and show coins added

#### Stripe Test Cards
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### 7. File Structure

```
app/
├── api/
│   ├── checkout/route.ts          # Stripe checkout session creation
│   └── webhooks/stripe/route.ts   # Webhook for payment confirmation
├── buy-coins/
│   ├── page.tsx                   # Main coin shop
│   └── success/
│       └── page.tsx               # Success page after payment
└── profile/
    └── page.tsx                   # Updated with coin balance & buy button

supabase/migrations/
├── 019_add_coin_purchases_tracking.sql
└── 020_fix_comments_rls_public_read.sql

lib/supabase/
└── profiles.ts                    # Contains getUserCoins() and coin functions
```

## User Flow

1. **Profile Page**
   - Shows coin balance at top
   - "Buy Coins" button visible
   - Displays coin balance in yellow box

2. **Buy Coins Page** (`/buy-coins`)
   - 3 package options with pricing
   - Shows coins per dollar value
   - Current balance displayed
   - FAQ section

3. **Stripe Checkout**
   - Stripe-hosted checkout
   - User enters payment info
   - Returns to success page

4. **Success Page** (`/buy-coins/success`)
   - Shows coins added
   - Shows new total balance
   - Links back to profile or more purchases

## API Routes

### POST `/api/checkout`
Creates a Stripe checkout session.

**Request:**
```json
{
  "packageId": "pro",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST `/api/webhooks/stripe`
Handles Stripe webhooks for payment confirmation.
- Updates user's `coin_balance` in profiles table
- Creates record in `coin_purchases` table
- Runs asynchronously after Stripe payment

## Database Schema

### coin_purchases table
```
id: UUID (PK)
user_id: UUID (FK → auth.users)
coins: INTEGER (amount of coins added)
amount_cents: INTEGER (payment amount in cents)
stripe_session_id: TEXT (unique, for deduplication)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

## Troubleshooting

### Stripe Key Issues
- Publishable key should be in browser (starts with `pk_`)
- Secret key should NEVER be exposed (starts with `sk_`)
- Both must be from same environment (test or live)

### Webhook Not Working
- Check that signing secret matches exactly
- Verify endpoint URL is publicly accessible
- Check server logs for webhook errors
- For local testing, use Stripe CLI for tunneling

### Coins Not Adding
- Verify webhook is being triggered (Stripe Dashboard → Events)
- Check database logs for the insert query
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is in env vars

### Testing RLS Policy
Run this in Supabase to verify coins being added:
```sql
SELECT * FROM public.profiles 
WHERE id = 'your-user-id' 
ORDER BY updated_at DESC LIMIT 1;
```

## Security Checklist

- [ ] Secret key is in `.env.local` (not `.env` or committed)
- [ ] Webhook secret is correct
- [ ] RLS policies prevent coin manipulation
- [ ] Only authenticated users can purchase
- [ ] Stripe key rotation planned
- [ ] Test mode disabled in production
- [ ] Error messages don't expose sensitive data

## Production Deployment

1. Create live Stripe account
2. Get live API keys (start with `pk_live_` and `sk_live_`)
3. Update `.env.local` with live keys
4. Set `NEXT_PUBLIC_BASE_URL` to your live domain
5. Deploy webhook handling
6. Test with real small transaction
7. Monitor webhook delivery
8. Keep logs of all transactions

## Future Enhancements

- [ ] Refund system
- [ ] More coin packages
- [ ] Earn coins through engagement
- [ ] Daily bonuses
- [ ] Promotional codes
- [ ] Purchase history in profile
- [ ] Coin balance history
- [ ] Email receipts

---

## Support

For Stripe support: https://support.stripe.com
For Supabase support: https://supabase.help
