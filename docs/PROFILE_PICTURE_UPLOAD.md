# Profile Picture Upload Feature - Complete Guide

## What Was Added

A new interactive profile picture component that allows users to change their profile picture with real-time updates.

## Features

✅ **Click-to-upload** - Users can click the camera icon on their profile picture to change it
✅ **Real-time preview** - Image preview updates immediately after selection
✅ **Loading state** - Shows a spinner while uploading
✅ **Error handling** - Clear error messages if upload fails
✅ **File validation** - Checks file type (must be image) and size
✅ **Automatic sync** - Other users see the updated profile picture immediately

## How It Works

### 1. **User's Own Profile** (`/profile`)
- Click the camera icon 🔘 on their profile picture
- Select a new image from their device
- Image uploads to Supabase Storage
- Profile database updated with new image URL
- Changes visible instantly on their profile

### 2. **Viewing Other Profiles** (`/profile/[userId]`)
- Users can view other people's profiles
- Profile picture displays with their latest image
- No edit button shown (read-only)

### 3. **Real-time Updates Across the App**
When a user changes their profile picture:
- Their own profile page updates immediately ✅
- Other users see the new picture when they view the profile ✅
- The database stores the new image URL in `profiles.profile_picture_url`

## Components Used

### New Component: `EditableProfilePicture.tsx`
Located in: `components/EditableProfilePicture.tsx`

**Props:**
- `userId` (string) - The user's ID
- `currentImageUrl` (string) - Current profile picture URL
- `fullName` (string) - User's full name (for initials fallback)
- `username` (string) - User's username (for initials fallback)
- `isOwnProfile` (boolean) - Whether this is the logged-in user's profile
- `onImageUpdated` (function) - Callback when image is successfully updated
- `className` (string) - Tailwind classes for sizing (e.g., "w-24 h-24")

## Technical Details

### Image Upload Flow

```
User selects image
    ↓
Validation (type + size check)
    ↓
Preview shown immediately
    ↓
Upload to Supabase Storage
    ↓
Get public URL
    ↓
Update profiles table
    ↓
Callback triggered (parent component re-fetches)
    ↓
Profile picture updates everywhere
```

### Storage Location
- **Bucket**: `videos` (or configured NEXT_PUBLIC_SUPABASE_BUCKET)
- **Path**: `profile-pictures/{userId}/{unique-id}.{ext}`
- **Visibility**: Public (returns public URL)

### Database Update
```sql
UPDATE profiles
SET profile_picture_url = 'https://...'
WHERE id = {userId}
```

## File Validation

✅ **File Type**: Must be an image (image/*)
✅ **File Size**: Maximum 5MB (can change in `lib/supabase/profiles.ts`)

## Error Handling

If anything goes wrong:
- Error message displayed below the profile picture
- Original profile picture retained
- User can try uploading again

## Updated Files

1. **New File**: `components/EditableProfilePicture.tsx`
   - Reusable component for profile pictures
   
2. **Updated**: `app/profile/page.tsx`
   - Uses new EditableProfilePicture component
   - Passes `isOwnProfile={true}` to show edit button
   
3. **Updated**: `app/profile/[userId]/page.tsx`
   - Uses new EditableProfilePicture component
   - Passes `isOwnProfile={false}` to hide edit button

## Testing the Feature

### Test 1: Change Your Own Profile Picture
1. Go to `/profile`
2. Click the camera icon on your profile picture
3. Select an image file
4. Watch it upload and update
5. Refresh the page - image should still be there

### Test 2: View Updated Picture From Another Account
1. Change your profile picture (Test 1)
2. Log out (or use another browser/incognito)
3. Log in as a different user
4. Navigate to your profile (`/profile/{your-id}`)
5. You should see the updated picture

### Test 3: Error Handling
1. Try uploading a non-image file (should fail)
2. Try uploading a file larger than 5MB (should fail)
3. Error message should display clearly

## Customization

### Change Max File Size
Edit `lib/supabase/profiles.ts`:
```typescript
export const MAX_PROFILE_PICTURE_SIZE = 10 * 1024 * 1024; // 10MB
```

### Change Profile Picture Size
When using the component:
```tsx
<EditableProfilePicture
  className="w-40 h-40" // Change size here
  ...
/>
```

### Change Allowed Image Types
Edit `lib/supabase/profiles.ts`:
```typescript
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
```

## How Other Users See Updates

The update is **real-time** because:
1. Image is uploaded to public storage (Supabase Storage)
2. Database is updated immediately
3. On next visit to `/profile/{userId}`, the new URL is fetched from DB
4. Browser displays the new image

No refresh needed - data is fetched fresh from database each time!

## Security Notes

✅ Users can only upload to their own profile picture folder
✅ RLS policies ensure users can only update their own profile
✅ File validation prevents malicious uploads
✅ Images stored in public bucket (but URLs are pseudo-random with UUIDs)

## Next Steps (Optional Enhancements)

- Add image cropper for better control
- Add multiple profile pictures/gallery
- Add profile picture history
- Add profile picture filters/effects
