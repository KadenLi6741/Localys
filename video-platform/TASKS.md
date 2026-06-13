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
