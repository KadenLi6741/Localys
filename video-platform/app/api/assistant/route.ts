/**
 * API route: POST /api/assistant — backend for the in-app Localy Assistant chat.
 * Purpose: Takes the user's message (plus recent history) and returns an AI help reply, primed with a
 *   system prompt describing how Localy works. Runs server-side so the AI provider key stays secret, and
 *   degrades to a friendly fallback message on any error.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';

// System prompt: teaches the assistant what Localy is and how to answer (scope + tone).
const SYSTEM_PROMPT = `You are the Localy Assistant, the in-app help guide for Localy — a web app that helps people discover and support small local businesses. Localy blends a TikTok-style video feed, Reddit-style communities, and Uber Eats-style ordering. Your job is to help users navigate the app and answer questions clearly, briefly, and in a friendly tone.

KEY FEATURES YOU CAN HELP WITH:
- Discover feed: scroll a vertical video feed of local businesses; like, comment, bookmark/save videos, view a business's menu items, and add items to cart from the feed.
- Search & filters: search businesses; filter/sort by category, rating/reviews, price, distance, and open-now.
- Reviews & ratings: leave a star rating and written review on a business.
- Save & like: bookmark favorite videos (Saved), like stores (Liked Stores), and like menu items (Liked Items) — all viewable in the Profile.
- Communities: browse and post in local community threads; upvote/downvote; join communities.
- Deals & coupons: businesses offer deals (e.g. 15% off orders $30+); apply one coupon per order at checkout.
- Cart & checkout: add items to cart, see a cart badge count, checkout securely via Stripe, then get an order confirmation with an order number.
- Order history: view past orders with their order number, items, and totals.
- Messaging: message a business directly from its store page.
- Business Manager (for business accounts): manage menu, hours, location, reviews, orders, promo codes, post videos, and view a Reports dashboard (sales, top items, customers, with CSV/PDF export).
- Localy Premium: a $5/month subscription giving 15% off all items and double coins.
- Ranks: users earn ranks based on local-support activity, shown in their Profile.

HOW TO ANSWER:
- Give short, step-by-step navigation help (e.g. 'Open a business → tap the star rating → write your review → Submit').
- If you don't know something specific, suggest where in the app to look.
- If asked something unrelated to Localy, gently steer back to helping with the app.
- Keep a warm, encouraging tone. No emojis.`;

const FALLBACK = "I'm having trouble right now — try a suggested question below.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body?.message ?? '';
    const history: { role: string; text: string }[] = body?.history ?? [];

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
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
