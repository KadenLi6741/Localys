# TikTok-Style Small Business Discovery App

## Project Overview

A vertical video scrolling application similar to TikTok, but focused on discovering and engaging with local small businesses. Users scroll through business advertisements in full-screen video format, with interactive features for reviews, messaging, bookings, and payments.

##Tech Stack:
- Frontend: React Native with TypeScript, Expo, and Expo Router
- Backend/Database: Supabase
- UI Framework: React Native Paper
- AI Processing: DeepSeek

## Core Features

### 0. Sign-Up/Login

 **Options**: Email based sign-up and login
 **Flow**: user inputs credentials, succesful login and signup redirects to main dashboard

### 1. Video Feed (Main Content)
- **Full-screen vertical video display** - Business advertisements shown in TikTok-style format
- **Swipeable content** - Users can scroll through different business videos
- **Video-centric design** - Large video player takes center stage

### 2. Navigation Hotbar (Bottom)
- **Home** - Return to main video feed
- **Search** - Access search and filtering tools
- **Plus Button** - Create and upload your own business advertisement
- **Chats** - Direct messaging with businesses
- **Profile** - User profile and settings

### 3. Video Interaction Panel (Right Side)
Each video displays interactive buttons on the right side:
- **Profile Button** - View business profile
- **Likes** - Like/favorite a business
- **Reviews** - View and leave reviews (replaces comments)
- **Bookmark** - Save business to favorites
- **Location** - View business location on map

### 4. Business Profile Information (Right Side of Video)
Displayed vertically on the right side of each video:
- **Profile Picture** (top) - Business owner/logo
  - Clickable to send default quick messages:
    - "Are you available for bookings?"
    - "How much is the price?"
    - Custom message input bar
- **Reviews Section** - Star rating display
  - Shows verified customer reviews only
  - Rating based on review quality and quantity
- **Location** - Google Maps integration
  - Shows distance from user's location
  - Clickable link to open in Google Maps
- **Bookmark Button** - Save to favorites
- **Share Button** - Share business (TikTok-style sharing)

### 5. Search & Filter System (Left Side)
Located on the left side of the screen:
- **Logo** (top) - App branding
- **Search Bar** - Text search for businesses
- **AI-Assisted Filters:**
  - **Location** - "5km near me" radius filter
  - **Rating** - Filter by star rating (e.g., "5 star reviews")
  - **Price Range** - Slider filter from $0-$1000
  - **Category** - Filter by business type:
    - Food
    - Retail
    - Services
- **Search Results** - When search is executed:
  - Displays list of matching businesses
  - Replaces video feed with search results
  - Clicking a result loads that business's video

### 6. Messaging System
- **Direct Messaging** - Users can message business owners
- **Quick Message Templates:**
  - "Are you available for bookings?"
  - "How much is the price?"
  - Custom message input
- **Message History** - View all conversations in Chats tab

### 7. Reviews System
- **Verified Reviews Only** - Reviews allowed only after verified purchase
- **Purchase Verification** - Purchase must be completed through the app
- **Incentive System** - Leaving reviews rewards users with:
  - Coupons
  - Special deals
  - Other incentives
- **Review Display** - Shows star ratings and verified customer badge

### 8. Booking & Payment System
- **Purchase Flow:**
  1. User agrees to purchase service/product
  2. Seller sends payment request
  3. User approves and payment is processed
  4. Seller completes work/service
  5. User can add tip after completion
- **Notifications** - Seller receives notification when:
  - Payment is received
  - Work is completed
  - Tip is added

### 9. Activity Tab
- **Notifications** - Located below Messaging tab
- Shows:
  - Payment confirmations
  - Work completion notifications
  - Tip notifications
  - Other activity updates

### 10. Profile Page
- **User Profile Editing:**
  - Edit personal information
  - Manage business advertisement
  - View passes/coupons
- **Suggested Businesses** - List of recommended businesses to engage with
- **Profile Settings** (click into profile):
  - Payment methods
  - Language preferences
  - Location settings

### 11. Business Profile Pages
Each business has a dedicated profile page including:
- Business name
- Description
- Contact information
- Reviews and ratings
- Special deals or coupons
- Business advertisement video

## Technical Requirements

### Code Standards
- **Standalone Execution** - Code must run independently with no programming errors
- **Security** - No malware, unsafe libraries, or copyrighted assets
- **Free Libraries Only** - Use only free and documented libraries
- **Code Documentation** - Clearly comment all code sections
- **README Required** - Include comprehensive README with:
  - What the app does
  - How to run it
  - Libraries or templates used

### Design Expectations
- **Simple, Clean UI** - Focus on usability over complexity
- **Easy Demonstration** - Should be easy to show live to judges
- **Functionality First** - Emphasize working features over flashy design

## Output Requirements

### Source Code Structure
- Generate complete, structured source code
- Include sample data for:
  - Businesses
  - Reviews
  - Coupons
  - Users

### Documentation
- Explain how each feature works
- Provide clear instructions for demonstrating features to judges
- Include setup and installation guide

## UI Layout Summary

### Main Screen (Video Feed)
```
┌─────────────────────────────────────┐
│  [Logo]  [Search Bar + Filters]     │ ← Left Side
│                                      │
│         ┌──────────────┐            │
│         │              │  [Profile] │ ← Right Side
│         │              │  [Likes]   │
│         │   VIDEO      │  [Reviews] │
│         │   PLAYER     │  [Location]│
│         │              │  [Bookmark]│
│         │              │  [Share]   │
│         └──────────────┘            │
│                                      │
│  [Home] [Search] [+] [Chat] [Profile] ← Bottom Hotbar
└─────────────────────────────────────┘
```

### Navigation Structure
1. **Home** → Main video feed
2. **Search** → Search bar + filters + results list
3. **Plus** → Create business advertisement
4. **Chats** → Messaging interface
5. **Profile** → User profile + settings + suggested businesses

## Key Interactions

1. **Scrolling** - Swipe up/down to navigate between business videos
2. **Search** - Use filters to find specific businesses, results replace feed
3. **Messaging** - Quick message buttons or custom input
4. **Reviews** - Only after verified purchase through app
5. **Bookings** - Request → Payment → Service → Tip workflow
6. **Bookmarking** - Save favorites to profile

## Database Schema (Supabase)

### Tables

#### 1. `users`
Stores user account information and profiles.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  profile_picture_url TEXT,
  bio TEXT,
  phone_number TEXT,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  language_preference TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `businesses`
Stores business information and profiles.

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('food', 'retail', 'services')),
  profile_picture_url TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  price_range_min DECIMAL(10, 2) DEFAULT 0,
  price_range_max DECIMAL(10, 2),
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. `reviews`
Stores verified customer reviews for businesses.

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id, booking_id)
);
```

#### 4. `bookings`
Stores purchase/booking transactions.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'requested', 'paid', 'in_progress', 'completed', 'cancelled')),
  payment_requested_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tip_added_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. `payments`
Stores payment transaction records.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  payment_provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. `messages`
Stores direct messages between users and businesses.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_quick_message BOOLEAN DEFAULT FALSE,
  quick_message_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. `conversations`
Stores conversation metadata between users and businesses.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  last_message_id UUID REFERENCES messages(id),
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count_user INTEGER DEFAULT 0,
  unread_count_business INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);
```

#### 8. `bookmarks`
Stores user bookmarks/favorites.

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);
```

#### 9. `likes`
Stores user likes on businesses.

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);
```

#### 10. `coupons`
Stores coupons and special deals offered by businesses or as review rewards.

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_item')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2),
  expiry_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 11. `user_coupons`
Stores coupons owned by users (from reviews or direct assignment).

```sql
CREATE TABLE user_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, coupon_id)
);
```

#### 12. `notifications`
Stores activity notifications for users.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment_received', 'payment_sent', 'work_completed', 'tip_added', 'booking_request', 'message', 'review_received', 'coupon_earned')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 13. `user_payment_methods`
Stores user payment method information.

```sql
CREATE TABLE user_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('card', 'bank_account', 'digital_wallet')),
  provider TEXT,
  last_four_digits TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_location ON businesses(latitude, longitude);
CREATE INDEX idx_businesses_rating ON businesses(average_rating);
CREATE INDEX idx_reviews_business ON reviews(business_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_bookings_business ON bookings(business_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_business ON conversations(business_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_likes_user ON likes(user_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on security requirements)
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Businesses are publicly readable
CREATE POLICY "Businesses are publicly readable" ON businesses
  FOR SELECT USING (is_active = TRUE);

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
```

## Folder Structure

### Recommended Project Structure

```
FBLC/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication routes group
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home/Video Feed
│   │   ├── search.tsx            # Search & Filters
│   │   ├── create.tsx             # Create Business Video
│   │   ├── chats.tsx              # Messaging
│   │   ├── profile.tsx             # User Profile
│   │   └── _layout.tsx           # Tab navigation layout
│   ├── business/                  # Business profile routes
│   │   ├── [id].tsx              # Business detail page
│   │   └── edit.tsx              # Edit business
│   ├── booking/                   # Booking routes
│   │   ├── [id].tsx              # Booking details
│   │   └── create.tsx            # Create booking
│   ├── conversation/              # Chat routes
│   │   └── [id].tsx              # Individual conversation
│   ├── settings/                  # Settings routes
│   │   ├── index.tsx             # Settings main
│   │   ├── payment.tsx           # Payment methods
│   │   ├── language.tsx          # Language settings
│   │   └── location.tsx          # Location settings
│   ├── activity/                  # Activity/Notifications
│   │   └── index.tsx
│   ├── _layout.tsx                # Root layout
│   └── +not-found.tsx            # 404 page
│
├── components/                    # Reusable components
│   ├── video/                     # Video-related components
│   │   ├── VideoPlayer.tsx
│   │   ├── VideoFeed.tsx
│   │   └── VideoControls.tsx
│   ├── business/                  # Business components
│   │   ├── BusinessCard.tsx
│   │   ├── BusinessProfile.tsx
│   │   ├── BusinessInfo.tsx
│   │   └── BusinessVideo.tsx
│   ├── review/                    # Review components
│   │   ├── ReviewCard.tsx
│   │   ├── ReviewForm.tsx
│   │   └── StarRating.tsx
│   ├── message/                   # Messaging components
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── QuickMessages.tsx
│   │   └── ConversationList.tsx
│   ├── search/                    # Search components
│   │   ├── SearchBar.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── PriceSlider.tsx
│   │   ├── CategoryFilter.tsx
│   │   └── SearchResults.tsx
│   ├── booking/                   # Booking components
│   │   ├── BookingCard.tsx
│   │   ├── BookingForm.tsx
│   │   └── PaymentRequest.tsx
│   ├── navigation/                # Navigation components
│   │   ├── BottomTabBar.tsx
│   │   └── TopBar.tsx
│   ├── common/                    # Common UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   └── map/                       # Map components
│       └── LocationMap.tsx
│
├── lib/                           # Utilities and helpers
│   ├── supabase/                  # Supabase client and helpers
│   │   ├── client.ts              # Supabase client setup
│   │   ├── auth.ts                # Authentication helpers
│   │   ├── businesses.ts          # Business queries
│   │   ├── reviews.ts             # Review queries
│   │   ├── bookings.ts            # Booking queries
│   │   ├── messages.ts            # Message queries
│   │   └── notifications.ts       # Notification queries
│   ├── utils/                     # General utilities
│   │   ├── distance.ts            # Distance calculations
│   │   ├── formatting.ts          # Date, currency formatting
│   │   ├── validation.ts          # Form validation
│   │   └── constants.ts           # App constants
│   └── ai/                        # AI integration (DeepSeek)
│       └── search.ts              # AI-assisted search
│
├── hooks/                         # Custom React hooks
│   ├── useAuth.ts                 # Authentication hook
│   ├── useBusinesses.ts           # Business data hook
│   ├── useVideoFeed.ts            # Video feed hook
│   ├── useSearch.ts               # Search functionality hook
│   ├── useMessages.ts             # Messaging hook
│   ├── useBookings.ts             # Booking hook
│   ├── useLocation.ts             # Location services hook
│   └── useNotifications.ts         # Notifications hook
│
├── types/                         # TypeScript type definitions
│   ├── database.ts                # Database types (generated from Supabase)
│   ├── user.ts                    # User types
│   ├── business.ts                # Business types
│   ├── review.ts                  # Review types
│   ├── booking.ts                 # Booking types
│   ├── message.ts                 # Message types
│   └── navigation.ts              # Navigation types
│
├── constants/                     # App constants
│   ├── colors.ts                  # Color palette
│   ├── categories.ts              # Business categories
│   ├── quickMessages.ts           # Quick message templates
│   └── config.ts                  # App configuration
│
├── services/                      # External services
│   ├── storage.ts                 # File upload/storage
│   ├── maps.ts                    # Google Maps integration
│   └── payments.ts                # Payment processing
│
├── context/                       # React Context providers
│   ├── AuthContext.tsx            # Authentication context
│   ├── ThemeContext.tsx           # Theme context
│   └── LocationContext.tsx        # Location context
│
├── assets/                        # Static assets
│   ├── images/
│   │   ├── logo.png
│   │   └── placeholder.png
│   ├── fonts/
│   └── videos/                    # Sample videos (if any)
│
├── data/                          # Sample/mock data (for development)
│   ├── sampleBusinesses.ts
│   ├── sampleUsers.ts
│   ├── sampleReviews.ts
│   └── sampleCoupons.ts
│
├── .env.example                   # Environment variables template
├── .gitignore
├── app.json                       # Expo configuration
├── package.json
├── tsconfig.json                  # TypeScript configuration
├── babel.config.js                # Babel configuration
└── README.md                      # Project documentation
```

### Key Directory Explanations

- **`app/`** - Expo Router file-based routing. Each file becomes a route.
- **`components/`** - Reusable UI components organized by feature.
- **`lib/`** - Utility functions, Supabase helpers, and business logic.
- **`hooks/`** - Custom React hooks for data fetching and state management.
- **`types/`** - TypeScript type definitions for type safety.
- **`constants/`** - App-wide constants and configuration.
- **`services/`** - External service integrations (maps, storage, payments).
- **`context/`** - React Context providers for global state.
- **`data/`** - Sample data for development and testing.

### File Naming Conventions

- **Components**: PascalCase (e.g., `VideoPlayer.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatting.ts`)
- **Types**: camelCase (e.g., `business.ts`)
- **Constants**: camelCase (e.g., `colors.ts`)

