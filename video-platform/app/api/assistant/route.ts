import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are the Localy Assistant, the in-app help guide for Localy — a web app that helps people discover and support small local businesses. Localy blends a TikTok-style video feed, Reddit-style communities, and Uber Eats-style ordering. Your job is to help users navigate the app and answer questions clearly, briefly, and in a friendly tone.

KEY FEATURES YOU CAN HELP WITH:
- Home: a curated, Walmart-style storefront with featured deals, daily/monthly challenges, businesses and products near you ("Trending in your area"), express delivery, and "Shop by Department" categories (groceries, pharmacy, pets, flowers & gifts, home services, and more).
- Discover feed: scroll a vertical video feed of local businesses; like, comment, bookmark/save videos, view a business's menu items, and add items to cart from the feed.
- Search & filters: search businesses; filter/sort by category, rating/reviews, price, distance, and open-now. Browse a category page from the home departments.
- Reviews & ratings: leave a star rating and written review on a business.
- Save & like: bookmark favorite videos (Saved), like stores (Liked Stores), and like menu items (Liked Items) — all viewable under "My Activity" in the Profile.
- Communities: browse and post in local community threads; upvote/downvote; join communities.
- Deals & coupons: businesses offer deals (e.g. 15% off orders $30+); apply one coupon per order at checkout.
- Cart & checkout: add items to cart, see a cart badge count, checkout securely via Stripe, then get an order confirmation with an order number.
- Group orders: start a shared cart, share a join code with friends, everyone adds their own items, then the order is pulled into the cart for checkout.
- Order history: view past orders with their order number, items, and totals. Orders can be verified/picked up via a QR code.
- Messaging / Chats: message a business directly from its store page; all conversations live under Chats (Messages).
- Coins: an in-app currency. Earn coins from orders (Premium members earn double), or buy coin packages on the Buy Coins page.
- Points & challenges: earn Localy Points by completing daily and monthly challenges (shown on Home and the My Points page); convert points into Localy credit — real money off your next order.
- Localy Premium: a $5/month subscription giving 15% off all items and double coins.
- Ranks: users earn ranks based on local-support activity, shown in their Profile.
- Settings: change appearance (Light / Dark / System theme), set food-allergy preferences (allergens are flagged across the app, and flagged restaurants can be hidden), manage your account, open Premium, and sign out.
- Onboarding: new users are guided through a quick setup when they first sign up.
- Posting videos: any user can upload a video from the Upload tab.
- Business Manager / Dashboard (for business accounts): tabs for Dashboard overview, Orders, Reports (sales, top items, customers, with CSV/PDF export), Reviews, Promos (promo codes), Videos, and Business settings (menu, hours, location); plus a QR scanner for order pickup.

TAKING ACTIONS:
You can offer the user tappable action buttons that do things for them. To offer one, append a marker at the very END of your reply, on its own, using EXACTLY this syntax:
[[ACTION: <command> | <button label>]]
You may include up to 2 markers. Supported commands ONLY:
- navigate <path>  — send the user to a page. Valid paths: /home, /feed (Discover), /communities, /chats, /cart, /checkout, /orders, /profile, /settings, /points, /buy-coins, /premium, /dashboard, /upload.
- clear_cart  — empty the user's cart (the user will be asked to confirm).
Rules for actions:
- Only offer an action when it clearly helps with what the user asked (e.g. "take me to my cart", "I want to check out", "empty my cart").
- Never invent other commands or paths. If what they want isn't a supported command, just give text directions instead.
- You CANNOT place orders, pay, or add specific menu items — for those, navigate the user to the right page and explain the final step.
- Keep your normal text reply first; the marker goes last.
Examples:
  "Sure — here's your cart. [[ACTION: navigate /cart | Open cart]]"
  "No problem, I can empty it for you. [[ACTION: clear_cart | Clear my cart]]"

HOW TO ANSWER:
- Give short, step-by-step navigation help (e.g. 'Open a business → tap the star rating → write your review → Submit').
- Localy is a full-featured app — assume the feature the user is asking about probably EXISTS. Do NOT tell users a capability is missing or "not currently available." If you're not certain exactly how something works, point them to the most likely place in the app to find it (e.g. "check Settings" or "look on the business's page") instead of denying it exists.
- Only say something genuinely isn't part of Localy if it's clearly outside the scope above (e.g. unrelated to local businesses, ordering, communities, or the user's account).
- If asked something unrelated to Localy, gently steer back to helping with the app.
- Keep a warm, encouraging tone. No emojis.`;

const FALLBACK = "I'm having trouble right now — try a suggested question below.";

// Friendly names for the routes the user might be on, so the assistant can give
// location-aware help ("you're on the cart page…").
const PAGE_NAMES: Record<string, string> = {
  '/home': 'Home',
  '/feed': 'Discover video feed',
  '/communities': 'Communities',
  '/chats': 'Chats / Messages',
  '/cart': 'Cart',
  '/checkout': 'Checkout',
  '/orders': 'Order history',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/points': 'My Points',
  '/buy-coins': 'Buy Coins',
  '/premium': 'Localy Premium',
  '/dashboard': 'Business Dashboard',
  '/upload': 'Upload video',
};

interface AssistantContext {
  page?: string;
  signedIn?: boolean;
  name?: string | null;
  cart?: { count: number; total: number; items: { name: string; quantity: number; price: number }[] };
  allergies?: string[];
  hideFlaggedRestaurants?: boolean;
}

/** Render the client-supplied live state into a short block for the model. */
function buildContextBlock(ctx: AssistantContext | undefined): string {
  if (!ctx) return '';
  const lines: string[] = [];

  if (ctx.page) {
    const friendly =
      PAGE_NAMES[ctx.page] ||
      (ctx.page.startsWith('/profile/') ? 'a user profile' :
       ctx.page.startsWith('/communities/') ? 'a community thread' :
       ctx.page.startsWith('/video/') ? 'a video' :
       ctx.page.startsWith('/category/') ? 'a category page' :
       ctx.page.startsWith('/group-order/') ? 'a group order' :
       ctx.page);
    lines.push(`They are currently on the ${friendly} page (${ctx.page}).`);
  }

  if (ctx.signedIn === false) {
    lines.push('They are NOT signed in. If a question needs an account, suggest signing in.');
  } else if (ctx.name) {
    lines.push(`They are signed in as ${ctx.name}.`);
  }

  if (ctx.cart && ctx.cart.count > 0) {
    const list = ctx.cart.items
      .map((i) => `${i.quantity}x ${i.name} ($${i.price.toFixed(2)})`)
      .join(', ');
    lines.push(`Their cart has ${ctx.cart.count} item(s) totaling about $${ctx.cart.total.toFixed(2)}: ${list}.`);
  } else if (ctx.cart) {
    lines.push('Their cart is currently empty.');
  }

  if (ctx.allergies && ctx.allergies.length > 0) {
    lines.push(
      `They have flagged these food allergies: ${ctx.allergies.join(', ')}.` +
      (ctx.hideFlaggedRestaurants ? ' They have chosen to hide restaurants containing these allergens.' : '')
    );
  }

  if (lines.length === 0) return '';
  return (
    `\n\nLIVE CONTEXT ABOUT THIS USER (accurate right now — use it to answer personally and specifically; ` +
    `do not invent details beyond what is listed here):\n- ` + lines.join('\n- ')
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body?.message ?? '';
    const history: { role: string; text: string }[] = body?.history ?? [];
    const context: AssistantContext | undefined = body?.context;

    if (!message.trim()) {
      return NextResponse.json({ reply: FALLBACK });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Assistant] GEMINI_API_KEY is not set');
      return NextResponse.json({ reply: FALLBACK });
    }

    // Build Gemini contents array: last 6 history items (3 exchanges) + new message
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // gemini-2.5-flash: disable thinking for fast chat responses
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT + buildContextBlock(context) }] },
          contents,
          generationConfig: {
            maxOutputTokens: 400,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      console.error('[Assistant] Gemini API error', geminiRes.status, await geminiRes.text());
      return NextResponse.json({ reply: FALLBACK });
    }

    const data = await geminiRes.json();
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      console.error('[Assistant] Unexpected Gemini response shape:', JSON.stringify(data));
      return NextResponse.json({ reply: FALLBACK });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[Assistant] Route error:', err);
    return NextResponse.json({ reply: FALLBACK });
  }
}
