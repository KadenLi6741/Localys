# Environment Variables Guide

## Summary: What You Need

### For Your App to Work Right Now:

```env
# Chat & Authentication (Always needed)
NEXT_PUBLIC_SUPABASE_URL=https://dbqkpcwnzteljwxjoudj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0KyfCBFYECxfh0NfQ15Flw_P_BMyk89

# For Stripe Payments (Needed)
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# For Signup & Webhooks (Needed)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## What Each Key Does:

### ✅ MUST HAVE - Safe to Commit
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (PUBLIC)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (PUBLIC)

### ✅ MUST HAVE - **NEVER Commit** (Keep in .env.local only)
- `STRIPE_SECRET_KEY` - Stripe payment processing
  - Where: Backend only ([app/api/checkout/route.ts](app/api/checkout/route.ts) and webhooks)
  - Get from: https://dashboard.stripe.com/apikeys

- `SUPABASE_SERVICE_ROLE_KEY` - Admin access for sensitive operations
  - Where: Backend only ([app/api/auth/create-profile/route.ts](app/api/auth/create-profile/route.ts), webhooks)
  - Get from: Supabase dashboard → Settings → API

## How to Set Up

### 1. Create `.env.local` (NOT committed to git)
```
NEXT_PUBLIC_SUPABASE_URL=https://dbqkpcwnzteljwxjoudj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0KyfCBFYECxfh0NfQ15Flw_P_BMyk89
STRIPE_SECRET_KEY=sk_test_your_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 2. Create `.env.example` (Safe to commit - shows structure only)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
STRIPE_SECRET_KEY=sk_test_your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Ensure `.gitignore` Contains:
```
.env
.env.local
.env.*.local
```

## Which Files Need Each Key

| File | STRIPE_SECRET_KEY | SUPABASE_SERVICE_ROLE_KEY | SUPABASE_ANON_KEY |
|------|---|---|---|
| [app/api/checkout/route.ts](app/api/checkout/route.ts) | ✅ | ❌ | ✅ |
| [app/api/checkout-item/route.ts](app/api/checkout-item/route.ts) | ✅ | ❌ | ✅ |
| [app/api/verify-purchase/route.ts](app/api/verify-purchase/route.ts) | ✅ | ✅ | ❌ |
| [app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts) | ✅ | ✅ | ❌ |
| [app/api/auth/create-profile/route.ts](app/api/auth/create-profile/route.ts) | ❌ | ✅ | ❌ |

## Getting Your Keys

### Stripe Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_test_`)
3. Add to `.env.local` as `STRIPE_SECRET_KEY`

### Supabase Service Role Key
1. Go to Supabase dashboard → Your project
2. Click **Settings** (bottom left)
3. Click **API**
4. Find **Service Role Key**
5. Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

## What NOT to Commit to Git

❌ `.env.local` - Contains all secrets
❌ Stripe Secret Keys
❌ Supabase Service Role Key

## What IS Safe to Commit

✅ `NEXT_PUBLIC_SUPABASE_URL` (it's in the code already)
✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (it's in the code already)
✅ `.env.example` (template showing what's needed)
