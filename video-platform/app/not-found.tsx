'use client';

/**
 * not-found.tsx — the global 404 page.
 * Purpose: Rendered for unknown routes; shows a friendly "page not found" message with a link back home.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border-4 border-black">
        <span className="text-4xl font-black text-black">404</span>
      </div>
      <h1 className="text-3xl font-black tracking-tight text-black">Page not found</h1>
      <p className="mt-3 max-w-sm text-base text-gray-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/home"
        className="mt-8 rounded-full bg-[#f97316] px-8 py-3 text-base font-bold text-white transition hover:opacity-90"
      >
        Back to Home
      </Link>
    </div>
  );
}
