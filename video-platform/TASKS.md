# Localys restructure + fix pass — TASKS

Decisions: category icons = PNG files in `/public/categories/` (emoji fallback); community↔thread link = Supabase migration `041`; video feed = Explore (normal page), Home = storefront.

## Part 1 — IA restructure
- [x] 1A Home → storefront
- [x] 1B Explore → video feed (PersistentVideoFeed now keys on /explore)
- [x] 1C Communities → threads (moved from old Explore)
- [ ] 1D Search → users-only (no filters)  ← NOT done yet (header search still has filters)
- [x] 1E Left nav order: Home, Explore, Communities, Messages, Cart

## Part 2 — Home storefront
- [x] Pickup|Service toggle + location + (cart in top bar)
- [x] Category PNG row (emoji fallback) above chips — user must drop PNGs in /public/categories/
- [x] Chip filters row (visual: Offers/Distance/Rating/Sort) — wiring is TODO
- [x] Deals carousel
- [x] Featured / Today's offers / Stores near you (no delivery fees)

## Part 3 — Communities + threads
- [x] Threads feed w/ upvote/downvote + comments + share (carried from explore card)
- [x] Create post in community = text thread (not video)
- [~] Community page shows only that community's threads — needs migration 041 applied + community_id query wiring
- [x] Migration 041 written (communities table + shoutouts.community_id) — APPLY IT, then reload PostgREST schema

## Part 4 — Coins/Rewards
- [x] White rounded cards, fewer circles, no "+", black coins text
- [x] Coins → store credit conversion (separate from coupons)
- [x] Rebalanced earn rates

## Part 5 — Notifications + Advertise icons (inline SVG) ✓
## Part 6 — Shop rating stars overflow ✓
## Part 7 — Search button oval, right-anchored ✓ (source-correct)
## Part 8 — 8A order history page ✓ · 8B name-reset bug ✓ · 8C dark bg ✓
## Part 9 — Text full black in light mode — [~] rewards/home/profile done; app-wide sweep TODO

---

# HOME POLISH + COUPONS/TEXT + ICONS FIX (latest pass)
- [x] P1 Category PNGs wired with EXACT case-sensitive filenames (grocery, Fast-food, bakery, restaurants, flower, service, cafe, clothing, toys, pet, health) + emoji fallback. ⚠️ PNGs NOT in repo yet (only README.txt) → emoji shows until files are dropped in /public/categories/.
- [x] P2 Coupon/body text black: global --muted-foreground darkened (light #3a3a3a / dark #c4c4c4); rewards coupon business+finePrint forced text-foreground. (buy-coins coupons are green-themed, not grey-on-orange.)
- [x] P3 Home filter chips oval + elevated (bg-surface) + spacious (px-4 py-2, gap-3) + horizontal scroll; Distance chip opens a SLIDER dropdown (1–25 km) w/ click-away backdrop.
- [x] P4 Section order Featured → Today's offers → Stores near you; distance + pickup time on store cards AND Stores-near-you (deterministic demo meta, display-only).
- [x] P5 Featured card redesign: rounded-[16px] logo, name under image, HEART favorite beside name (orange when active), ★ rating (reviews) · distance below.
- [x] P6 Deleted /search page/route entirely; header search is inline-only (Enter opens top live result, never navigates); stray /search links repointed (footer→Communities, profile→Explore).
- [x] P7 Advertise + Notifications top-bar icons switched to lucide (Megaphone/Bell) matching the working Create (Plus); bell keeps orange unread badge. ⚠️ if still missing, it's a stale build → delete .next and rebuild.
- [x] Verify: tsc clean (app), build 35/35 routes (/search gone), changed files lint-clean (0 errors).

---

# HOME SCREEN OVERHAUL PASS (minimal B&W + structural)
- [x] 1 Orange pulled back: Button default → foreground; sidebar active/badges/progress neutral; promo strip neutral; header search pill/logo/active chips neutral. (Home + chrome + Shop + shared Button done; deep secondary pages e.g. rewards/product/challenges still have inline bg-primary — pending full sweep.)
- [x] 2 Category PNGs wired (exact filenames), EMOJI REMOVED entirely; neutral letter fallback. ⚠️ PNG files still NOT in repo (only README.txt) → letter tiles show until added/pulled.
- [x] 3 Category row: white circular L + R arrows. File: app/page.tsx
- [x] 4 Advertise + Notifications = hardcoded inline SVG, explicit text-foreground; bell unread = small orange dot. File: components/AppHeader.tsx. ⚠️ if still blank → stale .next (rebuild).
- [x] 5 "Find anything" search is rounded-full (oval); inline-only (no /search nav — already deleted). File: components/AppHeader.tsx
- [x] 6 AnnouncementBar ("Up to 20% off…") fixed full-width directly under header (z-30, above sidebar), keeps slide animation; recoloured neutral (was orange fill). Files: components/LayoutShell.tsx, DesktopSidebar.tsx, globals.css (--bg-banner→foreground)
- [x] 7 Deals bigger (h-52/56, w 360/460, rounded-20) + longer white oval CTAs (min-w-180, px-7 py-3); auto-slide R→L + white circular arrows + hover shadow. File: app/page.tsx
- [x] 8 Filters oval/airier (px-5 py-2.5); Distance = slider; Rating = working dropdown (slider) that FILTERS; Sort = working dropdown (radios) that SORTS; both styled like shop popovers w/ title + X + Reset/Apply (FilterPopover). File: app/page.tsx
- [x] 9 Order Featured → Today's offers → Stores near you; REMOVED boxes around all three sections; store cards rounded-24 + heart + ★rating (reviews) · distance + soft shadow; "Show more" pill below Stores near you. File: app/page.tsx
- [x] 10 Pickup|Service toggle = rounded pill, neutral active fill (done prior pass; verified). File: app/page.tsx
- [x] 11 Text black: --muted-foreground near-black (light #3a3a3a); deal cards use per-card contrast fg. (Token-level; deep per-component grey sweep ongoing.)
- [x] 12 "Localys" wordmark: bold black, tracking-tight, orange "." accent. File: components/AppHeader.tsx
- [x] 13 Sidebar sections (Daily Challenges/Recent/Communities/Resources) collapse individually, ALL CLOSED on first load (defaultOpen=false), persisted in localStorage. File: components/SidebarContent.tsx
- [x] Extra: sidebar narrowed 250→208px; removed border between sidebar↔content; removed hr dividers between sections.
- [x] Verify: tsc clean, build all routes, changed files lint-clean.
- ⚠️ PENDING (flagged to user): app-wide orange sweep on deep pages (rewards/product/challenges/communities/chats/profile); full per-component grey→black text sweep.

---

# UBER-EATS-INSPIRED REDESIGN (PLAN.md approved) — direction reversed to VIBRANT
Decisions: vibrant CONTENT on white/neutral chrome · primary CTAs + active states = orange (#f97316), utility buttons neutral · explicit profiles.account_type (customer|business, switchable) · account drawer COEXISTS with left rail · Advertise in Manager + customer upsell · Localys Manager = distinct pro-dashboard, same tokens.

## Phase 1 — Foundation (vibrant tokens, spacing, rounding) — IN PROGRESS
- [x] Vibrant content palette tokens (8 hues × light/dark) + radius scale tokens in globals.css. (chrome stays neutral)
- [x] Primary CTA Button → ORANGE again (`default` variant `bg-primary`); secondary/outline/ghost stay neutral; link orange. File: components/ui/button.tsx
- [ ] (Per-screen) active-state orange accents + inline CTA buttons → orange happen in their phases (header/sidebar = Phase 2, Home = Phase 3); utility buttons (header Search) stay neutral.
- [x] Container/spacing conventions confirmed (max-w-1280, 4px grid, 48px section breaks already on Home); rounding scale documented as tokens.
- [ ] Verify build + STOP for user review before Phase 2.

## Phase 2 — Header + hamburger account drawer — DONE (pending icon verify)
- [x] Item 1: wordmark uses distinct display font (Outfit 800) + orange dot, dark-safe; search already oval/inline-only (no /search route); coins already black/no "+". Files: app/layout.tsx, components/AppHeader.tsx
- [x] Item 2: user confirmed the red ADV/BELL boxes mounted → **finalized to clean icons**: Advertise = megaphone, Notifications = bell + small orange unread dot; both `text-foreground` (black on white / light in dark) → orange on hover; all debug styling removed. File: components/AppHeader.tsx
- [x] Item 3: hamburger → new AccountDrawer (coexists w/ rail; mobile nav = AppBottomNav). Header + items + customer/business account-type row + Sign out; slide-in + backdrop/Esc/close. Files: components/AccountDrawer.tsx (new), AppHeader.tsx, LayoutShell.tsx, globals.css (drawerInLeft keyframe). NOTE: account-type links point at /dashboard for now; Phase 5 reroutes to /manager.
- [x] Item 4: left-rail active nav = orange (text + left bar). File: components/SidebarContent.tsx
- [x] Verify: tsc clean, changed files lint-clean, build green.
- ⚠️ Removed the redundant mobile nav Sheet (SidebarContent still powers the desktop rail; mobile nav = AppBottomNav).
## Phase 3 — Home storefront (emoji categories, balance, circular logos) — DONE
- [x] 1 Promo banner = vibrant rounded pill (amber palette token, theme-aware), side gaps. Files: globals.css, LayoutShell.tsx, DesktopSidebar.tsx
- [x] 2 Pickup|Service = rounded pill, neutral active fill. File: app/page.tsx
- [x] 3 Category row = colourful EMOJI on vibrant tiles + label; `icon` field kept (1-line PNG swap later); white circular L/R arrows. File: app/page.tsx
- [x] 4 Filters = oval pills; Distance slider + Rating dropdown (actually filters) + Sort dropdown (actually sorts). File: app/page.tsx
- [x] 5 Order Featured → Today's offers → Stores near you; no section boxes; centered max-w-1280 + balanced 4px-grid spacing. File: app/page.tsx
- [x] 6 Store cards = circular logo, name under image, heart beside name, ★rating·(reviews)·distance·min, soft hover shadow; "Show more" under Stores near you. File: app/page.tsx
- [x] 7 Resources moved from left rail → bottom nav (BookOpen → /info); unused RESOURCE consts + section deleted. Files: SidebarContent.tsx, AppBottomNav.tsx
- [x] 8 Cleanup: consolidated duplicate FeaturedSection+StoreSection into one StoreCard/StoreRow; removed dead PNG/letter CategoryIcon logic, `file` field, Clock import. File: app/page.tsx
- [x] Verify: tsc clean, changed files lint-clean, build green.
- NOTE: deals carousel left as-is (already has motion); Phase 4 refines the carousel + per-card imagery.
## Phase 4 — Deals carousel + animations — DONE
- [x] 1 Deal cards colourful (vibrant palette hue per card, theme-aware), rounded-24, bigger/taller (h-56/60), title + subline + white OVAL CTA (min-w-180). File: app/page.tsx
- [x] 2 Fixed deal images: each deal uses its own image slot by index OR a thematic emoji fallback; clipped via overflow-hidden + object-cover — no bleeding/overflow, no duplicate-across-distinct-cards. File: app/page.tsx
- [x] 3 Continuous right→left rAF marquee on a duplicated seamless track; pause on hover; white circular arrows nudge manually; hover lift on cards. File: app/page.tsx
- [x] 4 Promo banner keeps slide-in message cycle + prefers-reduced-motion guard. File: app/globals.css
- [x] 5 Cleanup: removed old stepped-interval carousel + hardcoded-hex DEALS. File: app/page.tsx
- [x] Verify: tsc clean, lint clean, build green.

### Phase 4 fixes (post-review)
- [x] Fix 1: deal cards cycle EXACTLY #06C167/#9F6402/#FFCF70/#FFF2D9 via `--deal-*` tokens (same in light+dark); white text on green/brown, dark text on amber/cream; white CTA has border+shadow to stay visible on cream. Files: globals.css, app/page.tsx
- [x] Fix 2: CTA = true horizontal oval (h-11 rounded-full px-8 min-w-180). File: app/page.tsx
- [x] Fix 3: sidebar section titles single-line (truncate/nowrap + shrink-0 chevron) so "Daily Challenges" aligns flush. File: components/SidebarContent.tsx
## Phase 5A — Business account FOUNDATION — DONE (user must run migration)
Decisions (user): FULL reconcile now (Home reads businesses); demo seed via SQL with OWNER_USER_ID placeholder.
⚠️ FOUND: migrations folder is inconsistent with the live DB (no businesses CREATE; profiles.type not in repo; TWO conflicting `reviews` tables 008 vs 035). So migration 042 is additive/idempotent/guarded.
- [x] 1 Migration `042_business_accounts.sql`: profiles.account_type; ensure businesses table + onboarding columns; RLS (public read, owner-only write); backfill profile-storefronts→businesses + mark owners business; guarded demo seed (business + 2 menu items + 1 review) w/ OWNER_USER_ID placeholder. **USER MUST RUN IT** in Supabase SQL editor (set OWNER_USER_ID first).
- [x] 2 `/business/new` onboarding (name, category, address, description, hours, contact, logo URL) → validates → inserts businesses row → sets account_type=business → redirects /manager. File: app/business/new/page.tsx
- [x] 3 `/manager` distinct shell (app/manager/layout.tsx: own fixed top bar + left nav rail + mobile scroll nav, Localys tokens) + 9 stub pages (dashboard/analytics/feedback/content/menu/orders/marketing/payments/settings).
- [x] 4 Switching: drawer (account_type) → customer '/business/new' / owner '/manager'; Manager top bar 'Switch to Customer view' → '/'; business-less user hitting /manager is redirected to onboarding.
- [x] 5 Reconcile/cleanup: Home + drawer now use businesses + account_type (single source of truth); LayoutShell renders /manager bare (responsive-container wrapper moved into LayoutShell); AppBottomNav hidden on /manager. (Remaining profiles.type usages are the profile storefront view — Phase 5B/later.)
- [x] Verify: clean build (all routes incl. /manager/* + /business/new), tsc clean, changed files lint-clean.
- NOTE 5B: Manager data sections (dashboard metrics, reviews+replies, content, menu, orders, advertise) are stubs.

## Phase 5 — (superseded by 5A/5B split above)
## Phase 6 — Communities / Profile / Order History / Coins-Rewards
