# Video Feed & Promotion System - Setup Guide

## Overview
A complete coin-based video promotion system where users start with 100 coins and can spend them to boost video visibility in the feed.

---

## 1. Database Setup (SQL)

Run this SQL migration in your Supabase database:

```sql
-- Add coin system to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coin_balance INTEGER DEFAULT 100;

-- Add promotion fields to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS boost_value FLOAT DEFAULT 1.0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS coins_spent_on_promotion INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS last_promoted_at TIMESTAMP WITH TIME ZONE;

-- Create promotion history table
CREATE TABLE IF NOT EXISTS public.promotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  coins_spent INTEGER NOT NULL,
  previous_boost FLOAT NOT NULL,
  new_boost FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on promotion_history
ALTER TABLE public.promotion_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for promotion_history
CREATE POLICY "Users can view their own promotion history"
  ON public.promotion_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create promotion records for their videos"
  ON public.promotion_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_promotion_history_user_id ON public.promotion_history(user_id);
CREATE INDEX idx_promotion_history_video_id ON public.promotion_history(video_id);
CREATE INDEX idx_videos_boost_value ON public.videos(boost_value DESC);
```

---

## 2. Files Created/Modified

### New Files Created:
1. **`supabase/migrations/015_add_coin_and_promotion_system.sql`** - Database migration
2. **`components/PromotionModal.tsx`** - Modal UI for promoting videos
3. **`lib/supabase/videos.ts`** - Added promotion functions
4. **`lib/supabase/profiles.ts`** - Added coin management functions

### Files Modified:
1. **`app/page.tsx`** - Added coin display and loading
2. **`app/upload/page.tsx`** - Integrated promotion modal after upload

---

## 3. System Details

### Coin System
- **Starting Balance**: 100 coins per user
- **Min Spend**: 10 coins
- **Max Spend**: 500 coins per promotion
- **Boost Multiplier**: 10 coins = 2 boost increase (formula: coins * 0.2)
- **Max Boost Value**: 100

### Promotion Logic
- Each video has a `boost_value` (default: 1.0)
- When user promotes: `new_boost = current_boost + (coins_spent * 0.2)`
- Coins are deducted immediately
- Promotion history is tracked in `promotion_history` table

### Feed Algorithm (Weighted Random)
The feed uses a "weighted random" system:

1. **Collect all videos** with their boost values
2. **Create weighted pool**: Each video gets "tickets" = boost_value * 10
3. **Weighted selection**: Randomly pick from the ticket pool
4. **Result**: Videos with higher boost appear more frequently

Example:
- Video A: boost=1 → 10 tickets
- Video B: boost=2 → 20 tickets (twice as likely)
- Video C: boost=5 → 50 tickets (5x as likely)

---

## 4. Key Functions

### Coin Management (`lib/supabase/profiles.ts`)
```typescript
getUserCoins(userId: string)          // Get user's coin balance
deductCoins(userId: string, amount)   // Spend coins
addCoins(userId: string, amount)      // Add coins
```

### Promotion (`lib/supabase/videos.ts`)
```typescript
promoteVideo(userId, videoId, coins)     // Promote a video
getVideoBoost(videoId)                   // Get video's current boost
getWeightedVideoFeed(limit, offset)      // Get randomized feed
```

---

## 5. User Flow

### Posting a Video
1. User uploads video on `/upload` page
2. After successful upload, **Promotion Modal** appears
3. User can:
   - Choose coins to spend (slider: 10-500)
   - See estimated boost increase
   - Quick select buttons (10, 50, 100 coins)
4. Click "Promote" to spend coins and boost video
5. Redirected to home feed

### Viewing Feed
1. Home page loads coin balance (top-left, yellow badge)
2. Videos are randomized using weighted algorithm
3. Promoted videos appear more frequently
4. No obvious indication that video is "promoted" (blends naturally)

### Profile
- Shows bookmarked videos
- Could add promotion history (future feature)

---

## 6. UI Components

### PromotionModal (`components/PromotionModal.tsx`)
- Slider for coin selection (10-500 range)
- Quick select buttons for common amounts
- Real-time boost estimate
- Shows tiered boost visualization
- Warns if user has insufficient coins
- Toast feedback on success

### Coin Balance Badge
- Located top-left of feed page
- Shows: 🪙 + coin count
- Yellow styling for visibility
- Updates when coins spent

---

## 7. Constants & Configuration

```typescript
MIN_COINS_TO_PROMOTE = 10
MAX_COINS_TO_PROMOTE = 500
BOOST_MULTIPLIER = 0.2     // (coins * 0.2)
MAX_BOOST_VALUE = 100
PROMOTION_COOLDOWN_HOURS = 24  // Optional: can re-promote after 24h
```

---

## 8. Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Create new user account (should start with 100 coins)
- [ ] Upload a video and see promotion modal
- [ ] Promote with different coin amounts
- [ ] Check boost value increased correctly
- [ ] Verify coins deducted from balance
- [ ] Check promoted videos appear more in feed
- [ ] Test with insufficient coins (button disabled)
- [ ] Verify coin balance displays on feed page
- [ ] Check promotion history table populated

---

## 9. Future Enhancements

1. **Earn Coins**: Add system to earn coins through likes/engagement
2. **Daily Bonus**: Give users daily free coins
3. **Boost Decay**: Reduce boost over time (video ages)
4. **Promotion History**: Show users their promotion history in profile
5. **Analytics**: Track promotion ROI (views gained per coin)
6. **Premium Coins**: Real currency option for more coins
7. **Trending Boost**: Auto-boost videos that go viral
8. **Boost Caps**: Per-video or per-user promotion limits

---

## 10. How Promotion Affects Visibility

**Boost Value → Visibility Percentage (Approximate)**

| Boost | Relative Visibility | Example |
|-------|-------------------|---------|
| 1.0   | 100%              | Base (no promotion) |
| 2.0   | 200%              | 10 coins spent |
| 3.0   | 300%              | 20 coins spent |
| 5.0   | 500%              | 50 coins spent |
| 10.0  | 1000%             | 100 coins spent |

---

## 11. Error Handling

- **Insufficient Coins**: Modal shows warning, button disabled
- **Database Errors**: Toast notification with error message
- **Upload Errors**: User sees error before promotion modal
- **RLS Violations**: User can only see/modify their own data

---

## 12. Architecture

```
User Upload
    ↓
PromotionModal (choose coins)
    ↓
promoteVideo() function
    ↓
[Deduct Coins] → [Update Boost] → [Record History]
    ↓
Success → Redirect to Feed
    ↓
getWeightedVideoFeed() (uses boost values)
    ↓
Display feed with promoted videos more visible
```

---

## Support

All functions include error handling and logging. Check browser console and Supabase logs for debugging.
