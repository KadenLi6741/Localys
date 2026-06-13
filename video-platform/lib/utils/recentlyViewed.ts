// Recently-viewed businesses, persisted in localStorage so the sidebar "Recent"
// section reflects profiles the user actually visited (own or others'). Capped
// and most-recent-first. A custom event lets open components update live.

export interface RecentBusiness {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
  type: string | null;
}

export const RECENTLY_VIEWED_KEY = 'localys.recentlyViewed';
const KEY = RECENTLY_VIEWED_KEY;
export const RECENTLY_VIEWED_EVENT = 'localys:recently-viewed';
const MAX = 8;

export function getRecentBusinesses(): RecentBusiness[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]') as RecentBusiness[];
  } catch {
    return [];
  }
}

/** Record a visited business/profile at the front of the recents list. */
export function recordRecentBusiness(biz: RecentBusiness): void {
  if (typeof window === 'undefined' || !biz?.id) return;
  const current = getRecentBusinesses().filter((b) => b.id !== biz.id);
  const next = [biz, ...current].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
}
