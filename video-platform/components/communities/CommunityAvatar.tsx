'use client';

import { useState } from 'react';

/**
 * Round community avatar. Shows the mapped image when one exists; otherwise (or
 * if the image fails to load) falls back to an orange circle with the community's
 * initial — keeps the palette black/white/orange and avoids broken-image icons.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
export function CommunityAvatar({
  src,
  name,
  className = 'h-10 w-10',
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name.trim()[0] || '?').toUpperCase();

  if (!src || failed) {
    return (
      <span
        className={`flex items-center justify-center rounded-full border border-gray-200 bg-[#f97316] font-bold text-white dark:border-gray-700 ${className}`}
        aria-label={name}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className={`rounded-full border border-gray-200 object-cover dark:border-gray-700 ${className}`}
    />
  );
}
