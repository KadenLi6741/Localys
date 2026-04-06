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

    const trimmedContent = content.trim();
    if (!trimmedContent || loading || uploading) return;

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
      <div className="text-center py-4 text-gray-400">
        <p className="text-sm">Please sign in to comment</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="Your avatar"
            className={`rounded-full object-cover ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
          />
        ) : (
          <div className={`rounded-full bg-[var(--glass-bg)] flex items-center justify-center ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}>
            <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
              {user.email?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          rows={compact ? 1 : 3}
          className={`w-full bg-transparent border border-[var(--glass-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder-gray-500 focus:outline-none focus:border-[var(--glass-border-focus)] disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
            compact ? 'text-sm min-h-[32px]' : 'text-sm'
          }`}
          style={{ maxHeight: compact ? '80px' : '120px' }}
        />

        {/* Star Rating */}
        {!compact && (
          <div className="flex items-center gap-2 mt-3 mb-2">
            <span className="text-xs text-gray-400">Rate:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                  disabled={loading}
                >
                  <svg
                    className={`w-5 h-5 ${
                      rating && rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'
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
            {rating && <span className="text-xs text-gray-400">{rating}/5</span>}
          </div>
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
              <svg className="w-4 h-4 text-[var(--text-primary)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
        )}

        {/* Image Upload Button and Submit */}
        <div className="flex justify-between items-center mt-2 gap-2">
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
              className="px-3 py-1.5 rounded-lg font-semibold text-sm bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Add image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={!content.trim() || loading || uploading}
            className={`px-4 py-1.5 rounded-lg font-semibold text-sm disabled:bg-[var(--glass-bg)] disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 ${
              compact
                ? 'bg-[var(--glass-bg-strong)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] active:scale-95'
                : 'bg-[var(--glass-bg-strong)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
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