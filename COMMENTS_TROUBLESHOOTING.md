# Comments System Troubleshooting Checklist

## What I Just Fixed

✅ **CommentModal.tsx** - Connected it to actual Supabase `createComment()` function instead of just logging to console

---

## Complete Setup Checklist

Follow these steps to ensure comments work:

### 1. Database Setup ✅ 
   - [ ] Ran the SQL from `COMMENTS_SQL_QUICK_COPY.sql` in Supabase
   - [ ] Verified tables were created:
     ```sql
     SELECT * FROM public.comments LIMIT 1;
     SELECT * FROM public.comment_likes LIMIT 1;
     ```

### 2. Profiles Table ✅
   - [ ] You have a `profiles` table with columns:
     - `id` (UUID)
     - `username` (TEXT)
     - `full_name` (TEXT, nullable)
     - `avatar_url` (TEXT, nullable)
   - [ ] Your user profile exists in `profiles` table
   - Verify:
     ```sql
     SELECT id, username, full_name FROM public.profiles WHERE id = 'YOUR_USER_ID';
     ```

### 3. Test the Comment Posting

**Option A: Test in Supabase Console**
```sql
-- Insert a test comment (replace video_id and user_id with real values)
INSERT INTO public.comments (video_id, user_id, content)
VALUES (
  'YOUR_VIDEO_ID',
  'YOUR_USER_ID', 
  'Test comment'
);

-- Verify it was created
SELECT * FROM public.comments WHERE content = 'Test comment';
```

**Option B: Test in Your App**
1. Click the comment button on a video
2. Type a comment
3. Click "Post"
4. Check browser console (F12) for any errors

### 4. Check for Errors

If nothing happens, check:

**Browser Console** (F12 → Console):
- Look for red error messages
- Check if it says "User not authenticated"
- Look for any API errors from Supabase

**Browser Network Tab** (F12 → Network):
- Click "Post" comment
- Look for a request to Supabase
- Check if response shows error

### 5. Verify RLS Policies

Run this in Supabase to check if RLS is correctly enabled:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('comments', 'comment_likes');
-- Should show: rowsecurity = true for both
```

### 6. Test Authentication

Make sure you're logged in:
```typescript
// In your browser console
const { data: { user } } = await supabase.auth.getUser();
console.log(user);
// Should show your user ID, not null
```

---

## What Happens When You Post a Comment

1. **CommentModal** component calls `createComment()` with `video_id` and `content`
2. `createComment()` function:
   - Gets current user ID from auth
   - Inserts comment into `comments` table
   - Fetches profile data (username, avatar)
   - Returns comment object with all data
3. Comment appears immediately in the modal feedback

---

## Common Issues & Solutions

### Issue: "User not authenticated"
- **Solution**: Make sure you're logged in
- Check that auth context is properly set up
- Verify `useAuth()` hook returns a valid user

### Issue: "Cannot insert into comments" (RLS error)
- **Solution**: RLS policies prevent anonymous users
- Make sure you're logged in as authenticated user
- Check that RLS policies were created

### Issue: "Cannot find profiles table"
- **Solution**: profiles table doesn't exist
- Run migration `001_user_messaging_schema.sql` first
- Verify table exists: `SELECT * FROM public.profiles LIMIT 1;`

### Issue: Comment posts but doesn't show anywhere
- **Solution**: Display component might not be on the page
- CommentSection isn't currently displayed in main video feed
- You need to add a section to show all comments on the video (see below)

---

## Next Step: Display Comments

Currently, comments are saved but not displayed anywhere. To show comments, you need to add a CommentSection component somewhere.

### Option 1: Add to CommentModal (Show existing comments)

In `components/CommentModal.tsx`, add above the form:

```tsx
import { CommentSection } from '@/components/comments';

// In the Content section, before the form:
<div className="flex-1 p-4 overflow-y-auto">
  <CommentSection videoId={postId} className="mb-4" />
</div>
```

### Option 2: Add to Main Video Feed

In `app/page.tsx`, add after the video:

```tsx
import { CommentSection } from '@/components/comments';

// After the video player
{currentVideo && (
  <CommentSection videoId={currentVideo.id} />
)}
```

---

## Testing Steps

1. **Add your test profiles** to database (if missing)
2. **Post a comment** through the modal
3. **Refresh the page** - does comment still appear?
4. **Check Supabase UI** - go to SQL Editor and run:
   ```sql
   SELECT * FROM public.comments ORDER BY created_at DESC LIMIT 10;
   ```
5. **Do you see your comment there?** If yes, the backend works!
6. **If comment shows in Supabase but not in app** - the display component needs to be added

---

## File Summary

- ✅ `CommentModal.tsx` - Now saves comments to Supabase
- ✅ `lib/supabase/comments.ts` - Has all the functions
- ✅ `components/comments/CommentSection.tsx` - Shows all comments (not on page yet)
- ⚙️ `COMMENTS_SQL_QUICK_COPY.sql` - Must be run in Supabase SQL Editor

---

## Questions?

If you see specific errors, share them and I can help debug further!
