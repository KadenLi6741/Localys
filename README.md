# Localys

A location-based video discovery platform built with Next.js and Supabase. Users can share, discover, and interact with videos tied to local businesses and creators.

## Features

- **Video Feed** — Scrollable, TikTok-style video feed with autoplay and swipe navigation
- **Video Upload** — Upload and share videos with captions and business tagging
- **User Authentication** — Sign up, sign in, and manage user sessions via Supabase Auth
- **User Profiles** — Editable profiles with profile picture upload and bio
- **Comments & Ratings** — Threaded comment system with likes, replies, and star ratings
- **Real-Time Messaging** — One-to-one chat with real-time message delivery via Supabase Realtime
- **Video Bookmarks** — Save videos for later viewing
- **Like System** — Like videos and businesses with real-time count updates
- **Search** — Search videos and businesses with semantic keyword expansion and location-based filtering
- **Coin System** — Purchase coins via Stripe and spend them to promote videos
- **Video Promotion** — Boost video visibility in the feed using coins

## Tech Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| Framework          | Next.js 16 (App Router, React 19)  |
| Language           | TypeScript 5.9                      |
| Database & Auth    | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Payments           | Stripe                              |
| Styling            | Tailwind CSS 4                      |
| State Management   | React Context + Custom Hooks        |
| Linting            | ESLint 9                            |

## Project Structure

```
video-platform/
├── app/                 # Next.js App Router pages and API routes
│   ├── (auth)/          # Login and signup pages
│   ├── api/             # REST API endpoints (Stripe checkout, webhooks)
│   ├── buy-coins/       # Coin purchase flow
│   ├── chats/           # Messaging pages
│   ├── profile/         # User profile pages
│   ├── search/          # Search page
│   ├── upload/          # Video upload page
│   └── video/           # Video detail page
├── components/          # Reusable UI components
│   ├── chats/           # Chat UI components
│   ├── comments/        # Comment system components
│   └── messaging/       # Messaging UI components
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── models/              # TypeScript interfaces and type definitions
├── services/            # Business logic service classes (OOP)
├── lib/                 # Utilities and data access
│   ├── supabase/        # Supabase client and data access functions
│   └── utils/           # Helper utilities (geolocation, sharing)
├── public/              # Static assets
└── supabase/            # Database migrations and SQL scripts
```

## Setup

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (with Auth, Database, Storage, and Realtime enabled)
- A Stripe account (for the coin purchase feature)

### Environment Variables

Create a `.env.local` file inside `video-platform/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_BUCKET=videos
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Install Dependencies

```bash
cd video-platform
npm install
```

### Database Migrations

Run the SQL migration files in `video-platform/supabase/migrations/` against your Supabase project in order (001 through 020).

## How to Run

### Development

```bash
cd video-platform
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
cd video-platform
npm run build
npm start
```

### Linting

```bash
cd video-platform
npm run lint
```

## Future Improvements

- AI-powered search with intent classification and result ranking
- Push notifications for new messages and comments
- Video analytics dashboard for creators
- Group chat support
- Video recommendation engine based on user behavior
- Geofenced video discovery with map view
- Content moderation and reporting system
- Progressive Web App (PWA) support for mobile
