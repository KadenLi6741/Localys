import { NextRequest, NextResponse } from 'next/server';
import { keywordRank, type SearchCandidate } from '@/lib/semanticSearch';

/**
 * Semantic search ranking via Gemini (server-side; GEMINI_API_KEY never leaves
 * the server). Given a query + candidate businesses (name, summary, tags, a few
 * item names), Gemini returns the relevant business ids ordered by intent —
 * "spicy" surfaces likely-spicy dishes, "burger" surfaces burger places.
 *
 * Reliability: if the key is missing, Gemini errors, or the response is unusable,
 * we fall back to a fast keyword/tag match so search ALWAYS returns something.
 */

// Cap how much we send to keep latency + token use reasonable.
const MAX_CANDIDATES = 40;
const MAX_ITEMS_PER_CANDIDATE = 8;

export async function POST(req: NextRequest) {
  let query = '';
  let candidates: SearchCandidate[] = [];

  try {
    const body = await req.json();
    query = typeof body?.query === 'string' ? body.query.trim() : '';
    candidates = Array.isArray(body?.candidates) ? body.candidates : [];
  } catch {
    return NextResponse.json({ ids: [], source: 'keyword' });
  }

  if (!query || candidates.length === 0) {
    return NextResponse.json({ ids: candidates.map((c) => c.id), source: 'keyword' });
  }

  // Trim payload before sending to Gemini.
  const trimmed = candidates.slice(0, MAX_CANDIDATES).map((c) => ({
    id: c.id,
    name: c.name,
    summary: c.summary,
    category: c.category,
    tags: c.tags,
    items: (c.items ?? []).slice(0, MAX_ITEMS_PER_CANDIDATE),
  }));
  const validIds = new Set(trimmed.map((c) => c.id));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No key → keyword fallback (still useful for the demo).
    return NextResponse.json({ ids: keywordRank(query, trimmed), source: 'keyword' });
  }

  const prompt = `You are the search ranking engine for "Localy", a local-business discovery app.

User query: "${query}"

Rank the businesses below by how well they match the user's INTENT, most relevant first. Infer meaning, do not just match words:
- "burger" -> burger restaurants and places with burgers.
- "spicy" -> businesses with dishes that are plausibly spicy (e.g. hot sauces, chili, certain cuisines) even if the word "spicy" is absent.
- A normal term (e.g. a cuisine, product, or business name) -> the obvious matches.

Only include businesses that are genuinely relevant. Omit irrelevant ones. Return STRICT JSON: {"ids": ["id1","id2", ...]} using ONLY the provided ids, ordered best first. No prose.

Businesses (JSON):
${JSON.stringify(trimmed)}`;

  try {
    const geminiRes = await fetch(
      // gemini-2.5-flash with thinking disabled = fast, JSON-only ranking. (The
      // free tier blocks gemini-2.0-flash on this account; 2.5-flash is what the
      // Localy Assistant route already uses.)
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      console.error('[ai-search] Gemini API error', geminiRes.status, await geminiRes.text());
      return NextResponse.json({ ids: keywordRank(query, trimmed), source: 'keyword' });
    }

    const data = await geminiRes.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    let ids: string[] = [];
    if (text) {
      try {
        const parsed = JSON.parse(text);
        const raw = Array.isArray(parsed) ? parsed : parsed?.ids;
        if (Array.isArray(raw)) {
          ids = raw.filter((id): id is string => typeof id === 'string' && validIds.has(id));
        }
      } catch {
        // fall through to keyword fallback below
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ ids: keywordRank(query, trimmed), source: 'keyword' });
    }
    return NextResponse.json({ ids, source: 'ai' });
  } catch (err) {
    console.error('[ai-search] request failed', err);
    return NextResponse.json({ ids: keywordRank(query, trimmed), source: 'keyword' });
  }
}
