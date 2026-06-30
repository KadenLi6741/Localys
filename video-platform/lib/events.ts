/**
 * Local Events — data model + client-side persistence for the Events feature.
 *
 * Customers browse upcoming events from local businesses; businesses create
 * events from their dashboard. For the demo this is fully client-side:
 *   - A fixed set of seeded events (see MOCK_EVENTS below).
 *   - Owner-created events + RSVP ("interested") state persisted to localStorage
 *     so they survive refreshes (optimistic, wire to Supabase later).
 *
 * // MOCK events data — wire to Supabase later
 */

export type EventType =
  | 'Promotion'
  | 'Anniversary'
  | 'Live Music'
  | 'Tasting'
  | 'Grand Opening'
  | 'Community/Charity'
  | 'Workshop'
  | 'Other';

/** Canonical type list — used by the dashboard dropdown and the customer filters. */
export const EVENT_TYPES: EventType[] = [
  'Promotion',
  'Anniversary',
  'Live Music',
  'Tasting',
  'Grand Opening',
  'Community/Charity',
  'Workshop',
  'Other',
];

export interface LocalEvent {
  id: string;
  businessId: string;
  businessName: string;
  /** Slug used to link to the business profile/store page (optional). */
  businessSlug?: string;
  title: string;
  type: EventType;
  /** ISO timestamp for the event start. */
  startsAt: string;
  description: string;
  imageUrl?: string;
  /** Optional promo / deal details (e.g. "20% off all platters"). */
  promoDetails?: string;
  /** Base interested count (excludes the current viewer's own RSVP). */
  interestedCount: number;
  /** Approximate distance for the local "within 5 km" theme. */
  distanceKm?: number;
  /** True for events created by a business owner in the dashboard. */
  createdByUser?: boolean;
}

const CREATED_KEY = 'localy_events_created';
const INTERESTED_KEY = 'localy_events_interested';

/** Build an ISO timestamp `days` from now at the given hour (deterministic per render day). */
function atDay(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * MOCK events data — wire to Supabase later.
 *
 * Dates are relative to "now" so the feed always looks upcoming for judges, and
 * Today / This Week / Upcoming filters always have content. A spread of types
 * and businesses keeps the page full and varied.
 */
export const MOCK_EVENTS: LocalEvent[] = [
  {
    id: 'evt-seed-1',
    businessId: 'holy-smoke-barbecue',
    businessName: 'Holy Smoke Barbecue',
    businessSlug: 'holy-smoke-barbecue',
    title: 'Smokehouse Happy Hour',
    type: 'Promotion',
    startsAt: atDay(0, 17, 0),
    description:
      'Half-price brisket sliders and $4 craft sodas from 5–7pm tonight. Pull up a stool, the smoker has been running since dawn.',
    imageUrl: '/stores/holy-smoke-barbecue/banner.jpg',
    promoDetails: '50% off brisket sliders · $4 craft sodas (5–7pm)',
    interestedCount: 42,
    distanceKm: 1.2,
  },
  {
    id: 'evt-seed-2',
    businessId: 'amys-fish-and-chips',
    businessName: "Amy's Fish & Chips",
    businessSlug: 'amys-fish-and-chips',
    title: 'Friday Night Live Music',
    type: 'Live Music',
    startsAt: atDay(0, 19, 30),
    description:
      'Local acoustic duo "The Harbourmen" play sea shanties and indie covers while you tuck into fresh-battered haddock. No cover charge.',
    imageUrl: '/stores/amys-fish-and-chips/banner.jpg',
    interestedCount: 76,
    distanceKm: 2.4,
  },
  {
    id: 'evt-seed-3',
    businessId: 'ambrosia-thornhills',
    businessName: 'Ambrosia',
    businessSlug: 'ambrosia-thornhills',
    title: 'Organic Tasting Evening',
    type: 'Tasting',
    startsAt: atDay(2, 18, 0),
    description:
      'Sample our new line of organic dips, olive oils and cold-pressed juices. Our buyers will be on hand to talk sourcing and seasonality.',
    imageUrl: '/stores/ambrosia-thornhills/banner.jpg',
    interestedCount: 31,
    distanceKm: 3.1,
  },
  {
    id: 'evt-seed-4',
    businessId: 'k1-floral-studio',
    businessName: 'K1 Floral Studio',
    businessSlug: 'k1-floral-studio',
    title: 'Summer Bouquet Workshop',
    type: 'Workshop',
    startsAt: atDay(3, 11, 0),
    description:
      'Hands-on class building a seasonal hand-tied bouquet. All stems, twine and a take-home wrap included. Beginners very welcome.',
    imageUrl: '/stores/k1-floral-studio/banner.jpg',
    promoDetails: '$45 per seat · materials included',
    interestedCount: 18,
    distanceKm: 4.6,
  },
  {
    id: 'evt-seed-5',
    businessId: 'ashario-pets',
    businessName: 'Ashario Pets',
    businessSlug: 'ashario-pets',
    title: 'Adoption & Charity Day',
    type: 'Community/Charity',
    startsAt: atDay(4, 12, 0),
    description:
      'Meet adoptable rescues from the local shelter. Every treat and toy sold today sends 100% of profits to animal welfare.',
    imageUrl: '/stores/ashario-pets/banner.jpg',
    interestedCount: 54,
    distanceKm: 2.0,
  },
  {
    id: 'evt-seed-6',
    businessId: 'pho-nga-son',
    businessName: 'Pho Nga Son',
    businessSlug: 'pho-nga-son',
    title: '10 Year Anniversary Feast',
    type: 'Anniversary',
    startsAt: atDay(5, 18, 30),
    description:
      'A decade of pho! Celebrate with a special anniversary tasting menu, lucky-draw prizes and a free dessert with every bowl.',
    imageUrl: '/stores/pho-nga-son/banner.jpg',
    promoDetails: 'Free che dessert with every pho',
    interestedCount: 63,
    distanceKm: 3.8,
  },
  {
    id: 'evt-seed-7',
    businessId: 'flowers-gifts-and-balloons',
    businessName: 'Flowers, Gifts & Balloons',
    businessSlug: 'flowers-gifts-and-balloons',
    title: 'Grand Re-Opening',
    type: 'Grand Opening',
    startsAt: atDay(6, 10, 0),
    description:
      'Freshly renovated and bursting with colour. First 50 guests get a complimentary single-stem rose and a ribbon-cutting at 10am sharp.',
    imageUrl: '/stores/flowers-gifts-and-balloons/banner.jpg',
    interestedCount: 27,
    distanceKm: 1.7,
  },
  {
    id: 'evt-seed-8',
    businessId: 'pho-xe-lua',
    businessName: 'Pho Xe Lua',
    businessSlug: 'pho-xe-lua',
    title: 'Trivia & Noodle Night',
    type: 'Other',
    startsAt: atDay(7, 19, 0),
    description:
      'Team trivia over steaming bowls of pho. Winning table takes home a month of free spring rolls. Tables of up to six.',
    imageUrl: '/stores/pho-xe-lua/banner.jpg',
    interestedCount: 22,
    distanceKm: 4.1,
  },
  {
    id: 'evt-seed-9',
    businessId: 'express-mart',
    businessName: 'Express Mart',
    businessSlug: 'express-mart',
    title: 'Weekend Flash Deals',
    type: 'Promotion',
    startsAt: atDay(1, 9, 0),
    description:
      'Two days of rotating flash deals on snacks, drinks and household staples. New markdowns drop every two hours — first come, first served.',
    imageUrl: '/stores/express-mart/banner.jpg',
    promoDetails: 'Up to 40% off · new deals every 2 hours',
    interestedCount: 38,
    distanceKm: 0.8,
  },
  {
    id: 'evt-seed-10',
    businessId: 'razi-pharmacy',
    businessName: 'Razi Pharmacy',
    businessSlug: 'razi-pharmacy',
    title: 'Free Wellness Clinic',
    type: 'Community/Charity',
    startsAt: atDay(9, 13, 0),
    description:
      'Drop in for free blood-pressure checks and a chat with our pharmacists about seasonal health. No appointment needed.',
    imageUrl: '/stores/razi-pharmacy/banner.jpg',
    interestedCount: 15,
    distanceKm: 2.9,
  },
];

/* ── localStorage helpers (SSR-safe) ── */

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore for the demo */
  }
}

/** Owner-created events (persisted client-side). */
export function getCreatedEvents(): LocalEvent[] {
  return readJSON<LocalEvent[]>(CREATED_KEY, []);
}

/** All events shown on the customer feed: seeded + owner-created, soonest first. */
export function getAllEvents(): LocalEvent[] {
  const all = [...MOCK_EVENTS, ...getCreatedEvents()];
  return all.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

/** Events for one business (used by the dashboard "My Events" list). */
export function getEventsForBusiness(businessId: string): LocalEvent[] {
  return getCreatedEvents()
    .filter((e) => e.businessId === businessId)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function addEvent(event: LocalEvent): LocalEvent[] {
  const next = [...getCreatedEvents(), event];
  writeJSON(CREATED_KEY, next);
  return next;
}

export function updateEvent(id: string, patch: Partial<LocalEvent>): LocalEvent[] {
  const next = getCreatedEvents().map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e));
  writeJSON(CREATED_KEY, next);
  return next;
}

export function deleteEvent(id: string): LocalEvent[] {
  const next = getCreatedEvents().filter((e) => e.id !== id);
  writeJSON(CREATED_KEY, next);
  return next;
}

/* ── RSVP / "Interested" state ── */

export function getInterestedIds(): string[] {
  return readJSON<string[]>(INTERESTED_KEY, []);
}

export function isInterested(id: string): boolean {
  return getInterestedIds().includes(id);
}

/** Toggle interest for an event; returns the new interested state. */
export function toggleInterested(id: string): boolean {
  const ids = getInterestedIds();
  const active = ids.includes(id);
  const next = active ? ids.filter((x) => x !== id) : [...ids, id];
  writeJSON(INTERESTED_KEY, next);
  return !active;
}

/** Stable client id for newly created events. */
export function newEventId(): string {
  return `evt-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
