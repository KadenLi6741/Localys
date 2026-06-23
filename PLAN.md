# Localys — Home / Vibrancy / Account-Types Plan

> Planning only. No code is changed by this document. Phases are ordered so quick
> visual wins land first and risky backend work (account types) lands last.
> Design **inspiration** is taken from the extracted Uber Eats system in
> `./ubereats-design/` (layout, spacing rhythm, color vibrancy, roundness, motion)
> — **no** Uber logo / name / copy / photos / fonts are copied. Localys keeps its
> own brand (orange `#f97316`), Supabase data, and dark mode.

---

## A. Current-state inventory (real files)

**App chrome / mount chain**
- `video-platform/app/layout.tsx` → wraps everything in `components/LayoutShell.tsx`.
- `components/LayoutShell.tsx` — renders `AppHeader`, `DesktopSidebar`, the mobile nav `Sheet` (uses `SidebarContent`), the fixed full-width `AnnouncementBar`, `{children}`, `Footer`, and `CartDrawer`.
- `components/AppHeader.tsx` — top bar: logo wordmark, oval search, coins pill, **Advertise (MegaphoneIcon)**, **Create** dropdown, **Notifications (BellIcon)**, Profile dropdown. (Inline SVG icons confirmed present in source + build.)
- `components/DesktopSidebar.tsx` (208px rail) + `components/SidebarContent.tsx` (nav + collapsible Daily Challenges / Recent / Communities / Resources). Mobile = same `SidebarContent` inside the `Sheet`.
- `components/AppBottomNav.tsx` — mobile bottom nav.
- `components/AnnouncementBar.tsx` — sliding promo strip ("Up to 20% off for new customers").

**Home storefront** — `video-platform/app/page.tsx`
- `HomeStorefront` (Pickup|Service toggle, location selector, category row, filter chips, sections), `CategoryIcon` (PNG → letter fallback), `DealsCarousel` (auto-slide + white arrows), `FilterPopover` (Distance/Rating/Sort), `Reveal` (scroll-reveal), `FeaturedSection`, `StoreSection`, `storeMeta` (demo rating/reviews/distance).
- Category list = `CATEGORIES` array → `/categories/*.png` (⚠ PNG files NOT in repo yet — only `public/categories/README.txt`; letters show).

**Other surfaces**
- Explore (video feed): `app/explore/page.tsx`, `components/PersistentVideoFeed.tsx`, `components/HomeContent.tsx` (its own overlay header — only on `/explore`).
- Communities: `app/communities/page.tsx`, `app/communities/[slug]/page.tsx`, `app/communities/new/page.tsx`.
- Shop: `app/shop/page.tsx`. Rewards/coins: `app/rewards/page.tsx`, `app/buy-coins/page.tsx`.
- Profile: `app/profile/page.tsx`, `app/profile/[userId]/page.tsx`. Orders: `app/orders/page.tsx` (`components/OrderHistory.tsx`).
- Business dashboard (already exists): `app/dashboard/page.tsx` (QR scan + item purchases). Analytics: `app/analytics/page.tsx`.
- Styling tokens + utilities: `app/globals.css` (`.shadow-soft`, `.hover-elevate`, `.reveal`, `.range-orange`, semantic color tokens in `:root` / `.dark`).
- Contexts: `contexts/AuthContext.tsx`, `CartContext`, `UnreadMessagesContext`, `ActivityContext`, `LanguageContext`.

**Data model (Supabase) — relevant to account types**
- `profiles`: `id, username, full_name, profile_picture_url, type (food|retail|service|null), bio, …`. `type` non-null ≈ "this profile is a business of that category"; `null` ≈ regular user. (Home queries `profiles` by `type`.)
- `businesses` (separate table): `id, owner_id (→ user), business_name, business_type, category, profile_picture_url, average_rating, total_reviews, price_range_min/max, latitude, longitude, business_hours` (migrations `022`, `038–040`). A business is **owned by a user** via `owner_id`.
- ⚠ The model is **split/denormalized**: Home reads `profiles.type`, while videos/trust read the `businesses` table. This must be reconciled in the account-types phase.
- `lib/supabase/auth.ts` (`ensureOwnProfile`), `app/onboarding/page.tsx` (bio + picture only — no account-type choice today).

---

## B. Gap analysis — current Localys vs. Uber Eats target (from the 3 screenshots)

| Area | Current Localys (shot 1) | Uber Eats target (shot 2/3) | Action |
|---|---|---|---|
| Color | Mostly white/black, muted; only deals have color | **Vibrant** — colorful category icons, colorful deal banners, colorful **circular** store logos | Re-introduce lively color (Phase 1/3/4) |
| Category icons | Letter fallbacks (PNGs missing) | Colorful round icon tiles | Ship PNGs + colored tiles (Phase 3) |
| Store logos | Square-ish rounded cards | **Circular** round badges | Circular logos (Phase 1/3) |
| Layout balance | Compressed in places, big empty gutters; content starts mid-page | Even rhythm, centered, aligned columns, breathing room | Spacing system + container (Phase 1/3) |
| Deals carousel | Works but images repeat / bleed oddly; first card looks broken | Clean cream/yellow/green banners w/ distinct images | Fix image mapping + proportions (Phase 4) |
| Header icons | Advertise + Notifications not visible to user (stale-cache; source OK) | Visible actions | Verify after clean build; keep inline SVG (Phase 2) |
| Left nav | App sections (Home/Explore/Communities/Messages/Cart) + collapsibles | Category-led nav + **hamburger account drawer** | Add hamburger drawer (Phase 2) |
| Account model | Implicit (profiles.type / businesses table); no switch UI | Explicit **Customer vs Business**, create/switch in drawer | Phase 5 |

---

## C. Target design direction (write-up)

1. **Vibrant + alive (supersedes the earlier "minimal B&W" direction).** Clean **white** base, but bring back energy: colorful category icon tiles, multi-color deal banners, and colorful circular store logos. Orange `#f97316` stays the **brand** accent (logo dot, active states, links, primary CTAs) — but color is allowed broadly on content (icons, banners, badges), not just one accent. Dark mode mirrors every new token.
2. **Balanced, spread-out layout.** One centered `max-w-[1280px]` container, a strict 4px spacing grid (`8 / 12 / 16 / 24 / 32 / 48`), 48px between major sections, aligned card columns/gutters, generous breathing room. No more "compressed here, empty there."
3. **Less boxy / more rounded.** Pill buttons & toggles (full radius), oval search, **circular** store logos, `16–24px` rounded cards, soft "raised → floating-on-hover" shadows (already in `.shadow-soft`/`.hover-elevate`).

---

## D. Phased plan

### Phase 1 — Foundation: vibrant color system, spacing, global rounding
**Goal:** establish the lively palette + spacing/rounding primitives everything else uses.
**Files:** `app/globals.css` (tokens + utilities), `tailwind`/theme usage, `components/ui/button.tsx`.
- [ ] Add a small **content color palette** (category/banner hues) as tokens for light + dark — not just the single orange accent.
- [ ] Confirm spacing scale + a `max-w-[1280px]` container convention; document the 4px grid.
- [ ] Rounding conventions: pills for controls, `rounded-full` for store logos, `16–24px` for cards.
- [ ] Decide button vibrancy: keep primary CTA orange (revert the all-black default if it reads too flat).
- [ ] Verify `.shadow-soft` / `.hover-elevate` / `.reveal` tokens render in both themes.

### Phase 2 — Header + nav + new hamburger account drawer
**Goal:** clean top bar with visible actions, plus a left slide-out account drawer (shot 3).
**Files:** `components/AppHeader.tsx`, `components/LayoutShell.tsx`, new `components/AccountDrawer.tsx`, `components/SidebarContent.tsx`, `contexts/AuthContext.tsx`.
- [ ] Add a **hamburger** (three-lines) button at top-left that opens a left drawer (reuse the `Sheet` primitive).
- [ ] Drawer contents: account header (name + "Manage account"), **Order History**, **Favorites**, **Wallet/Coins**, **Promotions/Coupons**, **Communities**, **Help**, **Invite friends**, **Sign out**; then account-type actions: **"Create a business account"**, **"Switch to business/customer"** (Phase 5 wires these).
- [ ] Confirm Advertise + Notifications icons render after a clean build (source verified; was a stale `.next`/browser cache).
- [ ] Keep oval "Find anything" search (inline only, no separate page).

### Phase 3 — Home storefront (balance + vibrancy)
**Goal:** the storefront matches the reference rhythm and feels colorful.
**Files:** `app/page.tsx`.
- [ ] **Category icons = colorful EMOJI for now** (the `/categories/*.png` exist on GitHub but aren't on the local build — leave the PNG wiring alone). Render vibrant emoji on colored round tiles: 🛒 Grocery · 🍔 Fast Food · 🥐 Bakery · 🍽️ Restaurants · 💐 Flower Shops · 🛠️ Services · ☕ Cafés · 👕 Clothing · 🧸 Toy Stores · 🐾 Pet · ❤️ Health.
- [ ] Keep a per-category **`icon` field** in the `CATEGORIES` array so swapping emoji → PNG later is a **one-line change per category** (e.g. `icon: '🛒'` → `iconSrc: '/categories/grocery.png'`). *(Later upgrade: re-wire `CategoryIcon` to PNG once pulled.)*
- [ ] Section order: **Featured on Localys → Today's offers → Stores near you**, even 48px breaks, aligned card grid.
- [ ] Store cards: **circular** logo, name + **heart** beside it, `★ rating · (reviews) · distance`, soft hover shadow.
- [ ] "Stores near you" circular colorful logos + **Show more**.
- [ ] Filter row pills (Offers, Distance slider, Rating dropdown, Sort) — spacing + vibrancy pass.
- [ ] Pickup|Service oval toggle + location selector polish.

### Phase 4 — Deals carousel + animations
**Goal:** colorful, correct, lively carousel.
**Files:** `app/page.tsx` (`DealsCarousel`), `app/globals.css`.
- [ ] Fix the **image mapping** (current cards repeat/bleed the same logo); give each deal a distinct image/treatment.
- [ ] Card proportions per reference; per-card color; oval white CTA; auto-slide right→left + white circular arrows + hover shadow.
- [ ] Keep scroll-reveal + `prefers-reduced-motion` safe.

### Phase 5 — Business account = a COMPLETELY SEPARATE experience ("Localys Manager") ⚠ BIGGEST / ARCHITECTURAL
**Concept:** like Uber Eats (customer app) vs **Uber Eats Manager** (business app). The customer storefront and the business dashboard are **entirely different interfaces** — different route group, different layout, different navigation. Build this **after** the customer redesign (Phases 1–4) so the main app looks great first.

**The flow**
1. A user **first registers as a normal (customer) account** (current signup — unchanged).
2. From the **hamburger drawer** (Phase 2) they tap **"Create business account"**.
3. → routes to a **separate onboarding page** (e.g. `app/manager/onboarding/page.tsx`) to fill out business info: **business name, category, location/address, description, hours, logo/photo, contact**.
4. On submit, the business record is created and it **opens "Localys Manager"** — a separate dashboard interface at its own route group **`/manager`** with its **own layout** (NOT the customer chrome).
5. The user can **switch** between **Customer view** (`/`) and **Localys Manager** (`/manager`) from the drawer / an account switcher.

**Localys Manager — interface spec** (own left nav + clean white dashboard styling; model on the Uber Eats Manager reference)
**Files (new):** `app/manager/layout.tsx` (separate shell + left nav, no customer `LayoutShell`), `app/manager/page.tsx` (Dashboard), `app/manager/onboarding/page.tsx`, and one route per section below. Reuse existing logic where possible: `app/dashboard/page.tsx` (orders/QR), `app/analytics/page.tsx`, `components/OrderHistory.tsx`, `components/MenuList.tsx`/`MenuModal.tsx`, `components/BusinessQASection.tsx`, `lib/supabase/trust.ts`, `lib/supabase/videos.ts`.
- [ ] **Manager shell** — dedicated left sidebar nav (Dashboard, Analytics, Feedback, Content, Menu/Products, Orders, Marketing, Payments, Settings) + top bar with business name + "Switch to customer view". Own `layout.tsx` so it does not render the customer header/sidebar/announcement bar.
- [ ] **Dashboard / Home** — key metrics overview (today's orders, views, rating, revenue, pending replies) as stat cards.
- [ ] **Analytics** — views, visits, likes, orders, reviews, advertise ROI, trends over time (reuse/extend `app/analytics`, `components/analytics/*`).
- [ ] **Feedback / Reviews** — list customer reviews w/ star ratings, **reply to each**, filters (rating, status: replied/awaiting), and stats (total reviews, awaiting replies, avg rating). Needs review-replies storage.
- [ ] **Content** — manage the business's **videos, threads, posts** (create/edit/delete) that surface in the customer Explore/Communities.
- [ ] **Menu / Products** — create/edit/delete listed items (reuse `MenuList`/`MenuModal`).
- [ ] **Orders** — incoming-orders list (**Stripe TEST mode**; seeded/demo data so it runs standalone).
- [ ] **Marketing / Advertise** — "Advertise on Localys" promote flow (reuse `components/PromotionModal.tsx`).
- [ ] **Payments + Settings** — basic business settings (hours, location, payout placeholder in test mode).

**Suggested internal build order:** onboarding → manager shell/nav → dashboard/analytics → reviews/feedback → content → menu/orders → advertise/settings.

**Data / backend (FLAG ONLY — do not build yet)**
- [ ] **Account model:** add an explicit `profiles.account_type ('customer'|'business')` **and/or** rely on owning a `businesses` row (`owner_id`). A user can own a business and **switch modes**. Reconcile the current split where Home reads `profiles.type` but videos/trust read the `businesses` table.
- [ ] **Tables/columns needed:** `businesses` (name, category, address, lat/lng, description, hours, logo, contact, owner_id — mostly exists, migrations `022`/`038–040`); `menu_items`/products; **`reviews` + a new `review_replies`** (or a `reply` column) for the Feedback section; business **content** linkage (videos/threads/posts already keyed to `business_id`/`owner_id`).
- [ ] **RLS:** only the owner can edit their `businesses` row, menu, content, and reply to reviews; customers cannot.
- [ ] **Standalone/demo:** seeded business + demo orders/reviews + **Stripe test mode** so the whole Manager runs without external setup (competition requirement).
- [ ] FLAG: don't break current auth, `dashboard`, `analytics`, Stripe checkout, or the customer flows.

### Phase 6 — Communities, Profile / Order History, Coins/Rewards
**Goal:** finish the carried-over feature polish.
**Files:** `app/communities/*`, `app/profile/*`, `app/orders/page.tsx` + `components/OrderHistory.tsx`, `app/rewards/page.tsx`, `app/buy-coins/page.tsx`, `components/SidebarContent.tsx`.
- [ ] Communities: upvote/downvote threads (verify migration `041` applied), create-thread flow.
- [ ] Dedicated Order History page polish; Profile alignment with new visual system.
- [ ] Coins/Rewards redesign consistent with vibrant palette.
- [ ] Collapsible left-sidebar sections (already collapsed-by-default) — visual pass.

---

## E. Resolved this round
- **Category icons:** colorful **emoji now**, kept behind a per-category `icon` field; PNG swap is a later one-line-per-category upgrade. ✅
- **Business = a completely separate experience** ("Localys Manager") at its own `/manager` route group + layout; created via the hamburger → separate onboarding → opens Manager; user can switch views. ✅
- **Business scope:** full Manager spec'd (Dashboard, Analytics, Feedback/Reviews w/ replies, Content, Menu/Products, Orders, Marketing/Advertise, Payments+Settings), runnable standalone with seeded/demo data + Stripe test mode. ✅

## F. Open questions (still need your answers — mostly before Phase 5)
1. **Color vibrancy scope:** colorful **content** (icons/banners/logos/badges) on white but keep **chrome** (header/sidebar/buttons) mostly neutral + orange accents? Or vibrant chrome too?
2. **Primary buttons:** revert to **orange** fills (lively) or keep current black/foreground fills?
3. **Account-type model:** explicit `profiles.account_type` flag (cleanest) **and/or** infer business from owning a `businesses` row — your preference? (Both assume one user can be customer **and** business, switchable.)
4. **Hamburger vs. existing left rail (customer app):** should the new account **drawer** replace the persistent `DesktopSidebar`, or coexist (rail = app nav, drawer = account)?
5. **"Advertise on Localys":** business-only (in Manager) — or also surfaced to everyone in the customer app as an upsell entry point?
6. **Manager nav style:** mirror the customer sidebar styling, or a distinct Manager look (different accent/denser) so the two apps feel clearly separate?

---

## G. Suggested sequencing recap
**Customer redesign first:** Phase 1 (foundation: vibrant tokens, spacing, rounding) → Phase 2 (header + hamburger account drawer) → Phase 3 (Home storefront, emoji categories) → Phase 4 (deals carousel + motion).
**Then the big architectural piece:** Phase 5 (**Business account + Localys Manager** — internal order: onboarding → shell/nav → dashboard/analytics → reviews → content → menu/orders → advertise/settings; backend gated on Q3).
**Finally:** Phase 6 (Communities / Profile / Order History / Coins-Rewards polish).
