# Profile Loading Error - Setup & Fix Guide

## Issue Summary
The error "Error loading profile" occurs because the `profiles` table doesn't exist, has incorrect RLS policies, or the columns are missing.

## Steps to Fix

### 1. **Create the Profiles Table in Supabase**

Go to your Supabase dashboard and run the SQL migration:

1. Navigate to: **SQL Editor** → **New Query**
2. Copy and paste the SQL from `supabase/migrations/create_profiles_table.sql`
3. Click **Run**

This creates:
- `profiles` table with correct schema
- Row-Level Security (RLS) policies
- Indexes for performance
- Auto-update timestamp trigger

### 2. **What the Table Structure Includes**

```sql
id (UUID) - References auth.users(id)
email (TEXT) - User email
full_name (TEXT) - User's full name
username (TEXT) - Unique username
bio (TEXT) - User biography
profile_picture_url (TEXT) - Profile picture URL
created_at (TIMESTAMP) - Creation timestamp
updated_at (TIMESTAMP) - Last update timestamp
```

### 3. **RLS Policies Configured**

The migration sets up these policies:

| Policy | Action | Who | Condition |
|--------|--------|-----|-----------|
| "Profiles are viewable by everyone" | SELECT | Everyone | Public read access |
| "Users can update their own profile" | UPDATE | User | Only their own profile |
| "Users can insert their own profile" | INSERT | User | Only their own profile |

This means:
- ✅ Anyone can view any profile (public)
- ✅ Users can only edit their own profile
- ✅ Users can only create their own profile

### 4. **Code Changes Made**

#### New Helper Function
Added `getProfileByUserId()` in `lib/supabase/profiles.ts`:
- Handles missing profiles gracefully
- Proper error logging
- Returns structured error/data format

#### Improved Error Handling
Updated `app/profile/[userId]/page.tsx`:
- Checks authentication status
- Uses the new helper function
- Better error messages displayed to users
- Detailed console logging for debugging

### 5. **Troubleshooting**

#### If you still get errors, check:

1. **Verify table exists**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'profiles' AND table_schema = 'public';
   ```

2. **Check RLS is enabled**
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'profiles';
   ```
   Should show `rowsecurity = true`

3. **Test a direct query in SQL Editor**
   ```sql
   SELECT * FROM profiles LIMIT 5;
   ```

4. **Check browser console** for detailed error messages when clicking on a profile

### 6. **How to Test**

1. **Sign up** a new user at `/signup`
2. **Navigate to home page** at `/`
3. **Click on any business profile** on a video (the profile button on the right side)
4. Should load without errors

### 7. **If Profiles Exist But Still Showing Error**

The issue might be that existing profiles were created during signup but the table wasn't created first. To sync:

```sql
-- Add missing auth users to profiles if they don't exist
INSERT INTO public.profiles (id, email, full_name, username)
SELECT id, email, '' as full_name, email as username
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

## Key Code Updates

### Before
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, username, full_name, profile_picture_url, bio')
  .eq('id', userId)
  .single();

if (error) throw error;
setProfile(data);
```

### After
```typescript
const { data, error } = await getProfileByUserId(userId);

if (error) {
  console.error('Error fetching profile:', error);
  return { data: null, error };
}

if (!data) {
  setError('Profile not found');
  return;
}

setProfile(data);
```

## Additional Notes

- The `profiles` table should automatically have an entry created when a user signs up (via `signUp()` in `auth.ts`)
- All profile queries now use the centralized `getProfileByUserId()` function for consistency
- Error messages are more informative for debugging
- RLS policies ensure data security while allowing public profile viewing
