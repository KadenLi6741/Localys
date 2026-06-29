'use client';

/**
 * CommentForm Component
 *
 * Form for creating comments and replies.
 * Supports both full and compact modes.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { validateRequired, validateMaxLength, validateRating, firstError } from '@/lib/utils/validation';

/** Max characters allowed in a single comment / review body. */
const MAX_COMMENT_LENGTH = 1000;

interface CommentFormProps {
  onSubmit: (content: string, rating?: number, imageUrl?: string) => Promise<void> | void;
  loading?: boolean;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
}

export default function CommentForm({
  onSubmit,
  loading = false,
  placeholder = 'Write a comment...',
  compact = false,
  autoFocus = false,
}: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    setSelectedImage(file);
    setUploadError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    try {
      setUploadError(null);
      const fileExt = selectedImage.name.split('.').pop()?.toLowerCase();
      
      if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt)) {
        setUploadError('Invalid file type. Allowed: JPG, PNG, GIF, WEBP, BMP');
        return null;
      }

      const fileName = `comment-images/${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedImage.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadError('Failed to upload image. Please try again.');
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Upload exception:', err);
      setUploadError('Error uploading image. Please try again.');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || uploading) return;

    const trimmedContent = content.trim();
    // Syntactic + semantic validation: non-empty, within length, valid 1–5 rating
    // when one is given (the review composer shows the star picker).
    const error = firstError(
      validateRequired(trimmedContent, compact ? 'Comment' : 'Review'),
      validateMaxLength(trimmedContent, MAX_COMMENT_LENGTH, compact ? 'Comment' : 'Review'),
      rating != null ? validateRating(rating) : null,
    );
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    try {
      setUploading(true);
      let imageUrl: string | undefined;

      if (selectedImage) {
        const url = await uploadImage();
        if (url) {
          imageUrl = url;
        } else {
          setUploading(false);
          return;
        }
      }

      await onSubmit(trimmedContent, rating || undefined, imageUrl);
      setContent('');
      setRating(null);
      removeImage();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Please sign in to comment</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2.5">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="Your avatar"
            className={`rounded-full object-cover ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
          />
        ) : (
          <div className={`rounded-full bg-gray-100 flex items-center justify-center ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}>
            <span className={`font-semibold text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>
              {user.email?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Input — min-w-0 lets this flex column shrink below its content's
          intrinsic width so the star row + Post button never overflow (and get
          clipped) inside a narrow container like the Discover reviews panel. */}
      <div className="min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => { setContent(e.target.value); if (validationError) setValidationError(null); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          rows={compact ? 1 : 3}
          className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
            compact ? 'text-sm min-h-[32px]' : 'text-sm min-h-[96px]'
          }`}
          style={{ maxHeight: compact ? '80px' : '160px' }}
        />

        {/* Star Rating */}
        {!compact && (
          <div className="mt-3 mb-2">
            <p className="text-sm font-semibold text-black mb-1.5">Rate this business from 1–5</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    className="p-0 shrink-0 focus:outline-none transition-transform hover:scale-110"
                    disabled={loading}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    aria-pressed={rating === star}
                  >
                    <svg
                      className={`w-6 h-6 ${
                        rating && rating >= star ? 'fill-[#f97316] text-[#f97316]' : 'fill-none text-gray-400'
                      }`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              {rating && <span className="text-xs font-medium text-gray-600">{rating}/5</span>}
            </div>
          </div>
        )}

        {/* Inline validation error (light red for the dark comment surface) */}
        {validationError && (
          <p role="alert" className="mt-1 text-xs font-medium text-red-400">{validationError}</p>
        )}

        {/* Image Upload Error */}
        {uploadError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs rounded p-2">
            {uploadError}
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative bg-gray-800 rounded-lg p-2">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-32 object-cover rounded"
            />
            <button
              type="button"
              onClick={removeImage}
              disabled={uploading}
              className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-600 disabled:opacity-50 p-1 rounded-full"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
        )}

        {/* Image Upload Button and Submit */}
        <div className="flex flex-wrap justify-between items-center mt-2 gap-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              disabled={uploading || loading}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="shrink-0 px-3 py-1.5 rounded-lg font-semibold text-sm bg-black/5 text-gray-700 hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Add image"
            >
              Photo
            </button>
          </div>
          <button
            type="submit"
            disabled={!content.trim() || loading || uploading}
            className={`shrink-0 px-4 py-1.5 rounded-lg font-semibold text-sm bg-[#f97316] text-white hover:bg-[#ea6a0c] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 ${
              compact ? 'active:scale-95' : ''
            }`}
          >
            {loading || uploading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                {uploading ? 'Uploading...' : 'Posting...'}
              </div>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}