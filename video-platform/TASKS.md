# Localys restructure + fix pass — TASKS

Decisions: category icons = PNG files in `/public/categories/`; community↔thread link = Supabase migration; video feed = Explore (normal page), Home = storefront.

## Part 1 — IA restructure
- [ ] 1A Home → storefront
- [ ] 1B Explore → video feed
- [ ] 1C Communities → threads
- [ ] 1D Search → users-only (no filters)
- [ ] 1E Left nav order: Home, Explore, Communities, Messages, Cart

## Part 2 — Home storefront (Uber-Eats layout)
- [ ] Pickup|Service toggle + location + cart
- [ ] Category emoji row (PNG) above chips
- [ ] Chip filters (Offers/Distance dropdown/Rating/Sort)
- [ ] Deals carousel
- [ ] Featured / Today's offers / Stores near you (no delivery fees)

## Part 3 — Communities + threads
- [ ] Threads feed w/ upvote/downvote + comments + share
- [ ] Community page shows only that community's threads
- [ ] Create post in community = text thread (not video)
- [ ] Migration: communities table + community_id on shoutouts

## Part 4 — Coins/Rewards
- [ ] Pure white (light), rounded cards, fewer circles, no "+", black coins text
- [ ] Coins → store credit conversion (separate from coupons)
- [ ] Rebalance earn rates

## Part 5 — Notifications + Advertise icons (inline SVG) ✓
## Part 6 — Shop rating stars overflow ✓
## Part 7 — Search button oval, right-anchored
## Part 8 — Profile: 8A order history page, 8B name-reset bug, 8C dark bg
## Part 9 — Text full black in light mode
