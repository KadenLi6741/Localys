/**
 * Semantic search shared layer.
 *
 * Pure ranking helpers used on BOTH sides:
 *   - the server route `app/api/ai-search/route.ts` (keyword fallback)
 *   - the client `components/shell/SearchDropdown.tsx` (candidate build + fallback)
 *
 * The flow: the client builds a small list of `SearchCandidate`s (name + AI
 * summary + tags + a few item names), POSTs them with the query to /api/ai-search
 * where Gemini ranks them by INTENT ("spicy" → likely-spicy dishes, "burger" →
 * burger places). If Gemini is missing/slow/errors we fall back to `keywordRank`
 * so search ALWAYS returns something fast and never hangs or blanks out.
 */

export interface SearchCandidate {
  /** Routing id — the username/slug used for /profile/<id>. */
  id: string;
  name: string;
  summary?: string;
  category?: string;
  type?: string; // 'food' | 'retail' | 'service'
  /** Intent hints (e.g. "spicy", "burger", "bbq") for the keyword fallback. */
  tags?: string[];
  /** A handful of representative item names (capped before sending to Gemini). */
  items?: string[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'for', 'with', 'to', 'in', 'on', 'near',
  'me', 'my', 'best', 'good', 'great', 'cheap', 'some', 'any', 'place', 'places',
  'shop', 'store', 'spot', 'spots',
]);

/** Lowercase word tokens, drop tiny/stop words. */
export function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length > 1 && !STOP_WORDS.has(t)
  );
}

/**
 * Fast keyword/tag scorer used as the always-on fallback. Returns candidate ids
 * ordered by relevance (best first), keeping only those with a non-zero score.
 * An empty query returns every candidate id (so filters alone still list stores).
 */
export function keywordRank(query: string, candidates: SearchCandidate[]): string[] {
  const terms = tokenize(query);
  if (terms.length === 0) return candidates.map((c) => c.id);

  const scored = candidates.map((c) => {
    const name = c.name.toLowerCase();
    const tags = (c.tags ?? []).map((t) => t.toLowerCase());
    const hay = [c.summary, c.category, ...tags, ...(c.items ?? [])]
      .join(' ')
      .toLowerCase();

    let score = 0;
    for (const t of terms) {
      if (name.includes(t)) score += 5; // name match is strongest
      if (tags.some((tag) => tag.includes(t))) score += 3; // intent tag
      if (hay.includes(t)) score += 1; // summary / category / items
    }
    return { id: c.id, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.id);
}

export interface RankResult {
  ids: string[];
  source: 'ai' | 'keyword';
}

/**
 * Client helper: ask the Gemini route to semantically rank the candidates, with
 * a hard timeout + keyword fallback so the UI never hangs. Always resolves.
 */
export async function rankCandidates(
  query: string,
  candidates: SearchCandidate[],
  timeoutMs = 3500
): Promise<RankResult> {
  const q = query.trim();
  if (q.length === 0) return { ids: candidates.map((c) => c.id), source: 'keyword' };

  const validIds = new Set(candidates.map((c) => c.id));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/api/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, candidates }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ai-search ${res.status}`);
    const data = (await res.json()) as { ids?: unknown };
    const ids = Array.isArray(data.ids)
      ? data.ids.filter((id): id is string => typeof id === 'string' && validIds.has(id))
      : [];
    // If the model returned nothing usable, fall back to keyword so we still show results.
    if (ids.length === 0) return { ids: keywordRank(q, candidates), source: 'keyword' };
    return { ids, source: 'ai' };
  } catch {
    return { ids: keywordRank(q, candidates), source: 'keyword' };
  } finally {
    clearTimeout(timer);
  }
}
