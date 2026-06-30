/**
 * AI business summaries — regenerate/cache later.
 *
 * Each entry is a 1–2 sentence summary distilled from a business's menu/product
 * names, plus a few intent `tags` that help the keyword fallback infer meaning
 * (e.g. "spicy", "burger"). These were generated from the product data and are
 * CACHED here so the store page and search are instant and don't re-call Gemini
 * on every render. To regenerate, POST a business name + item names to
 * `app/api/business-summary/route.ts` and paste the result back here.
 *
 * Keyed by the business display name (the same key used in data/store-menus.json).
 */

export interface BusinessSummary {
  summary: string;
  tags: string[];
}

export const BUSINESS_SUMMARIES: Record<string, BusinessSummary> = {
  "Amy's Fish & Chips": {
    summary:
      'Classic fish and chips shop serving battered haddock, cod, halibut, and shrimp with fresh-cut chips.',
    tags: ['seafood', 'fish', 'fried', 'chips', 'comfort food'],
  },
  'Holy Smoke Barbecue': {
    summary:
      'Smokehouse barbecue joint known for brisket, pulled pork, ribs, and hearty combo platters with classic sides.',
    tags: ['bbq', 'smoked', 'meat', 'ribs', 'brisket', 'savory', 'comfort food'],
  },
  'Pho Nga Son': {
    summary:
      'Vietnamese kitchen famous for pho beef noodle soup, spicy bun bo hue, vermicelli bowls, and banh mi sandwiches.',
    tags: ['vietnamese', 'noodles', 'soup', 'pho', 'spicy', 'broth', 'asian'],
  },
  'Express Mart Kingston Road': {
    summary:
      'Neighbourhood convenience store stocked with sodas, juices, chips, candy, and quick grab-and-go snacks.',
    tags: ['convenience', 'snacks', 'drinks', 'candy', 'soda'],
  },
  'K1 Floral Studio': {
    summary: 'Floral studio crafting fresh bouquets, roses, and gift boxes for every occasion.',
    tags: ['flowers', 'bouquets', 'roses', 'gifts', 'florist'],
  },
  'Flowers Gifts and Balloons': {
    summary:
      'Florist and gift shop offering rose bouquets, gift baskets, and balloons for celebrations.',
    tags: ['flowers', 'roses', 'balloons', 'gifts', 'florist'],
  },
  'Waterford Convenience': {
    summary:
      'Well-stocked convenience store with drinks, snacks, household basics, medicine, and trading cards.',
    tags: ['convenience', 'snacks', 'drinks', 'household', 'candy'],
  },
  'Razi Pharmacy': {
    summary:
      'Local pharmacy carrying vitamins, supplements, oral and lip care, and everyday wellness essentials.',
    tags: ['pharmacy', 'health', 'vitamins', 'wellness', 'medicine'],
  },
  'Ambrosia Thornhills': {
    summary:
      'Health-focused grocer specializing in organic herbs, nuts, pantry staples, and snacks, including some spicy dips.',
    tags: ['grocery', 'organic', 'healthy', 'snacks', 'spicy', 'nuts'],
  },
  'Ashario Pets North York': {
    summary: 'Pet store offering premium dog food, treats, toys, beds, and health supplies.',
    tags: ['pets', 'dog', 'pet food', 'treats', 'supplies'],
  },
  "Jay's Burger": {
    summary:
      'Casual burger spot known for classic smash-style burgers, loaded fries, poutine, and milkshakes.',
    tags: ['burger', 'burgers', 'fries', 'poutine', 'comfort food', 'fast food'],
  },
  'Comfort Air HVAC': {
    summary: 'Heating and cooling specialists providing HVAC service calls, repairs, and tune-ups.',
    tags: ['hvac', 'heating', 'cooling', 'home services', 'repair'],
  },
  'Reliable Flow Plumbing': {
    summary: 'Plumbing pros handling repairs, installations, and emergency service calls.',
    tags: ['plumbing', 'plumber', 'repair', 'home services'],
  },
  'GreenScape Landscaping': {
    summary: 'Landscaping crew for lawn care, garden upkeep, and yard maintenance.',
    tags: ['landscaping', 'lawn', 'garden', 'yard', 'home services'],
  },
  'Summit Home Renovations': {
    summary: 'Home renovation contractor offering consultations and full interior remodels.',
    tags: ['renovation', 'remodel', 'contractor', 'home services'],
  },
  'Sharp Fade Barbershop': {
    summary: "Barbershop specializing in men's haircuts, fades, and beard trims.",
    tags: ['barber', 'haircut', 'fade', 'beard', 'grooming'],
  },
  'Polished Nail Studio': {
    summary: 'Nail studio offering manicures, pedicures, and nail care.',
    tags: ['nails', 'manicure', 'pedicure', 'beauty'],
  },
  'Serenity Massage Therapy': {
    summary: 'Massage therapy studio for relaxation and therapeutic bodywork.',
    tags: ['massage', 'wellness', 'relaxation', 'spa', 'therapy'],
  },
  'Peak Personal Training': {
    summary: 'Personal training studio with one-on-one fitness coaching and tailored programs.',
    tags: ['fitness', 'training', 'gym', 'workout', 'trainer'],
  },
  'Sparkle Home Cleaning': {
    summary: 'Home cleaning service for standard upkeep and deep cleans.',
    tags: ['cleaning', 'cleaner', 'home services'],
  },
  'ClearWash Pressure Washing': {
    summary: 'Pressure washing service for driveways, exteriors, and outdoor surfaces.',
    tags: ['pressure washing', 'cleaning', 'exterior', 'driveway', 'home services'],
  },
  'FreshCoat Painting': {
    summary: 'Painting service for interior rooms and exterior projects.',
    tags: ['painting', 'painter', 'interior', 'home services'],
  },
};

/** Cached summary text for a business name, or undefined if not precomputed. */
export function getBusinessSummary(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return BUSINESS_SUMMARIES[name]?.summary;
}

/** Cached intent tags for a business name (empty array if none). */
export function getBusinessTags(name: string | null | undefined): string[] {
  if (!name) return [];
  return BUSINESS_SUMMARIES[name]?.tags ?? [];
}
