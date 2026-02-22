# Like Button Setup - Complete & Ready

## Status
✅ **Like button is fully implemented and communicates with Supabase**

## What's Working

### Frontend (React)
- Like button appears on the right side of each video (red heart icon)
- Shows like count below the heart
- Heart turns **red** when liked, **outline** when not liked
- Clicking the heart instantly updates the UI (optimistic update)
- Animation effect when clicking

### Backend (Supabase)
When you click the heart, here's what happens:

1. **Like a video:**
   - Calls `likeVideo(userId, businessId)`
   - Inserts into `likes` table: `{ user_id, business_id, created_at }`
   - Updates like count state immediately

2. **Unlike a video:**
   - Calls `unlikeVideo(userId, businessId)`
   - Deletes row from `likes` table
   - Decrements like count immediately

## How to Test

1. **Start the dev server:**
   ```powershell
   cd C:\Users\alvin\Localys\video-platform
   npm run dev
   ```

2. **Open the app:**
   - Navigate to `http://localhost:3001`
   - Sign in with your account

3. **Like a video:**
   - Scroll to any video that has a `business_id`
   - Click the heart icon on the right side
   - The heart should turn red
   - The count should increment by 1

4. **Verify in Supabase:**
   - Open Supabase Dashboard → Table Editor
   - Go to `likes` table
   - You should see a new row with:
     - `user_id`: your user ID
     - `business_id`: the video's business ID
     - `created_at`: current timestamp

5. **Unlike a video:**
   - Click the red heart again
   - Heart returns to outline
   - Count decrements by 1
   - Row is deleted from `likes` table in Supabase

## File Overview

### `lib/supabase/videos.ts`
- `likeVideo(userId, businessId)` - Inserts like into Supabase
- `unlikeVideo(userId, businessId)` - Removes like from Supabase
- `getLikeCounts(businessIds)` - Fetches like counts for multiple videos

### `app/page.tsx`
- `toggleLike()` - Handles like/unlike click logic
- Renders heart button with count
- Manages `likedVideos` state (tracks which videos user liked)
- Manages `likeCounts` state (tracks count per video)

## Database Schema

Your `likes` table in Supabase:
```sql
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id)  -- Can only like once per video
);
```

The `UNIQUE` constraint ensures a user can only like each video once.

## Troubleshooting

**Heart doesn't appear?**
- Verify the video has a `business_id` (videos without business don't show like button)
- Check browser console for JavaScript errors
- Confirm you're logged in

**Like doesn't save to database?**
- Check browser DevTools → Network tab
- Look for POST/DELETE requests to Supabase REST API
- Check browser Console for error messages
- Verify your Supabase `likes` table exists and has correct RLS policies

**Like count not updating?**
- Refresh the page to reload counts from Supabase
- Check that your user can SELECT/INSERT/DELETE from `likes` table (RLS policies)

**RLS Policy Errors?**
Your `likes` table should have these policies (already created):
```
- SELECT: allow all (public read)
- INSERT: allow if auth.uid() = user_id (users can only like their own likes)
- DELETE: allow if auth.uid() = user_id (users can only unlike their own likes)
```

## Next Steps

The like counter is complete! You can now:
1. ✅ Like videos (data saves to Supabase)
2. ✅ See like counts update in real-time
3. ✅ Unlike videos
4. ✅ View all user's likes in Supabase dashboard

Optional enhancements:
- Add like notifications (notify business owner when liked)
- Show "Most Liked" section
- Add like animations (floating hearts)
- Export likes for analytics
