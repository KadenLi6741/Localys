'use client';

/**
 * CommentForm Component
 *
 * Form for creating comments and replies.
 * Supports both full and compact modes.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CommentFormProps {
  onSubmit: (content: string, rating?: number) => Promise<void> | void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || loading) return;

    try {
      await onSubmit(trimmedContent, rating || undefined);
      setContent('');
      setRating(null);
    } catch (error) {
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
          <div className={`rounded-full bg-white/10 flex items-center justify-center ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}>
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
          className={`w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
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

        {/* Submit Button */}
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-gray-400">
            {!compact && 'Press Ctrl+Enter to submit'}
          </div>
          <button
            type="submit"
            disabled={!content.trim() || loading}
            className={`px-4 py-1.5 rounded-lg font-semibold text-sm disabled:bg-white/10 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 ${
              compact
                ? 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Posting...
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