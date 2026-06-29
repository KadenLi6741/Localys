'use client';

/**
 * Toast — transient, auto-dismissing notification banner.
 * Purpose: Shows brief status messages (e.g. "Added to cart", "Copied link") near the
 *   bottom of the screen and removes itself after a timeout so the user never has to dismiss it.
 *   Used app-wide for lightweight, non-blocking feedback.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

/**
 * Renders a floating toast and self-dismisses after `duration` ms.
 * Exists so callers can fire-and-forget a message: the component owns its own timer
 * and calls `onClose` when it expires, keeping notification state out of the parent.
 */
export function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  // Start a one-shot timer when shown; clearing on unmount prevents calling
  // onClose after the toast (or its parent) has already gone away.
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div 
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A18]/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg page-transition"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-[#f97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}
