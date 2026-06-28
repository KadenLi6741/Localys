/**
 * Crop a clean store BANNER for each seeded business out of the full-page Uber
 * Eats menu screenshots in public/Bizness, saving local images under
 * public/stores/<slug>/banner.jpg.
 *
 * Restaurants have a food "hero" strip at the top; shops have no hero, so we crop
 * a representative product-row collage. The 4 home-services already have clean
 * photos in public/stores/*.jpg (no crop needed). Item cards reuse their store's
 * banner (see lib/supabase/featured.ts), so we do NOT crop per-item photos.
 *
 * Side effects: writes the banner JPGs, a manifest at data/store-images.json, and
 * updates each store's `heroImage` in data/stores.json so the seed script
 * (scripts/seed-stores.mjs) persists it to Supabase.
 *
 *   node scripts/crop-menus.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BIZ = join(ROOT, 'public', 'Bizness');
const STORES_DIR = join(ROOT, 'public', 'stores');

const bizFiles = readdirSync(BIZ);
const findShot = (sub) => {
  const f = bizFiles.find((x) => x.includes(sub));
  if (!f) throw new Error(`no screenshot matching "${sub}"`);
  return join(BIZ, f);
};

/**
 * Per-store config. `match` locates the screenshot; `crop` is the banner region
 * in ORIGINAL pixels (left:0, full width). Services use a ready-made `staticBanner`.
 */
const STORES = [
  // --- restaurants: top food hero strip ---
  { name: "Amy's Fish & Chips", slug: 'amys-fish-and-chips', match: 'amys-fish-%26', crop: { top: 35, height: 270 } },
  { name: 'Holy Smoke Barbecue', slug: 'holy-smoke-barbecue', match: 'holy-smoke-barbecue', crop: { top: 34, height: 255 } },
  { name: 'Pho Nga Son', slug: 'pho-nga-son', match: 'pho-nga-son', crop: { top: 76, height: 213 } },
  { name: 'Pho Xe Lua Vietnamese Cuisine', slug: 'pho-xe-lua', match: 'pho-xe-lua', crop: { top: 92, height: 224 } },
  // --- shops: cover strip or product-row collage ---
  { name: 'K1 Floral Studio', slug: 'k1-floral-studio', match: 'k1-floral-studio', crop: { top: 12, height: 150 } },
  { name: 'Flowers Gifts and Balloons', slug: 'flowers-gifts-and-balloons', match: 'flowers-gifts-and-balloons', crop: { top: 400, height: 200 } },
  { name: 'Waterford Convenience', slug: 'waterford-convenience', match: 'waterford-convenience', crop: { top: 405, height: 200 } },
  { name: 'Ambrosia Thornhills', slug: 'ambrosia-thornhills', match: 'ambrosia-thornhills', crop: { top: 330, height: 185 } },
  { name: 'Ashario Pets North York', slug: 'ashario-pets', match: 'ashario-pets', crop: { top: 648, height: 210 } },
  { name: 'Razi Pharmacy', slug: 'razi-pharmacy', match: 'razi-pharmacy', crop: { top: 30, height: 140 } },
  { name: 'Express Mart Kingston Road', slug: 'express-mart', match: 'express-mart-kingston-road', crop: { top: 1208, height: 180 } },
  // --- services: ready-made clean photos already in public/stores ---
  { name: 'Comfort Air HVAC', slug: 'comfort-air-hvac', staticBanner: '/stores/hvac.jpg' },
  { name: 'Reliable Flow Plumbing', slug: 'reliable-flow-plumbing', staticBanner: '/stores/plumbing.jpg' },
  { name: 'GreenScape Landscaping', slug: 'greenscape-landscaping', staticBanner: '/stores/landscaping.jpg' },
  { name: 'Summit Home Renovations', slug: 'summit-home-renovations', staticBanner: '/stores/renovation.jpg' },
];

async function makeBanner(store) {
  if (store.staticBanner) return store.staticBanner; // services: reuse existing photo
  const buf = readFileSync(findShot(store.match));
  const meta = await sharp(buf, { limitInputPixels: false }).metadata();
  const top = Math.max(0, store.crop.top);
  const height = Math.min(store.crop.height, meta.height - top);
  const outDir = join(STORES_DIR, store.slug);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'banner.jpg');
  await sharp(buf, { limitInputPixels: false })
    .extract({ left: 0, top, width: meta.width, height })
    .resize({ width: 1200 })
    .jpeg({ quality: 84 })
    .toFile(outPath);
  return `/stores/${store.slug}/banner.jpg`;
}

(async () => {
  const manifest = {};
  for (const store of STORES) {
    try {
      const banner = await makeBanner(store);
      manifest[store.name] = { slug: store.slug, banner };
      console.log(`OK  ${store.name.padEnd(34)} ${banner}`);
    } catch (e) {
      manifest[store.name] = { slug: store.slug, banner: null };
      console.error(`x   ${store.name}: ${e.message}`);
    }
  }

  // write manifest
  writeFileSync(join(ROOT, 'data', 'store-images.json'), JSON.stringify(manifest, null, 2) + '\n');

  // patch data/stores.json heroImage by store name
  const storesPath = join(ROOT, 'data', 'stores.json');
  const stores = JSON.parse(readFileSync(storesPath, 'utf8'));
  let patched = 0;
  for (const s of stores) {
    const m = manifest[s.storeName];
    if (m && m.banner) { s.heroImage = m.banner; patched++; }
  }
  writeFileSync(storesPath, JSON.stringify(stores, null, 2) + '\n');
  console.log(`\nWrote data/store-images.json and patched ${patched}/${stores.length} heroImage entries in data/stores.json.`);
})();
