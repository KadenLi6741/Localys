# Localy — Project Report

**FBLA Event: Byte-Sized Business Boost**

---

## 1. Problem Statement

Small local businesses — restaurants, boutiques, flower shops, pharmacies — are increasingly invisible online. Platforms like Google Maps require active search intent; social media algorithms favor large accounts; Yelp and similar directories are text-heavy and static. There is no zero-friction way for a local business to show a potential nearby customer what they sell, what it looks like, and how to buy it right now.

Localy solves this with a video-first discovery experience. A business owner records a short video of their product or storefront, uploads it, and appears in the feeds of consumers in their area. The consumer sees the food or item in action, checks reviews, taps to buy, and checks out — without ever leaving the app.

---

## 2. What Localy Is

Localy is a full-stack web application (Progressive Web App) that combines:

- A **TikTok-style vertical video feed** for discovering local businesses
- A **marketplace** with cart, Stripe checkout, and order history
- A **business owner dashboard** with analytics, coupons, and PDF reports
- An **AI assistant** powered by Google Gemini for answering questions about local businesses
- **Communities**, **direct messaging**, and **social features** (likes, bookmarks, follows)
- **Localy Coins** and **Localy Premium** as monetization layers

The target users are two-sided:

| User Type | What They Get |
|---|---|
| Consumers | Discover nearby businesses, watch videos, read reviews, order food and products |
| Business Owners | Upload promotional videos, manage menu items, run promotions, view analytics |

---

## 3. Key Features

### 3.1 Discover Feed

The core of the app. A full-screen vertical video player that auto-plays one video at a time. Users scroll or swipe to move between videos. Each video is linked to a real business. The engagement action rail (like, comment, location, bookmark, share, send) sits beside the video on desktop. Up/down arrow buttons provide explicit navigation. Video views are tracked in Supabase.

### 3.2 Store Pages & Menus

Each business has a dedicated store page showing its name, category, rating, menu items with photos and prices, and a Google Map of its location. Items can be added to the cart directly from the store page.

### 3.3 Search & Filters

A real-time search bar in the top header queries businesses and menu items from Supabase. A filter panel allows narrowing by category (restaurants, retail, health, etc.) and distance.

### 3.4 Reviews & Ratings

Users can leave starred reviews and text comments on business videos. Comments are stored in Supabase with real-time count updates via Supabase Realtime subscriptions. A star rating aggregation is displayed on store pages.

### 3.5 Cart & Checkout

A persistent cart (React Context, `CartContext`) allows adding items from multiple videos. At checkout, a Stripe Checkout Session is created server-side via `/api/checkout`. After payment, a Stripe webhook (`/api/webhooks/stripe`) confirms the order and saves it to `order_history`. The purchase-success page reads the real order total and line items.

### 3.6 Business Manager & Reports

Business owners access a private dashboard at `/dashboard`. It shows:
- Revenue over time (RevenueChart)
- Orders breakdown (OrdersBreakdownChart)
- Top-selling items (TopSellingItemsChart)
- Video view counts and conversion (VideoConversionChart, VideoPerformanceTable)
- Coin distribution and spending
- PDF report export via jsPDF + jspdf-autotable

### 3.7 AI Assistant

A floating chat widget (`LocalysAssistant`) sends typed questions to `/api/assistant`, which calls Google Gemini with a grounded system prompt describing Localy's features and local business context. The assistant can answer questions about stores, hours, and how to use the app.

### 3.8 Communities

Threaded discussion boards at `/communities`. Each community has posts and threaded replies. State is managed via `CommunitiesContext`. Media attachments are supported via Supabase Storage.

### 3.9 Premium & Coins

Localy Coins are a virtual currency purchased at `/buy-coins` via Stripe. Localy Premium is a recurring subscription purchased at `/premium` via Stripe. Premium status is verified server-side in `/api/verify-premium`.

### 3.10 Messaging

Direct one-to-one chat between users, accessible at `/chats`. Messages are stored in Supabase and delivered in real time via Supabase Realtime.

---

## 4. Architecture

### 4.1 Stack Overview

```
Browser  →  Next.js (App Router)  →  Supabase (PostgreSQL + Auth + Realtime + Storage)
                  ↓
          API Routes (Node.js)   →  Stripe  /  Google Gemini  /  Google Maps
```

### 4.2 Rendering Strategy

- **Server Components**: layout shells, static pages, metadata
- **Client Components** (`'use client'`): interactive pages (feed, cart, dashboard, chats, communities)
- **API Routes**: payment intents, AI calls, webhook processing — anything requiring secret keys

### 4.3 Data Layer

All database access goes through typed helper functions in `lib/supabase/`. These functions wrap the Supabase JS client and return typed results. There is a service layer in `services/` that provides class-based abstractions (VideoService, CommentService, etc.) for more complex business logic.

### 4.4 Auth

Supabase Auth handles sign-up, login, email verification, and session management. `AuthContext` wraps the Supabase session and exposes `user` and `loading` to all components. Protected routes use `ProtectedRoute` to redirect unauthenticated users.

### 4.5 State Management

| State | Mechanism |
|---|---|
| Auth session | `AuthContext` (Supabase listener) |
| Cart | `CartContext` (React state + localStorage) |
| Theme | `ThemeContext` (localStorage + CSS class on `<html>`) |
| Language | `LanguageContext` (state + translation map) |
| Delivery location | `DeliveryLocationContext` |
| Communities | `CommunitiesContext` |
| Video feed | Local state inside `HomeContent` |

### 4.6 Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `profiles` | User profiles, coin balance, premium status, account type |
| `videos` | Video records with URL, caption, business link |
| `businesses` | Business profiles, category, location, rating |
| `menu_items` | Products/items sold by a business |
| `likes` | Video and business likes |
| `comments` | Reviews and comment threads |
| `video_bookmarks` | Saved videos per user |
| `order_history` | Completed orders |
| `messages` | Direct messages |
| `follows` | Follow relationships between users |
| `communities` | Community boards |
| `community_posts` | Posts within communities |
| `coupons` | Promotional codes |
| `liked_items` | Client-side persisted item likes |

---

## 5. Code Organization

```
video-platform/
├── app/               # Pages and API routes (Next.js App Router)
├── components/        # React UI components
├── contexts/          # React Context providers (global state)
├── hooks/             # Custom React hooks
├── lib/               # Supabase helpers, utilities
│   ├── supabase/      # One file per Supabase feature domain
│   └── utils/         # Pure utility functions
├── models/            # TypeScript interfaces
├── services/          # OOP service layer
├── supabase/          # SQL migration files
├── data/              # Seed JSON files for demo stores
├── scripts/           # Node.js seeding scripts
└── public/            # Static video and image assets
```

---

## 6. Source File Correlation

The table below maps each major feature to the primary files that implement it.

| Feature | Primary Files |
|---|---|
| **Discover Feed (video player, navigation, swipe)** | `components/HomeContent.tsx`, `components/PersistentVideoFeed.tsx`, `app/feed/page.tsx` |
| **Feed action rail (like/comment/bookmark/share)** | `components/HomeContent.tsx` (action rail section, `.feed-action-rail` CSS) |
| **Up/Down video navigation arrows** | `components/HomeContent.tsx` (`.feed-nav-arrows`, `goToPrev`, `goToNext`) |
| **Business items rail in feed** | `components/feed/BusinessItemsRail.tsx`, `components/feed/MenuPopup.tsx` |
| **Video like / unlike** | `components/HomeContent.tsx` (`toggleLike`), `lib/supabase/videos.ts` (`likeItem`, `unlikeItem`) |
| **Video bookmark / save** | `components/HomeContent.tsx` (`toggleBookmark`), `lib/supabase/videos.ts` (`bookmarkVideo`) |
| **Comments / Reviews modal** | `components/CommentModal.tsx`, `components/comments/CommentSection.tsx`, `components/comments/CommentItem.tsx`, `components/comments/CommentForm.tsx` |
| **Store page** | `components/store/StorePage.tsx`, `components/store/StoreItemCards.tsx`, `components/store/InfoModal.tsx` |
| **Search & filter** | `components/shell/SearchDropdown.tsx`, `components/shell/FilterPanel.tsx`, `lib/supabase/search.ts`, `services/SearchService.ts` |
| **Cart** | `contexts/CartContext.tsx`, `app/cart/page.tsx`, `components/FloatingCartButton.tsx` |
| **Checkout (Stripe)** | `app/checkout/page.tsx`, `app/api/checkout/route.ts`, `app/api/checkout-item/route.ts` |
| **Stripe webhook & order save** | `app/api/webhooks/stripe/route.ts` |
| **Purchase success page** | `app/purchase-success/page.tsx`, `app/api/verify-purchase/route.ts` |
| **Order history** | `components/OrderHistory.tsx`, `lib/supabase/reviews.ts` |
| **Business owner dashboard** | `app/dashboard/page.tsx`, `components/analytics/AnalyticsDashboard.tsx` |
| **Revenue / analytics charts** | `components/analytics/RevenueChart.tsx`, `components/analytics/OrdersBreakdownChart.tsx`, `components/analytics/VideoConversionChart.tsx`, `components/analytics/TopSellingItemsChart.tsx`, `hooks/useAnalytics.ts`, `hooks/useFinancialAnalytics.ts` |
| **PDF report export** | `components/dashboard/BusinessReports.tsx`, `lib/reports.ts` |
| **AI assistant** | `components/LocalysAssistant.tsx`, `app/api/assistant/route.ts` |
| **Communities** | `app/communities/page.tsx`, `app/communities/[id]/page.tsx`, `contexts/CommunitiesContext.tsx`, `components/communities/CommunityAvatar.tsx`, `components/communities/PostMedia.tsx` |
| **Direct messaging** | `app/chats/page.tsx`, `app/chats/[id]/page.tsx`, `components/chats/ChatWindow.tsx`, `components/chats/ChatList.tsx`, `hooks/useChats.ts`, `hooks/useMessages.ts`, `lib/supabase/messaging.ts` |
| **Follow / unfollow** | `components/HomeContent.tsx` (`toggleVideoFollow`), Supabase `follows` table |
| **User profile & activity tabs** | `app/profile/page.tsx`, `app/profile/[userId]/page.tsx`, `components/PostedVideos.tsx`, `components/BookmarkedVideos.tsx` |
| **Auth (login / signup / reset)** | `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/reset-password/page.tsx`, `contexts/AuthContext.tsx`, `lib/supabase/auth.ts`, `components/auth/AuthSplitLayout.tsx` |
| **Bot protection (Turnstile)** | `components/TurnstileWidget.tsx`, `app/api/verify-turnstile/route.ts` |
| **Localy Coins purchase** | `app/buy-coins/page.tsx`, `app/api/checkout/route.ts` |
| **Localy Premium subscription** | `app/premium/page.tsx`, `app/api/subscribe-premium/route.ts`, `app/api/verify-premium/route.ts` |
| **Group orders** | `app/group-order/[code]/page.tsx`, `lib/supabase/group-orders.ts` |
| **Dark / light mode** | `contexts/ThemeContext.tsx`, `components/ThemeToggle.tsx`, `app/layout.tsx` (inline theme init script) |
| **Multilingual UI** | `contexts/LanguageContext.tsx`, `lib/translations.ts`, `hooks/useTranslation.ts`, `components/LanguageSettings.tsx` |
| **Settings page** | `app/settings/page.tsx` |
| **Video upload** | `app/upload/page.tsx`, `lib/supabase/videos.ts` |
| **QR code (group order share)** | `components/QRCode.tsx`, `components/QRScanner.tsx` |
| **Google Maps (store location)** | `components/GoogleMap.tsx`, `components/BusinessLocationMap.tsx`, `components/LocationPickerMap.tsx`, `lib/utils/googleMapsLoader.ts`, `lib/utils/googleGeocode.ts` |
| **Distance calculation** | `lib/utils/geo.ts` (`haversineDistance`), `lib/utils/distance.ts`, `lib/utils/useStoreDistance.ts` |
| **Deals / coupons / promo codes** | `components/home/DealsHero.tsx`, `lib/supabase/coupons.ts`, `lib/supabase/promo-codes.ts` |
| **Home screen (ranked lists, featured)** | `app/home/page.tsx`, `components/HomeContent.tsx` (home data), `components/home/RankedLists.tsx`, `components/home/FeaturedInVideos.tsx`, `components/home/BusinessesRow.tsx`, `lib/home-data.ts` |
| **App shell (header, nav, sidebar)** | `components/AppChrome.tsx`, `components/shell/TopHeader.tsx`, `components/shell/SecondaryNav.tsx`, `components/AppBottomNav.tsx`, `components/DesktopSidebar.tsx` |
| **Supabase DB migrations** | `supabase/rls_policies.sql`, `supabase/20240626_business_manager.sql`, `supabase/20260627_businesses_rls_fix.sql`, `supabase/20260627_premium.sql`, `supabase/20260627_liked_items.sql` |
| **Demo data (seed stores, menus)** | `lib/demoStores.ts`, `lib/demoVideos.ts`, `lib/businessAliases.ts`, `data/stores.json`, `data/store-menus.json`, `scripts/seed-stores.mjs` |
| **Validation schemas** | `lib/schemas.ts` (Zod), `lib/utils/validation.ts` |
| **Rate limiting** | `lib/rate-limit.ts` |
| **Server auth helpers** | `lib/server-auth.ts`, `lib/verification.ts` |

---

## 7. Security Considerations

- All Stripe secret keys, Gemini keys, and Supabase service role keys are server-side only (never sent to the browser).
- Supabase Row-Level Security policies are applied to all tables so users can only read/write their own data.
- Cloudflare Turnstile is used on auth forms to block bots.
- API routes validate input with Zod before processing.
- Rate limiting (`lib/rate-limit.ts`) is applied to sensitive endpoints.
- Purchase verification (`/api/verify-purchase`) confirms payment directly with Stripe before saving orders.

---

## 8. Development Process

The project was built iteratively using:

- **GitHub** for version control with feature branches
- **Vercel** for continuous deployment (preview deploys on every push)
- **Supabase dashboard** for database management, RLS policy editing, and real-time log inspection
- **Stripe CLI** for local webhook testing
- **Claude Code** (Anthropic) for AI-assisted development

---

*End of Project Report*
