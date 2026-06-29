'use client';

/**
 * Client-side engagement store for demo/seeded content.
 *
 * Demo videos, slug-based stores, and demo comments are not real Supabase rows,
 * so likes / bookmarks / comment-likes / comments / replies / ratings on them
 * cannot be persisted in the database. This module keeps that state in
 * localStorage so it works with zero Supabase calls and survives reloads.
 *
 * Mirrors the localStorage pattern used by `contexts/CartContext.tsx`. A tiny
 * pub-sub lets components (profile "Saved" section, headers, comment lists)
 * re-render when demo state changes.
 */

import type { Comment } from '../models/Comment';

const STORAGE_KEY = 'localys:engagement';

export interface SavedItem {
  id: string;
  type: 'video' | 'business';
  name: string;
  image?: string;
  /** Optional link target (e.g. store slug page) for the profile Saved grid. */
  href?: string;
}

/** A liked menu item snapshot — enough to render the profile "Liked Items" card. */
export interface LikedMenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  storeName: string;
  /** Where the card links (the store/item page). */
  href: string;
}

interface EngagementState {
  likedItems: Record<string, true>;
  bookmarkedItems: Record<string, SavedItem>;
  likedMenuItems: Record<string, LikedMenuItem>;
  commentLikes: Record<string, true>;
  demoComments: Record<string, Comment[]>;
  ratings: Record<string, number>;
}

const EMPTY: EngagementState = {
  likedItems: {},
  bookmarkedItems: {},
  likedMenuItems: {},
  commentLikes: {},
  demoComments: {},
  ratings: {},
};

let state: EngagementState = { ...EMPTY };
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EngagementState>;
      state = {
        likedItems: parsed.likedItems ?? {},
        bookmarkedItems: parsed.bookmarkedItems ?? {},
        likedMenuItems: parsed.likedMenuItems ?? {},
        commentLikes: parsed.commentLikes ?? {},
        demoComments: parsed.demoComments ?? {},
        ratings: parsed.ratings ?? {},
      };
    }
  } catch {
    // ignore corrupt storage
  }
}

function persistAndEmit() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }
  listeners.forEach((cb) => cb());
}

/** Subscribe to demo-engagement changes. Returns an unsubscribe function. */
export function subscribeEngagement(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ----- Likes (videos AND businesses) -------------------------------------------------

export function isItemLiked(id: string): boolean {
  hydrate();
  return !!state.likedItems[id];
}

/** Toggle a like for a demo video/business. Returns the new liked state. */
export function toggleItemLike(id: string): boolean {
  hydrate();
  const next = !state.likedItems[id];
  const likedItems = { ...state.likedItems };
  if (next) likedItems[id] = true;
  else delete likedItems[id];
  state = { ...state, likedItems };
  persistAndEmit();
  return next;
}

export function getLikedItemIds(): string[] {
  hydrate();
  return Object.keys(state.likedItems);
}

// ----- Bookmarks / saved -------------------------------------------------------------

export function isItemBookmarked(id: string): boolean {
  hydrate();
  return !!state.bookmarkedItems[id];
}

/** Toggle a bookmark for a demo item. Returns the new bookmarked state. */
export function toggleItemBookmark(item: SavedItem): boolean {
  hydrate();
  const exists = !!state.bookmarkedItems[item.id];
  const bookmarkedItems = { ...state.bookmarkedItems };
  if (exists) delete bookmarkedItems[item.id];
  else bookmarkedItems[item.id] = item;
  state = { ...state, bookmarkedItems };
  persistAndEmit();
  return !exists;
}

export function getSavedItems(): SavedItem[] {
  hydrate();
  return Object.values(state.bookmarkedItems);
}

// ----- Liked menu items --------------------------------------------------------------
// A client snapshot is kept for every liked item (demo AND real) so the heart
// state + profile "Liked Items" tab work offline; real items are additionally
// persisted to Supabase by the caller (lib/supabase/likedItems.ts).

export function isMenuItemLiked(id: string): boolean {
  hydrate();
  return !!state.likedMenuItems[id];
}

/** Toggle a liked menu item snapshot. Returns the new liked state. */
export function toggleMenuItemLike(item: LikedMenuItem): boolean {
  hydrate();
  const exists = !!state.likedMenuItems[item.id];
  const likedMenuItems = { ...state.likedMenuItems };
  if (exists) delete likedMenuItems[item.id];
  else likedMenuItems[item.id] = item;
  state = { ...state, likedMenuItems };
  persistAndEmit();
  return !exists;
}

export function getLikedMenuItems(): LikedMenuItem[] {
  hydrate();
  return Object.values(state.likedMenuItems);
}

// ----- Comment likes -----------------------------------------------------------------

export function isCommentLiked(commentId: string): boolean {
  hydrate();
  return !!state.commentLikes[commentId];
}

/** Toggle a like for a demo comment. Returns the new liked state. */
export function toggleCommentLikeLocal(commentId: string): boolean {
  hydrate();
  const next = !state.commentLikes[commentId];
  const commentLikes = { ...state.commentLikes };
  if (next) commentLikes[commentId] = true;
  else delete commentLikes[commentId];
  state = { ...state, commentLikes };
  persistAndEmit();
  return next;
}

// ----- Demo comments + replies -------------------------------------------------------

/** Comments the user posted on a demo video (newest first). */
export function getDemoComments(videoId: string): Comment[] {
  hydrate();
  return state.demoComments[videoId] ?? [];
}

export function addDemoComment(videoId: string, comment: Comment): void {
  hydrate();
  const existing = state.demoComments[videoId] ?? [];
  state = {
    ...state,
    demoComments: { ...state.demoComments, [videoId]: [comment, ...existing] },
  };
  persistAndEmit();
}

// ----- Local order history -----------------------------------------------------------

export interface LocalOrder {
  id: string;
  confirmationNumber: string;
  itemName: string;
  price: number;
  purchased_at: string;
  /** Buyer-chosen pickup/delivery time (ISO), special concerns, QR token, qty. */
  scheduledAt?: string | null;
  specialRequests?: string | null;
  token?: string | null;
  quantity?: number;
  /** How the order is fulfilled: picked up at the store, or delivered. */
  fulfillment?: 'pickup' | 'delivery';
}

const LOCAL_ORDERS_KEY = 'localys:local-orders';

export function saveLocalOrder(order: LocalOrder): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalOrders();
    const deduped = existing.filter((o) => o.id !== order.id);
    window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([order, ...deduped]));
  } catch {
    // ignore quota errors
  }
}

export function getLocalOrders(): LocalOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as LocalOrder[]) : [];
  } catch {
    return [];
  }
}

// ----- Ratings -----------------------------------------------------------------------

export function getDemoRating(videoId: string): number | undefined {
  hydrate();
  return state.ratings[videoId];
}

export function setDemoRating(videoId: string, rating: number): void {
  hydrate();
  state = { ...state, ratings: { ...state.ratings, [videoId]: rating } };
  persistAndEmit();
}
