/**
 * Build a folder-driven store-menu manifest for the Uber-Eats-style store page.
 *
 * Asset files on disk are normalized to lowercase-hyphen-ASCII (deploy-safe). The
 * ORIGINAL filename for each asset is read from data/menu-name-map.json, and the
 * item name is derived from that original (so display names are unchanged).
 *
 * Scans public/menu/<folder>, filters out Uber Eats
 * UI junk, and DETERMINISTICALLY makes up the data the folders don't contain
 * (prices, descriptions, categories, "like %", reviews, rating, address) so each
 * store page can render the full layout. Output: data/store-menus.json keyed by the
 * seeded business_name (what app/profile/[userId] reads from Supabase).
 *
 *   node scripts/build-store-menus.mjs
 *
 * Re-running is stable: all generated values are hashed off the item name.
 */
import sharp from 'sharp';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const MENU_DIR = join(ROOT, 'public', 'menu');
const HQ_MIN = 320; // images whose smaller side is below this read as blurry on the home cards

// Maps each NEW (deploy-safe) public path -> the ORIGINAL filename, so item names
// and junk detection match what the un-normalized filenames produced.
const NAME_MAP = existsSync(join(ROOT, 'data', 'menu-name-map.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'data', 'menu-name-map.json'), 'utf8'))
  : {};
/** Original filename for a slugged asset (fallback: the slug filename itself). */
const origName = (folder, file) => NAME_MAP[encPath(folder, file)] || file;

/* ----------------------------- helpers ----------------------------- */
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };
const pick = (arr, seed) => arr[seed % arr.length];

// junk filenames that are Uber Eats chrome / icons, not menu items
const JUNK = [
  'donutuberone', 'download on the app store', 'get it on google play', 'uber eats home',
  'star_promotion', 'dealsbackground', 'deals-happy', 'transparenttrailingimage', 'zonnic_gray',
  'shopping_bags',
  // competitor / other-store logo tiles that Uber Eats injects into a store page
  'burger king', 'dairy queen', 'popeyes', 'tondo',
];
// `name` is the ORIGINAL filename (pre-normalization) so the keyword/hex/uuid
// rules match exactly as they did before assets were renamed.
const isJunk = (file, name, bannerFile) => {
  if (file === bannerFile) return true;
  const lower = (name || file).toLowerCase();
  if (JUNK.some((j) => lower.includes(j))) return true;
  const base = (name || file).replace(/\.[^.]+$/, '');
  // 32-hex (md5-ish) or uuid filenames -> not items
  if (/^[0-9a-f]{32}(-\d+)?$/i.test(base)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base)) return true;
  return false;
};

const encPath = (folder, file) => `/menu/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;

// price within [min,max], snapped to a cents style, deterministic per name
const priceFor = (name, [min, max], style) => {
  const raw = min + (hash('p' + name) % Math.round((max - min) * 100)) / 100;
  if (style === 'half') return Math.max(min, Math.round(raw * 2) / 2); // x.00 / x.50
  const dollars = Math.floor(raw);
  return dollars + (hash('c' + name) % 2 === 0 ? 0.99 : 0.49); // x.49 / x.99
};

const REVIEW_POOL = [
  'Great quality and fast delivery, will order again!',
  'Exactly as described, fresh and well packaged.',
  'Really happy with my order. Highly recommend.',
  'Good portion and fair prices. Solid choice.',
  'Friendly service and everything arrived on time.',
  'My go-to spot — never disappoints.',
];
const REVIEWERS = ['Nataly O.', 'Winnie C.', 'Tanya Z.', 'Marcus L.', 'Priya S.', 'Daniel K.', 'Grace W.', 'Omar H.'];
const genReviews = (slug) =>
  [0, 1, 2].map((i) => {
    const h = hash(slug + i);
    const d = new Date(2024, h % 12, (h % 27) + 1);
    return {
      name: REVIEWERS[(h + i) % REVIEWERS.length],
      stars: 5,
      date: `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(2)}`,
      text: pick(REVIEW_POOL, h + i),
    };
  });

const STREETS = ['Yonge St', 'Kingston Rd', 'Bayview Ave', 'Bathurst St', 'Steeles Ave', 'Hwy 7', 'Major Mackenzie Dr'];
const CITIES = ['Richmond Hill, ON', 'North York, ON', 'Thornhill, ON', 'Markham, ON', 'Toronto, ON'];
const genAddress = (slug) => {
  const h = hash(slug);
  return `${1000 + (h % 9000)} ${pick(STREETS, h)}, ${pick(CITIES, h >> 3)}`;
};

// Varied, deterministic deals. ~40% of items get one; types are mixed so the app
// shows percentage off, BOGO, $ off, free delivery, bundle, and first-order deals.
const DEAL_TYPES = ['percent', 'bogo', 'dollar_off', 'free_delivery', 'bundle', 'first_order'];
const dealFor = (name) => {
  const h = hash('deal' + name);
  if (h % 5 >= 2) return undefined; // ~40% of items carry a deal
  const type = DEAL_TYPES[h % DEAL_TYPES.length];
  switch (type) {
    case 'percent': { const v = [10, 15, 20, 25, 30][h % 5]; return { type, value: v, label: `${v}% off` }; }
    case 'dollar_off': { const v = [3, 5, 8, 10][h % 4]; const t = [20, 25, 30][h % 3]; return { type, value: v, threshold: t, label: `$${v} off $${t}` }; }
    case 'bogo': return { type, label: 'Buy 1 Get 1 Free' };
    case 'free_delivery': { const t = [25, 30, 35][h % 3]; return { type, threshold: t, label: `Free delivery over $${t}` }; }
    case 'bundle': return { type, label: 'Combo deal' };
    case 'first_order': { const v = [15, 20][h % 2]; return { type, value: v, label: `${v}% off 1st order` }; }
    default: return undefined;
  }
};

// Read pixel dimensions for a /public URL path; null on failure.
async function imgDims(publicUrlPath) {
  if (!publicUrlPath) return null;
  try {
    const rel = decodeURIComponent(publicUrlPath.replace(/^\//, ''));
    const buf = readFileSync(join(PUBLIC, rel));
    const m = await sharp(buf, { limitInputPixels: false }).metadata();
    return { w: m.width || 0, h: m.height || 0 };
  } catch { return null; }
}
const isHq = (d) => !!d && Math.min(d.w, d.h) >= HQ_MIN;

// Business-level department (drives the themed home rows). Reliable here because
// the live Supabase `businesses.category` isn't always readable by the anon client.
const DEPT = {
  pho: 'Restaurants', bbq: 'Restaurants', restaurant: 'Restaurants',
  flowers: 'Flowers', pets: 'Pets', pharmacy: 'Pharmacy',
  grocery: 'Grocery', convenience: 'Convenience',
};

// Realistic, varied (non-round) review counts, stable per seed.
const reviewCountFor = (seed) => 15 + (hash('rc' + seed) % 470);

/* ----------------------------- per-store config ----------------------------- */
// kind drives price range, description templates, and category rules.
const PRICE = {
  restaurant: [[11, 24], 'half'], bbq: [[9, 32], 'half'], pho: [[9.5, 24], 'half'],
  flowers: [[28, 95], 'half'], pets: [[6, 64], 'retail'], pharmacy: [[3.5, 42], 'retail'],
  grocery: [[2.5, 16], 'retail'], convenience: [[1.5, 13], 'retail'],
};
const DESC = {
  restaurant: ['Freshly cooked and served hot.', 'A house favourite, made to order.', 'Crispy, golden and delicious.'],
  bbq: ['Slow-smoked low and slow over hardwood.', 'Tender, smoky and full of flavour.', 'Pitmaster favourite, served with our house sides.'],
  pho: ['Made fresh daily with a rich, flavorful broth.', 'A traditional favourite, served hot.', 'Authentic and full of flavour.'],
  flowers: ['A handcrafted arrangement for any occasion.', 'Fresh blooms, beautifully arranged.', 'Designed by our florists with care.'],
  pets: ['Quality your pet will love.', 'Trusted brand, great everyday value.', 'Picked for happy, healthy pets.'],
  pharmacy: ['Everyday health essential.', 'Trusted relief, ready when you need it.', 'A pharmacy staple.'],
  grocery: ['Fresh, quality grocery pick.', 'An everyday pantry favourite.', 'Good food, good value.'],
  convenience: ['Grab-and-go favourite.', 'A snack-time classic.', 'Stocked and ready for you.'],
};
const descFor = (name, kind) => pick(DESC[kind] || DESC.restaurant, hash('d' + name));

// keyword rules: ordered [category, [keywords...]]; first match wins. Falls to `default`.
const RULES = {
  pho: { type: 'prefix', default: 'More', map: [
    ['BM', 'Vietnamese Sandwich (Banh Mi)'], ['B', 'Bun (Vermicelli)'], ['A', 'Appetizer'],
    ['S', 'Special Dishes (Mon Dac Biet)'], ['C', 'Broken Steamed Rice (Com Tam)'],
    ['P', 'Beef Noodle Soup (Pho)'], ['H', 'Spicy Beef Noodle Soup (Bun Bo Hue)'], ['F', 'Stir-Fried Dishes'],
  ], order: ['Appetizer', 'Special Dishes (Mon Dac Biet)', 'Broken Steamed Rice (Com Tam)', 'Beef Noodle Soup (Pho)', 'Spicy Beef Noodle Soup (Bun Bo Hue)', 'Bun (Vermicelli)', 'Vietnamese Sandwich (Banh Mi)', 'Stir-Fried Dishes', 'More'] },
  restaurant: { type: 'kw', default: 'Mains', rules: [['Fish & Chips', ['haddock', 'halibut', 'cod', 'fish', 'chips']], ['Seafood', ['shrimp', 'scallop', 'calamari']], ['Sides', ['salad', 'fries', 'side']]] },
  bbq: { type: 'kw', default: 'Mains', rules: [['Combos & Platters', ['combo', 'platter', 'trio']], ['Sandwiches', ['sandwich']], ['Smoked Meats', ['ribs', 'brisket', 'pulled pork', 'wings', 'turkey', 'sausage']], ['Sides', ['salad', 'coleslaw', 'corn', 'beans', 'pickle', 'macaroni', 'bread']], ['Desserts', ['pie', 'cake']]] },
  flowers: { type: 'kw', default: 'Bouquets & Flowers', rules: [['Roses', ['rose']], ['Gift Boxes', ['box']], ['Balloons', ['balloon']], ['Gift Baskets', ['basket', 'fruit', 'snack', 'ferrero', 'bear', 'chocolate']]] },
  pets: { type: 'kw', default: 'Pet Supplies', rules: [['Dog Food', ['dry dog food', 'raw dog food', 'dinner', 'food']], ['Dog Treats', ['treat', 'bone', 'stick', 'bite', 'jerky', 'chew']], ['Toys & Play', ['toy', 'feeder', 'ring', 'ball']], ['Health & Wellness', ['probio', 'oil', 'flea', 'tick', 'test', 'aging', 'health', 'supplement']], ['Carriers & Beds', ['bed', 'carrier', 'harness', 'vest']]] },
  pharmacy: { type: 'kw', default: 'Health & Wellness', rules: [['Vitamins & Supplements', ['vit', 'feramax', 'palafer', 'emergen', 'caffeine', 'wakeups', 'capsule', 'tablet', 'iron', 'polyride']], ['Oral Care', ['toothbrush', 'floss', 'colgate', 'orajel', 'sensodyne', 'gum ', 'anbesol', 'prevident', 't_p']], ['Lip Care', ['lip', 'blistex', 'nivea']], ['Sexual Wellness', ['condom', 'ondom', 'durex', 'trojan', 'astroglide', 'vibrat', 'ring', 'plan b', 'contingency', 'levonorgestrel', 'vagisil', 'massage', 'pleasure']], ['Candy & Snacks', ['chocolate', 'kitkat', 'kit kat', 'kinder', 'toblerone', 'loacker', 'gummies', 'lifesavers', 'gum']]] },
  grocery: { type: 'kw', default: 'Pantry', rules: [['Drinks', ['ml', 'soda', 'juice', 'ale', 'sparkling']], ['Snacks & Nuts', ['seed', 'cashew', 'jerky', 'stick', 'crisp', 'nut', 'dip']], ['Organic & Herbs', ['organic', 'chamomile', 'dandelion', 'broccoli', 'micro']]] },
  convenience: { type: 'kw', default: 'Snacks', rules: [['Water', ['water', 'aquafina', 'dasani', 'evian', 'fiji']], ['Soda & Juice', ['soda', 'juice', 'cocktail', 'cranberry', 'cola', 'sprite', '7up', 'a & w', 'ml)']], ['Chocolate & Candy', ['m & m', 'm&m', 'maltesers', 'brookside', 'milka', 'kitkat', 'reese', 'raffaello', 'toblerone', 'haribo', 'airheads', 'hi-chew', 'candy', 'sour', 'trolli', 'mike and ike', 'milk duds']], ['Chips & Snacks', ['bugles', 'chip', 'popcorn', 'pickle']], ['Health & Medicine', ['nyquil', 'dayquil', 'advil', 'tylenol', 'claritin', 'benadryl', 'allergy', 'nasal', 'dristan', 'otrivin', 'alcohol', 'mask']], ['Household', ['cascade', 'dawn', 'palmolive', 'detergent', 'dish']], ['Trading Cards', ['hockey', 'nba', 'hoops', 'card']]] },
};

const categorize = (rawName, kind) => {
  const cfg = RULES[kind];
  if (!cfg) return 'Menu';
  if (cfg.type === 'prefix') {
    const m = rawName.match(/^([A-Za-z]{1,3})\s*\d/); // e.g. "BM1", "P0", "A2"
    if (m) { const code = m[1].toUpperCase(); for (const [pre, cat] of cfg.map) if (code.startsWith(pre)) return cat; }
    return cfg.default;
  }
  const l = rawName.toLowerCase();
  for (const [cat, kws] of cfg.rules) if (kws.some((k) => l.includes(k))) return cat;
  return cfg.default;
};

/* ----------------------------- stores ----------------------------- */
const STORES = [
  { folder: 'amys-fish-and-chips', name: "Amy's Fish & Chips", slug: 'amys-fish-and-chips', kind: 'restaurant' },
  { folder: 'holy-smoke-barbecue', name: 'Holy Smoke Barbecue', slug: 'holy-smoke-barbecue', kind: 'bbq' },
  {
    folder: 'pho-nga-son', name: 'Pho Nga Son', slug: 'pho-nga-son', kind: 'pho',
    overrides: {
      rating: 4.8, ratingCount: '500+', address: '10909 Yonge St, Richmond Hill, ON L4C 3E3',
      availability: 'Available Saturday 11:00 a.m.', hoursLabel: 'Sat 11:00 a.m. – 9:45 p.m.', deliveryTime: '11 min',
      featuredNames: ['P1.', 'P4.', 'C1.', 'A2.'],
      reviews: [
        { name: 'Nataly O.', stars: 5, date: '11-11-23', text: "Best pho ever, I order here 3 times a week and it's always the same" },
        { name: 'Winnie C.', stars: 5, date: '04-04-24', text: 'Delicious, fresh and good portion! Will definitely order again!' },
        { name: 'Tanya Z.', stars: 5, date: '24-11-25', text: 'Fresh, tasty and not too spicy!' },
      ],
      descriptions: [
        ['P1.', 'Rib eye beef, flank, tendon, tripe, and beef balls.'],
        ['P4.', 'Tender beef flank and rice noodles in a rich, flavorful broth.'],
        ['BM1', 'Grilled lemongrass pork sandwich.'],
        ['C1.', 'House special broken rice with grilled meats and egg.'],
        ['A2.', 'Fresh salad spring rolls, 2 pieces.'],
      ],
    },
  },
  { folder: 'express-mart', name: 'Express Mart Kingston Road', slug: 'express-mart', kind: 'convenience' },
  { folder: 'k1-floral-studio', name: 'K1 Floral Studio', slug: 'k1-floral-studio', kind: 'flowers' },
  { folder: 'flowers-gifts-and-balloons', name: 'Flowers Gifts and Balloons', slug: 'flowers-gifts-and-balloons', kind: 'flowers' },
  { folder: 'waterford-convenience', name: 'Waterford Convenience', slug: 'waterford-convenience', kind: 'convenience' },
  { folder: 'razi-pharmacy', name: 'Razi Pharmacy', slug: 'razi-pharmacy', kind: 'pharmacy' },
  { folder: 'ambrosia-thornhills', name: 'Ambrosia Thornhills', slug: 'ambrosia-thornhills', kind: 'grocery' },
  { folder: 'ashario-pets', name: 'Ashario Pets North York', slug: 'ashario-pets', kind: 'pets' },
  { folder: 'jays-burger', name: "Jay's Burger", slug: 'jays-burger', kind: 'restaurant' },
  // 'johnson-supermarket' folder intentionally skipped (no seeded business).
];

/* ----------------------------- services (photo-only, single item) ----------------------------- */
// Each service business is one item whose image IS the service photo in
// public/Menu/Services photos. Banner = same photo.
const SERVICES_DIR = 'services-photos';
const SERVICES = [
  { name: 'Comfort Air HVAC', slug: 'comfort-air-hvac', photo: 'hvac-business-photo.jpg', item: 'HVAC Service Call', cat: 'Home Services', price: 99 },
  { name: 'Reliable Flow Plumbing', slug: 'reliable-flow-plumbing', photo: 'plumbing-buissness-photo.jpg', item: 'Plumbing Service Call', cat: 'Home Services', price: 89 },
  { name: 'GreenScape Landscaping', slug: 'greenscape-landscaping', photo: 'landscaping-business.jpg', item: 'Lawn & Garden Service', cat: 'Home Services', price: 79 },
  { name: 'Summit Home Renovations', slug: 'summit-home-renovations', photo: 'renovation-buisness.jpg', item: 'Renovation Consultation', cat: 'Home Services', price: 150 },
  { name: 'Sharp Fade Barbershop', slug: 'sharp-fade-barbershop', photo: 'barber.jpg', item: "Men's Haircut & Beard Trim", cat: 'Grooming', price: 35 },
  { name: 'Polished Nail Studio', slug: 'polished-nail-studio', photo: 'nails.jpg', item: 'Manicure & Pedicure', cat: 'Beauty', price: 55 },
  { name: 'Serenity Massage Therapy', slug: 'serenity-massage-therapy', photo: 'massage.jpg', item: '60-Minute Relaxation Massage', cat: 'Wellness', price: 95 },
  { name: 'Peak Personal Training', slug: 'peak-personal-training', photo: 'personal-fitnes-instructor.jpg', item: '1-on-1 Personal Training Session', cat: 'Fitness', price: 70 },
  { name: 'Sparkle Home Cleaning', slug: 'sparkle-home-cleaning', photo: 'home-cleaning-services-richmond-hill.jpg', item: 'Standard Home Cleaning', cat: 'Cleaning', price: 120 },
  { name: 'ClearWash Pressure Washing', slug: 'clearwash-pressure-washing', photo: 'pressure-washing.jpg', item: 'Driveway & Exterior Pressure Wash', cat: 'Home Services', price: 150 },
  { name: 'FreshCoat Painting', slug: 'freshcoat-painting', photo: 'home-painting-service-main-thumbnail.webp', item: 'Interior Room Painting', cat: 'Home Services', price: 300 },
];

async function buildService(s) {
  const img = encPath(SERVICES_DIR, s.photo);
  const d = await imgDims(img);
  const hq = isHq(d);
  const item = {
    id: `${s.slug}-0`, name: s.item, price: s.price,
    description: 'Professional service, book online.', image: img, category: s.cat,
    likePct: 90 + (hash(s.slug) % 9), likeCount: 12 + (hash(s.slug) % 40),
    reviewCount: reviewCountFor(s.item),
    w: d?.w || 0, h: d?.h || 0, hq,
    deal: dealFor(s.item),
  };
  return {
    slug: s.slug, folder: SERVICES_DIR, department: s.cat, banner: img, bannerHq: hq,
    rating: Number((4.6 + (hash(s.slug) % 4) / 10).toFixed(1)), ratingCount: '200+',
    reviewCount: reviewCountFor(s.slug),
    address: genAddress(s.slug), availability: 'Available today',
    hoursLabel: 'Mon–Sat 8:00 a.m. – 6:00 p.m.', deliveryTime: 'By appointment',
    reviews: genReviews(s.slug), categories: [s.cat],
    featuredIds: [item.id], pickedIds: [item.id], items: [item], isService: true,
  };
}

const storeImages = existsSync(join(ROOT, 'data', 'store-images.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'data', 'store-images.json'), 'utf8')) : {};

async function build(store) {
  const dir = join(MENU_DIR, store.folder);
  const files = readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  // banner = file whose name matches the business name; else existing /stores banner; else first item
  const nameKey = norm(store.name).replace(/north|york|kingston|road|thornhills|vietnamese|cuisine/g, '');
  // Only treat a file as the banner if its name EXACTLY matches the store name
  // (e.g. "Amy's Fish & Chips.jpg", "PHO NGA SON.jpg"); otherwise fall back to the
  // clean public/stores collage so we don't pick a random product as the header.
  const bannerFile = files.find((f) => {
    const fn = norm(origName(store.folder, f).replace(/\.[^.]+$/, ''));
    return fn === norm(store.name) || fn === nameKey || fn === norm('pho nga son');
  });
  let banner = bannerFile ? encPath(store.folder, bannerFile)
    : (storeImages[store.name]?.banner || null);

  const itemFiles = files.filter((f) => !isJunk(f, origName(store.folder, f), bannerFile));
  if (!banner && itemFiles[0]) banner = encPath(store.folder, itemFiles[0]);

  const [range, style] = PRICE[store.kind] || PRICE.restaurant;
  const ov = store.overrides || {};

  const itemDims = await Promise.all(itemFiles.map((f) => imgDims(encPath(store.folder, f))));

  const items = itemFiles.map((file, i) => {
    const rawName = origName(store.folder, file).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
    let description = descFor(rawName, store.kind);
    if (ov.descriptions) { const hit = ov.descriptions.find(([p]) => rawName.startsWith(p) || rawName.includes(p)); if (hit) description = hit[1]; }
    const h = hash(rawName);
    const d = itemDims[i];
    return {
      id: `${store.slug}-${i}`,
      name: rawName,
      price: Number(priceFor(rawName, range, style).toFixed(2)),
      description,
      image: encPath(store.folder, file),
      category: categorize(rawName, store.kind),
      likePct: 82 + (h % 18),          // 82–99%
      likeCount: 8 + (h % 60),         // 8–67
      reviewCount: reviewCountFor(rawName),
      w: d?.w || 0, h: d?.h || 0, hq: isHq(d),
      deal: dealFor(rawName),
    };
  });

  // ordered category list (config order first, then any extras by first appearance)
  const present = [];
  const order = RULES[store.kind]?.order;
  if (order) for (const c of order) if (items.some((it) => it.category === c)) present.push(c);
  for (const it of items) if (!present.includes(it.category)) present.push(it.category);

  // featured: explicit override names, else first 8 items
  let featured;
  if (ov.featuredNames) featured = ov.featuredNames.map((p) => items.find((it) => it.name.startsWith(p))).filter(Boolean);
  if (!featured || !featured.length) featured = items.slice(0, 8);
  const featuredIds = new Set(featured.map((it) => it.id));
  const picked = items.filter((it) => !featuredIds.has(it.id)).slice(0, 6);
  if (picked.length < 4) picked.push(...items.slice(0, 6 - picked.length));

  const bannerHq = isHq(await imgDims(banner));

  return {
    slug: store.slug,
    folder: store.folder,
    department: DEPT[store.kind] || 'Shop',
    banner,
    bannerHq,
    rating: ov.rating ?? Number((4.5 + (hash(store.slug) % 5) / 10).toFixed(1)), // 4.5–4.9
    ratingCount: ov.ratingCount ?? '500+',
    reviewCount: reviewCountFor(store.slug), // varied numeric count for home cards
    address: ov.address ?? genAddress(store.slug),
    availability: ov.availability ?? 'Available today',
    hoursLabel: ov.hoursLabel ?? 'Mon–Sun 9:00 a.m. – 9:00 p.m.',
    deliveryTime: ov.deliveryTime ?? `${10 + (hash(store.slug) % 25)} min`,
    reviews: ov.reviews ?? genReviews(store.slug),
    categories: present,
    featuredIds: featured.map((it) => it.id),
    pickedIds: picked.map((it) => it.id),
    items,
  };
}

/* ----------------------------- run ----------------------------- */
const manifest = {};
for (const store of STORES) {
  try {
    manifest[store.name] = await build(store);
    const m = manifest[store.name];
    const hq = m.items.filter((it) => it.hq).length;
    console.log(`OK  ${store.name.padEnd(30)} ${m.items.length} items · ${hq} hq · banner ${m.bannerHq ? 'hq' : 'soft'}`);
  } catch (e) {
    console.error(`x   ${store.name}: ${e.message}`);
  }
}
for (const s of SERVICES) {
  try {
    manifest[s.name] = await buildService(s);
    console.log(`OK  ${s.name.padEnd(30)} service · 1 item · banner ${manifest[s.name].bannerHq ? 'hq' : 'soft'}`);
  } catch (e) {
    console.error(`x   ${s.name}: ${e.message}`);
  }
}
writeFileSync(join(ROOT, 'data', 'store-menus.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nWrote data/store-menus.json (${Object.keys(manifest).length} stores).`);
