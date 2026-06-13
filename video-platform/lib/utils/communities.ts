// Frontend-only communities, persisted in localStorage (no backend table yet).
// The sidebar only shows communities that actually exist here; visiting a
// community that isn't found renders a 404. A custom event keeps the UI live.

export interface Community {
  slug: string;
  name: string;
  description: string;
  createdAt: string;
}

export const COMMUNITIES_KEY = 'localys.communities';
export const COMMUNITIES_EVENT = 'localys:communities';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

export function getCommunities(): Community[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(COMMUNITIES_KEY) || '[]') as Community[];
  } catch {
    return [];
  }
}

export function getCommunity(slug: string): Community | null {
  return getCommunities().find((c) => c.slug === slug) ?? null;
}

/** Create a community; returns it, or null if the name is empty/duplicate. */
export function createCommunity(name: string, description: string): Community | null {
  const slug = slugify(name);
  if (!slug) return null;
  const current = getCommunities();
  if (current.some((c) => c.slug === slug)) return null;
  const community: Community = { slug, name: name.trim(), description: description.trim(), createdAt: new Date().toISOString() };
  window.localStorage.setItem(COMMUNITIES_KEY, JSON.stringify([community, ...current]));
  window.dispatchEvent(new Event(COMMUNITIES_EVENT));
  return community;
}
