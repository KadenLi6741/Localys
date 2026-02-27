# Stripe Checkout JSON Parse Error - Debugging Guide

## Problem
When another user tries to purchase something from your store, they get:
```
JSON.parse: unexpected character at line 1 column 1 of the JSON data
```

This error occurs because the API is returning invalid JSON (usually HTML error page or empty response).

## Root Causes

### 1. **Environment Variables Not Set** (Most Common)
The Stripe API key is not configured on your production/deployment environment.

**Check:**
- Verify `STRIPE_SECRET_KEY` is set in your `.env.local` or deployment environment
- Verify `STRIPE_PUBLISHABLE_KEY` is set as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Verify `NEXT_PUBLIC_BASE_URL` is set correctly (needed for success/cancel URLs)

### 2. **Different User Session Issues**
Other users might have:
- Invalid auth tokens
- Missing user ID in their session
- Different permission levels

### 3. **Network/CORS Issues**
The browser might not be able to reach the API endpoint.

## How to Debug

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Try to purchase something
4. Look for error messages - they will now show:
   - `Checkout response status: 500` (or other status code)
   - `Checkout response headers: text/html` (or other content-type)
   - Detailed error messages

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Filter by XHR/Fetch
3. Try to purchase
4. Click on the `/api/checkout` request
5. Check:
   - **Status**: Should be 200. If 500, there's a server error
   - **Response**: Should be JSON like `{"url": "https://checkout.stripe.com/..."}`
   - **Preview**: Shows the actual response

### Step 3: Check Server Logs
Check your deployment logs for detailed error messages:
- Vercel: Check Deployment → Functions logs
- Other: Check application logs

### Step 4: Verify Environment Variables
```bash
# Check if variables are set (DO NOT commit keys)
echo $STRIPE_SECRET_KEY
echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
echo $NEXT_PUBLIC_BASE_URL
```

## Quick Fix Checklist

- [ ] Stripe API keys are set on your deployment platform
- [ ] `NEXT_PUBLIC_BASE_URL` is correctly set (e.g., `https://yourdomain.com`)
- [ ] Test user is authenticated (check if `user.id` is present)
- [ ] Stripe account has test mode enabled
- [ ] Try in incognito mode (rules out caching issues)
- [ ] Check if it works with the Stripe publishable key you provided

## Environment Variables Needed

```
# Required
STRIPE_SECRET_KEY=sk_test_51T3pP6El4n6psv8uSSqe4TToLXQTvbiia8cbElDqwJjloFVcJRYEvq7k0rbzw1oCe93biodq0yXjYquQD0pOcJa400mVSRHCW2

# Public (safe to expose)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51T3pP6El4n6psv8uSSqe4TToLXQTvbiia8cbElDqwJjloFVcJRYEvq7k0rbzw1oCe93biodq0yXjYquQD0pOcJa400mVSRHCW2
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BASE_URL=https://yourdomain.com (or http://localhost:3000 for dev)
```

## Expected Error Messages (Now More Helpful)

### If STRIPE_SECRET_KEY is missing:
```
"error": "Payment system not configured. Please contact support."
```

### If required fields are missing:
```
"error": "Missing packageId or userId"
```

### If Stripe API call fails:
```
"error": "Payment processing error: [stripe error details]"
```

## Test It Works

1. Logged in user clicks "Buy Now"
2. Console shows: `Checkout response status: 200`
3. `Checkout response headers: application/json`
4. Redirects to Stripe Checkout page
5. On Stripe page, it should show your publishable key works

## If Still Getting JSON Parse Error

The improved error handling now logs much more info. Check:
1. Browser console for specific error
2. Network tab response for actual server response
3. Server logs for the API error details

Contact support with the specific error message from the Network tab Response.
