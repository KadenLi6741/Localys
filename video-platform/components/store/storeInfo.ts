/**
 * storeInfo.ts
 *
 * // MOCK store info: founder story, things to look out for, common questions —
 * // wire to real business data later.
 *
 * Believable, business-specific demo content keyed by the store SLUG (StoreMenu.slug),
 * so it stays consistent across refreshes. Unknown / local business ids fall back to a
 * generic-but-sensible entry via getStoreInfo(), so demo stores never crash on a miss.
 */

export interface StoreInfo {
  /** Short founder / origin paragraph. */
  founderStory: string;
  /** Scannable cautions + allergen warnings shown as tags above the menu. */
  lookOut: string[];
  /** Common questions about the business, each with an answer. */
  faqs: { q: string; a: string }[];
}

const STORE_INFO: Record<string, StoreInfo> = {
  'amys-fish-and-chips': {
    founderStory:
      "Amy grew up in a seaside town where her dad ran a tiny chippy off the harbour. After moving to Toronto she missed that fresh-off-the-boat batter, so in 2016 she opened Amy's to fry the same way he taught her — beer-battered to order, never sitting under a heat lamp.",
    lookOut: [
      'Contains gluten (batter)',
      'Cooked in shared fryer with shellfish',
      'Fish is wild-caught, bones possible',
      'Cash and card accepted',
      'Busy Friday evenings — expect a short wait',
    ],
    faqs: [
      { q: 'Is the fish fresh or frozen?', a: 'Delivered fresh daily and battered to order — never pre-cooked.' },
      { q: 'Do you have gluten-free batter?', a: 'Yes, a rice-flour batter is available on request for a small upcharge.' },
      { q: 'Do you deliver?', a: 'Yes, within 5 km. Orders over $30 ship with free delivery.' },
      { q: 'Are the chips cooked separately?', a: 'Chips share a fryer with the fish, so they are not suitable for shellfish allergies.' },
    ],
  },
  'holy-smoke-barbecue': {
    founderStory:
      "Holy Smoke started as Marcus's backyard offset smoker and a stubborn belief that good brisket can't be rushed. Word spread from block parties to a permanent pit in 2018, where he still trims every brisket by hand and smokes it low over Ontario oak for 14 hours.",
    lookOut: [
      'Brisket and ribs sell out — come early',
      'Rubs contain gluten and mustard',
      'Some sauces contain soy',
      'Smoked daily — meats run out by evening',
      'Limited parking on weekends',
    ],
    faqs: [
      { q: 'What time do you sell out?', a: 'Popular cuts often sell out by 7 p.m. on weekends — ordering ahead is recommended.' },
      { q: 'Can I pre-order whole briskets?', a: 'Yes, with 48 hours notice for whole briskets and racks.' },
      { q: 'Do you have vegetarian options?', a: 'Yes — smoked mac, beans, slaw and cornbread, though they are cooked near meat.' },
      { q: 'Is the meat spicy?', a: 'The house rub is mild; hot sauce is on the side so you control the heat.' },
    ],
  },
  'pho-nga-son': {
    founderStory:
      "The Tran family carried their broth recipe from Nha Trang to Toronto, simmering beef bones, charred ginger and star anise for 12 hours just as grandmother did. Pho Nga Son opened in 2009 and three generations still work the line today.",
    lookOut: [
      'Broth is not vegetarian (beef bone base)',
      'Contains fish sauce and soy',
      'Peanuts served as garnish',
      'Spicy by default — ask for mild',
      'Cash preferred for orders under $10',
    ],
    faqs: [
      { q: 'Is there a vegetarian pho?', a: 'Yes, a separate vegetable broth is made daily — just ask for the veggie bowl.' },
      { q: 'Are you vegetarian-friendly?', a: 'Several plant-based bowls and fresh tofu rolls are available.' },
      { q: 'How spicy is the default?', a: 'Medium heat. Tell us "no spice" and we will hold the chili oil.' },
      { q: 'Do you take reservations?', a: 'Walk-ins only, but the line moves fast even at peak.' },
    ],
  },
  'express-mart': {
    founderStory:
      "Sam took over the corner store on Kingston Road in 2014 and turned a tired convenience shop into the neighbourhood's late-night lifeline — fresh milk, local eggs, and the only place open past midnight for blocks.",
    lookOut: [
      'Some shelf items near best-before — check dates',
      'Lottery and tobacco require valid ID',
      'Card minimum $5',
      'Hot snacks share equipment with nuts',
    ],
    faqs: [
      { q: 'How late are you open?', a: 'Open until 1 a.m. daily, including holidays.' },
      { q: 'Do you deliver?', a: 'Yes, quick local delivery within roughly 5 km.' },
      { q: 'Do you sell lottery tickets?', a: 'Yes, plus transit tokens and prepaid cards.' },
      { q: 'Is there an ATM?', a: 'Yes, a surcharge-free ATM is by the front entrance.' },
    ],
  },
  'k1-floral-studio': {
    founderStory:
      "Kira trained as a florist in Amsterdam before coming home to open K1 in 2019. She builds every arrangement around what's freshest at the morning market, so no two bouquets are ever quite the same.",
    lookOut: [
      'Flowers may aggravate pollen allergies',
      'Some stems (lilies) are toxic to pets',
      'Seasonal stems may be substituted',
      'Same-day orders need a 2 p.m. cutoff',
    ],
    faqs: [
      { q: 'Can you do same-day delivery?', a: 'Yes, for orders placed before 2 p.m. within 5 km.' },
      { q: 'Do you take custom requests?', a: 'Absolutely — share a colour palette or photo and we will build to it.' },
      { q: 'Are arrangements pet-safe?', a: 'Ask for our pet-safe list; we avoid lilies and other toxic stems on request.' },
      { q: 'Do you do weddings and events?', a: 'Yes, book a consultation at least three weeks ahead.' },
    ],
  },
  'flowers-gifts-and-balloons': {
    founderStory:
      "A husband-and-wife team, Rosa and Dan started with a single balloon cart at neighbourhood birthdays. Demand for their cheerful, last-minute arrangements grew into a full gift shop in 2017.",
    lookOut: [
      'Latex balloons — latex allergy caution',
      'Helium balloons last ~12 hours',
      'Some gift baskets contain nuts',
      'Fresh flowers may trigger pollen allergies',
    ],
    faqs: [
      { q: 'Do you deliver balloons inflated?', a: 'Yes, helium balloons are delivered ready within 5 km.' },
      { q: 'Can I build a custom gift basket?', a: 'Yes — pick the items in store or call ahead and we will assemble it.' },
      { q: 'How long do helium balloons last?', a: 'Foil balloons last days; latex roughly 12 hours.' },
      { q: 'Do you do same-day?', a: 'Same-day is available for orders before 3 p.m.' },
    ],
  },
  'waterford-convenience': {
    founderStory:
      "Run by the Patel family since 2008, Waterford Convenience is the kind of shop where the owner knows your usual order. They stock hard-to-find imported snacks alongside the everyday essentials.",
    lookOut: [
      'Card minimum $5',
      'ID required for tobacco and lottery',
      'Imported snacks may contain nuts',
      'Check best-before on clearance items',
    ],
    faqs: [
      { q: 'What are your hours?', a: 'Open 7 a.m. to midnight, seven days a week.' },
      { q: 'Do you carry imported goods?', a: 'Yes, a rotating selection of UK and South Asian snacks.' },
      { q: 'Do you deliver?', a: 'Yes, small local deliveries within about 5 km.' },
      { q: 'Is there parking?', a: 'Two spots out front plus free street parking.' },
    ],
  },
  'razi-pharmacy': {
    founderStory:
      "Pharmacist Dr. Razi opened the pharmacy in 2012 to give the community unhurried, one-on-one advice. He still does free medication reviews and remembers most patients by name.",
    lookOut: [
      'Bring valid ID for prescription pickup',
      'Some products contain gluten or lactose fillers',
      'Allergy meds may cause drowsiness',
      'Consult the pharmacist before combining medications',
    ],
    faqs: [
      { q: 'Do you offer free prescription delivery?', a: 'Yes, free delivery within 5 km for prescriptions.' },
      { q: 'Can I transfer my prescription?', a: 'Yes, we handle the transfer — just bring your bottle or details.' },
      { q: 'Do you give flu shots?', a: 'Yes, walk-in vaccinations are available daily.' },
      { q: 'Do you do medication reviews?', a: 'Yes, free one-on-one reviews by appointment.' },
    ],
  },
  'ambrosia-thornhills': {
    founderStory:
      "Ambrosia began as Lena's love letter to the Mediterranean tables she grew up around. Since 2015 she has sourced olive oil and spices direct from small family farms, building a grocer that smells like a market in Athens.",
    lookOut: [
      'Bulk bins may contain traces of nuts',
      'Many cheeses are unpasteurized',
      'Olives cured with pits',
      'Contains sesame and dairy products',
    ],
    faqs: [
      { q: 'Do you carry halal products?', a: 'Yes, a clearly labelled halal section is in the back aisle.' },
      { q: 'Can you vacuum-seal cheese?', a: 'Yes, ask at the deli counter for travel-ready sealing.' },
      { q: 'Do you deliver?', a: 'Yes, within 5 km; orders over $40 are free.' },
      { q: 'Are bulk items nut-free?', a: 'No — bulk bins are shared, so cross-contact with nuts is possible.' },
    ],
  },
  'ashario-pets': {
    founderStory:
      "Lifelong animal lovers, the Ashario siblings opened in 2013 after struggling to find honest advice for their own rescue dogs. They hand-pick every brand they stock and won't sell food they wouldn't feed their own pets.",
    lookOut: [
      'Some treats contain common pet allergens (chicken, grain)',
      'Live feeders kept in-store',
      'Leashed pets welcome — vaccinations required',
      'Special-order items take 3-5 days',
    ],
    faqs: [
      { q: 'Can I bring my pet in?', a: 'Yes, leashed and vaccinated pets are always welcome.' },
      { q: 'Do you price-match?', a: 'Yes, on identical in-stock items from local competitors.' },
      { q: 'Do you deliver heavy bags?', a: 'Yes, free delivery on food and litter within 5 km.' },
      { q: 'Do you carry grain-free food?', a: 'Yes, a full grain-free and limited-ingredient range.' },
    ],
  },
  'jays-burger': {
    founderStory:
      "Jay flipped his first burger at his uncle's diner at fifteen. After years of perfecting a smash-patty technique on a flat-top in his garage, he opened Jay's in 2017 — fresh-ground chuck, potato buns, no freezers in sight.",
    lookOut: [
      'Contains gluten (buns) and dairy (cheese, sauce)',
      'Cooked on shared grill with egg',
      'Sauces contain mustard and soy',
      'Patties cooked medium-well by default',
      'Peak wait times Friday and Saturday nights',
    ],
    faqs: [
      { q: 'Can I get a lettuce wrap instead of a bun?', a: 'Yes, any burger can be wrapped in lettuce for a gluten-free option.' },
      { q: 'Do you have vegetarian options?', a: 'Yes, a house black-bean patty and a fried-mushroom burger.' },
      { q: 'Do you deliver?', a: 'Yes, within 5 km — fries travel best ordered "extra crispy".' },
      { q: 'Can I customize doneness?', a: 'Smash patties are cooked through; quarter-pounders can be done medium on request.' },
    ],
  },
  'comfort-air-hvac': {
    founderStory:
      "After 20 years servicing furnaces for a big chain, Dave struck out on his own in 2016 to do it right — honest quotes, no upselling, and same-day heat when a family is freezing in January.",
    lookOut: [
      'Emergency call-outs prioritized in winter',
      'Quotes free; diagnostic fee applies if no repair',
      'Filters sold separately',
      'Booking lead time longer during cold snaps',
    ],
    faqs: [
      { q: 'Do you offer emergency service?', a: 'Yes, 24/7 emergency heating and cooling call-outs.' },
      { q: 'Is the estimate free?', a: 'Quotes are free; a diagnostic fee applies only if no work proceeds.' },
      { q: 'What areas do you cover?', a: 'Roughly a 5 km service radius for standard bookings.' },
      { q: 'Do you service all brands?', a: 'Yes, all major furnace and AC brands.' },
    ],
  },
  'reliable-flow-plumbing': {
    founderStory:
      "Reliable Flow is a father-son operation. Tony taught his son Marco the trade on weekends, and together they opened shop in 2018 with one rule: leave every home cleaner than you found it.",
    lookOut: [
      'Emergency rates apply after hours',
      'Free estimates for non-emergency jobs',
      'Parts billed separately',
      'Drain camera inspection available',
    ],
    faqs: [
      { q: 'Do you handle emergencies?', a: 'Yes, 24/7 for burst pipes, leaks and backups.' },
      { q: 'Are estimates free?', a: 'Yes, for scheduled non-emergency work.' },
      { q: 'Do you guarantee your work?', a: 'Yes, labour is warrantied for one year.' },
      { q: 'What is your service area?', a: 'About 5 km; ask about jobs slightly outside it.' },
    ],
  },
  'greenscape-landscaping': {
    founderStory:
      "GreenScape grew from Priya's tiny gardening side-gig into a full landscape crew. Since 2015 she has focused on native, low-water plantings that look great and survive Ontario winters.",
    lookOut: [
      'Seasonal service — book early for spring',
      'Quotes depend on site visit',
      'Pollen-heavy work may affect allergies',
      'Weather can shift scheduled dates',
    ],
    faqs: [
      { q: 'Do you offer weekly maintenance?', a: 'Yes, weekly and bi-weekly lawn and garden plans.' },
      { q: 'Can you design a native garden?', a: 'Yes, low-water native designs are our specialty.' },
      { q: 'Do you do snow removal?', a: 'Yes, seasonal contracts are available in winter.' },
      { q: 'Is the consultation free?', a: 'Yes, the first on-site consultation is free.' },
    ],
  },
  'summit-home-renovations': {
    founderStory:
      "Carpenter-turned-contractor Ben founded Summit in 2012 after too many clients told him about renos gone wrong. He runs fixed timelines, clear contracts, and a single point of contact from demo to final coat.",
    lookOut: [
      'Construction dust — seal off rooms',
      'Permits may extend timelines',
      'Deposit required to schedule',
      'Lead times longer in peak season',
    ],
    faqs: [
      { q: 'Do you handle permits?', a: 'Yes, we manage permits and inspections end to end.' },
      { q: 'How long does a kitchen take?', a: 'Typically 4-6 weeks depending on scope and materials.' },
      { q: 'Do you provide a written quote?', a: 'Yes, a detailed fixed quote after the site visit.' },
      { q: 'Are you insured?', a: 'Fully insured and WSIB-covered.' },
    ],
  },
  'sharp-fade-barbershop': {
    founderStory:
      "Andre learned to cut hair in his grandfather's chair and opened Sharp Fade in 2016 to keep that old-school barbershop feel — hot towels, straight-razor lineups, and conversation that's as sharp as the fades.",
    lookOut: [
      'Walk-ins welcome but waits peak weekends',
      'Cash earns a small discount',
      'Skin-sensitivity? Mention before hot-towel shave',
      'Kids cuts available off-peak',
    ],
    faqs: [
      { q: 'Do you take walk-ins?', a: 'Yes, walk-ins welcome; booking ahead skips the weekend wait.' },
      { q: 'Do you do beard trims?', a: 'Yes, including straight-razor lineups and hot-towel shaves.' },
      { q: 'Is there a cancellation fee?', a: 'No fee with two hours notice.' },
      { q: 'Do you cut kids hair?', a: 'Yes, kids cuts are best booked off-peak.' },
    ],
  },
  'polished-nail-studio': {
    founderStory:
      "Mai opened Polished in 2018 after a decade in luxury spas, wanting a calm, spotless studio where hygiene comes first — every tool sterilized in view, every file single-use.",
    lookOut: [
      'Acetone and acrylic fumes — ventilated rooms',
      'Patch test advised for gel allergies',
      'Single-use files; tools sterilized',
      'Late arrivals may be rescheduled',
    ],
    faqs: [
      { q: 'Do you take walk-ins?', a: 'Walk-ins when available; appointments are recommended.' },
      { q: 'How do you handle sanitation?', a: 'Single-use files and hospital-grade tool sterilization between clients.' },
      { q: 'Do you do nail art?', a: 'Yes, from simple French to detailed custom designs.' },
      { q: 'Can I bring my own polish?', a: 'Yes, you are welcome to bring your own colour.' },
    ],
  },
  'serenity-massage-therapy': {
    founderStory:
      "Registered therapist Nadia founded Serenity in 2014 to bridge clinical and relaxation massage — real treatment for real pain in a space that still feels like an escape.",
    lookOut: [
      'Some oils contain nut derivatives — flag allergies',
      'Arrive 10 min early to fill intake',
      'Receipts provided for insurance',
      'Cancellation fee within 24 hours',
    ],
    faqs: [
      { q: 'Are treatments covered by insurance?', a: 'Yes, RMT receipts are provided for extended health plans.' },
      { q: 'Can I request unscented oil?', a: 'Yes, fragrance-free and nut-free oils are available.' },
      { q: 'Do you offer deep tissue?', a: 'Yes, plus Swedish, prenatal and sports massage.' },
      { q: 'How early should I arrive?', a: 'Ten minutes early for a first-visit intake form.' },
    ],
  },
  'peak-personal-training': {
    founderStory:
      "Former college athlete Chris started Peak in 2017 after rehabbing his own knee injury, building a gym that trains everyday people with the same care given to athletes.",
    lookOut: [
      'Health screening required before first session',
      'Book sessions 24h ahead',
      'Bring water and indoor shoes',
      'Peak hours fill fast — reserve early',
    ],
    faqs: [
      { q: 'Do you offer a free first session?', a: 'Yes, a complimentary intro and assessment session.' },
      { q: 'Do you do online coaching?', a: 'Yes, remote programming and video check-ins are available.' },
      { q: 'Can you work around an injury?', a: 'Yes, programs are tailored after a movement screen.' },
      { q: 'Are there group classes?', a: 'Yes, small-group sessions cap at six people.' },
    ],
  },
  'sparkle-home-cleaning': {
    founderStory:
      "Sparkle began with Elena and a bucket of eco-friendly supplies, cleaning a few neighbours' homes. Trusted referrals grew it into a vetted, insured team by 2019 — same cleaners, every visit.",
    lookOut: [
      'Eco products used; flag scent sensitivities',
      'Secure pets before the team arrives',
      'Supplies included; specialty products extra',
      'Same-day booking subject to availability',
    ],
    faqs: [
      { q: 'Do you bring your own supplies?', a: 'Yes, eco-friendly supplies and equipment are included.' },
      { q: 'Are your cleaners insured?', a: 'Yes, fully insured and background-checked.' },
      { q: 'Will I get the same cleaner?', a: 'We assign a consistent team to each home where possible.' },
      { q: 'Do you do move-out cleans?', a: 'Yes, deep and move-out cleans are available.' },
    ],
  },
  'clearwash-pressure-washing': {
    founderStory:
      "Jordan bought a single pressure washer to clean his own driveway, posted the before-and-after, and the requests never stopped. ClearWash became a full crew in 2020, still chasing that satisfying clean.",
    lookOut: [
      'Move vehicles and patio items beforehand',
      'Delicate surfaces get soft-wash only',
      'Weather may reschedule jobs',
      'Water access required on site',
    ],
    faqs: [
      { q: 'Is the estimate free?', a: 'Yes, free quotes from a photo or quick site visit.' },
      { q: 'Will it damage my siding?', a: 'No — we soft-wash delicate surfaces at safe pressure.' },
      { q: 'Do you do driveways and decks?', a: 'Yes, driveways, decks, siding, and patios.' },
      { q: 'What is your service area?', a: 'Roughly a 5 km radius for standard bookings.' },
    ],
  },
  'freshcoat-painting': {
    founderStory:
      "FreshCoat is the work of Sofia, a muralist who turned a steady hand and an eye for colour into a painting crew known for crisp lines and tidy sites. Founded in 2018, they treat every wall like a canvas.",
    lookOut: [
      'Paint fumes — ventilation needed',
      'Low-VOC paint available on request',
      'Move or cover furniture before start',
      'Drying times depend on humidity',
    ],
    faqs: [
      { q: 'Do you offer colour consultation?', a: 'Yes, a colour consult is included with every quote.' },
      { q: 'Do you use low-VOC paint?', a: 'Yes, low- and zero-VOC options are available.' },
      { q: 'Do you do exterior work?', a: 'Yes, interior and exterior, weather permitting.' },
      { q: 'Is your work guaranteed?', a: 'Yes, a two-year workmanship warranty.' },
    ],
  },
};

/** Generic, sensible fallback so unknown / local business ids never crash. */
const DEFAULT_STORE_INFO: StoreInfo = {
  founderStory:
    'This local business was founded by neighbours who wanted to bring something genuinely good to the community. Every order supports an independent owner right here in your area.',
  lookOut: [
    'Ask about allergens before ordering',
    'Hours may vary on holidays',
    'Cash and card accepted',
    'Busier during weekends and evenings',
  ],
  faqs: [
    { q: 'Do you deliver?', a: 'Yes, within roughly 5 km of the store.' },
    { q: 'Do you take special requests?', a: 'Yes — add a note at checkout and we will do our best.' },
    { q: 'What are your hours?', a: 'See the hours listed on this page; they can vary on holidays.' },
  ],
};

/**
 * Food / restaurant businesses — the ONLY stores that should show allergen
 * warnings in "Things to Look Out For". Every other business (convenience stores,
 * pharmacies, florist / gift / balloon shops, grocers like Ambrosia/Thornhill,
 * pet shops, and all service trades) has its allergen tags hidden. Matched by
 * slug (the business id); keep this in sync when adding new food businesses.
 */
const FOOD_SLUGS = new Set<string>([
  'amys-fish-and-chips',
  'holy-smoke-barbecue',
  'pho-nga-son',
  'jays-burger',
]);

/** Keywords that mark a "look out for" tag as an allergy/allergen warning. */
const ALLERGEN_RE = /allerg|\bnuts?\b|peanut|gluten|dairy|lactose|sesame|\bsoy\b|shellfish|latex|pollen/i;

/** True when a "look out for" tag is an allergy/allergen warning (vs a general caution). */
function isAllergenWarning(text: string): boolean {
  return ALLERGEN_RE.test(text);
}

/** True only for food/restaurant businesses, which keep their allergen warnings. */
export function showsAllergens(slug?: string): boolean {
  return !!slug && FOOD_SLUGS.has(slug);
}

/**
 * Look up demo store info by slug, falling back to a safe generic entry.
 * For NON-food businesses, allergen/allergy tags are stripped from `lookOut`
 * (general cautions like "Cash only" / "ID required" are kept) so allergy
 * warnings only ever appear on food businesses.
 */
export function getStoreInfo(slug?: string): StoreInfo {
  const base = (slug && STORE_INFO[slug]) ? STORE_INFO[slug] : DEFAULT_STORE_INFO;
  if (showsAllergens(slug)) return base;
  return { ...base, lookOut: base.lookOut.filter((tag) => !isAllergenWarning(tag)) };
}
