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

## Phase 2 — Header + hamburger account drawer (NEXT, after approval)
## Phase 3 — Home storefront (emoji categories, balance, circular logos)
## Phase 4 — Deals carousel + motion (fix image mapping)
## Phase 5 — Business account + Localys Manager (separate /manager app) + backend
## Phase 6 — Communities / Profile / Order History / Coins-Rewards
