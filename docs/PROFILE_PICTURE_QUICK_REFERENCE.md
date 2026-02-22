# Quick Reference - Profile Picture Upload

## What You Can Do Now

✅ Click the camera icon on your profile picture to change it
✅ Select a new image and it uploads instantly
✅ See the change on your profile right away
✅ Other users see your new picture when they view your profile

## How to Use

### Change Your Profile Picture
1. Go to your profile page
2. Look for the camera icon in the bottom-right corner of your profile picture
3. Click it and select an image
4. Watch it upload (spinner shows progress)
5. Done! Your profile picture is updated

### View Someone Else's Profile
1. Click on any business profile while watching videos
2. Their profile picture loads automatically
3. You'll see their latest uploaded image

## File Requirements

- **Type**: Must be an image (JPG, PNG, GIF, WebP)
- **Size**: Must be under 5MB
- **Format**: Any standard image format works

## What Happens Behind the Scenes

1. Image uploads to Supabase Storage
2. Unique URL is generated (it's very long and random)
3. Profile database is updated with this URL
4. Real-time update shows on your profile
5. Other users see it next time they view your profile

## In Edit Mode

You can also change your profile picture from edit mode:
1. Click "Edit Profile" button
2. Click the camera icon on your picture
3. Select a new image
4. Save the form
5. Profile updates with all changes

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't click camera icon | Make sure you're on your own profile (`/profile`) |
| "Image too large" error | Select a smaller image (under 5MB) |
| "Invalid file type" error | Select a real image file (JPG, PNG, etc.) |
| Picture doesn't update | Refresh the page or wait a moment |

## Technical Info

- **Component**: `EditableProfilePicture.tsx`
- **Upload Handler**: `uploadProfilePicture()` in `profiles.ts`
- **Profile Update**: `updateProfile()` in `profiles.ts`
- **Storage Bucket**: `videos` bucket in Supabase
- **Database**: `profiles.profile_picture_url` column

## Code Example (For Developers)

```tsx
<EditableProfilePicture
  userId={user.id}
  currentImageUrl={profile?.profile_picture_url}
  fullName={profile?.full_name}
  username={profile?.username}
  isOwnProfile={true}  // Show edit button
  onImageUpdated={() => loadProfile()}  // Refresh after update
  className="w-24 h-24"  // Size of picture
/>
```
