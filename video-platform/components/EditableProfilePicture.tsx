'use client';

import { useRef, useState } from 'react';
import { uploadProfilePicture, updateProfile, MAX_PROFILE_PICTURE_SIZE, BYTES_TO_MB } from '@/lib/supabase/profiles';

interface EditableProfilePictureProps {
  userId: string;
  currentImageUrl?: string;
  fullName?: string;
  username?: string;
  isOwnProfile?: boolean;
  onImageUpdated?: () => void;
  className?: string;
}

export function EditableProfilePicture({
  userId,
  currentImageUrl,
  fullName,
  username,
  isOwnProfile = false,
  onImageUpdated,
  className = 'w-24 h-24'
}: EditableProfilePictureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      const maxSizeMB = MAX_PROFILE_PICTURE_SIZE / BYTES_TO_MB;
      setError(`Image size must be less than ${maxSizeMB}MB`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Show preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Upload to Supabase
      console.log('Uploading profile picture for userId:', userId);
      const { data, error: uploadError } = await uploadProfilePicture(file, userId);
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image: ' + uploadError.message);
      }

      console.log('Upload successful, updating profile with URL:', data?.publicUrl);

      // Update profile with new image URL
      if (data?.publicUrl) {
        const { error: updateError } = await updateProfile(userId, {
          profile_picture_url: data.publicUrl,
        });

        if (updateError) {
          console.error('Update profile error:', updateError);
          throw new Error('Failed to update profile: ' + updateError.message);
        }

        // Clean up object URL
        URL.revokeObjectURL(objectUrl);
        setPreview(data.publicUrl);
        
        // Callback to refresh parent component
        onImageUpdated?.();
      }
    } catch (err: any) {
      console.error('Profile picture update error:', err);
      setError(err.message || 'Failed to update profile picture');
      // Revert preview on error
      setPreview(currentImageUrl || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className={`${className} rounded-full bg-white/20 flex items-center justify-center overflow-hidden`}>
        {preview ? (
          <img
            src={preview}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl text-white/60">
            {fullName?.[0] || username?.[0] || '?'}
          </span>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Edit button - only show if it's user's own profile */}
      {isOwnProfile && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-full p-2 transition-colors"
            title="Change profile picture"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />

          {/* Error message */}
          {error && (
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-xs px-3 py-1 rounded whitespace-nowrap">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
