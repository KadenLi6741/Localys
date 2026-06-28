/**
 * Seed the onboarding stores from data/stores.json into Supabase.
 *
 * For each store it creates, idempotently:
 *   auth user -> profiles row -> businesses row -> menus row -> menu_items rows
 *
 * Requires a SERVICE ROLE key (creates auth users + bypasses RLS). Add
 * SUPABASE_SERVICE_ROLE_KEY to video-platform/.env.local, then run:
 *
 *   node scripts/seed-stores.mjs
 *
 * Re-running is safe: it upserts the profile/business by owner and rebuilds
 * the menu items, so edits to data/stores.json are picked up on the next run.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ---- credentials -------------------------------------------------- */
try {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbqkpcwnzteljwxjoudj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY is not set.');
  console.error('   Add it to video-platform/.env.local (Supabase dashboard → Settings → API → service_role),');
  console.error('   then re-run. It is required to create auth users and bypass RLS.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---- helpers ------------------------------------------------------ */
const slugify = (s) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 28);

const DEFAULT_HOURS = {
  monday: { open: '09:00', close: '17:00' }, tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' }, thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '17:00' }, saturday: { open: '10:00', close: '16:00' },
  sunday: { closed: true },
};

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureAuthUser(email) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return existing.id;
  const password = 'Localys!' + Math.random().toString(36).slice(2, 12) + 'A1';
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { seeded_store: true },
  });
  if (error) throw error;
  return data.user.id;
}

async function seedStore(store, usedUsernames) {
  const email = `${slugify(store.storeName)}@stores.localys.local`;
  let username = slugify(store.storeName);
  while (usedUsernames.has(username)) username = username.slice(0, 24) + Math.floor(Math.random() * 90 + 10);
  usedUsernames.add(username);

  const userId = await ensureAuthUser(email);

  const { error: pErr } = await supabase.from('profiles').upsert({
    id: userId, email, full_name: store.storeName, username,
    type: store.type, bio: `${store.category} • ${store.storeName}`,
    profile_picture_url: store.heroImage || null,
    latitude: store.latitude ?? null, longitude: store.longitude ?? null,
  }, { onConflict: 'id' });
  if (pErr) throw new Error(`profile: ${pErr.message}`);

  const { data: existingBiz } = await supabase
    .from('businesses').select('id').eq('owner_id', userId).maybeSingle();
  const bizPayload = {
    owner_id: userId, business_name: store.storeName, business_type: 'general',
    category: store.category, profile_picture_url: store.heroImage || null,
    business_hours: DEFAULT_HOURS, latitude: store.latitude ?? null, longitude: store.longitude ?? null,
  };
  let businessId;
  if (existingBiz) {
    businessId = existingBiz.id;
    const { error } = await supabase.from('businesses').update(bizPayload).eq('id', businessId);
    if (error) throw new Error(`business update: ${error.message}`);
  } else {
    const { data, error } = await supabase.from('businesses').insert(bizPayload).select('id').single();
    if (error) throw new Error(`business insert: ${error.message}`);
    businessId = data.id;
  }

  // rebuild menu + items for this owner (idempotent re-seed)
  await supabase.from('menu_items').delete().eq('user_id', userId);
  await supabase.from('menus').delete().eq('user_id', userId);

  const { data: menu, error: mErr } = await supabase.from('menus').insert({
    user_id: userId, business_id: businessId, menu_name: 'Menu',
    description: '', category: 'General', is_active: true,
  }).select('id').single();
  if (mErr) throw new Error(`menu: ${mErr.message}`);

  const rows = (store.items || []).map((it) => ({
    menu_id: menu.id, user_id: userId, item_name: it.name, description: it.description || '',
    price: Number(it.price) || 0, category: it.category || null,
    image_url: it.imageUrl || null, is_available: true,
  }));
  if (rows.length) {
    const { error: iErr } = await supabase.from('menu_items').insert(rows);
    if (iErr) throw new Error(`menu_items: ${iErr.message}`);
  }

  return { storeName: store.storeName, username, profileId: userId, items: rows.length };
}

/* ---- run ---------------------------------------------------------- */
(async () => {
  const stores = JSON.parse(readFileSync(join(ROOT, 'data', 'stores.json'), 'utf8'));
  const usedUsernames = new Set();
  const summary = [];
  for (const store of stores) {
    try {
      const r = await seedStore(store, usedUsernames);
      console.log(`OK  ${r.storeName.padEnd(32)} @${r.username.padEnd(26)} ${r.items} items`);
      summary.push(r);
    } catch (e) {
      console.error(`x   ${store.storeName}: ${e.message}`);
    }
  }
  console.log(`\nSeeded ${summary.length}/${stores.length} stores.`);
  for (const r of summary) console.log(`   /profile/${r.username}`);
})();
