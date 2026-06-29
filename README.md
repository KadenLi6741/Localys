# Localy — Small Business Discovery Platform

> **FBLA Event: Byte-Sized Business Boost**

Localy is a TikTok-style video-first marketplace that helps consumers discover, review, and order from local small businesses — and gives business owners a full analytics and promotion dashboard.

---

## How It Addresses the Topic

**Byte-Sized Business Boost** challenges us to build a digital tool that gives small, local businesses a real boost. Localy does exactly that: it turns the same short-form, "byte-sized" video format that powers today's biggest social platforms into a discovery engine for the corner restaurant, the neighborhood florist, and the local trades business. Each business gets a free storefront, a video feed to showcase products, customer reviews and ratings to build trust, deals and coupons to drive traffic, and an owner analytics dashboard to understand performance — leveling the playing field against large chains that can afford expensive marketing. By combining discovery, reviews, promotions, and ordering in one place, Localy helps consumers find and support local businesses while giving those businesses the online visibility and sales tools they normally lack.

---

## What the App Does

Small businesses are often invisible online. Localy solves this by letting businesses post short-form videos of their products and services. Consumers scroll a vertical video feed, discover nearby stores, read reviews, and buy — all in one place.

### Main Features

| Feature | Description |
|---|---|
| **Discover Feed** | TikTok-style vertical video feed. Swipe or scroll between business videos. Like, comment, bookmark, and share from the action rail beside the video. |
| **Store Pages** | Full store profile with menu items, ratings, photos, category, and distance. |
| **Search & Filters** | Real-time search across businesses and menu items with category and distance filters. |
| **Sort by Category** | Browse and sort businesses by category (food, retail, services, trades, etc.). |
| **Reviews & Ratings** | Star ratings and text reviews attached to videos. Comment counts sync live via Supabase Realtime. |
| **Sort by Reviews / Ratings** | Rank and sort businesses by their average rating and number of reviews. |
| **Bookmarks / Saved (Favorites)** | Bookmark favorite videos and stores; view them in your profile's Saved tab. |
| **Deals & Coupons** | Promotional codes and featured deal banners on the home screen. |
| **Bot-Prevention Verification** | Cloudflare Turnstile bot-prevention check on sign-up / login forms to stop automated abuse. |
| **Cart & Checkout** | Full shopping cart with Stripe-powered secure checkout and order confirmation. |
| **Order History** | Per-user order history with itemized receipts. |
| **Business Manager & Reports** | Dashboard for business owners: revenue charts, video performance, top-selling items, coupon management, and PDF export. |
| **AI Assistant** | In-app chat assistant powered by Google Gemini; answers questions about local businesses and the platform. |
| **Communities** | Threaded discussion boards for local neighborhoods and interest groups. |
| **Localy Premium** | Subscription tier unlocked via Stripe; gives users a badge and elevated features. |
| **Localy Coins** | In-app virtual currency; purchasable via Stripe; used for promotions and rewards. |
| **Group Orders** | Shareable group-order links so friends can add to a single cart. |
| **Dark / Light Mode** | System-aware theme with manual toggle; persisted in localStorage. |
| **Multilingual UI** | Language context supports i18n string swaps throughout the UI. |
| **PWA / Mobile** | Installable as a Progressive Web App; bottom nav for mobile, sidebar for desktop. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components, API Routes) |
| UI Library | **React 19** |
| Language | **TypeScript 5.9** |
| Styling | **Tailwind CSS 4** |
| Database & Auth | **Supabase** (PostgreSQL, Row-Level Security, Realtime, Storage) |
| Payments | **Stripe** (checkout sessions, webhooks, subscriptions) |
| AI | **Google Gemini** API (via `/api/assistant` server route) |
| Maps | **Google Maps JavaScript API** + Geocoding API |
| Bot Protection | **Cloudflare Turnstile** |
| Charts | **Recharts** |
| Icons | **Lucide React** |
| PDF Export | **jsPDF** + **jspdf-autotable** |
| Animation | **Framer Motion** |
| QR Codes | **jsQR** + **qrcode.react** |
| Validation | **Zod** |
| Image Optimization | **Sharp** |
| Hosting | **Vercel** |
| Version Control | **GitHub** |
| Fonts | Google Fonts — Outfit, Inter, Anton, JetBrains Mono |

---

## Running Locally

```bash
# 1. Enter the project directory
cd video-platform

# 2. Install dependencies
npm install

# 3. Create environment file and fill in your keys
#    Required variables:
#      NEXT_PUBLIC_SUPABASE_URL
#      NEXT_PUBLIC_SUPABASE_ANON_KEY
#      SUPABASE_SERVICE_ROLE_KEY
#      STRIPE_SECRET_KEY
#      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
#      STRIPE_WEBHOOK_SECRET
#      GEMINI_API_KEY
#      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
#      NEXT_PUBLIC_TURNSTILE_SITE_KEY
#      TURNSTILE_SECRET_KEY

# 4. Start the development server
npm run dev
# App runs at http://localhost:3000
```

---

## Folder Structure

```
video-platform/
├── app/                        # Next.js App Router pages & API routes
│   ├── (auth)/                 # Login, signup, reset-password
│   ├── (marketing)/            # Public landing page
│   ├── api/                    # Server-side API routes
│   │   ├── assistant/          # Google Gemini AI endpoint
│   │   ├── checkout/           # Stripe checkout session
│   │   ├── subscribe-premium/  # Stripe premium subscription
│   │   ├── verify-purchase/    # Post-purchase order verification
│   │   └── webhooks/stripe/    # Stripe webhook handler
│   ├── feed/                   # Discover video feed
│   ├── home/                   # Home screen (deals, featured, ranked lists)
│   ├── communities/            # Community boards and threads
│   ├── profile/                # User profile and activity tabs
│   ├── dashboard/              # Business owner analytics dashboard
│   ├── cart/ checkout/         # Shopping cart and Stripe checkout
│   ├── chats/                  # Direct messaging
│   ├── premium/ buy-coins/     # Premium and coin purchase flows
│   └── upload/                 # Video upload
├── components/                 # Reusable React components
│   ├── HomeContent.tsx         # Discover feed — video player + engagement logic
│   ├── AppChrome.tsx           # App shell (header, nav, persistent feed mount)
│   ├── shell/                  # TopHeader, SecondaryNav, SearchDropdown, FilterPanel
│   ├── feed/                   # BusinessItemsRail, MenuPopup
│   ├── home/                   # BusinessCard, ProductCarousel, DealsHero, etc.
│   ├── store/                  # StorePage, StoreItemCards, InfoModal
│   ├── analytics/              # Dashboard charts and stat cards
│   ├── communities/            # CommunityAvatar, PostMedia
│   ├── comments/               # CommentSection, CommentItem, CommentForm
│   ├── chats/                  # ChatList, ChatWindow, NewChatModal
│   └── messaging/              # Lower-level chat primitives
├── contexts/                   # React context providers
│   ├── AuthContext.tsx         # Supabase session + user state
│   ├── CartContext.tsx         # Shopping cart state
│   ├── ThemeContext.tsx        # Dark/light mode
│   ├── LanguageContext.tsx     # i18n
│   └── DeliveryLocationContext.tsx
├── hooks/                      # Custom React hooks (analytics, chats, messages)
├── lib/                        # Utilities and Supabase helpers
│   ├── supabase/               # Per-feature Supabase query functions
│   └── utils/                  # geo, distance, pricing, share, validation, etc.
├── models/                     # TypeScript type definitions
├── services/                   # Business-logic service layer
├── supabase/                   # SQL migration files
├── data/                       # Seed data (stores, menus, images JSON)
├── scripts/                    # Data seeding scripts
└── public/                     # Static assets (videos, images, icons)
```

---

## Credits & Attributions

All store/business images are sourced from third-party websites and are used for educational, non-commercial purposes for the FBLA Coding & Programming competition. Full per-store image sources and library licenses are listed in [CREDITS.md](CREDITS.md).

**Main templates & libraries used:** [Next.js](https://nextjs.org), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org), [Tailwind CSS](https://tailwindcss.com), [Supabase](https://supabase.com), [Stripe](https://stripe.com), [Framer Motion](https://www.framer.com/motion), [Recharts](https://recharts.org), and [Lucide](https://lucide.dev) icons — see the [full libraries & licenses section in CREDITS.md](CREDITS.md#third-party-libraries--frameworks) for the complete list with versions and licenses.
