'use client';

/**
 * CommentModal — popup dialog wrapper around the comments thread for a post/video.
 * Purpose: Presents the shared CommentSection inside an accessible modal (Escape to close, body-scroll
 *   lock, backdrop click-to-dismiss). Used wherever comments are opened as an overlay rather than inline.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect } from 'react';
import { CommentSection } from '@/components/comments';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  businessName?: string;
}

/**
 * Modal for viewing and composing comments on a post
 */
export function CommentModal({ isOpen, onClose, postId, businessName }: CommentModalProps) {
  // Let users dismiss with the Escape key, the standard expectation for a modal dialog.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock background scrolling while open so the page behind the modal doesn't move under it.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Close only when the click is on the backdrop itself, not when it bubbles up from inner content.
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comment-modal-title"
    >
      <div className="relative w-full sm:max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] sm:max-h-[600px] flex flex-col animate-[scaleIn_200ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="comment-modal-title" className="text-lg font-semibold text-black">
            Comments
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <CommentSection videoId={postId} />
        </div>
      </div>
    </div>
  );
}
// hai