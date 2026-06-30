'use client';

/**
 * Community Feedback store (demo).
 *
 * Customers leave short wishlist / feedback requests (e.g. "I wish you had
 * vegan options"); business owners see and MANAGE them in the Business Manager
 * dashboard. Persisted client-side via localStorage and kept in sync across
 * mounted components (home box + dashboard panel) with a tiny event emitter.
 *
 * Wire to Supabase later: replace read()/write() with queries on a
 * `community_feedback` table and drop the MOCK seed below.
 */

import { useCallback, useEffect, useState } from 'react';

export interface FeedbackEntry {
  id: string;
  businessId: string;
  message: string;
  authorId: string | null;
  authorName: string;
  createdAt: string; // ISO timestamp
  upvotes: number;
  upvotedBy: string[]; // voter ids — one vote per user
  resolved: boolean;
}

/**
 * Shared demo channel. The generic home feedback box and the seeded mock data
 * both live here, so ANY owner's dashboard shows a populated, believable list
 * regardless of the real/local business id (handles demo ids gracefully).
 */
export const DEMO_BUSINESS_ID = 'demo-business';

const STORAGE_KEY = 'localy.communityFeedback.v1';
const EVENT = 'localy:community-feedback';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── MOCK community feedback — wire to Supabase later ──
// Believable wishlist/feedback so the dashboard isn't empty for judges.
function seed(): FeedbackEntry[] {
  return [
    { id: 'seed-1', businessId: DEMO_BUSINESS_ID, message: 'Please add vegan and gluten-free options to the menu.', authorId: null, authorName: 'Priya R.', createdAt: daysAgo(2), upvotes: 34, upvotedBy: [], resolved: false },
    { id: 'seed-2', businessId: DEMO_BUSINESS_ID, message: 'Online ordering for pickup would be a game changer.', authorId: null, authorName: 'Marcus L.', createdAt: daysAgo(5), upvotes: 28, upvotedBy: [], resolved: false },
    { id: 'seed-3', businessId: DEMO_BUSINESS_ID, message: 'Can you open earlier on weekends? 8am would be perfect for coffee.', authorId: null, authorName: 'Hannah K.', createdAt: daysAgo(1), upvotes: 19, upvotedBy: [], resolved: false },
    { id: 'seed-4', businessId: DEMO_BUSINESS_ID, message: 'A loyalty / rewards program would keep me coming back.', authorId: null, authorName: 'Diego M.', createdAt: daysAgo(8), upvotes: 16, upvotedBy: [], resolved: false },
    { id: 'seed-5', businessId: DEMO_BUSINESS_ID, message: 'More seating outside please — the patio fills up fast.', authorId: null, authorName: 'Aisha N.', createdAt: daysAgo(12), upvotes: 11, upvotedBy: [], resolved: true },
    { id: 'seed-6', businessId: DEMO_BUSINESS_ID, message: 'Would love a kids menu for family visits.', authorId: null, authorName: 'Tom B.', createdAt: daysAgo(3), upvotes: 7, upvotedBy: [], resolved: false },
    { id: 'seed-7', businessId: DEMO_BUSINESS_ID, message: 'Please accept tap-to-pay / Apple Pay at the counter.', authorId: null, authorName: 'Sofia C.', createdAt: daysAgo(6), upvotes: 5, upvotedBy: [], resolved: false },
  ];
}

function read(): FeedbackEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as FeedbackEntry[];
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

function write(entries: FeedbackEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore quota / serialization errors in demo */
  }
}

/**
 * Feedback shown for a business = that business's own entries PLUS the shared
 * demo channel (seeded mock + generic home submissions). Keeps the demo
 * populated whatever id the dashboard resolves to.
 */
export function getFeedbackForBusiness(businessId: string | null | undefined): FeedbackEntry[] {
  return read().filter(
    (e) => e.businessId === DEMO_BUSINESS_ID || (businessId != null && e.businessId === businessId),
  );
}

export function addFeedback(input: {
  businessId?: string | null;
  message: string;
  authorId: string | null;
  authorName: string;
}): FeedbackEntry {
  const entry: FeedbackEntry = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    businessId: input.businessId || DEMO_BUSINESS_ID,
    message: input.message.trim().slice(0, 280),
    authorId: input.authorId,
    authorName: input.authorName || 'Anonymous',
    createdAt: new Date().toISOString(),
    upvotes: 0,
    upvotedBy: [],
    resolved: false,
  };
  write([entry, ...read()]);
  return entry;
}

export function toggleUpvote(id: string, userId: string | null): void {
  const voter = userId || 'anon';
  write(
    read().map((e) => {
      if (e.id !== id) return e;
      const has = e.upvotedBy.includes(voter);
      return {
        ...e,
        upvotedBy: has ? e.upvotedBy.filter((v) => v !== voter) : [...e.upvotedBy, voter],
        upvotes: Math.max(0, e.upvotes + (has ? -1 : 1)),
      };
    }),
  );
}

export function hasUpvoted(entry: FeedbackEntry, userId: string | null): boolean {
  return entry.upvotedBy.includes(userId || 'anon');
}

export function deleteFeedback(id: string): void {
  write(read().filter((e) => e.id !== id));
}

export function toggleResolved(id: string): void {
  write(read().map((e) => (e.id === id ? { ...e, resolved: !e.resolved } : e)));
}

/** Clears every entry visible to a business (its own + the shared demo channel). */
export function clearFeedbackForBusiness(businessId: string | null | undefined): void {
  write(
    read().filter(
      (e) => !(e.businessId === DEMO_BUSINESS_ID || (businessId != null && e.businessId === businessId)),
    ),
  );
}

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb); // cross-tab sync
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Live list of a business's feedback that re-renders on any add/upvote/delete/resolve. */
export function useCommunityFeedback(businessId: string | null | undefined) {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const refresh = useCallback(() => setEntries(getFeedbackForBusiness(businessId)), [businessId]);
  useEffect(() => {
    refresh();
    return subscribe(refresh);
  }, [refresh]);
  return { entries, refresh };
}
