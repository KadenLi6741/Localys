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

/** A single comment on an event (mock + user-added for the demo). */
export interface EventComment {
  id: string;
  author: string;
  message: string;
  /** ISO timestamp. */
  createdAt: string;
  /** True for comments added by the current viewer in the demo. */
  createdByUser?: boolean;
}

const CREATED_KEY = 'localy_events_created';
const INTERESTED_KEY = 'localy_events_interested';
const COMMENTS_KEY = 'localy_event_comments';

/** Build an ISO timestamp `days` from now at the given hour (deterministic per render day). */
function atDay(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** ISO timestamp on day-of-month `dom` of the CURRENT month at the given time.
 *  Used so seeded events spread across the calendar regardless of today's date. */
function onDom(dom: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(dom);
  return d.toISOString();
}

/** ISO timestamp `h` hours before now — for believable comment timestamps. */
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
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
    startsAt: onDom(6, 12, 0),
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
    startsAt: onDom(11, 10, 0),
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
    startsAt: onDom(16, 19, 0),
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
    startsAt: onDom(22, 13, 0),
    description:
      'Drop in for free blood-pressure checks and a chat with our pharmacists about seasonal health. No appointment needed.',
    imageUrl: '/stores/razi-pharmacy/banner.jpg',
    interestedCount: 15,
    distanceKm: 2.9,
  },
  {
    id: 'evt-seed-11',
    businessId: 'holy-smoke-barbecue',
    businessName: 'Holy Smoke Barbecue',
    businessSlug: 'holy-smoke-barbecue',
    title: 'Low & Slow Brisket Masterclass',
    type: 'Workshop',
    startsAt: onDom(9, 15, 0),
    description:
      'Our pitmaster walks you through trimming, rubbing and the all-day smoke. Tasting board and a bottle of our house rub to take home.',
    imageUrl: '/stores/holy-smoke-barbecue/banner.jpg',
    promoDetails: '$60 per seat · tasting board included',
    interestedCount: 29,
    distanceKm: 1.2,
  },
  {
    id: 'evt-seed-12',
    businessId: 'amys-fish-and-chips',
    businessName: "Amy's Fish & Chips",
    businessSlug: 'amys-fish-and-chips',
    title: 'Sunday Acoustic Sessions',
    type: 'Live Music',
    startsAt: onDom(27, 16, 0),
    description:
      'Wind down the weekend with rotating local singer-songwriters on the harbour deck. Family friendly, free entry, kids welcome.',
    imageUrl: '/stores/amys-fish-and-chips/banner.jpg',
    interestedCount: 47,
    distanceKm: 2.4,
  },
];

/**
 * MOCK event comments — wire to Supabase later.
 *
 * A few believable comments per seeded event (varied names, short realistic
 * messages, relative timestamps). User-added comments are layered on top from
 * localStorage (see getCommentsForEvent / addCommentToEvent).
 */
export const MOCK_EVENT_COMMENTS: Record<string, EventComment[]> = {
  'evt-seed-1': [
    { id: 'c1-1', author: 'Marcus T.', message: "Those brisket sliders are unreal. See you at 5!", createdAt: hoursAgo(20) },
    { id: 'c1-2', author: 'Priya K.', message: 'Do you take walk-ins or should we book a table?', createdAt: hoursAgo(6) },
    { id: 'c1-3', author: 'Dan R.', message: 'Went last week, the craft soda is a great shout.', createdAt: hoursAgo(2) },
  ],
  'evt-seed-2': [
    { id: 'c2-1', author: 'Sofia L.', message: 'The Harbourmen are so good live, highly recommend.', createdAt: hoursAgo(30) },
    { id: 'c2-2', author: 'Aiden M.', message: 'Is there space for a group of six?', createdAt: hoursAgo(9) },
    { id: 'c2-3', author: 'Grace W.', message: "Can't wait for this!", createdAt: hoursAgo(3) },
  ],
  'evt-seed-3': [
    { id: 'c3-1', author: 'Helen O.', message: 'Loved the olive oil tasting last season.', createdAt: hoursAgo(40) },
    { id: 'c3-2', author: 'Tomas V.', message: 'Are the juices available to buy on the night?', createdAt: hoursAgo(12) },
  ],
  'evt-seed-4': [
    { id: 'c4-1', author: 'Bella N.', message: 'Booked two seats for me and my mum, so excited.', createdAt: hoursAgo(26) },
    { id: 'c4-2', author: 'Chris D.', message: 'Total beginner here — is that ok?', createdAt: hoursAgo(8) },
    { id: 'c4-3', author: 'Yuki S.', message: 'Did this last summer, you come away with a gorgeous bouquet.', createdAt: hoursAgo(4) },
  ],
  'evt-seed-5': [
    { id: 'c5-1', author: 'Olivia P.', message: 'Are kids allowed to meet the rescues?', createdAt: hoursAgo(22) },
    { id: 'c5-2', author: 'Ravi B.', message: 'Such a good cause, will be there.', createdAt: hoursAgo(5) },
  ],
  'evt-seed-6': [
    { id: 'c6-1', author: 'Linh T.', message: 'Ten years already?! Congratulations team.', createdAt: hoursAgo(33) },
    { id: 'c6-2', author: 'Jordan F.', message: 'Is the tasting menu veggie friendly?', createdAt: hoursAgo(11) },
    { id: 'c6-3', author: 'Mei H.', message: 'Best pho in the area, no contest.', createdAt: hoursAgo(2) },
  ],
  'evt-seed-7': [
    { id: 'c7-1', author: 'Emma C.', message: 'The new layout looks stunning from the window!', createdAt: hoursAgo(18) },
    { id: 'c7-2', author: 'Noah K.', message: 'What time does the ribbon-cutting start exactly?', createdAt: hoursAgo(7) },
  ],
  'evt-seed-8': [
    { id: 'c8-1', author: 'Sam G.', message: 'Our table is already booked, bringing the A-team.', createdAt: hoursAgo(28) },
    { id: 'c8-2', author: 'Isla R.', message: 'How hard are the questions?? Asking for a friend.', createdAt: hoursAgo(6) },
  ],
  'evt-seed-9': [
    { id: 'c9-1', author: 'Paul E.', message: 'These flash deals are no joke, set an alarm.', createdAt: hoursAgo(15) },
    { id: 'c9-2', author: 'Nadia A.', message: 'What time do the first markdowns drop?', createdAt: hoursAgo(4) },
  ],
  'evt-seed-10': [
    { id: 'c10-1', author: 'George M.', message: 'Did the BP check last time, lovely staff.', createdAt: hoursAgo(24) },
    { id: 'c10-2', author: 'Farah J.', message: 'Do I need to bring anything?', createdAt: hoursAgo(10) },
  ],
  'evt-seed-11': [
    { id: 'c11-1', author: 'Leo W.', message: 'Been waiting for a class like this, count me in.', createdAt: hoursAgo(21) },
    { id: 'c11-2', author: 'Hana Q.', message: 'Is the house rub gluten free?', createdAt: hoursAgo(5) },
  ],
  'evt-seed-12': [
    { id: 'c12-1', author: 'Ruby S.', message: 'The harbour deck at sunset is perfect for this.', createdAt: hoursAgo(27) },
    { id: 'c12-2', author: 'Theo L.', message: 'Are the acts confirmed yet?', createdAt: hoursAgo(8) },
    { id: 'c12-3', author: 'Amara D.', message: 'Went last year, it was amazing.', createdAt: hoursAgo(3) },
  ],
};

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

/* ── Comments (mock + user-added, persisted client-side) ── */

/** All comments for an event: seeded + user-added, oldest first. */
export function getCommentsForEvent(eventId: string): EventComment[] {
  const seeded = MOCK_EVENT_COMMENTS[eventId] ?? [];
  const stored = readJSON<Record<string, EventComment[]>>(COMMENTS_KEY, {});
  const added = stored[eventId] ?? [];
  return [...seeded, ...added].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Add a viewer comment to an event (optimistic + localStorage); returns it. */
export function addCommentToEvent(eventId: string, author: string, message: string): EventComment {
  const comment: EventComment = {
    id: `c-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: author.trim() || 'You',
    message: message.trim(),
    createdAt: new Date().toISOString(),
    createdByUser: true,
  };
  const stored = readJSON<Record<string, EventComment[]>>(COMMENTS_KEY, {});
  stored[eventId] = [...(stored[eventId] ?? []), comment];
  writeJSON(COMMENTS_KEY, stored);
  return comment;
}
