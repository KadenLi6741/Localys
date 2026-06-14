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
