'use client';

/**
 * EditableProfilePicture — avatar that shows a user's photo and (on their own profile) lets them change it.
 * Purpose: Displays the profile image with an initial-letter fallback, and for the owner adds an upload
 *   button that pushes the new image to Supabase storage and updates their profile record. Handles the
 *   instant local preview, size/type validation, and loading/error states.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useRef, useState, useEffect } from 'react';
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
  // Tracks the temporary blob: URL used for instant preview so we can revoke it and avoid memory leaks.
  const objectUrlRef = useRef<string | null>(null);

  // Revoke any outstanding preview blob URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Validates the chosen file, shows an immediate preview, uploads it, then saves the public URL
  // to the user's profile. Runs when the owner picks a new image from the hidden file input.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject non-images up front so we don't waste an upload on an invalid file.
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Enforce the size cap client-side for instant feedback (storage also limits it server-side).
    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      const maxSizeMB = MAX_PROFILE_PICTURE_SIZE / BYTES_TO_MB;
      setError(`Image size must be less than ${maxSizeMB}MB`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Drop the previous preview URL before creating a new one to prevent blob leaks.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      // Show the picked image immediately (optimistic preview) while the upload happens in the background.
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPreview(objectUrl);

      console.log('Uploading profile picture for userId:', userId);
      const { data, error: uploadError } = await uploadProfilePicture(file, userId);
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image: ' + uploadError.message);
      }

      console.log('Upload successful, updating profile with URL:', data?.publicUrl);

      if (data?.publicUrl) {
        // Persist the uploaded image's public URL onto the profile so it shows everywhere going forward.
        const { error: updateError } = await updateProfile(userId, {
          profile_picture_url: data.publicUrl,
        });

        if (updateError) {
          console.error('Update profile error:', updateError);
          throw new Error('Failed to update profile: ' + updateError.message);
        }

        // Swap the temporary blob preview for the real hosted URL now that the save succeeded.
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setPreview(data.publicUrl);
        
        onImageUpdated?.();
      }
    } catch (err: any) {
      // On any failure, roll the preview back to the original image so the UI doesn't lie about success.
      console.error('Profile picture update error:', err);
      setError(err.message || 'Failed to update profile picture');
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
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
          <div className="absolute inset-0 bg-[#1A1A18]/50 flex items-center justify-center rounded-full">
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
            className="absolute bottom-0 right-0 bg-[#f97316] hover:bg-[#ea6a0c] disabled:bg-[#f97316]/50 rounded-full p-2 transition-colors"
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
