import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a 1–2 sentence business summary from its product/menu item names via
 * Gemini (server-side; GEMINI_API_KEY never leaves the server).
 *
 * Summaries are normally read from the precomputed cache in
 * `lib/businessSummaries.ts` so the UI is instant. This route is for generating
 * a fresh summary (e.g. for a new business, or to regenerate the cache). It
 * always returns something: if the key is missing or Gemini errors, it derives a
 * simple summary from the item names so the caller never gets a blank.
 */

const MAX_ITEMS = 25;

/** Naive, no-API fallback so the response is never empty. */
function fallbackSummary(name: string, items: string[]): string {
  const sample = items.slice(0, 4).join(', ');
  if (!sample) return `${name} — a local business on Localy.`;
  return `${name} offers ${sample}${items.length > 4 ? ', and more' : ''}.`;
}

export async function POST(req: NextRequest) {
  let name = '';
  let items: string[] = [];

  try {
    const body = await req.json();
    name = typeof body?.name === 'string' ? body.name.trim() : '';
    items = Array.isArray(body?.items)
      ? body.items.filter((i: unknown): i is string => typeof i === 'string').slice(0, MAX_ITEMS)
      : [];
  } catch {
    return NextResponse.json({ summary: '' }, { status: 400 });
  }

  if (!name) return NextResponse.json({ summary: '' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || items.length === 0) {
    return NextResponse.json({ summary: fallbackSummary(name, items), source: 'fallback' });
  }

  const prompt = `Write a concise 1-2 sentence summary describing this local business based on its products/menu items. Capture the vibe and what it is known for (e.g. "Casual burger joint known for smash burgers, loaded fries, and milkshakes."). No emojis, no quotes, plain text only.

Business name: ${name}
Items: ${items.join(', ')}`;

  try {
    const geminiRes = await fetch(
      // gemini-2.5-flash (thinking off) — matches the Localy Assistant route; the
      // free tier blocks gemini-2.0-flash on this account.
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 120,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      console.error('[business-summary] Gemini API error', geminiRes.status, await geminiRes.text());
      return NextResponse.json({ summary: fallbackSummary(name, items), source: 'fallback' });
    }

    const data = await geminiRes.json();
    const summary: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!summary) {
      return NextResponse.json({ summary: fallbackSummary(name, items), source: 'fallback' });
    }
    return NextResponse.json({ summary, source: 'ai' });
  } catch (err) {
    console.error('[business-summary] request failed', err);
    return NextResponse.json({ summary: fallbackSummary(name, items), source: 'fallback' });
  }
}
