'use client';

import { useEffect, useState } from 'react';
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comment-modal-title"
    >
      <div className="relative w-full sm:max-w-lg bg-black rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] sm:max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 id="comment-modal-title" className="text-lg font-semibold text-white">
            Comments
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto bg-gray-900 text-white flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Comments feature coming soon! 🚀</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
