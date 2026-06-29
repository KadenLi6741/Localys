'use client';

/**
 * error.tsx — Next.js route-level error boundary for the app.
 * Purpose: Shown when a page throws during render. Logs the error and offers a "try again" (reset) plus
 *   a link home, so a crash degrades to a friendly recoverable screen instead of a blank page.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#f97316]">
        <svg className="h-10 w-10 text-[#f97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-black tracking-tight text-black">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-base text-gray-500">
        An unexpected error occurred. You can try again or go back to the home screen.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#f97316] px-8 py-3 text-base font-bold text-white transition hover:opacity-90"
          style={{ padding: '0.75rem 2rem' }}
        >
          Try again
        </button>
        <Link
          href="/home"
          className="rounded-full border-2 border-black px-8 py-3 text-base font-bold text-black transition hover:bg-black hover:text-white"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
