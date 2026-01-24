# Diagnostic SQL Queries for Profiles Table

Run these queries one by one in your Supabase SQL Editor to diagnose the issue:

## 1. Check if profiles table exists and its structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

## 2. Check if RLS is enabled
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles' AND table_schema = 'public';
```

## 3. List all RLS policies on profiles table
```sql
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

## 4. Test a simple query (check if you can read profiles)
```sql
SELECT id, username, full_name, profile_picture_url, bio
FROM public.profiles
LIMIT 5;
```

## 5. Check if there are any profiles in the table
```sql
SELECT COUNT(*) as profile_count FROM public.profiles;
```

---

## Common Issues & Fixes

### Issue 1: RLS is too restrictive
If you see policies but can't query, the RLS might be blocking SELECT.

**Fix: Add this policy if it doesn't exist**
```sql
CREATE POLICY "Enable read access for all users"
ON public.profiles FOR SELECT
USING (true);
```

### Issue 2: Missing columns
If the columns don't match what the app expects, you need to add them.

**For example, if `username` or `profile_picture_url` is missing:**
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;
```

### Issue 3: No profiles exist
If the count is 0, profiles aren't being created during signup.

**Check if auth users exist:**
```sql
SELECT COUNT(*) as user_count FROM auth.users;
```

**If users exist but profiles don't, insert them:**
```sql
INSERT INTO public.profiles (id, email, full_name, username)
SELECT id, email, '' as full_name, email as username
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```
