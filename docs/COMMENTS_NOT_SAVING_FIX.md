# Comments Not Saving - Fix Guide

## Issue
Comments are not saving to the database even though the form appears to work.

## Cause
The Supabase database might be missing:
1. The `rating` column in the `comments` table
2. Updated RPC functions that expect the `rating` column
3. Proper RLS policies

## Solution: Run the SQL Setup

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to the "SQL Editor" section

2. **Create a new query**
   - Click "New Query"
   - Paste the entire contents of: `SUPABASE_COMMENTS_FIX.sql`

3. **Run the query**
   - Click "Run" button
   - Wait for it to complete (should see green checkmarks)
   - At the bottom, you should see verification queries showing:
     - The comments table with all columns (including `rating`)
     - The count of existing comments

4. **Test the comments system**
   - Go back to your app
   - Clear your browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
   - Open a post/video
   - Try posting a comment
   - Check browser console for any errors (press F12)

## Troubleshooting

### If comments still don't save:
1. **Check browser console** (F12 > Console tab) for error messages
2. **Verify you're logged in** - Comments require authentication
3. **Check Supabase logs** - In Supabase Dashboard > Logs, look for any database errors

### If you see auth errors:
- Make sure your Supabase session is active
- Try logging out and logging back in

### If you see constraint violations:
- The comment text might be too long (max 2000 characters)
- The rating value must be between 1-5 or NULL

## Next Steps After Fix

Once comments are saving:
1. Refresh your page to verify comments persist
2. Check that the comment form clears after submission
3. Verify that ratings (if provided) are stored
4. Test that the average rating calculation works

## Questions?

If you still have issues:
- Check the console output from the SQL query for any error messages
- Verify the comments table exists: `SELECT * FROM public.comments LIMIT 1;`
- Check RLS policies: Look in Supabase Dashboard > Authentication > Policies
